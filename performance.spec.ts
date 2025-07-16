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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                       new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);
      const urlSlug = urlObj.hostname.replace(/\./g, '_');
      const reportName = `${urlSlug}_${timestamp}.report.html`;
      
      console.log(`Report name: ${reportName}`);
      
      // Ensure lighthouse directory exists
      const lighthouseDir = path.join(__dirname, 'lighthouse');
      if (!fs.existsSync(lighthouseDir)) {
        fs.mkdirSync(lighthouseDir, { recursive: true });
        console.log(`Created lighthouse directory: ${lighthouseDir}`);
      }
      
      const fullReportPath = path.join(lighthouseDir, reportName);
      
      // Run Lighthouse CLI with proper output path
      const command = `npx lighthouse "${url}" --output=html --output-path="${fullReportPath}" --chrome-flags="--headless --no-sandbox --disable-gpu" --only-categories=performance,accessibility,seo,best-practices --max-wait-for-load=60000 --timeout=60000`;
      
      console.log(`Executing Lighthouse command: ${command}`);
      
      try {
        const { stdout, stderr } = await execAsync(command, { 
          timeout: 120000,
          maxBuffer: 1024 * 1024 * 5 // 5MB buffer
        });
        console.log(`Lighthouse completed for ${url}`);
        
        if (stderr && !stderr.includes('Warning')) {
          console.log(`Lighthouse stderr: ${stderr}`);
        }
        
        // Verify the report was created
        console.log(`Checking for report at: ${fullReportPath}`);
        
        const reportExists = fs.existsSync(fullReportPath);
        console.log(`Report exists: ${reportExists}`);
        
        if (reportExists) {
          const stats = fs.statSync(fullReportPath);
          console.log(`Report size: ${stats.size} bytes`);
        }
        
        expect(reportExists).toBe(true);
        
        // Also verify the report has content
        if (reportExists) {
          const stats = fs.statSync(fullReportPath);
          expect(stats.size).toBeGreaterThan(1000); // At least 1KB
        }
        
      } catch (error) {
        console.error(`Lighthouse failed for ${url}:`, error);
        throw error;
      }
    });
  });
});
