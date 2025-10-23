/**
 * Normalization utilities for matching population dataset to subzones
 * Handles case-insensitivity, punctuation, spacing, and common variations
 */

/**
 * Normalizes a subzone name for matching
 * - Converts to uppercase
 * - Trims whitespace
 * - Collapses multiple spaces to single space
 * - Removes punctuation except hyphens
 * - Removes "SUBZONE" suffix
 * - Handles hyphens vs spaces consistently
 */
export function normalizeName(name: string): string {
  if (!name) return '';

  return name
    .toUpperCase()
    .trim()
    // Remove "SUBZONE" suffix (case-insensitive)
    .replace(/\s+SUBZONE$/i, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Remove most punctuation but keep hyphens
    .replace(/[^\w\s-]/g, '')
    // Normalize hyphens to spaces for consistent matching
    .replace(/-/g, ' ')
    // Final cleanup: collapse spaces again
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely converts a value to an integer
 * Returns null if conversion fails
 */
export function toIntSafe(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Handle string numbers with commas
  if (typeof value === 'string') {
    value = value.replace(/,/g, '');
  }

  const num = Number(value);
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return Math.floor(num);
}

/**
 * Normalizes a row from the population dataset
 */
export interface NormalizedRow {
  sourceKey: string;
  rawName: string;
  normalizedName: string;
  populationTotal: number | null;
  year: number | null;
}

export function normalizePopulationRow(raw: any): NormalizedRow {
  const rawName = raw.name || raw.subzone || raw.area || raw.location || '';
  
  return {
    sourceKey: raw.id || raw.code || rawName,
    rawName: rawName.trim(),
    normalizedName: normalizeName(rawName),
    populationTotal: toIntSafe(raw.population || raw.total || raw.count),
    year: toIntSafe(raw.year || new Date().getFullYear()),
  };
}

