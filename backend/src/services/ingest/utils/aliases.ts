/**
 * Alias mapping for Part B: Census 2020 Population
 * Maps Census subzone names to URA Subzone.id
 * 
 * This is a living document - add entries as unmatched names appear
 * during ingestion runs.
 * 
 * Key: Normalized Census name (uppercase, no punctuation)
 * Value: URA Subzone.id (from Part A - typically UPPER_SNAKE_CASE)
 */

export const ALIASES: Record<string, string> = {
  // Examples of common naming variations:
  // "TAMPINES E" : "TAMPINES_EAST",
  // "TAMPINES W" : "TAMPINES_WEST",
  // "JURONG EAST CENTRAL": "JURONG_EAST",
  
  // TODO: Populate this based on actual unmatched names from first ingestion run
  // Check the DatasetSnapshot.meta.unmatchedSamples after first run
  
  // Common abbreviations and variations
  // (Add entries here as they're discovered)
};

/**
 * Attempts to resolve a normalized subzone name to a Subzone.id
 * 
 * Strategy:
 * 1. Check ALIASES map first
 * 2. If not found, return null (caller will try direct name match)
 * 
 * @param normalizedName - Normalized Census subzone name
 * @returns URA Subzone.id if alias exists, null otherwise
 */
export function resolveAlias(normalizedName: string): string | null {
  return ALIASES[normalizedName] || null;
}

/**
 * Adds a new alias to the map (for runtime updates during debugging)
 * Note: This only affects the current process - to persist, update ALIASES constant
 * 
 * @param censusName - Normalized Census subzone name
 * @param uraSubzoneId - URA Subzone.id to map to
 */
export function addAlias(censusName: string, uraSubzoneId: string): void {
  ALIASES[censusName] = uraSubzoneId;
}

/**
 * Returns all currently defined aliases (for debugging/auditing)
 */
export function getAllAliases(): Record<string, string> {
  return { ...ALIASES };
}

/**
 * Returns count of defined aliases
 */
export function getAliasCount(): number {
  return Object.keys(ALIASES).length;
}

