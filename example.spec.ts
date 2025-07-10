import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://beachwoodhomes.com.au/inclusions/melbourne-inclusions');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Quality New Home Inclusions | Beachwood Homes/);
});

test('Download inclusions', async ({ page }) => {
  await page.goto('https://beachwoodhomes.com.au/inclusions/melbourne-inclusions');

  // Click the get started link.
  await page.getByRole('link', { name: 'password' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Melbourne Inclusions,' })).toBeVisible();
});

test.describe('Contact Form Validations', () => {
  const viewports = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'mobile', width: 375, height: 812 }
  ];

  const browsers = ['chromium', 'firefox', 'webkit'];

  viewports.forEach(({ name, width, height }) => {
    browsers.forEach(browser => {
      test(`[${browser}] ${name} viewport validations @visual`, async ({ page }, testInfo) => {
        testInfo.snapshotSuffix = '';
        await page.setViewportSize({ width, height });
        await page.goto('https://beachwoodhomes.com.au/contact-us');

        // Element-specific screenshot (form container)
        const form = page.locator('#contact-form');
        await expect(form).toHaveScreenshot(`${browser}-${name}-form-initial.png`);

        // Test validations
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(form).toHaveScreenshot(`${browser}-${name}-form-errors.png`);

        // Test valid inputs
        await page.getByLabel('Email').fill('test@example.com');
        await page.getByLabel('Phone Number').fill('0412345678');
        await expect(form).toHaveScreenshot(`${browser}-${name}-form-valid.png`);

        // Mock submission
        await page.route('**/submit', route => route.fulfill({ 
          status: 200,
          body: JSON.stringify({ success: true })
        }));
        
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByText('Thank you!')).toBeVisible();
      });
    });
  });
});
