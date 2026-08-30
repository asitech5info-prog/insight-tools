const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('MS Office Suite Tools', () => {
  const sampleDocx = path.resolve(__dirname, 'fixtures/sample.docx');
  const sampleXlsx = path.resolve(__dirname, 'fixtures/sample.xlsx');
  const samplePptx = path.resolve(__dirname, 'fixtures/sample.pptx');
  const samplePdf = path.resolve(__dirname, 'fixtures/sample.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');
  });

  test('Word to PDF converts .docx document and triggers download', async ({ page }) => {
    await page.click('.tool-card[data-tool="word-to-pdf"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Word to PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(sampleDocx);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify option controls
    await expect(page.locator('#w2pPageSize')).toBeVisible();
    await expect(page.locator('#w2pFont')).toBeVisible();
    await expect(page.locator('#w2pFilename')).toHaveValue('converted_document.pdf');

    // Trigger download verification
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

  test('PDF to Word converts .pdf to editable .docx and triggers download', async ({ page }) => {
    await page.click('.tool-card[data-tool="pdf-to-word"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('PDF to Word');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('.docx');
  });

  test('Excel to PDF converts .xlsx spreadsheet and triggers download', async ({ page }) => {
    await page.click('.tool-card[data-tool="excel-to-pdf"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Excel to PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(sampleXlsx);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify orientation & grid style
    await expect(page.locator('#e2pOrientation')).toBeVisible();
    await expect(page.locator('#e2pGridStyle')).toBeVisible();

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

  test('PDF to Excel extracts table data into .xlsx spreadsheet', async ({ page }) => {
    await page.click('.tool-card[data-tool="pdf-to-excel"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('PDF to Excel');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('PowerPoint to PDF converts .pptx presentation to landscape slides PDF', async ({ page }) => {
    await page.click('.tool-card[data-tool="ppt-to-pdf"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('PowerPoint to PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePptx);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify Slide theme options
    await expect(page.locator('#p2pTheme')).toBeVisible();

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
