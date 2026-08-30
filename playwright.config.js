const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // Sequential execution for stable server port and clean telemetry/state
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:3000',
    navigationTimeout: 20000,
    actionTimeout: 20000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: true,
    timeout: 15000
  }
});
