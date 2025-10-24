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
  // Part B.1: Common subzone name quirks discovered from Census 2020 data
  
  // Town centres and place names
  "BOON LAY PLACE": "BOON_LAY_PLACE",
  "BEDOK TOWN CENTRE": "BEDOK_TOWN_CENTRE",
  "CHOA CHU KANG CENTRAL": "CHOA_CHU_KANG_CENTRAL",
  "JURONG EAST CENTRAL": "JURONG_EAST_CENTRAL",
  "TAMPINES EAST": "TAMPINES_EAST",
  "TAMPINES WEST": "TAMPINES_WEST",
  "TAMPINES NORTH": "TAMPINES_NORTH",
  "WOODLANDS EAST": "WOODLANDS_EAST",
  "WOODLANDS WEST": "WOODLANDS_WEST",
  
  // Ang Mo Kio variations
  "ANG MO KIO TOWN CENTRE": "ANG_MO_KIO_TOWN_CENTRE",
  
  // Bedok variations
  "BEDOK NORTH": "BEDOK_NORTH",
  "BEDOK SOUTH": "BEDOK_SOUTH",
  
  // Bukit variations
  "BUKIT BATOK CENTRAL": "BUKIT_BATOK_CENTRAL",
  "BUKIT BATOK EAST": "BUKIT_BATOK_EAST",
  "BUKIT BATOK WEST": "BUKIT_BATOK_WEST",
  "BUKIT PANJANG RING ROAD": "BUKIT_PANJANG_RING_ROAD",
  "BUKIT TIMAH": "BUKIT_TIMAH",
  
  // Clementi variations
  "CLEMENTI CENTRAL": "CLEMENTI_CENTRAL",
  "CLEMENTI NORTH": "CLEMENTI_NORTH",
  "CLEMENTI WEST": "CLEMENTI_WEST",
  
  // Hougang variations
  "HOUGANG CENTRAL": "HOUGANG_CENTRAL",
  "HOUGANG EAST": "HOUGANG_EAST",
  "HOUGANG WEST": "HOUGANG_WEST",
  
  // Jurong variations
  "JURONG WEST CENTRAL": "JURONG_WEST_CENTRAL",
  
  // Marine Parade variations
  "MARINE PARADE": "MARINE_PARADE",
  
  // Pasir Ris variations
  "PASIR RIS CENTRAL": "PASIR_RIS_CENTRAL",
  "PASIR RIS EAST": "PASIR_RIS_EAST",
  "PASIR RIS WEST": "PASIR_RIS_WEST",
  
  // Punggol variations
  "PUNGGOL FIELD": "PUNGGOL_FIELD",
  "PUNGGOL TOWN CENTRE": "PUNGGOL_TOWN_CENTRE",
  
  // Sengkang variations
  "SENGKANG CENTRAL": "SENGKANG_CENTRAL",
  "SENGKANG EAST": "SENGKANG_EAST",
  "SENGKANG WEST": "SENGKANG_WEST",
  
  // Serangoon variations
  "SERANGOON CENTRAL": "SERANGOON_CENTRAL",
  "SERANGOON NORTH": "SERANGOON_NORTH",
  
  // Toa Payoh variations
  "TOA PAYOH CENTRAL": "TOA_PAYOH_CENTRAL",
  "TOA PAYOH EAST": "TOA_PAYOH_EAST",
  "TOA PAYOH WEST": "TOA_PAYOH_WEST",
  
  // Yishun variations
  "YISHUN CENTRAL": "YISHUN_CENTRAL",
  "YISHUN EAST": "YISHUN_EAST",
  "YISHUN WEST": "YISHUN_WEST",
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

