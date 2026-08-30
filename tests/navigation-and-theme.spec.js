const { test, expect } = require('@playwright/test');

test.describe('Navigation, Search, Filters & Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');
  });

  test('Homepage renders all 23 tools and branding correctly', async ({ page }) => {
    // Check Brand Title & Subtitle
    await expect(page.locator('.navbar .brand-text')).toContainText('Insight');
    await expect(page.locator('.hero-title')).toBeVisible();

    // Verify 23 Tool Cards rendered
    const toolCards = page.locator('.tool-card');
    await expect(toolCards).toHaveCount(23);

    // Verify Hero Stats & Badges
    const stats = page.locator('.stat-item');
    await expect(stats).toHaveCount(3);

    // Verify Footer categories & links
    const footerColumns = page.locator('.footer-col');
    await expect(footerColumns).toHaveCount(3);
    const footerToolLinks = page.locator('.footer-col .tool-link');
    expect(await footerToolLinks.count()).toBeGreaterThanOrEqual(18);
  });

  test('Theme toggle switches between light and dark modes', async ({ page }) => {
    const html = page.locator('html');
    
    // Initial state check
    const initialTheme = await html.getAttribute('data-theme');
    
    // Toggle Theme
    await page.click('#themeToggleBtn');
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);

    // Toggle Back
    await page.click('#themeToggleBtn');
    const restoredTheme = await html.getAttribute('data-theme');
    expect(restoredTheme).toBe(initialTheme);
  });

  test('Tool search filters cards dynamically', async ({ page }) => {
    const searchInput = page.locator('#toolSearchInput');
    const toolCards = page.locator('.tool-card');

    // Search for "Word"
    await searchInput.fill('Word');
    const visibleCards = page.locator('.tool-card:visible');
    const count = await visibleCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Search for non-existent tool
    await searchInput.fill('xyznonexistenttool999');
    await expect(page.locator('.tool-card:visible')).toHaveCount(0);

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('.tool-card:visible')).toHaveCount(23);
  });

  test('Category filter tabs filter tools accurately', async ({ page }) => {
    // Office Tab
    await page.click('.filter-tab-btn[data-category="office"]');
    let visible = page.locator('.tool-card:visible');
    await expect(visible).toHaveCount(5);

    // Organize Tab
    await page.click('.filter-tab-btn[data-category="organize"]');
    visible = page.locator('.tool-card:visible');
    await expect(visible).toHaveCount(5);

    // Convert Tab
    await page.click('.filter-tab-btn[data-category="convert"]');
    visible = page.locator('.tool-card:visible');
    await expect(visible).toHaveCount(6);

    // Security Tab
    await page.click('.filter-tab-btn[data-category="security"]');
    visible = page.locator('.tool-card:visible');
    await expect(visible).toHaveCount(7);

    // Reset to All
    await page.click('.filter-tab-btn[data-category="all"]');
    visible = page.locator('.tool-card:visible');
    await expect(visible).toHaveCount(23);
  });

  test('Hash routing opens workspace and back to home functions properly', async ({ page }) => {
    // Navigate via hash
    await page.goto('/#/merge');
    await expect(page.locator('#workspaceSection')).toHaveClass(/active/);
    await expect(page.locator('#wsToolTitle')).toHaveText('Merge PDF');
    await expect(page.locator('#homeView')).toBeHidden();

    // Click Back to Tools
    await page.click('#btnBackToHome');
    await expect(page.locator('#homeView')).toBeVisible();
    await expect(page.locator('#workspaceSection')).not.toHaveClass(/active/);
  });
});
