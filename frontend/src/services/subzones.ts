/**
 * Subzones API Service
 * Typed wrappers for Task 2 backend endpoints
 */

import { apiGet } from './api';

/**
 * Subzone list item (lightweight)
 */
export type SubzoneListItem = {
  id: string;
  name: string;
  region: string;
  population: {
    total: number;
    year: number;
  } | null;
  info?: {
    missing?: string[];
  };
};

/**
 * Subzone detail (includes metrics)
 */
export type SubzoneDetail = SubzoneListItem & {
  metrics?: {
    demand?: number | null;
    supply?: number | null;
    accessibility?: number | null;
    score?: number | null;
  };
};

/**
 * GeoJSON Feature properties for map
 */
export type GeoFeatureProps = {
  id: string;
  name: string;
  region: string;
  populationTotal: number | null;
  populationYear: number | null;
  missing?: string[];
};

/**
 * GeoJSON Feature
 */
export type Feature = {
  type: 'Feature';
  id?: string | number;
  properties: GeoFeatureProps;
  geometry: any;
};

/**
 * GeoJSON FeatureCollection
 */
export type FeatureCollection = {
  type: 'FeatureCollection';
  features: Feature[];
};

/**
 * Batch response (may include notFound)
 */
export type BatchResponse = {
  data?: SubzoneDetail[];
  notFound?: string[];
} | SubzoneDetail[];

/**
 * Subzone API endpoints
 */
export const SubzoneAPI = {
  /**
   * Get all available regions
   */
  getAllRegions: async (): Promise<string[]> => {
    // Return the available regions from the Region enum
    return ['CENTRAL', 'EAST', 'NORTH', 'NORTH_EAST', 'WEST'];
  },

  /**
   * Get GeoJSON FeatureCollection for map rendering
   */
  geo: (region?: string): Promise<FeatureCollection> => {
    const query = region ? `?region=${encodeURIComponent(region)}` : '';
    return apiGet<FeatureCollection>(`/v1/geo/subzones${query}`);
  },

  /**
   * Get single subzone details
   */
  detail: (id: string): Promise<SubzoneDetail> => {
    return apiGet<SubzoneDetail>(`/v1/subzones/${encodeURIComponent(id)}`);
  },

  /**
   * Get multiple subzones for comparison (2-8 IDs)
   */
  batch: async (ids: string[]): Promise<SubzoneDetail[]> => {
    const idsParam = encodeURIComponent(ids.join(','));
    const response = await apiGet<BatchResponse>(`/v1/subzones:batch?ids=${idsParam}`);
    
    // Handle both response formats
    if (Array.isArray(response)) {
      return response;
    }
    
    return response.data || [];
  },

  /**
   * List subzones with optional filters
   */
  list: (params?: {
    region?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<SubzoneListItem[]> => {
    const query = new URLSearchParams();
    if (params?.region) query.set('region', params.region);
    if (params?.q) query.set('q', params.q);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    
    const queryString = query.toString();
    return apiGet<SubzoneListItem[]>(`/v1/subzones${queryString ? `?${queryString}` : ''}`);
  },
};

