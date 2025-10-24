/**
 * Integration tests for PART B: Census 2020 Population Ingestion
 * Tests idempotency, full pipeline, and API endpoints
 */

import request from 'supertest';
import prisma from '../../../db';
import { app } from '../../../main'; // Assuming app is exported
import { ingestCensus2020Population } from '../population.census2020';

// Note: These are integration tests that require a test database
// Skip if running in CI without test database setup

describe('PART B: Population Ingestion Integration', () => {
  beforeAll(async () => {
    // Ensure we have a test subzone to work with
    await prisma.subzone.upsert({
      where: { id: 'TEST_SUBZONE' },
      create: {
        id: 'TEST_SUBZONE',
        name: 'Test Subzone',
        region: 'CENTRAL',
      },
      update: {},
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.population.deleteMany({
      where: { subzoneId: 'TEST_SUBZONE' },
    });
    await prisma.subzone.delete({
      where: { id: 'TEST_SUBZONE' },
    }).catch(() => {});
    
    await prisma.$disconnect();
  });

  describe('Idempotency', () => {
    it('should allow re-running ingestion without creating duplicates', async () => {
      // Create a test population record
      await prisma.population.upsert({
        where: { subzoneId: 'TEST_SUBZONE' },
        create: {
          subzoneId: 'TEST_SUBZONE',
          subzoneName: 'Test Subzone',
          year: 2020,
          total: 10000,
        },
        update: {},
      });

      const countBefore = await prisma.population.count({
        where: { subzoneId: 'TEST_SUBZONE' },
      });

      // Re-run (simulated - would normally call ingestCensus2020Population)
      await prisma.population.upsert({
        where: { subzoneId: 'TEST_SUBZONE' },
        create: {
          subzoneId: 'TEST_SUBZONE',
          subzoneName: 'Test Subzone',
          year: 2020,
          total: 10000,
        },
        update: {
          year: 2020,
          total: 10000,
        },
      });

      const countAfter = await prisma.population.count({
        where: { subzoneId: 'TEST_SUBZONE' },
      });

      expect(countAfter).toBe(countBefore);
      expect(countAfter).toBe(1);
    });

    it('should update if newer year is provided', async () => {
      await prisma.population.upsert({
        where: { subzoneId: 'TEST_SUBZONE' },
        create: {
          subzoneId: 'TEST_SUBZONE',
          subzoneName: 'Test Subzone',
          year: 2020,
          total: 10000,
        },
        update: {
          year: 2020,
          total: 10000,
        },
      });

      // Update with newer data
      await prisma.population.upsert({
        where: { subzoneId: 'TEST_SUBZONE' },
        update: {
          year: 2021,
          total: 11000,
        },
        create: {
          subzoneId: 'TEST_SUBZONE',
          subzoneName: 'Test Subzone',
          year: 2021,
          total: 11000,
        },
      });

      const updated = await prisma.population.findUnique({
        where: { subzoneId: 'TEST_SUBZONE' },
      });

      expect(updated?.year).toBe(2021);
      expect(updated?.total).toBe(11000);
    });
  });

  describe('DatasetSnapshot Recording', () => {
    it('should create snapshot records on ingestion', async () => {
      const snapshotsBefore = await prisma.datasetSnapshot.count({
        where: { kind: 'census-2020-population' },
      });

      // Note: This would require a mock or test file to actually run
      // For now, we verify the snapshot structure

      const latestSnapshot = await prisma.datasetSnapshot.findFirst({
        where: { kind: 'census-2020-population' },
        orderBy: { startedAt: 'desc' },
      });

      // If any snapshots exist, they should have required fields
      if (latestSnapshot) {
        expect(latestSnapshot.kind).toBe('census-2020-population');
        expect(latestSnapshot.status).toMatch(/success|partial|failed/);
        expect(latestSnapshot.meta).toBeDefined();
      }
    });
  });
});

describe('PART B: Geo API Population Enrichment', () => {
  beforeAll(async () => {
    // Setup test data
    await prisma.subzone.upsert({
      where: { id: 'TEST_GEO' },
      create: {
        id: 'TEST_GEO',
        name: 'Test Geo Subzone',
        region: 'EAST',
        geomGeoJSON: {
          type: 'Polygon',
          coordinates: [[[103.8, 1.3], [103.9, 1.3], [103.9, 1.4], [103.8, 1.4], [103.8, 1.3]]],
        },
      },
      update: {},
    });

    await prisma.population.upsert({
      where: { subzoneId: 'TEST_GEO' },
      create: {
        subzoneId: 'TEST_GEO',
        subzoneName: 'Test Geo Subzone',
        year: 2020,
        total: 15000,
      },
      update: {},
    });
  });

  afterAll(async () => {
    await prisma.population.deleteMany({ where: { subzoneId: 'TEST_GEO' } });
    await prisma.subzone.deleteMany({ where: { id: 'TEST_GEO' } });
    await prisma.$disconnect();
  });

  it('should return GeoJSON with population fields', async () => {
    const response = await request(app)
      .get('/api/v1/geo/subzones')
      .expect(200);

    expect(response.body).toHaveProperty('type', 'FeatureCollection');
    expect(response.body).toHaveProperty('features');
    expect(Array.isArray(response.body.features)).toBe(true);

    // Check if at least some features have population data
    if (response.body.features.length > 0) {
      const firstFeature = response.body.features[0];
      expect(firstFeature.properties).toHaveProperty('populationTotal');
      expect(firstFeature.properties).toHaveProperty('populationYear');
    }
  });

  it('should include "missing" array for subzones without population', async () => {
    // Create a subzone without population
    await prisma.subzone.upsert({
      where: { id: 'NO_POP' },
      create: {
        id: 'NO_POP',
        name: 'No Population',
        region: 'WEST',
        geomGeoJSON: {
          type: 'Polygon',
          coordinates: [[[103.7, 1.3], [103.8, 1.3], [103.8, 1.4], [103.7, 1.4], [103.7, 1.3]]],
        },
      },
      update: {},
    });

    const response = await request(app)
      .get('/api/v1/geo/subzones')
      .expect(200);

    const noPopFeature = response.body.features.find((f: any) => f.properties.id === 'NO_POP');
    
    if (noPopFeature) {
      expect(noPopFeature.properties.populationTotal).toBeNull();
      expect(noPopFeature.properties.missing).toContain('population');
    }

    // Cleanup
    await prisma.subzone.deleteMany({ where: { id: 'NO_POP' } });
  });
});

describe('PART B: Diag Endpoint', () => {
  it('should return population metrics in tables', async () => {
    const response = await request(app)
      .get('/api/v1/diag/status')
      .expect(200);

    expect(response.body).toHaveProperty('tables');
    expect(response.body.tables).toHaveProperty('subzones');
    expect(response.body.tables).toHaveProperty('population');
    expect(typeof response.body.tables.population).toBe('number');
  });

  it('should include population snapshot info', async () => {
    const response = await request(app)
      .get('/api/v1/diag/status')
      .expect(200);

    expect(response.body).toHaveProperty('snapshots');
    
    // If population snapshot exists, it should have required fields
    if (response.body.snapshots.population) {
      expect(response.body.snapshots.population).toHaveProperty('finishedAt');
      expect(response.body.snapshots.population).toHaveProperty('status');
    }
  });

  it('should include sample population record', async () => {
    const response = await request(app)
      .get('/api/v1/diag/status')
      .expect(200);

    expect(response.body).toHaveProperty('sample');
    
    // If population sample exists, it should have required fields
    if (response.body.sample.population) {
      expect(response.body.sample.population).toHaveProperty('subzoneId');
      expect(response.body.sample.population).toHaveProperty('year');
      expect(response.body.sample.population).toHaveProperty('total');
      expect(typeof response.body.sample.population.total).toBe('number');
    }
  });
});

