/**
 * GeoJSON Service Integration Tests
 * Task D-3: Verify mrtExitCount and busStopCount enrichment
 */

import prisma from '../../../db';
import { getEnrichedGeoJSON } from '../geojson.service';

describe('GeoJSON Enrichment with Transit Counts (Task D-3)', () => {
  it('should include mrtExitCount and busStopCount in enriched GeoJSON', async () => {
    // Execute
    const result = await getEnrichedGeoJSON();

    // Verify structure
    expect(result).toBeTruthy();
    expect(result?.type).toBe('FeatureCollection');
    expect(Array.isArray(result?.features)).toBe(true);
    expect(result?.features.length).toBeGreaterThan(0);

    // Check that features have the required properties
    const firstFeature = result?.features[0];
    expect(firstFeature?.properties).toHaveProperty('id');
    expect(firstFeature?.properties).toHaveProperty('name');
    expect(firstFeature?.properties).toHaveProperty('region');
    expect(firstFeature?.properties).toHaveProperty('mrtExitCount');
    expect(firstFeature?.properties).toHaveProperty('busStopCount');
    expect(firstFeature?.properties).toHaveProperty('hawkerCount');

    // Verify mrtExitCount is a number
    expect(typeof firstFeature?.properties.mrtExitCount).toBe('number');
    expect(firstFeature?.properties.mrtExitCount).toBeGreaterThanOrEqual(0);

    // Verify busStopCount is a number
    expect(typeof firstFeature?.properties.busStopCount).toBe('number');
    expect(firstFeature?.properties.busStopCount).toBeGreaterThanOrEqual(0);
  });

  it('should have some subzones with MRT exits', async () => {
    const result = await getEnrichedGeoJSON();

    const withMRT = result?.features.filter(
      (f: any) => f.properties.mrtExitCount > 0
    );

    expect(withMRT?.length).toBeGreaterThan(0);
  });

  it('should have some subzones with bus stops', async () => {
    const result = await getEnrichedGeoJSON();

    const withBus = result?.features.filter(
      (f: any) => f.properties.busStopCount > 0
    );

    expect(withBus?.length).toBeGreaterThan(0);
  });

  it('should correctly map counts to subzone IDs', async () => {
    const result = await getEnrichedGeoJSON();

    // Get a sample subzone
    const sampleFeature = result?.features.find(
      (f: any) => f.properties.mrtExitCount > 0 || f.properties.busStopCount > 0
    );

    if (!sampleFeature) {
      console.log('No sample feature found with transit data');
      return;
    }

    const subzoneId = sampleFeature.properties.id;

    // Verify count matches database
    const mrtCountInDB = await prisma.mRTExit.count({
      where: { subzoneId },
    });

    const busCountInDB = await prisma.busStop.count({
      where: { subzoneId },
    });

    expect(sampleFeature.properties.mrtExitCount).toBe(mrtCountInDB);
    expect(sampleFeature.properties.busStopCount).toBe(busCountInDB);
  });
});
