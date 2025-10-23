/**
 * Geo-matcher utilities for matching normalized names to subzone IDs
 * Provides alias mapping and fuzzy matching capabilities
 */

import { normalizeName } from './normalize';
import { prisma } from '../../../db';

/**
 * Known aliases mapping normalized names to subzone IDs
 * TODO: Expand this map as more aliases are discovered during ingestion
 * 
 * Format: { "NORMALIZED_ALIAS": "SUBZONE_ID" }
 * Example: { "TAMPINES E": "TAMPINES_EAST" }
 */
export const ALIASES: Record<string, string> = {
  // TODO: Add aliases as they are discovered
  // Example entries:
  // "TAMPINES E": "TAMPINES_EAST",
  // "MARINE PDE": "MARINE_PARADE",
  // "PUNGGOL FLD": "PUNGGOL_FIELD",
};

/**
 * Match result type
 */
export interface MatchResult {
  subzoneId: string | null;
  matchType?: 'exact' | 'alias' | 'fuzzy';
  confidence?: number;
  reason?: string;
}

/**
 * Attempts to match a normalized name to a subzone ID
 * Uses multiple strategies in order of preference:
 * 1. Exact match on normalized subzone name
 * 2. Alias lookup
 * 3. Returns null if no match found
 */
export async function matchToSubzone(normalizedName: string): Promise<MatchResult> {
  if (!normalizedName) {
    return {
      subzoneId: null,
      reason: 'empty_name',
    };
  }

  // Strategy 1: Try exact match on normalized names from database
  const subzones = await prisma.subzone.findMany({
    select: { id: true, name: true },
  });

  for (const subzone of subzones) {
    const normalizedDbName = normalizeName(subzone.name);
    if (normalizedDbName === normalizedName) {
      return {
        subzoneId: subzone.id,
        matchType: 'exact',
        confidence: 1.0,
      };
    }
  }

  // Strategy 2: Check alias map
  if (ALIASES[normalizedName]) {
    return {
      subzoneId: ALIASES[normalizedName],
      matchType: 'alias',
      confidence: 0.9,
    };
  }

  // No match found
  return {
    subzoneId: null,
    reason: 'no_match',
  };
}

/**
 * Batch matcher for efficiency
 * Caches subzone list to avoid repeated DB queries
 */
export class SubzoneMatcher {
  private subzoneCache: Map<string, string> | null = null;

  async initialize() {
    const subzones = await prisma.subzone.findMany({
      select: { id: true, name: true },
    });

    this.subzoneCache = new Map();
    for (const subzone of subzones) {
      const normalizedName = normalizeName(subzone.name);
      this.subzoneCache.set(normalizedName, subzone.id);
    }
  }

  match(normalizedName: string): MatchResult {
    if (!this.subzoneCache) {
      throw new Error('SubzoneMatcher not initialized. Call initialize() first.');
    }

    if (!normalizedName) {
      return { subzoneId: null, reason: 'empty_name' };
    }

    // Try exact match
    if (this.subzoneCache.has(normalizedName)) {
      return {
        subzoneId: this.subzoneCache.get(normalizedName)!,
        matchType: 'exact',
        confidence: 1.0,
      };
    }

    // Try alias
    if (ALIASES[normalizedName]) {
      return {
        subzoneId: ALIASES[normalizedName],
        matchType: 'alias',
        confidence: 0.9,
      };
    }

    return { subzoneId: null, reason: 'no_match' };
  }
}

