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
    },
    {
      name: 'safari-scrolling',
      testMatch: '**/*scrolling.spec.ts',
      timeout: 180000, // 3 minutes
      retries: 1,
      use: {
        ...devices['iPhone 16'],
        browserName: 'webkit',
        headless: true,
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        locale: 'en-US',
        geolocation: { latitude: 14.5995, longitude: 120.9842 }
      }
    },
    {
      name: 'metricon-dashboard',
      testMatch: '**/metricon-dashboard.spec.ts',
      timeout: 180000, // 3 minutes
      retries: 1,
      use: {
        ...devices['iPhone 16'],
        browserName: 'webkit',
        headless: true,
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        locale: 'en-US',
        geolocation: { latitude: 14.5995, longitude: 120.9842 }
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
