const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Organize & Layout PDF Tools', () => {
  const samplePdf = path.resolve(__dirname, 'fixtures/sample.pdf');
  const samplePdf2 = path.resolve(__dirname, 'fixtures/sample-2.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');
  });

  test('Merge PDF combines multiple PDFs in sequence', async ({ page }) => {
    await page.click('.tool-card[data-tool="merge"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Merge PDF');

    // Upload 2 files
    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles([samplePdf, samplePdf2]);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify 2 file cards rendered
    const cards = page.locator('.file-card-item');
    await expect(cards).toHaveCount(2);

    // Download combined PDF
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
    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select "Split all pages" radio
    await page.click('input[name="splitMode"][value="all"]');

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

    // Verify page thumbnail cards rendered
    const pageCards = page.locator('.page-card');
    await expect(pageCards).toHaveCount(2);

    // Rotate Page 1
    const rotateBtn = page.locator('.btn-rotate-page').first();
    await rotateBtn.click();

    // Delete Page 2
    const delBtn = page.locator('.btn-del-page').nth(1);
    await delBtn.click();
    await expect(pageCards.nth(1)).toHaveClass(/page-deleted/);

    // Download organized PDF
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

    // Select format and position
    await page.selectOption('#pnPosition', 'bottom-center');
    await page.selectOption('#pnFormat', 'page-of-total');

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
