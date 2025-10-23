/**
 * Diagnostics Service Tests
 * Task DIAG-ENDTOEND
 */

import { getSystemStatus } from '../diag.service';
import prisma from '../../db';
import * as geoService from '../geo/geojson.service';

// Mock Prisma
jest.mock('../../db', () => ({
  __esModule: true,
  default: {
    subzone: {
      count: jest.fn(),
    },
    population: {
      count: jest.fn(),
    },
    populationUnmatched: {
      count: jest.fn(),
    },
  },
}));

// Mock geo service
jest.mock('../geo/geojson.service');

describe('Diagnostics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemStatus', () => {
    it('should return comprehensive system status', async () => {
      // Mock DB counts
      (prisma.subzone.count as jest.Mock).mockResolvedValue(5);
      (prisma.population.count as jest.Mock).mockResolvedValue(5);
      (prisma.populationUnmatched.count as jest.Mock).mockResolvedValue(0);

      // Mock GeoJSON
      const mockGeoJSON = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            id: 'TAMPINES_EAST',
            properties: { id: 'TAMPINES_EAST', name: 'Tampines East' },
            geometry: { type: 'Polygon' as const, coordinates: [] },
          },
          {
            type: 'Feature' as const,
            id: 'MARINE_PARADE',
            properties: { id: 'MARINE_PARADE', name: 'Marine Parade' },
            geometry: { type: 'Polygon' as const, coordinates: [] },
          },
        ],
      };

      (geoService.loadBaseGeoJSON as jest.Mock).mockResolvedValue(mockGeoJSON);
      (geoService.enrichWithPopulation as jest.Mock).mockResolvedValue(mockGeoJSON);

      // Execute
      const status = await getSystemStatus();

      // Verify
      expect(status).toEqual({
        subzones: 5,
        populations: 5,
        unmatched: 0,
        geo: {
          ok: true,
          features: 2,
          sampleIds: ['TAMPINES_EAST', 'MARINE_PARADE'],
        },
      });
    });

    it('should handle GeoJSON load failure', async () => {
      // Mock DB counts
      (prisma.subzone.count as jest.Mock).mockResolvedValue(5);
      (prisma.population.count as jest.Mock).mockResolvedValue(5);
      (prisma.populationUnmatched.count as jest.Mock).mockResolvedValue(0);

      // Mock GeoJSON failure
      (geoService.loadBaseGeoJSON as jest.Mock).mockResolvedValue(null);

      // Execute
      const status = await getSystemStatus();

      // Verify
      expect(status.geo.ok).toBe(false);
      expect(status.geo.features).toBe(0);
      expect(status.geo.error).toBe('Failed to load GeoJSON from DB or fallback file');
    });

    it('should handle GeoJSON error', async () => {
      // Mock DB counts
      (prisma.subzone.count as jest.Mock).mockResolvedValue(5);
      (prisma.population.count as jest.Mock).mockResolvedValue(5);
      (prisma.populationUnmatched.count as jest.Mock).mockResolvedValue(0);

      // Mock GeoJSON error
      (geoService.loadBaseGeoJSON as jest.Mock).mockRejectedValue(new Error('File not found'));

      // Execute
      const status = await getSystemStatus();

      // Verify
      expect(status.geo.ok).toBe(false);
      expect(status.geo.features).toBe(0);
      expect(status.geo.error).toBe('File not found');
    });

    it('should return sample IDs limited to 5', async () => {
      // Mock DB counts
      (prisma.subzone.count as jest.Mock).mockResolvedValue(10);
      (prisma.population.count as jest.Mock).mockResolvedValue(10);
      (prisma.populationUnmatched.count as jest.Mock).mockResolvedValue(0);

      // Mock GeoJSON with 10 features
      const features = Array.from({ length: 10 }, (_, i) => ({
        type: 'Feature' as const,
        id: `SUBZONE_${i}`,
        properties: { id: `SUBZONE_${i}`, name: `Subzone ${i}` },
        geometry: { type: 'Polygon' as const, coordinates: [] },
      }));

      const mockGeoJSON = { type: 'FeatureCollection' as const, features };

      (geoService.loadBaseGeoJSON as jest.Mock).mockResolvedValue(mockGeoJSON);
      (geoService.enrichWithPopulation as jest.Mock).mockResolvedValue(mockGeoJSON);

      // Execute
      const status = await getSystemStatus();

      // Verify
      expect(status.geo.features).toBe(10);
      expect(status.geo.sampleIds).toHaveLength(5);
      expect(status.geo.sampleIds).toEqual([
        'SUBZONE_0',
        'SUBZONE_1',
        'SUBZONE_2',
        'SUBZONE_3',
        'SUBZONE_4',
      ]);
    });
  });
});

