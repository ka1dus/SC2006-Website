/**
 * Tests for population ingestion pipeline
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { normalizeName, toIntSafe, normalizePopulationRow } from '../utils/normalize';
import { SubzoneMatcher, ALIASES } from '../utils/geo-matcher';
import { prisma } from '../../../db';

describe('Normalization Utilities', () => {
  describe('normalizeName', () => {
    it('should handle uppercase conversion', () => {
      expect(normalizeName('tampines east')).toBe('TAMPINES EAST');
      expect(normalizeName('Marine Parade')).toBe('MARINE PARADE');
    });

    it('should handle punctuation removal', () => {
      expect(normalizeName('Punggol, Field')).toBe('PUNGGOL FIELD');
      expect(normalizeName('Jurong-West')).toBe('JURONG WEST');
      expect(normalizeName('Marine Parade!!!')).toBe('MARINE PARADE');
    });

    it('should handle spacing normalization', () => {
      expect(normalizeName('Tampines   East')).toBe('TAMPINES EAST');
      expect(normalizeName('  Marine  Parade  ')).toBe('MARINE PARADE');
    });

    it('should remove SUBZONE suffix', () => {
      expect(normalizeName('Tampines East Subzone')).toBe('TAMPINES EAST');
      expect(normalizeName('Marine Parade SUBZONE')).toBe('MARINE PARADE');
    });

    it('should handle hyphens vs spaces', () => {
      expect(normalizeName('Jurong-West')).toBe('JURONG WEST');
      expect(normalizeName('Jurong West')).toBe('JURONG WEST');
    });

    it('should handle empty/null input', () => {
      expect(normalizeName('')).toBe('');
      expect(normalizeName(null as any)).toBe('');
      expect(normalizeName(undefined as any)).toBe('');
    });
  });

  describe('toIntSafe', () => {
    it('should convert valid numbers', () => {
      expect(toIntSafe(123)).toBe(123);
      expect(toIntSafe('456')).toBe(456);
      expect(toIntSafe('1,234')).toBe(1234);
    });

    it('should handle decimals by flooring', () => {
      expect(toIntSafe(123.45)).toBe(123);
      expect(toIntSafe('456.78')).toBe(456);
    });

    it('should return null for invalid input', () => {
      expect(toIntSafe(null)).toBeNull();
      expect(toIntSafe(undefined)).toBeNull();
      expect(toIntSafe('')).toBeNull();
      expect(toIntSafe('abc')).toBeNull();
      expect(toIntSafe(NaN)).toBeNull();
      expect(toIntSafe(Infinity)).toBeNull();
    });
  });

  describe('normalizePopulationRow', () => {
    it('should normalize a complete row', () => {
      const raw = {
        name: 'Tampines East',
        population: '45,000',
        year: 2023,
      };

      const normalized = normalizePopulationRow(raw);

      expect(normalized.rawName).toBe('Tampines East');
      expect(normalized.normalizedName).toBe('TAMPINES EAST');
      expect(normalized.populationTotal).toBe(45000);
      expect(normalized.year).toBe(2023);
    });

    it('should handle different field names', () => {
      const raw = {
        subzone: 'Marine Parade',
        total: 32000,
        year: '2023',
      };

      const normalized = normalizePopulationRow(raw);

      expect(normalized.rawName).toBe('Marine Parade');
      expect(normalized.normalizedName).toBe('MARINE PARADE');
      expect(normalized.populationTotal).toBe(32000);
      expect(normalized.year).toBe(2023);
    });

    it('should handle missing data gracefully', () => {
      const raw = {
        name: 'Test Area',
      };

      const normalized = normalizePopulationRow(raw);

      expect(normalized.rawName).toBe('Test Area');
      expect(normalized.populationTotal).toBeNull();
      expect(normalized.year).not.toBeNull(); // Should default to current year
    });
  });
});

describe('Geo Matcher', () => {
  let matcher: SubzoneMatcher;

  beforeAll(async () => {
    // Ensure test data exists
    await prisma.subzone.upsert({
      where: { id: 'TAMPINES_EAST' },
      create: {
        id: 'TAMPINES_EAST',
        name: 'Tampines East',
        region: 'EAST',
      },
      update: {},
    });

    matcher = new SubzoneMatcher();
    await matcher.initialize();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('matchToSubzone', () => {
    it('should match exact normalized names', () => {
      const result = matcher.match('TAMPINES EAST');
      
      expect(result.subzoneId).toBe('TAMPINES_EAST');
      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
    });

    it('should handle unmatched names', () => {
      const result = matcher.match('NONEXISTENT SUBZONE');
      
      expect(result.subzoneId).toBeNull();
      expect(result.reason).toBe('no_match');
    });

    it('should handle empty names', () => {
      const result = matcher.match('');
      
      expect(result.subzoneId).toBeNull();
      expect(result.reason).toBe('empty_name');
    });

    it('should match via aliases if configured', () => {
      // Add a test alias
      ALIASES['TEST ALIAS'] = 'TAMPINES_EAST';
      
      const result = matcher.match('TEST ALIAS');
      
      expect(result.subzoneId).toBe('TAMPINES_EAST');
      expect(result.matchType).toBe('alias');
      expect(result.confidence).toBe(0.9);

      // Cleanup
      delete ALIASES['TEST ALIAS'];
    });
  });
});

describe('Ingestion Pipeline', () => {
  beforeAll(async () => {
    // Ensure clean test state
    await prisma.populationUnmatched.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should record unmatched entries', async () => {
    await prisma.populationUnmatched.create({
      data: {
        sourceKey: 'test-key-001',
        rawName: 'Unknown Area',
        reason: 'no_match',
        details: { normalized: 'UNKNOWN AREA' },
      },
    });

    const unmatched = await prisma.populationUnmatched.findMany({
      where: { rawName: 'Unknown Area' },
    });

    expect(unmatched).toHaveLength(1);
    expect(unmatched[0].reason).toBe('no_match');
  });

  it('should upsert population data idempotently', async () => {
    // Ensure subzone exists
    await prisma.subzone.upsert({
      where: { id: 'TEST_SUBZONE' },
      create: {
        id: 'TEST_SUBZONE',
        name: 'Test Subzone',
        region: 'UNKNOWN',
      },
      update: {},
    });

    // First upsert
    await prisma.population.upsert({
      where: { subzoneId: 'TEST_SUBZONE' },
      create: {
        subzoneId: 'TEST_SUBZONE',
        subzoneName: 'Test Subzone',
        year: 2023,
        total: 10000,
      },
      update: {
        year: 2023,
        total: 10000,
      },
    });

    let pop = await prisma.population.findUnique({
      where: { subzoneId: 'TEST_SUBZONE' },
    });

    expect(pop?.total).toBe(10000);

    // Second upsert with updated year (should replace)
    await prisma.population.upsert({
      where: { subzoneId: 'TEST_SUBZONE' },
      create: {
        subzoneId: 'TEST_SUBZONE',
        subzoneName: 'Test Subzone',
        year: 2024,
        total: 12000,
      },
      update: {
        year: 2024,
        total: 12000,
      },
    });

    pop = await prisma.population.findUnique({
      where: { subzoneId: 'TEST_SUBZONE' },
    });

    expect(pop?.year).toBe(2024);
    expect(pop?.total).toBe(12000);

    // Cleanup
    await prisma.population.delete({ where: { subzoneId: 'TEST_SUBZONE' } });
    await prisma.subzone.delete({ where: { id: 'TEST_SUBZONE' } });
  });

  it('should record dataset snapshots', async () => {
    await prisma.datasetSnapshot.create({
      data: {
        kind: 'population',
        sourceUrl: 'https://test.gov.sg/data',
        versionNote: 'Test snapshot',
        startedAt: new Date(),
        finishedAt: new Date(),
        status: 'success',
        meta: {
          matchedCount: 10,
          unmatchedCount: 2,
        },
      },
    });

    const snapshots = await prisma.datasetSnapshot.findMany({
      where: { kind: 'population' },
      orderBy: { startedAt: 'desc' },
      take: 1,
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].status).toBe('success');
    expect(snapshots[0].meta).toHaveProperty('matchedCount', 10);
  });
});

