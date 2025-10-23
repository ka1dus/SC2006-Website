/**
 * Subzones API Integration Tests
 * Tests for Task 2 REST API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../main';
import { prisma } from '../db';
import { Region } from '@prisma/client';

// Test helper: ensure seed data exists
async function ensureSeedData() {
  const subzones = [
    { id: 'TAMPINES_EAST', name: 'Tampines East', region: Region.EAST },
    { id: 'MARINE_PARADE', name: 'Marine Parade', region: Region.CENTRAL },
    { id: 'WOODLANDS_EAST', name: 'Woodlands East', region: Region.NORTH },
    { id: 'PUNGGOL_FIELD', name: 'Punggol Field', region: Region.NORTH_EAST },
    { id: 'JURONG_WEST_CENTRAL', name: 'Jurong West Central', region: Region.WEST },
  ];

  for (const subzone of subzones) {
    await prisma.subzone.upsert({
      where: { id: subzone.id },
      create: subzone,
      update: {},
    });
  }

  // Ensure some have population
  const populationData = [
    { subzoneId: 'TAMPINES_EAST', subzoneName: 'Tampines East', year: 2023, total: 45000 },
    { subzoneId: 'MARINE_PARADE', subzoneName: 'Marine Parade', year: 2023, total: 32000 },
    { subzoneId: 'WOODLANDS_EAST', subzoneName: 'Woodlands East', year: 2023, total: 38000 },
  ];

  for (const pop of populationData) {
    await prisma.population.upsert({
      where: { subzoneId: pop.subzoneId },
      create: pop,
      update: {},
    });
  }

  // Ensure some DON'T have population (for testing missing data)
  await prisma.population.deleteMany({
    where: {
      subzoneId: { in: ['PUNGGOL_FIELD', 'JURONG_WEST_CENTRAL'] },
    },
  });
}

describe('Subzones API - Task 2', () => {
  beforeAll(async () => {
    await ensureSeedData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/subzones', () => {
    it('should return list of subzones', async () => {
      const response = await request(app)
        .get('/api/v1/subzones')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const subzone = response.body[0];
      expect(subzone).toHaveProperty('id');
      expect(subzone).toHaveProperty('name');
      expect(subzone).toHaveProperty('region');
      expect(subzone).toHaveProperty('population');
    });

    it('should return subzone with population when available', async () => {
      const response = await request(app)
        .get('/api/v1/subzones?ids=TAMPINES_EAST')
        .expect(200);

      expect(response.body).toHaveLength(1);
      const subzone = response.body[0];
      
      expect(subzone.id).toBe('TAMPINES_EAST');
      expect(subzone.population).not.toBeNull();
      expect(subzone.population.total).toBe(45000);
      expect(subzone.population.year).toBe(2023);
      expect(subzone.info).toBeUndefined();
    });

    it('should return subzone with null population and missing flag when unavailable', async () => {
      const response = await request(app)
        .get('/api/v1/subzones?ids=PUNGGOL_FIELD')
        .expect(200);

      expect(response.body).toHaveLength(1);
      const subzone = response.body[0];
      
      expect(subzone.id).toBe('PUNGGOL_FIELD');
      expect(subzone.population).toBeNull();
      expect(subzone.info).toBeDefined();
      expect(subzone.info.missing).toContain('population');
    });

    it('should filter by region', async () => {
      const response = await request(app)
        .get('/api/v1/subzones?region=EAST')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((subzone: any) => {
        expect(subzone.region).toBe('EAST');
      });
    });

    it('should filter by search query (case-insensitive)', async () => {
      const response = await request(app)
        .get('/api/v1/subzones?q=tampines')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach((subzone: any) => {
        expect(subzone.name.toLowerCase()).toContain('tampines');
      });
    });

    it('should respect limit and offset', async () => {
      const response1 = await request(app)
        .get('/api/v1/subzones?limit=2&offset=0')
        .expect(200);

      expect(response1.body).toHaveLength(2);

      const response2 = await request(app)
        .get('/api/v1/subzones?limit=2&offset=2')
        .expect(200);

      expect(response2.body.length).toBeGreaterThan(0);
      expect(response2.body[0].id).not.toBe(response1.body[0].id);
    });

    it('should filter by multiple IDs', async () => {
      const response = await request(app)
        .get('/api/v1/subzones?ids=TAMPINES_EAST,MARINE_PARADE')
        .expect(200);

      expect(response.body).toHaveLength(2);
      const ids = response.body.map((s: any) => s.id);
      expect(ids).toContain('TAMPINES_EAST');
      expect(ids).toContain('MARINE_PARADE');
    });
  });

  describe('GET /api/v1/subzones/:id', () => {
    it('should return subzone details by ID', async () => {
      const response = await request(app)
        .get('/api/v1/subzones/TAMPINES_EAST')
        .expect(200);

      expect(response.body.id).toBe('TAMPINES_EAST');
      expect(response.body.name).toBe('Tampines East');
      expect(response.body.region).toBe('EAST');
      expect(response.body.population).not.toBeNull();
      expect(response.body.population.total).toBe(45000);
      expect(response.body.metrics).toBeDefined();
    });

    it('should return 404 for non-existent subzone', async () => {
      const response = await request(app)
        .get('/api/v1/subzones/NONEXISTENT')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('NOT_FOUND');
    });

    it('should include metrics object (even if null)', async () => {
      const response = await request(app)
        .get('/api/v1/subzones/MARINE_PARADE')
        .expect(200);

      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.demand).toBeNull();
      expect(response.body.metrics.supply).toBeNull();
      expect(response.body.metrics.accessibility).toBeNull();
      expect(response.body.metrics.score).toBeNull();
    });

    it('should flag missing data correctly', async () => {
      const response = await request(app)
        .get('/api/v1/subzones/PUNGGOL_FIELD')
        .expect(200);

      expect(response.body.population).toBeNull();
      expect(response.body.info).toBeDefined();
      expect(response.body.info.missing).toContain('population');
      expect(response.body.info.missing).toContain('metrics');
    });
  });

  describe('GET /api/v1/subzones:batch', () => {
    it('should return multiple subzones for comparison', async () => {
      const response = await request(app)
        .get('/api/v1/subzones:batch?ids=TAMPINES_EAST,MARINE_PARADE')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      
      const ids = response.body.map((s: any) => s.id);
      expect(ids).toContain('TAMPINES_EAST');
      expect(ids).toContain('MARINE_PARADE');
    });

    it('should reject if less than 2 IDs provided', async () => {
      const response = await request(app)
        .get('/api/v1/subzones:batch?ids=TAMPINES_EAST')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject if more than 8 IDs provided', async () => {
      const ids = Array.from({ length: 9 }, (_, i) => `ID_${i}`).join(',');
      const response = await request(app)
        .get(`/api/v1/subzones:batch?ids=${ids}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return notFound array when some IDs do not exist', async () => {
      const response = await request(app)
        .get('/api/v1/subzones:batch?ids=TAMPINES_EAST,NONEXISTENT,MARINE_PARADE')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('notFound');
      expect(response.body.notFound).toContain('NONEXISTENT');
      expect(response.body.data).toHaveLength(2);
    });

    it('should preserve input order when all IDs exist', async () => {
      const response = await request(app)
        .get('/api/v1/subzones:batch?ids=MARINE_PARADE,TAMPINES_EAST')
        .expect(200);

      // Note: Since we're not found some IDs, this returns { data, notFound }
      // If all are found, it returns the array directly
      const subzones = response.body.notFound ? response.body.data : response.body;
      
      expect(subzones[0].id).toBe('MARINE_PARADE');
      expect(subzones[1].id).toBe('TAMPINES_EAST');
    });
  });

  describe('GET /api/v1/geo/subzones', () => {
    it('should return GeoJSON FeatureCollection', async () => {
      const response = await request(app)
        .get('/api/v1/geo/subzones')
        .expect(200);

      expect(response.body.type).toBe('FeatureCollection');
      expect(Array.isArray(response.body.features)).toBe(true);
      expect(response.body.features.length).toBeGreaterThan(0);
    });

    it('should enrich features with population data', async () => {
      const response = await request(app)
        .get('/api/v1/geo/subzones')
        .expect(200);

      const tampinesFeature = response.body.features.find(
        (f: any) => f.properties.id === 'TAMPINES_EAST'
      );

      expect(tampinesFeature).toBeDefined();
      expect(tampinesFeature.properties.populationTotal).toBe(45000);
      expect(tampinesFeature.properties.populationYear).toBe(2023);
      expect(tampinesFeature.properties.missing).toBeUndefined();
    });

    it('should flag missing population in GeoJSON properties', async () => {
      const response = await request(app)
        .get('/api/v1/geo/subzones')
        .expect(200);

      const punggolFeature = response.body.features.find(
        (f: any) => f.properties.id === 'PUNGGOL_FIELD'
      );

      expect(punggolFeature).toBeDefined();
      expect(punggolFeature.properties.populationTotal).toBeNull();
      expect(punggolFeature.properties.populationYear).toBeNull();
      expect(punggolFeature.properties.missing).toContain('population');
    });

    it('should filter by region', async () => {
      const response = await request(app)
        .get('/api/v1/geo/subzones?region=EAST')
        .expect(200);

      expect(response.body.features.length).toBeGreaterThan(0);
      response.body.features.forEach((feature: any) => {
        expect(feature.properties.region).toBe('EAST');
      });
    });

    it('should include valid geometry', async () => {
      const response = await request(app)
        .get('/api/v1/geo/subzones')
        .expect(200);

      const feature = response.body.features[0];
      expect(feature.geometry).toBeDefined();
      expect(feature.geometry.type).toBeDefined();
      expect(feature.geometry.coordinates).toBeDefined();
    });

    it('should include all required properties', async () => {
      const response = await request(app)
        .get('/api/v1/geo/subzones')
        .expect(200);

      const feature = response.body.features[0];
      const props = feature.properties;

      expect(props).toHaveProperty('id');
      expect(props).toHaveProperty('name');
      expect(props).toHaveProperty('region');
      expect(props).toHaveProperty('populationTotal');
      expect(props).toHaveProperty('populationYear');
    });
  });

  describe('GET /api/v1/population/unmatched (dev only)', () => {
    it('should return unmatched entries in development', async () => {
      // Create test unmatched entry
      await prisma.populationUnmatched.create({
        data: {
          sourceKey: 'test-key',
          rawName: 'Unknown Area',
          reason: 'no_match',
        },
      });

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/api/v1/population/unmatched')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');
      expect(Array.isArray(response.body.items)).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should return 403 in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/v1/population/unmatched')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('FORBIDDEN');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error handling', () => {
    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/subzones?region=INVALID')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors gracefully', async () => {
      // This would require mocking Prisma, skipped for now
      // In a real scenario, we'd test disconnection, timeouts, etc.
    });
  });
});

