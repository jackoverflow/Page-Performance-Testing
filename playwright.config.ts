import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'performance',
      testMatch: '**/performance.spec.ts',
      timeout: 180000, // 3 minutes
      retries: 1,
      use: {
        headless: true,
        ignoreHTTPSErrors: true,
        bypassCSP: true
      }
    }
  ],
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled'
    }
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'performance-reports' }],
    ['junit', { outputFile: 'performance-results.xml' }]
  ]
});
