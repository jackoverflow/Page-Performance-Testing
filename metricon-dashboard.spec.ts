import { test, expect } from '@playwright/test';
import { webkit, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const iPhone16 = devices['iPhone 16'];

// Metricon specific credentials
const LOGIN_URL = 'https://mymetricon-nextjs-dev.vercel.app/';
const DASHBOARD_URL = 'https://mymetricon-nextjs-dev.vercel.app/dashboard/select-contract';
const EMAIL = 'pio@ypdigital.com.au';
const PASSWORD = 'YPD1g1t4l*';

test.describe('Metricon Dashboard Safari iPhone 16 Scrolling Tests', () => {
  test('Safari iPhone 16 scrolling test for Metricon Dashboard', async () => {
    console.log(`Starting Safari iPhone 16 scrolling test for Metricon Dashboard`);

    // Create a safe filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
      new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);

    // Create a safe URL slug from hostname
    const urlSlug = 'mymetricon_nextjs_dev_dashboard';

    // Ensure safari-reports directory exists
    const safariReportsDir = path.join(__dirname, 'safari-reports');
    if (!fs.existsSync(safariReportsDir)) {
      fs.mkdirSync(safariReportsDir, { recursive: true });
      console.log(`Created safari-reports directory: ${safariReportsDir}`);
    }

    // Launch webkit browser with iPhone 16 configuration
    const browser = await webkit.launch({
      headless: true
    });

    const context = await browser.newContext({
      ...iPhone16,
      locale: 'en-US',
      geolocation: { latitude: 14.5995, longitude: 120.9842 }, // Manila, Philippines
    });

    const page = await context.newPage();

    try {
      console.log(`Navigating to login page: ${LOGIN_URL}`);

      // First navigate to the login page
      await page.goto(LOGIN_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      // Wait for login form to be visible
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      console.log('Login form found, authenticating...');

      // Fill in login credentials
      await page.fill('input[name="email"]', EMAIL);
      await page.fill('input[name="password"]', PASSWORD);

      // Click submit and wait for navigation
      await page.click('button[type="submit"]');

      // Wait for navigation to complete
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('Login submitted, current URL:', page.url());

      // If not automatically redirected to dashboard, navigate there directly
      if (!page.url().includes('/dashboard/select-contract')) {
        console.log('Navigating directly to dashboard URL');
        await page.goto(DASHBOARD_URL, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
      }

      // Wait for dashboard page to load
      await page.waitForLoadState('domcontentloaded');
      console.log('Dashboard page loaded, URL:', page.url());
      
      // If we're on the select-contract page, we need to select a contract and navigate to its dashboard
      if (page.url().includes('/dashboard/select-contract')) {
        console.log('On select-contract page, looking for contract to select...');
        
        // Wait for contract selection elements to load
        await page.waitForSelector('.contract-item, [data-testid="contract-item"], .contract-card', { timeout: 10000 })
          .catch(e => console.log('Contract selection elements not found with standard selectors, will try alternative approach'));
        
        // Take a screenshot of the contract selection page
        const contractSelectionScreenshot = path.join(safariReportsDir, `${urlSlug}_${timestamp}_contract_selection.png`);
        await page.screenshot({
          path: contractSelectionScreenshot,
          fullPage: false
        });
        console.log(`Contract selection screenshot saved to: ${contractSelectionScreenshot}`);
        
        // Try to find and click the first contract
        const contractFound = await page.evaluate(() => {
          // Try various selectors that might contain contract IDs
          const selectors = [
            '.contract-item', '[data-testid="contract-item"]', '.contract-card',
            'a[href*="/dashboard/"]', 'button[data-contract-id]', '[data-contract]'
          ];
          
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              // Click the first contract element
              (elements[0] as HTMLElement).click();
              return true;
            }
          }
          
          // If no selectors worked, try to find any element with href containing /dashboard/
          const links = Array.from(document.querySelectorAll('a'));
          const dashboardLink = links.find(link => link.href && link.href.includes('/dashboard/') && !link.href.includes('/select-contract'));
          
          if (dashboardLink) {
            dashboardLink.click();
            return true;
          }
          
          return false;
        });
        
        if (contractFound) {
          console.log('Contract selected, waiting for navigation...');
          // Wait for navigation after contract selection
          await page.waitForNavigation({ timeout: 10000 })
            .catch(e => console.log('Navigation timeout after contract selection, continuing anyway'));
          console.log('After contract selection, URL:', page.url());
        } else {
          console.log('Could not find a contract to select automatically');
        }
      }

      // Take initial screenshot
      const initialScreenshot = path.join(safariReportsDir, `${urlSlug}_${timestamp}_initial.png`);
      await page.screenshot({
        path: initialScreenshot,
        fullPage: false // Just viewport
      });

      // Get initial metrics
      const initialMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
          largestContentfulPaint: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime || 0,
          scrollY: window.scrollY,
          viewportHeight: window.innerHeight,
          documentHeight: document.documentElement.scrollHeight
        };
      });

      const scrollSteps: Array<{
        step: number;
        duration: number;
        scrollPosition: number;
        timestamp: number;
      }> = [];
      const maxScrolls = 10; // Increase max scrolls to capture more of the dashboard

      // Perform scrolling test
      for (let i = 1; i <= maxScrolls; i++) {
        const scrollStart = Date.now();

        // Smooth scroll down by viewport height
        await page.evaluate(() => {
          return new Promise((resolve) => {
            const startY = window.scrollY;
            const targetY = startY + window.innerHeight;
            const maxY = document.documentElement.scrollHeight - window.innerHeight;
            const finalY = Math.min(targetY, maxY);

            window.scrollTo({
              top: finalY,
              behavior: 'smooth'
            });

            // Wait for scroll to complete
            setTimeout(resolve, 800);
          });
        });

        const scrollEnd = Date.now();

        // Get metrics after scroll
        const scrollMetrics = await page.evaluate(() => ({
          scrollY: window.scrollY,
          timestamp: Date.now(),
          viewportHeight: window.innerHeight,
          documentHeight: document.documentElement.scrollHeight
        }));

        scrollSteps.push({
          step: i,
          duration: scrollEnd - scrollStart,
          scrollPosition: scrollMetrics.scrollY,
          timestamp: scrollMetrics.timestamp
        });

        // Take screenshot after each scroll
        const scrollScreenshot = path.join(safariReportsDir, `${urlSlug}_${timestamp}_scroll_${i}.png`);
        await page.screenshot({
          path: scrollScreenshot,
          fullPage: false
        });

        // Wait a bit before next scroll
        await page.waitForTimeout(500);

        // Stop if we've reached the bottom
        if (scrollMetrics.scrollY >= scrollMetrics.documentHeight - scrollMetrics.viewportHeight - 10) {
          console.log(`Reached bottom of page at scroll step ${i}`);
          break;
        }
      }

      // Get final page info
      const pageInfo = {
        title: await page.title(),
        url: page.url(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: page.viewportSize(),
        timestamp: new Date().toISOString(),
        initialMetrics: initialMetrics,
        scrollSteps: scrollSteps,
        totalScrollDistance: scrollSteps[scrollSteps.length - 1]?.scrollPosition || 0
      };

      // Create HTML report
      const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Metricon Dashboard - Safari iPhone 16 Scrolling Test</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric-value { font-size: 24px; font-weight: bold; color: #28a745; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .info-item { background: #f8f9fa; padding: 10px; border-radius: 5px; }
        .scroll-steps { margin: 20px 0; }
        .scroll-step { background: #e9f7ef; padding: 12px; margin: 8px 0; border-radius: 5px; border-left: 4px solid #28a745; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .screenshot-item { text-align: center; }
        .screenshot-item img { max-width: 100%; border: 1px solid #ddd; border-radius: 5px; }
        .screenshot-item h4 { margin: 10px 0 5px 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 Metricon Dashboard - Safari iPhone 16 Scrolling Test</h1>
            <h2>${pageInfo.title}</h2>
            <p><a href="${pageInfo.url}" target="_blank">${pageInfo.url}</a></p>
            <p><strong>Test Date:</strong> ${new Date(pageInfo.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="info-grid">
            <div class="info-item">
                <strong>Device:</strong> iPhone 16
            </div>
            <div class="info-item">
                <strong>Browser:</strong> Safari (WebKit)
            </div>
            <div class="info-item">
                <strong>Viewport:</strong> ${pageInfo.viewport?.width || 'N/A'}x${pageInfo.viewport?.height || 'N/A'}
            </div>
            <div class="info-item">
                <strong>Location:</strong> Manila, Philippines
            </div>
        </div>
        
        <div class="metric">
            <h3>Document Height</h3>
            <div class="metric-value">${pageInfo.initialMetrics.documentHeight}px</div>
        </div>
        
        <div class="metric">
            <h3>Total Scroll Distance</h3>
            <div class="metric-value">${pageInfo.totalScrollDistance}px</div>
        </div>
        
        <div class="metric">
            <h3>Scroll Steps Completed</h3>
            <div class="metric-value">${pageInfo.scrollSteps.length}</div>
        </div>
        
        <div class="scroll-steps">
            <h3>Scroll Performance</h3>
            ${pageInfo.scrollSteps.map(step => `
                <div class="scroll-step">
                    <strong>Step ${step.step}:</strong> 
                    Scrolled to ${step.scrollPosition}px in ${step.duration}ms
                </div>
            `).join('')}
        </div>
        
        <div class="screenshots">
            <div class="screenshot-item">
                <h4>Initial View</h4>
                <img src="${urlSlug}_${timestamp}_initial.png" alt="Initial Screenshot" />
            </div>
            ${pageInfo.scrollSteps.map(step => `
                <div class="screenshot-item">
                    <h4>After Scroll ${step.step}</h4>
                    <img src="${urlSlug}_${timestamp}_scroll_${step.step}.png" alt="Scroll Step ${step.step}" />
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background: #e9ecef; border-radius: 5px;">
            <h4>User Agent:</h4>
            <code>${pageInfo.userAgent}</code>
        </div>
    </div>
</body>
</html>`;

      // Save HTML report
      const reportPath = path.join(safariReportsDir, `${urlSlug}_${timestamp}_scrolling.report.html`);
      fs.writeFileSync(reportPath, reportHtml);

      console.log(`Metricon Dashboard Safari iPhone 16 scrolling test completed`);
      console.log(`Report saved to: ${reportPath}`);
      console.log(`Screenshots saved: ${scrollSteps.length + 1} images`);

      // Verify report was created
      expect(fs.existsSync(reportPath)).toBe(true);
      expect(scrollSteps.length).toBeGreaterThan(0);

    } catch (error) {
      console.error(`Metricon Dashboard Safari iPhone 16 scrolling test failed:`, error);
      throw error;
    } finally {
      await browser.close();
    }
  });
});