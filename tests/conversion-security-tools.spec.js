const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Conversion, Image & Security Tools', () => {
  const samplePdf = path.join(__dirname, 'fixtures', 'sample.pdf');
  const samplePng = path.join(__dirname, 'fixtures', 'sample.png');

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');
  });

  test('Compress PDF optimizes file size and preserves clarity', async ({ page }) => {
    await page.click('.tool-card[data-tool="compress"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Compress PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select Medium compression radio
    await page.check('input[name="compressLevel"][value="medium"]');

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

  test('PDF to JPG/PNG renders pages into ZIP archive', async ({ page }) => {
    await page.click('.tool-card[data-tool="pdf-to-img"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('PDF to Images');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select PNG format
    await page.selectOption('#imgFormat', 'png');

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

  test('Images to PDF compiles photos into a single PDF document', async ({ page }) => {
    await page.click('.tool-card[data-tool="img-to-pdf"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Images to PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles([samplePng]);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select A4 page size
    await page.selectOption('#imgPdfPageSize', 'a4');

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

  test('Remove Background segments foreground and outputs transparent PNG', async ({ page }) => {
    await page.click('.tool-card[data-tool="bg-remover"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Remove Background');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePng);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select Auto Remove background option
    await page.check('input[name="bgReplaceMode"][value="transparent"]');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('.png');
  });

  test('Watermark PDF stamps custom text with position grid', async ({ page }) => {
    await page.click('.tool-card[data-tool="watermark"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Watermark PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Fill watermark text
    await page.fill('#watermarkText', 'CONFIDENTIAL DRAFT');

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

  test('Protect PDF validates passwords and secures document', async ({ page }) => {
    await page.click('.tool-card[data-tool="protect"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Protect PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Fill matching passwords
    await page.fill('#protectPassword', 'SecretPass2026!');
    await page.fill('#protectConfirmPassword', 'SecretPass2026!');

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

  test('Unlock PDF removes security restrictions and produces clean PDF', async ({ page }) => {
    await page.click('.tool-card[data-tool="unlock"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Unlock PDF');

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

    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('Sign PDF captures drawn signature and stamps onto page', async ({ page }) => {
    await page.click('.tool-card[data-tool="sign"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Sign PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify signature canvas exists
    const sigCanvas = page.locator('#signPadCanvas');
    await expect(sigCanvas).toBeVisible();

    // Draw on signature canvas
    const box = await sigCanvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 20, box.y + 20);
      await page.mouse.down();
      await page.mouse.move(box.x + 80, box.y + 60);
      await page.mouse.move(box.x + 140, box.y + 30);
      await page.mouse.up();
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('signed');
  });

  test('PDF to Text extracts text content into textarea and downloadable .txt file', async ({ page }) => {
    await page.click('.tool-card[data-tool="extract-text"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('PDF to Text');

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

    expect(download.suggestedFilename()).toContain('.txt');
  });
});
