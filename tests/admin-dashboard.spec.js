const { test, expect } = require('@playwright/test');

test.describe('Admin Console & Operations Dashboard', () => {
  const ADMIN_PASS = 'InsightAdmin2026!';

  test.beforeEach(async ({ page }) => {
    // Clear admin session
    await page.addInitScript(() => localStorage.removeItem('insight_admin_token'));
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('Shows login screen by default and rejects invalid password', async ({ page }) => {
    await expect(page.locator('#adminLoginScreen')).toBeVisible();
    await expect(page.locator('#adminApp')).toBeHidden();

    // Test invalid password
    await page.fill('#adminPasswordInput', 'WrongPassword123');
    await page.click('#adminLoginForm button[type="submit"]');

    // Toast error check
    const toast = page.locator('.admin-toast.error, .toast-error, .toast-message');
    await expect(toast.first()).toBeVisible({ timeout: 5000 });
  });

  test('Authenticates with valid password and renders dashboard metrics', async ({ page }) => {
    await page.fill('#adminPasswordInput', ADMIN_PASS);
    await page.click('#adminLoginForm button[type="submit"]');

    // Dashboard becomes visible
    await expect(page.locator('#adminApp')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#adminLoginScreen')).toBeHidden();

    // Verify Metric Cards
    await expect(page.locator('#valTotalConversions')).toBeVisible();
    await expect(page.locator('#valDataProcessed')).toBeVisible();
    await expect(page.locator('#valMemoryHeap')).toBeVisible();

    // Verify 23 Tool switches rendered
    const toolRows = page.locator('.tool-item-row');
    await expect(toolRows).toHaveCount(23);

    // Verify Audit Log table
    await expect(page.locator('#auditLogsTable')).toBeVisible();
  });

  test('Admin maintenance operations: Purge RAM, Clean Storage, and Save Config', async ({ page }) => {
    // Authenticate
    await page.fill('#adminPasswordInput', ADMIN_PASS);
    await page.click('#adminLoginForm button[type="submit"]');
    await expect(page.locator('#adminApp')).toBeVisible();

    // Click Clear RAM
    await page.click('#btnClearRAM');
    const toastRam = page.locator('.admin-toast');
    await expect(toastRam.first()).toBeVisible({ timeout: 5000 });

    // Click Clean Storage
    await page.click('#btnCleanStorage');
    const toastStorage = page.locator('.admin-toast');
    await expect(toastStorage.first()).toBeVisible({ timeout: 5000 });

    // Update Max File Size Config
    await page.fill('#cfgMaxFileSize', '150');
    await page.fill('#cfgAnnouncement', 'Scheduled Cloud Maintenance Tonight');
    await page.click('#btnSaveConfig');
    const toastConfig = page.locator('.admin-toast');
    await expect(toastConfig.first()).toBeVisible({ timeout: 5000 });
  });
});
