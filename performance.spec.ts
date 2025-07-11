import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Read URLs and thresholds from config file (required)
const configPath = path.join(__dirname, 'test-config.json');

if (!fs.existsSync(configPath)) {
  throw new Error('test-config.json not found. Please run tests through the dashboard.');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const urls = config.urls;
const thresholds = config.thresholds || { performance: 75, accessibility: 90, seo: 85 };

if (!urls || urls.length === 0) {
  throw new Error('No URLs found in configuration. Please add URLs through the dashboard.');
}

test.describe('Page Speed Tests', () => {
  urls.forEach(url => {
    test(`Performance audit for ${url}`, async () => {
      console.log(`Starting performance audit for: ${url}`);
      
      // Create a more robust URL slug
      const urlObj = new URL(url);
      const urlSlug = urlObj.hostname.replace(/\./g, '-') + urlObj.pathname.replace(/[\/]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
      const outputDir = `lighthouse/${urlSlug}`;
      const reportName = `report-${Date.now()}`;
      
      console.log(`Output directory: ${outputDir}`);
      console.log(`Report name: ${reportName}`);
      
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Created directory: ${outputDir}`);
      }
      
      // Run Lighthouse CLI
      const command = `npx lighthouse ${url} --output=html,csv --output-path=${outputDir}/${reportName} --chrome-flags="--headless" --only-categories=performance,accessibility,seo --max-wait-for-load=60000`;
      
      console.log(`Executing Lighthouse command: ${command}`);
      
      try {
        const { stdout, stderr } = await execAsync(command, { timeout: 120000 });
        console.log(`Lighthouse completed for ${url}`);
        
        if (stderr) {
          console.log(`Lighthouse stderr: ${stderr}`);
        }
        
        // Verify the report was created
        const htmlReportPath = `${outputDir}/${reportName}.report.html`;
        console.log(`Checking for report at: ${htmlReportPath}`);
        
        const reportExists = fs.existsSync(htmlReportPath);
        console.log(`Report exists: ${reportExists}`);
        
        expect(reportExists).toBe(true);
        
      } catch (error) {
        console.error(`Lighthouse failed for ${url}:`, error);
        throw error;
      }
    });
  });
});
