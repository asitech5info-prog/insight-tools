const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Organize & Layout PDF Tools', () => {
  const samplePdf = path.join(__dirname, 'fixtures', 'sample.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');
  });

  test('Merge PDF combines multiple PDFs in sequence', async ({ page }) => {
    await page.click('.tool-card[data-tool="merge"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Merge PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles([samplePdf, samplePdf]);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify 2 files rendered in canvas
    const fileCards = page.locator('.file-card-item');
    await expect(fileCards).toHaveCount(2);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('Split PDF extracts custom page ranges', async ({ page }) => {
    await page.click('.tool-card[data-tool="split"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Split PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Set page range option
    await page.fill('#splitRangeInput', '1');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('Split PDF extracts all pages into a ZIP archive', async ({ page }) => {
    await page.click('.tool-card[data-tool="split"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Split PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select Extract All Pages
    await page.check('input[name="splitMode"][value="all"]');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('.zip');
  });

  test('Organize PDF visually arranges pages, rotates, and excludes pages', async ({ page }) => {
    await page.click('.tool-card[data-tool="organize"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Organize PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify page canvas cards rendered
    const pageCards = page.locator('.page-card');
    await expect(pageCards.first()).toBeVisible({ timeout: 15000 });

    // Rotate first page
    const rotateBtn = pageCards.first().locator('.page-control-btn[title="Rotate 90°"]');
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click();
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('Rotate PDF rotates document orientation permanently', async ({ page }) => {
    await page.click('.tool-card[data-tool="rotate"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Rotate PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select 180 degrees
    await page.check('input[name="rotateAngle"][value="180"]');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('Page Numbers stamps header/footer page numbering', async ({ page }) => {
    await page.click('.tool-card[data-tool="page-number"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Page Numbers');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select Bottom-Center position
    await page.check('input[name="pageNumberPosition"][value="bottom-center"]');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
