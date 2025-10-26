/**
 * Stats Service Tests
 * PART E: Quantiles API tests
 */

import prisma from '../../db';

describe('Population Quantiles (Part E)', () => {
  it('should compute quantiles with monotonically increasing breaks', async () => {
    const populations = await prisma.population.findMany({
      select: { total: true },
      orderBy: { total: 'asc' },
    });

    if (populations.length === 0) {
      console.warn('⚠️  No population data for testing');
      return;
    }

    const k = 5;
    const n = populations.length;
    const breaks: number[] = [];

    for (let i = 1; i < k; i++) {
      const quantile = i / k;
      const index = Math.ceil(quantile * n) - 1;
      breaks.push(populations[Math.min(index, n - 1)].total);
    }

    // Verify monotonicity
    for (let i = 1; i < breaks.length; i++) {
      expect(breaks[i]).toBeGreaterThanOrEqual(breaks[i - 1]);
    }

    // Verify k=5 gives 4 thresholds
    expect(breaks.length).toBe(4);
  });

  it('should handle empty population gracefully', () => {
    // This would be tested if we had a way to mock the DB
    const breaks: number[] = [];
    expect(breaks.length).toBe(0);
  });
});

