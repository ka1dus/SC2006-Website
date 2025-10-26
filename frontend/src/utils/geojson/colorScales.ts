/**
 * Color Scales for Map Visualization
 * Computes quantiles and generates Mapbox expression for choropleth
 */

import type { Feature } from '@/services/subzones';

/**
 * Compute quantile breaks from feature population data
 */
export function computeQuantiles(
  features: Feature[],
  numBuckets: number = 5
): number[] {
  // Extract population values (filter out nulls)
  const values = features
    .map((f) => f.properties.populationTotal)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return [];
  }

  const breaks: number[] = [];
  for (let i = 1; i < numBuckets; i++) {
    const index = Math.floor((i / numBuckets) * values.length);
    breaks.push(values[index]);
  }

  return breaks;
}

/**
 * Color palette for population (light to dark)
 */
export const POPULATION_COLORS = [
  '#f0f9ff', // Lightest blue (lowest population)
  '#bae6fd',
  '#7dd3fc',
  '#38bdf8',
  '#0284c7', // Darkest blue (highest population)
];

/**
 * Color for missing data
 */
export const MISSING_DATA_COLOR = '#f3f4f6'; // Light gray

/**
 * Color for selected features
 */
export const SELECTED_COLOR = '#06b6d4'; // Neon cyan

/**
 * Generate Mapbox expression for fill color based on population quantiles
 * PART E: Uses API breaks [b0, b1, b2, b3] for 5 buckets
 */
export function generateFillColorExpression(breaks: number[]): any[] {
  if (breaks.length === 0) {
    return ['case', ['==', ['get', 'populationTotal'], null], MISSING_DATA_COLOR, POPULATION_COLORS[2]];
  }

  // Helper: coerce populationTotal to number, defaulting to -999999 for missing data
  const popNum = ['coalesce', ['to-number', ['get', 'populationTotal']], -999999];

  const [b0, b1, b2, b3] = breaks;
  
  const expression: any[] = [
    'case',
    // No data -> light gray
    ['==', popNum, -999999], '#E5E7EB',
    
    // Bucket 1: < b0 (lightest)
    ['<', popNum, b0 ?? 0], '#EFF6FF',
    
    // Bucket 2: b0 <= value < b1
    ['<', popNum, b1 ?? (b0 ?? 0)], '#BFDBFE',
    
    // Bucket 3: b1 <= value < b2
    ['<', popNum, b2 ?? (b1 ?? 0)], '#93C5FD',
    
    // Bucket 4: b2 <= value < b3
    ['<', popNum, b3 ?? (b2 ?? 0)], '#60A5FA',
    
    // Bucket 5: >= b3 (darkest)
    '#3B82F6'
  ];

  return expression;
}

/**
 * Format population number with commas
 */
export function formatPopulation(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString();
}

/**
 * Calculate which bucket index a population value belongs to (Task G)
 * @param breaks Array of 4 thresholds [b0, b1, b2, b3] for 5 buckets
 * @param v Population value (or null for no data)
 * @returns Bucket index 0-4, or -1 for no data
 */
export function bucketIndex(breaks: number[], v: number | null): number {
  if (v === null) return -1; // No data
  if (breaks.length < 4) return 0; // Fallback if breaks not ready
  
  const [b0, b1, b2, b3] = breaks;
  
  if (v < b0) return 0;      // Bucket 1: < b0
  if (v < b1) return 1;     // Bucket 2: b0 <= v < b1
  if (v < b2) return 2;     // Bucket 3: b1 <= v < b2
  if (v < b3) return 3;     // Bucket 4: b2 <= v < b3
  return 4;                  // Bucket 5: >= b3
}

/**
 * Get legend items for display (Part E: uses API breaks)
 */
export function getLegendItems(breaks: number[]): Array<{ color: string; label: string }> {
  if (breaks.length === 0) {
    return [
      { color: '#3B82F6', label: 'Population' },
      { color: MISSING_DATA_COLOR, label: 'No data' },
    ];
  }

  // PART E: 5 color buckets from breaks array [b0, b1, b2, b3]
  const colors = ['#EFF6FF', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6'];
  const items: Array<{ color: string; label: string }> = [];

  // Bucket 1: < b0
  items.push({
    color: colors[0],
    label: `< ${formatPopulation(breaks[0])}`,
  });

  // Bucket 2: b0 to b1
  items.push({
    color: colors[1],
    label: `${formatPopulation(breaks[0])} - ${formatPopulation(breaks[1])}`,
  });

  // Bucket 3: b1 to b2
  items.push({
    color: colors[2],
    label: `${formatPopulation(breaks[1])} - ${formatPopulation(breaks[2])}`,
  });

  // Bucket 4: b2 to b3
  items.push({
    color: colors[3],
    label: `${formatPopulation(breaks[2])} - ${formatPopulation(breaks[3])}`,
  });

  // Bucket 5: >= b3
  items.push({
    color: colors[4],
    label: `> ${formatPopulation(breaks[3])}`,
  });

  // Missing data
  items.push({
    color: MISSING_DATA_COLOR,
    label: 'No data',
  });

  return items;
}

