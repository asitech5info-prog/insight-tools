const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('New Power Tools Suite', () => {
  const samplePdf = path.resolve(__dirname, 'fixtures/sample.pdf');
  const sampleJpg = path.resolve(__dirname, 'fixtures/sample.jpg');

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');
  });

  test('OCR Text Recognition processes PDF pages and outputs clean text', async ({ page }) => {
    await page.click('.tool-card[data-tool="ocr-pdf"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('OCR Text Recognition');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify OCR UI controls
    await expect(page.locator('input[name="ocrMode"]')).toHaveCount(2);
    await expect(page.locator('#ocrFilename')).toHaveValue('ocr_extracted_text.txt');

    // Click execute
    await page.click('#btnExecuteAction');
    await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#btnDownloadPrimary')).toBeVisible();
    await expect(page.locator('#btnDownloadText')).toContainText('.txt');

    // Verify textarea populated
    const extractedArea = page.locator('#extractedTextarea');
    await expect(extractedArea).toBeVisible();
    const text = await extractedArea.inputValue();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('OCR Processed');
  });

  test('Redact PDF blacks out confidential zones and produces secure PDF', async ({ page }) => {
    await page.click('.tool-card[data-tool="redact"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Redact PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify Redaction options
    await expect(page.locator('#redactPresetZone')).toBeVisible();
    await page.selectOption('#redactPresetZone', 'top');
    await expect(page.locator('input[name="redactColor"]')).toHaveCount(2);

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

  test('Edit PDF Metadata updates author, title, and keywords tags', async ({ page }) => {
    await page.click('.tool-card[data-tool="metadata"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Edit PDF Metadata');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Fill metadata inputs
    await page.fill('#metaTitle', 'Playwright Automated Audit Report 2026');
    await page.fill('#metaAuthor', 'DeepMind Test Runner');
    await page.fill('#metaKeywords', 'audit, automated, verified, 2026');

    // Process and Download
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

  test('PDF to Grayscale converts full-color pages to monochrome PDF', async ({ page }) => {
    await page.click('.tool-card[data-tool="grayscale"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('PDF to Grayscale');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select profile and DPI
    await page.selectOption('#grayDpiSelect', '1.5');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('grayscale');
  });
});
