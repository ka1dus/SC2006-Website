/**
 * Unit tests for PART B: Census 2020 Population Normalization
 * Tests normName, toInt, and normalizePopulationRow functions
 */

import { normName, toInt, normalizePopulationRow } from '../utils/normalize';

describe('PART B: Population Normalization Utils', () => {
  describe('normName', () => {
    it('should normalize basic names to uppercase', () => {
      expect(normName('tampines east')).toBe('TAMPINES EAST');
      expect(normName('Bedok North')).toBe('BEDOK NORTH');
    });

    it('should remove quotes and apostrophes', () => {
      expect(normName("Tampines' East")).toBe('TAMPINES EAST');
      expect(normName('Bedok "North"')).toBe('BEDOK NORTH');
      expect(normName('Newton's Circus')).toBe('NEWTONS CIRCUS');
    });

    it('should replace hyphens and slashes with spaces', () => {
      expect(normName('Bukit-Timah')).toBe('BUKIT TIMAH');
      expect(normName('Bukit/Timah')).toBe('BUKIT TIMAH');
      expect(normName('Tampines-East')).toBe('TAMPINES EAST');
    });

    it('should collapse multiple spaces', () => {
      expect(normName('Tampines    East')).toBe('TAMPINES EAST');
      expect(normName('Bedok  North   Area')).toBe('BEDOK NORTH AREA');
    });

    it('should handle Unicode normalization (NFKD)', () => {
      expect(normName('Café')).toBe('CAFE');
      expect(normName('Naïve')).toBe('NAIVE');
    });

    it('should handle empty or null strings', () => {
      expect(normName('')).toBe('');
      expect(normName(null as any)).toBe('');
      expect(normName(undefined as any)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(normName('  Tampines East  ')).toBe('TAMPINES EAST');
      expect(normName('\n\tBedok North\n')).toBe('BEDOK NORTH');
    });
  });

  describe('toInt', () => {
    it('should parse valid numbers', () => {
      expect(toInt('123')).toBe(123);
      expect(toInt('456.78')).toBe(456); // floors
      expect(toInt(789)).toBe(789);
    });

    it('should handle numbers with commas', () => {
      expect(toInt('1,234')).toBe(1234);
      expect(toInt('1,234,567')).toBe(1234567);
    });

    it('should return null for invalid inputs', () => {
      expect(toInt(null)).toBeNull();
      expect(toInt(undefined)).toBeNull();
      expect(toInt('')).toBeNull();
      expect(toInt('abc')).toBeNull();
      expect(toInt('12abc')).toBeNull();
    });

    it('should floor decimal numbers', () => {
      expect(toInt(123.456)).toBe(123);
      expect(toInt('789.999')).toBe(789);
    });

    it('should handle zero', () => {
      expect(toInt(0)).toBe(0);
      expect(toInt('0')).toBe(0);
    });

    it('should reject NaN and Infinity', () => {
      expect(toInt(NaN)).toBeNull();
      expect(toInt(Infinity)).toBeNull();
      expect(toInt(-Infinity)).toBeNull();
    });
  });

  describe('normalizePopulationRow', () => {
    it('should normalize a basic row with direct fields', () => {
      const raw = {
        subzone: 'Tampines East',
        population: 15000,
        year: 2020,
      };

      const result = normalizePopulationRow(raw, 0);

      expect(result).not.toBeNull();
      expect(result?.subzone_name).toBe('Tampines East');
      expect(result?.subzone_name_norm).toBe('TAMPINES EAST');
      expect(result?.population_total).toBe(15000);
      expect(result?.year).toBe(2020);
      expect(result?.sourceKey).toContain('row_0');
    });

    it('should handle alternative field names', () => {
      const raw1 = {
        'Subzone': 'Bedok North',
        'Total Population': '22456',
        Year: 2020,
      };

      const result1 = normalizePopulationRow(raw1, 1);
      expect(result1?.subzone_name).toBe('Bedok North');
      expect(result1?.population_total).toBe(22456);

      const raw2 = {
        'Planning Area': 'Bishan',
        total: 18900,
      };

      const result2 = normalizePopulationRow(raw2, 2);
      expect(result2?.subzone_name).toBe('Bishan');
      expect(result2?.population_total).toBe(18900);
      expect(result2?.year).toBe(2020); // default
    });

    it('should sum age/sex columns if no direct population field', () => {
      const raw = {
        subzone_name: 'Ang Mo Kio',
        age_0_4: 1000,
        age_5_9: 1200,
        age_10_14: 1100,
        age_15_plus: 11700,
      };

      const result = normalizePopulationRow(raw, 3);
      expect(result?.population_total).toBe(15000); // sum of all ages
    });

    it('should skip metadata columns when summing', () => {
      const raw = {
        name: 'Test Subzone',
        area: 'Test Area', // should be skipped
        year: 2020,         // should be skipped
        male_0_4: 500,
        female_0_4: 480,
        male_5_9: 600,
        female_5_9: 590,
      };

      const result = normalizePopulationRow(raw, 4);
      expect(result?.population_total).toBe(2170); // sum of age columns only
    });

    it('should return null for rows without subzone name', () => {
      const raw1 = { population: 1000 };
      expect(normalizePopulationRow(raw1, 5)).toBeNull();

      const raw2 = { subzone: '', population: 1000 };
      expect(normalizePopulationRow(raw2, 6)).toBeNull();

      const raw3 = { subzone: null, population: 1000 };
      expect(normalizePopulationRow(raw3, 7)).toBeNull();
    });

    it('should return null for rows without valid population', () => {
      const raw1 = { subzone: 'Test' };
      expect(normalizePopulationRow(raw1, 8)).toBeNull();

      const raw2 = { subzone: 'Test', population: null };
      expect(normalizePopulationRow(raw2, 9)).toBeNull();

      const raw3 = { subzone: 'Test', population: -100 };
      expect(normalizePopulationRow(raw3, 10)).toBeNull();
    });

    it('should handle population with commas', () => {
      const raw = {
        subzone: 'Jurong East',
        population: '25,432',
        year: 2020,
      };

      const result = normalizePopulationRow(raw, 11);
      expect(result?.population_total).toBe(25432);
    });

    it('should normalize complex subzone names', () => {
      const raw = {
        subzone: "Tampines' East-Central/North",
        population: 10000,
      };

      const result = normalizePopulationRow(raw, 12);
      expect(result?.subzone_name_norm).toBe('TAMPINES EAST CENTRAL NORTH');
    });

    it('should create unique source keys per row', () => {
      const result1 = normalizePopulationRow({ subzone: 'A', population: 100 }, 0);
      const result2 = normalizePopulationRow({ subzone: 'A', population: 200 }, 1);

      expect(result1?.sourceKey).not.toBe(result2?.sourceKey);
      expect(result1?.sourceKey).toContain('row_0');
      expect(result2?.sourceKey).toContain('row_1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long subzone names', () => {
      const longName = 'A'.repeat(200);
      const result = normalizePopulationRow({ 
        subzone: longName, 
        population: 100 
      }, 0);

      expect(result?.subzone_name).toBe(longName);
      expect(result?.sourceKey.length).toBeLessThan(50); // truncated in sourceKey
    });

    it('should handle zero population (edge case)', () => {
      const raw = {
        subzone: 'Empty Subzone',
        population: 0,
      };

      // Zero population is technically valid but might indicate missing data
      const result = normalizePopulationRow(raw, 0);
      expect(result).toBeNull(); // Our implementation treats 0 as invalid
    });

    it('should handle mixed case and spacing consistently', () => {
      const name1 = 'TAMPINES   EAST';
      const name2 = 'tampines east';
      const name3 = '  Tampines  East  ';

      expect(normName(name1)).toBe(normName(name2));
      expect(normName(name2)).toBe(normName(name3));
    });
  });
});

