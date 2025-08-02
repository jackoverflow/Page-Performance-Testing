import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Define iPhone 16 manually since it might not be available in older Playwright versions
const iPhone16 = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
};

// Read configuration from test-config.json
const configPath = path.join(__dirname, 'test-config.json');
let config = {};

if (fs.existsSync(configPath)) {
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configContent);
        console.log('Loaded configuration:', config);
    } catch (error) {
        console.error('Error parsing test-config.json:', error);
    }
}

// Get credentials from config or use defaults  
const scrollingConfig = (config as any).scrollingConfig || {};
const LOGIN_URL = scrollingConfig.loginUrl || 'https://mymetricon-nextjs-dev.vercel.app/';
const DASHBOARD_URL = scrollingConfig.dashboardUrl || 'https://mymetricon-nextjs-dev.vercel.app/dashboard/select-contract';
const CONTRACT_ID = scrollingConfig.contractId || '';
const EMAIL = scrollingConfig.email || 'pio@ypdigital.com.au';
const PASSWORD = scrollingConfig.password || 'YPD1g1t4l*';
const ORIENTATION = scrollingConfig.orientation || 'portrait';

// Define viewport based on orientation
const getViewportForOrientation = (orientation: string) => {
    if (orientation === 'landscape') {
        return { width: 844, height: 390 }; // Landscape iPhone 16
    }
    return { width: 390, height: 844 }; // Portrait iPhone 16 (default)
};

const VIEWPORT = getViewportForOrientation(ORIENTATION);

test.describe('Metricon Dashboard Safari iPhone 16 Scrolling Tests', () => {
    test('Safari iPhone 16 scrolling test for Metricon Dashboard', async ({ page }) => {
        console.log(`Starting Safari iPhone 16 scrolling test for Metricon Dashboard`);

        // Create a safe filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
            new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);

        // Create a safe URL slug from hostname
        const urlSlug = 'mymetricon_nextjs_dev_dashboard';

        // Ensure safari-scrolling directory exists
        const safariScrollingDir = path.join(__dirname, 'safari-scrolling');
        if (!fs.existsSync(safariScrollingDir)) {
            fs.mkdirSync(safariScrollingDir, { recursive: true });
            console.log(`Created safari-scrolling directory: ${safariScrollingDir}`);
        }

        // Set viewport based on orientation configuration
        await page.setViewportSize(VIEWPORT);

        // Verify viewport is set correctly
        const viewport = page.viewportSize();
        console.log('Current viewport:', viewport);
        console.log(`Expected ${ORIENTATION} viewport:`, VIEWPORT);
        console.log('Orientation setting:', ORIENTATION);

        // Force set viewport if needed
        if (viewport?.width !== VIEWPORT.width || viewport?.height !== VIEWPORT.height) {
            console.log(`Setting ${ORIENTATION} viewport...`);
            await page.setViewportSize(VIEWPORT);
        }

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

            // Clear and fill in login credentials with more robust approach
            console.log('Clearing email field...');
            await page.locator('input[name="email"]').click();
            await page.locator('input[name="email"]').fill('');
            await page.locator('input[name="email"]').type(EMAIL, { delay: 100 });

            console.log('Clearing password field...');
            await page.locator('input[name="password"]').click();
            await page.locator('input[name="password"]').fill('');
            await page.locator('input[name="password"]').type(PASSWORD, { delay: 100 });

            // Wait a moment for fields to be filled
            await page.waitForTimeout(1000);

            // Verify credentials were filled
            const emailValue = await page.locator('input[name="email"]').inputValue();
            const passwordValue = await page.locator('input[name="password"]').inputValue();
            console.log('Email filled correctly:', emailValue === EMAIL);
            console.log('Password filled correctly:', passwordValue === PASSWORD);
            console.log('Actual email value:', emailValue);
            console.log('Expected email value:', EMAIL);

            // Take screenshot before submitting to verify credentials are filled
            const beforeSubmitScreenshot = path.join(safariScrollingDir, `before_submit_${timestamp}.png`);
            await page.screenshot({ path: beforeSubmitScreenshot, fullPage: false });
            console.log(`Before submit screenshot saved to: ${beforeSubmitScreenshot}`);

            // Click submit without waiting for navigation
            console.log('Clicking submit button...');
            await page.click('button[type="submit"]');

            // Wait a bit for any navigation to start
            await page.waitForTimeout(8000);

            // Take screenshot after login attempt
            const loginScreenshot = path.join(safariScrollingDir, `after_login_${timestamp}.png`);
            await page.screenshot({ path: loginScreenshot, fullPage: false });
            console.log(`After login screenshot saved to: ${loginScreenshot}`);

            console.log('Login submitted, current URL:', page.url());
            
            // Check if we need to navigate to specific dashboard URL with contract ID
            if (CONTRACT_ID && CONTRACT_ID.trim()) {
                const targetDashboardUrl = `https://mymetricon-nextjs-dev.vercel.app/dashboard/${CONTRACT_ID.trim()}`;
                console.log(`Contract ID provided: ${CONTRACT_ID}, navigating directly to: ${targetDashboardUrl}`);
                
                // Navigate directly to the dashboard with contract ID
                await page.goto(targetDashboardUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                
                console.log(`Successfully navigated to dashboard URL: ${page.url()}`);
                
                // Wait for page to stabilize
                await page.waitForTimeout(3000);
            }
            // If we're on the select-contract page and no specific contract ID was provided, we need to select a contract
            else if (page.url().includes('/dashboard/select-contract')) {
                console.log('On select-contract page, looking for contract to select...');
                
                // Wait for contract selection elements to load
                await page.waitForSelector('.contract-item, [data-testid="contract-item"], .contract-card', { timeout: 10000 })
                    .catch(e => console.log('Contract selection elements not found with standard selectors, will try alternative approach'));
                
                // Take a screenshot of the contract selection page
                const contractSelectionScreenshot = path.join(safariScrollingDir, `${urlSlug}_${timestamp}_contract_selection.png`);
                await page.screenshot({
                    path: contractSelectionScreenshot,
                    fullPage: false
                });
                console.log(`Contract selection screenshot saved to: ${contractSelectionScreenshot}`);
                
                let contractFound = false;
                
                // If a specific Contract ID was provided, try to use it first
                if (CONTRACT_ID) {
                    console.log(`Specific Contract ID provided: ${CONTRACT_ID}, attempting to select it...`);
                    
                    try {
                        // Try to find and click the specific contract by ID
                        contractFound = await page.evaluate((contractId) => {
                            // Try various ways to find the specific contract
                            const selectors = [
                                `[data-contract-id="${contractId}"]`,
                                `[data-contract="${contractId}"]`,
                                `a[href*="/dashboard/${contractId}"]`,
                                `button[data-id="${contractId}"]`,
                                `div[id*="${contractId}"]`
                            ];
                            
                            for (const selector of selectors) {
                                const element = document.querySelector(selector);
                                if (element) {
                                    (element as HTMLElement).click();
                                    return true;
                                }
                            }
                            
                            // Try to find by text content
                            const elements = document.querySelectorAll('a, button, div');
                            for (const element of elements) {
                                if (element.textContent && element.textContent.includes(contractId)) {
                                    (element as HTMLElement).click();
                                    return true;
                                }
                            }
                            
                            return false;
                        }, CONTRACT_ID);
                        
                        if (contractFound) {
                            console.log(`Successfully selected contract with ID: ${CONTRACT_ID}`);
                        } else {
                            console.log(`Could not find contract with ID: ${CONTRACT_ID}, will try fallback methods`);
                        }
                    } catch (error) {
                        console.log(`Error trying to select specific contract: ${error.message}`);
                    }
                }
                
                // If no specific contract was found or provided, try to select any contract
                if (!contractFound) {
                    console.log('Attempting to select any available contract...');
                    
                    // Try to find and click the first contract
                    contractFound = await page.evaluate(() => {
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
                }
                
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
            
            // Skip navigation to dashboard and just test whatever page we're on
            console.log('Will test scrolling on current page:', page.url());

            // Wait for page to stabilize
            await page.waitForTimeout(3000);

            // Take a debug screenshot
            const debugScreenshot = path.join(safariScrollingDir, `debug_screenshot_${timestamp}.png`);
            await page.screenshot({
                path: debugScreenshot,
                fullPage: false
            });
            console.log(`Debug screenshot saved to: ${debugScreenshot}`);

            // Take initial screenshot
            const initialScreenshot = path.join(safariScrollingDir, `${urlSlug}_${timestamp}_initial.png`);
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
            const maxScrolls = 5;

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
                const scrollScreenshot = path.join(safariScrollingDir, `${urlSlug}_${timestamp}_scroll_${i}.png`);
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
    <title>Safari iPhone 16 Scrolling Test - ${pageInfo.title}</title>
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
            <h1>📱 Safari iPhone 16 Scrolling Test</h1>
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
                <strong>Orientation:</strong> ${ORIENTATION.charAt(0).toUpperCase() + ORIENTATION.slice(1)}
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
            const reportPath = path.join(safariScrollingDir, `${urlSlug}_${timestamp}_scrolling.report.html`);
            fs.writeFileSync(reportPath, reportHtml);

            console.log(`Safari iPhone 16 scrolling test completed for Metricon Dashboard`);
            console.log(`Report saved to: ${reportPath}`);
            console.log(`Screenshots saved: ${scrollSteps.length + 1} images`);

            // Verify report was created
            expect(fs.existsSync(reportPath)).toBe(true);
            expect(scrollSteps.length).toBeGreaterThan(0);

        } catch (error) {
            console.error(`Safari iPhone 16 scrolling test failed for Metricon Dashboard:`, error);
            throw error;
        } finally {
            // Page will be closed automatically by Playwright test runner
        }
    });
});