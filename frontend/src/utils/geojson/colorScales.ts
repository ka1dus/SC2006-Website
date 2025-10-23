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
 */
export function generateFillColorExpression(breaks: number[]): any[] {
  if (breaks.length === 0) {
    return ['case', ['==', ['get', 'populationTotal'], null], MISSING_DATA_COLOR, POPULATION_COLORS[2]];
  }

  const expression: any[] = ['case'];

  // Handle missing data first
  expression.push(['==', ['get', 'populationTotal'], null], MISSING_DATA_COLOR);

  // Add quantile steps
  for (let i = 0; i < breaks.length; i++) {
    expression.push(['<', ['get', 'populationTotal'], breaks[i]], POPULATION_COLORS[i]);
  }

  // Default to highest color
  expression.push(POPULATION_COLORS[POPULATION_COLORS.length - 1]);

  return expression;
}

/**
 * Format population number with commas
 */
export function formatPopulation(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString();
}

/**
 * Get legend items for display
 */
export function getLegendItems(breaks: number[]): Array<{ color: string; label: string }> {
  if (breaks.length === 0) {
    return [
      { color: POPULATION_COLORS[2], label: 'Population' },
      { color: MISSING_DATA_COLOR, label: 'No data' },
    ];
  }

  const items: Array<{ color: string; label: string }> = [];

  // First bucket
  items.push({
    color: POPULATION_COLORS[0],
    label: `< ${formatPopulation(breaks[0])}`,
  });

  // Middle buckets
  for (let i = 0; i < breaks.length - 1; i++) {
    items.push({
      color: POPULATION_COLORS[i + 1],
      label: `${formatPopulation(breaks[i])} - ${formatPopulation(breaks[i + 1])}`,
    });
  }

  // Last bucket
  items.push({
    color: POPULATION_COLORS[POPULATION_COLORS.length - 1],
    label: `> ${formatPopulation(breaks[breaks.length - 1])}`,
  });

  // Missing data
  items.push({
    color: MISSING_DATA_COLOR,
    label: 'No data',
  });

  return items;
}

