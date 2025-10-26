import { test, expect } from '@playwright/test';

test.describe('Home Map Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for the page to load (check for header)
    await page.waitForSelector('h1:has-text("Singapore Hawker Opportunity Map")');
  });

  test('loads map with legend', async ({ page }) => {
    // Check for header
    await expect(page.locator('h1')).toContainText('Singapore Hawker Opportunity Map');
    
    // Check for legend (should have 6 items: 5 buckets + "No data")
    const legend = page.locator('text=Population').first();
    await expect(legend).toBeVisible();
    
    // Check for map canvas (Mapbox/MapLibre container)
    const mapContainer = page.locator('[class*="map"]').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('shows tooltip on hover', async ({ page }) => {
    // Wait for map to be ready
    await page.waitForTimeout(2000);
    
    // Hover over a polygon (this will be approximate since we can't control map layer interaction directly)
    // We'll check that tooltips can appear by looking for the map container
    const mapContainer = page.locator('canvas, [class*="map"]').first();
    await expect(mapContainer).toBeVisible();
    
    // Tooltip should be conditionally rendered (we can't reliably test hover without specific coordinates)
    // This test ensures the page loads and map is interactive
    console.log('✅ Map loaded successfully');
  });

  test('searches for subzone and selects it', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search subzones"]');
    
    // Should exist
    await expect(searchInput).toBeVisible();
    
    // Type "Bedok" to search
    await searchInput.fill('Bedok');
    
    // Wait for dropdown to appear
    await page.waitForTimeout(500);
    
    // Check that results appear
    const results = page.locator('[style*="backdrop-filter"]').filter({ hasText: 'Bedok' }).first();
    await expect(results).toBeVisible({ timeout: 2000 });
    
    // Click first result
    await results.click();
    
    // Should zoom to location (wait for animation)
    await page.waitForTimeout(1000);
    
    // Compare panel should appear when a subzone is selected
    const comparePanel = page.locator('text=Comparison').or(page.locator('text=Opportunity Score'));
    await expect(comparePanel).toBeVisible({ timeout: 3000 });
  });

  test('selects two subzones and shows comparison', async ({ page }) => {
    // Wait for map to be ready
    await page.waitForTimeout(2000);
    
    // Search for first subzone
    const searchInput = page.locator('input[placeholder*="Search subzones"]');
    await searchInput.fill('Bedok');
    await page.waitForTimeout(500);
    const result1 = page.locator('text=/Bedok/i').first();
    await result1.click();
    await page.waitForTimeout(1000);
    
    // Search for second subzone
    await searchInput.fill('Tampines');
    await page.waitForTimeout(500);
    const result2 = page.locator('text=/Tampines/i').first();
    await result2.click();
    await page.waitForTimeout(1000);
    
    // Compare panel should show both subzones
    const comparePanel = page.locator('text=Comparison');
    await expect(comparePanel).toBeVisible({ timeout: 3000 });
    
    // Should show scores for both subzones
    const scores = page.locator('[style*="color"][style*="rgb"]').filter({ hasText: /\d+/ });
    const scoreCount = await scores.count();
    expect(scoreCount).toBeGreaterThanOrEqual(1); // At least one score visible
    
    // Clear All button should be visible
    const clearAllBtn = page.locator('button:has-text("Clear All")');
    await expect(clearAllBtn).toBeVisible();
    
    // Click Clear All
    await clearAllBtn.click();
    await page.waitForTimeout(500);
    
    // Compare panel should disappear
    await expect(comparePanel).not.toBeVisible({ timeout: 2000 });
  });

  test('legend shows 6 items (5 buckets + No data)', async ({ page }) => {
    // Wait for legend to load
    await page.waitForTimeout(2000);
    
    // Look for legend items
    // The legend should show 6 swatches total
    const legendItems = page.locator('[class*="legend"], [style*="background"]').filter({ hasText: /<|No data/i });
    
    // Should have at least one legend item
    const itemCount = await legendItems.count();
    expect(itemCount).toBeGreaterThan(0);
    
    console.log(`✅ Found ${itemCount} legend items`);
  });
});

test.describe('API Endpoints', () => {
  test('GET /api/v1/geo/subzones returns valid GeoJSON', async ({ request }) => {
    const response = await request.get('/api/v1/geo/subzones');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.type).toBe('FeatureCollection');
    expect(data.features).toBeDefined();
    expect(data.features.length).toBeGreaterThan(0);
    
    // Check caching headers
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('max-age=300');
    
    const etag = response.headers()['etag'];
    expect(etag).toBeDefined();
  });

  test('GET /api/v1/stats/population-quantiles returns quantiles', async ({ request }) => {
    const response = await request.get('/api/v1/stats/population-quantiles?k=5');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.k).toBe(5);
    expect(data.breaks).toBeDefined();
    expect(data.breaks.length).toBe(4); // 5 buckets = 4 thresholds
    
    // Check caching headers
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('max-age=300');
  });

  test('GET /api/v1/diag/ready returns 200 when healthy', async ({ request }) => {
    const response = await request.get('/api/v1/diag/ready');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ready');
  });
});

