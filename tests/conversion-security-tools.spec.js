const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Conversion, Image & Security Tools', () => {
  const samplePdf = path.resolve(__dirname, 'fixtures/sample.pdf');
  const samplePng = path.resolve(__dirname, 'fixtures/sample.png');
  const sampleJpg = path.resolve(__dirname, 'fixtures/sample.jpg');

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

    // Select Recommended compression
    await page.click('input[name="compressLevel"][value="recommended"]');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('compressed');
  });

  test('PDF to JPG/PNG renders pages into ZIP archive', async ({ page }) => {
    await page.click('.tool-card[data-tool="pdf-to-img"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('PDF to JPG / PNG');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Select PNG format
    await page.selectOption('#p2iFormat', 'image/png');

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
    await fileInput.setInputFiles([samplePng, sampleJpg]);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify 2 image cards rendered
    const cards = page.locator('.file-card-item');
    await expect(cards).toHaveCount(2);

    // Verify options
    await page.selectOption('#i2pPageSize', 'A4');
    await page.selectOption('#i2pMargin', 'none');

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
    await page.selectOption('#bgModeSelect', 'auto');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('nobg.png');
  });

  test('Watermark PDF stamps custom text with position grid', async ({ page }) => {
    await page.click('.tool-card[data-tool="watermark"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Watermark PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Type custom stamp
    await page.fill('#wmText', 'OFFICIAL AUDIT 2026');
    await page.selectOption('#wmPosition', 'diagonal');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('watermarked');
  });

  test('Protect PDF validates passwords and secures document', async ({ page }) => {
    await page.click('.tool-card[data-tool="protect"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Protect PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Fill matching passwords
    await page.fill('#protectPassword', 'SecureSecretPass123!');
    await page.fill('#protectConfirmPassword', 'SecureSecretPass123!');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      (async () => {
        await page.click('#btnExecuteAction');
        await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });
        await page.click('#btnDownloadPrimary');
      })()
    ]);

    expect(download.suggestedFilename()).toContain('protected');
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

    expect(download.suggestedFilename()).toContain('unlocked');
  });

  test('Sign PDF captures drawn signature and stamps onto page', async ({ page }) => {
    await page.click('.tool-card[data-tool="sign"]');
    await expect(page.locator('#wsToolTitle')).toHaveText('Sign PDF');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(samplePdf);
    await expect(page.locator('#activeWorkspace')).toBeVisible();

    // Verify signature canvas exists
    const sigCanvas = page.locator('#signatureCanvas');
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

    // Click execute
    await page.click('#btnExecuteAction');
    await expect(page.locator('#successScreen')).toBeVisible({ timeout: 20000 });

    // Verify textarea populated
    const extractedArea = page.locator('#extractedTextarea');
    await expect(extractedArea).toBeVisible();
    const val = await extractedArea.inputValue();
    expect(val.length).toBeGreaterThan(0);
    expect(val).toContain('Page 1');

    // Download text file
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.click('#btnDownloadPrimary')
    ]);

    expect(download.suggestedFilename()).toContain('.txt');
  });
});
