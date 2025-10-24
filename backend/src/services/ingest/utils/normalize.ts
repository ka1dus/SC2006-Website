/**
 * Normalization utilities for Part B: Census 2020 Population
 * Handles case-insensitivity, punctuation, spacing, and common variations
 * per PART B specification
 */

/**
 * Normalizes a subzone name for matching according to Part B spec:
 * - NFKD normalization
 * - Remove quotes/apostrophes
 * - Replace hyphens/slashes with spaces
 * - Collapse multiple spaces
 * - Trim and uppercase
 */
export function normName(s: string): string {
  if (!s) return '';

  return s
    .normalize("NFKD")                    // Unicode normalization
    .replace(/['''`]/g, "")               // Remove quotes/apostrophes
    .replace(/[-/]/g, " ")                // Hyphens/slashes → space
    .replace(/\s+/g, " ")                 // Collapse spaces
    .trim()
    .toUpperCase();
}

/**
 * Safely converts a value to an integer
 * Returns null if conversion fails (per Part B spec)
 */
export function toInt(x: unknown): number | null {
  if (x === null || x === undefined || x === '') {
    return null;
  }

  // Handle string numbers with commas
  if (typeof x === 'string') {
    x = x.replace(/,/g, '');
  }

  const num = Number(x);
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return Math.floor(num);
}

/**
 * Normalized row from Census 2020 population data
 * Fields per Part B spec
 */
export interface NormalizedPopulationRow {
  subzone_name: string;           // Original raw name from CSV
  subzone_name_norm: string;      // Normalized name for matching
  year: number;                   // Census year (e.g., 2020)
  population_total: number;       // Total resident population
  sourceKey: string;              // Unique identifier from source (for unmatched tracking)
}

/**
 * Normalizes a row from the Census 2020 population dataset
 * Handles both wide and long formats
 * 
 * Expected input fields (flexible):
 * - subzone, subzone_name, area, name, planning_area
 * - population, total, population_total, residents
 * - year (optional, defaults to 2020)
 * 
 * If multiple age/sex columns exist, sums them
 */
export function normalizePopulationRow(raw: any, rowIndex: number = 0): NormalizedPopulationRow | null {
  // Extract subzone name from various possible field names
  const subzoneName = 
    raw.Number ||           // Census 2020 format: "Number" column contains subzone names
    raw.number ||
    raw.subzone || 
    raw.subzone_name || 
    raw['Subzone'] ||
    raw['Planning Area'] ||
    raw.area || 
    raw.name ||
    raw.location ||
    '';

  if (!subzoneName || typeof subzoneName !== 'string') {
    return null;
  }

  // Skip header rows and totals
  if (subzoneName.toLowerCase() === 'number' || 
      subzoneName.toLowerCase() === 'total' ||
      subzoneName.trim() === '') {
    return null;
  }

  // Clean up subzone name - remove " - Total" suffix if present
  const cleanedSubzoneName = subzoneName.replace(/ - Total$/i, '').trim();

  // Extract year (default to 2020 for Census 2020)
  const year = toInt(raw.year || raw.Year || 2020) || 2020;

  // Extract population - try direct fields first
  let populationTotal = toInt(
    raw.Total_Total ||      // Census 2020 format: "Total_Total" column
    raw.total_total ||
    raw.population || 
    raw.total || 
    raw.population_total ||
    raw['Total Population'] ||
    raw.residents ||
    raw.count
  );

  // If no direct population field, try summing age/sex columns
  if (populationTotal === null) {
    const keys = Object.keys(raw);
    let sum = 0;
    let hasNumericColumns = false;

    for (const key of keys) {
      // Skip metadata columns
      if (['subzone', 'subzone_name', 'area', 'name', 'year', 'planning_area'].some(skip => 
        key.toLowerCase().includes(skip.toLowerCase())
      )) {
        continue;
      }

      const val = toInt(raw[key]);
      if (val !== null && val > 0) {
        sum += val;
        hasNumericColumns = true;
      }
    }

    if (hasNumericColumns) {
      populationTotal = sum;
    }
  }

  if (populationTotal === null || populationTotal < 0) {
    return null;
  }

  // Create unique source key for tracking unmatched
  const sourceKey = `row_${rowIndex}_${cleanedSubzoneName.slice(0, 30)}`;

  return {
    subzone_name: cleanedSubzoneName,
    subzone_name_norm: normName(cleanedSubzoneName),
    year,
    population_total: populationTotal,
    sourceKey,
  };
}

/**
 * Legacy export for backward compatibility
 * (keeping old name as alias)
 */
export const normalizeName = normName;
export const toIntSafe = toInt;

export interface NormalizedRow {
  sourceKey: string;
  rawName: string;
  normalizedName: string;
  populationTotal: number | null;
  year: number | null;
}

/**
 * Legacy normalizer (for backward compatibility)
 */
export function normalizePopulationRowLegacy(raw: any): NormalizedRow {
  const rawName = raw.name || raw.subzone || raw.area || raw.location || '';
  
  return {
    sourceKey: raw.id || raw.code || rawName,
    rawName: rawName.trim(),
    normalizedName: normName(rawName),
    populationTotal: toInt(raw.population || raw.total || raw.count),
    year: toInt(raw.year || 2020),
  };
}
