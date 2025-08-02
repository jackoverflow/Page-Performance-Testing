import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';

const execAsync = promisify(exec);

// Performance optimizations
const MAX_CONCURRENT_TESTS = 3;
const LIGHTHOUSE_TIMEOUT = 90000; // 90 seconds
const REPORT_BUFFER_SIZE = 1024 * 1024 * 30; // 30MB

// Read URLs and thresholds from config file (required)
const configPath = path.join(__dirname, 'test-config.json');

if (!fsSync.existsSync(configPath)) {
  throw new Error('test-config.json not found. Please run tests through the dashboard.');
}

const config = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
const urls = config.urls;
const thresholds = config.thresholds || { performance: 75, accessibility: 90, seo: 85 };

if (!urls || urls.length === 0) {
  throw new Error('No URLs found in configuration. Please add URLs through the dashboard.');
}

// Helper function to create safe filenames
function createSafeFilename(url: string): { urlSlug: string, reportName: string } {
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                   new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);
  
  const hostname = urlObj.hostname || 'unknown-host';
  const urlSlug = hostname.replace(/[^a-zA-Z0-9]/g, '_');
  const reportName = `${urlSlug}_${timestamp}.report.html`;
  
  return { urlSlug, reportName };
}

// Optimized lighthouse execution function
async function runOptimizedLighthouse(url: string, reportPath: string): Promise<void> {
  const lighthouseFlags = [
    '--output=html',
    `--output-path="${reportPath}"`,
    '--chrome-flags="--headless --no-sandbox --disable-gpu --disable-web-security --disable-features=VizDisplayCompositor"',
    '--only-categories=performance,accessibility,seo,best-practices',
    '--max-wait-for-load=45000',
    '--timeout=60000',
    '--throttling-method=devtools',
    '--disable-extensions',
    '--disable-device-emulation',
    '--skip-audits=uses-http2'
  ].join(' ');

  const command = `npx lighthouse "${url}" ${lighthouseFlags}`;
  
  console.log(`🚀 Starting optimized Lighthouse for: ${url}`);
  
  const startTime = Date.now();
  
  try {
    const { stdout, stderr } = await execAsync(command, { 
      timeout: LIGHTHOUSE_TIMEOUT,
      maxBuffer: REPORT_BUFFER_SIZE,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=2048',
        CHROME_FLAGS: '--disable-dev-shm-usage --no-sandbox'
      }
    });
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ Lighthouse completed for ${url} in ${executionTime}ms`);
    
    if (stderr && !stderr.includes('Warning') && !stderr.includes('DevTools')) {
      console.log(`Lighthouse stderr: ${stderr}`);
    }
    
    // Verify the report was created and has content
    const reportExists = fsSync.existsSync(reportPath);
    if (!reportExists) {
      throw new Error(`Report file not created: ${reportPath}`);
    }
    
    const stats = fsSync.statSync(reportPath);
    if (stats.size < 1000) {
      throw new Error(`Report file too small (${stats.size} bytes), likely corrupt`);
    }
    
    console.log(`📊 Report generated: ${path.basename(reportPath)} (${Math.round(stats.size / 1024)}KB)`);
    
  } catch (error) {
    console.error(`❌ Lighthouse failed for ${url}:`, error.message);
    throw error;
  }
}

// Batch processing function for better performance
async function processBatch(urlBatch: string[], batchIndex: number): Promise<void> {
  console.log(`🔄 Processing batch ${batchIndex + 1} with ${urlBatch.length} URLs`);
  
  const promises = urlBatch.map(async (url) => {
    const { reportName } = createSafeFilename(url);
    
    // Ensure lighthouse directory exists
    const lighthouseDir = path.join(__dirname, 'lighthouse');
    if (!fsSync.existsSync(lighthouseDir)) {
      await fs.mkdir(lighthouseDir, { recursive: true });
      console.log(`Created lighthouse directory: ${lighthouseDir}`);
    }
    
    const fullReportPath = path.join(lighthouseDir, reportName);
    
    return runOptimizedLighthouse(url, fullReportPath);
  });
  
  // Run URLs in batch concurrently with error handling
  const results = await Promise.allSettled(promises);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`📈 Batch ${batchIndex + 1} completed: ${successful} successful, ${failed} failed`);
  
  // Log failed URLs for debugging
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`❌ Failed URL in batch ${batchIndex + 1}: ${urlBatch[index]} - ${result.reason.message}`);
    }
  });
}

// Memory cleanup function
function forceGarbageCollection() {
  if (global.gc) {
    global.gc();
    console.log('🧹 Forced garbage collection');
  }
}

test.describe('Optimized Page Speed Tests', () => {
  // Set test timeout
  test.setTimeout(LIGHTHOUSE_TIMEOUT * 2);
  
  test('Performance audit for all URLs with batching', async () => {
    console.log(`🎯 Starting optimized performance tests for ${urls.length} URLs`);
    console.log(`⚙️  Configuration: Max concurrent tests: ${MAX_CONCURRENT_TESTS}, Timeout: ${LIGHTHOUSE_TIMEOUT}ms`);
    
    const startTime = Date.now();
    
    // Split URLs into batches for memory management
    const batches: string[][] = [];
    for (let i = 0; i < urls.length; i += MAX_CONCURRENT_TESTS) {
      batches.push(urls.slice(i, i + MAX_CONCURRENT_TESTS));
    }
    
    console.log(`📦 Split ${urls.length} URLs into ${batches.length} batches`);
    
    let totalSuccessful = 0;
    let totalFailed = 0;
    
    // Process batches sequentially to manage memory usage
    for (let i = 0; i < batches.length; i++) {
      try {
        await processBatch(batches[i], i);
        totalSuccessful += batches[i].length;
        
        // Force garbage collection between batches
        if (i < batches.length - 1) {
          forceGarbageCollection();
          // Small delay to allow memory to be freed
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error.message);
        totalFailed += batches[i].length;
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // Final verification
    const lighthouseDir = path.join(__dirname, 'lighthouse');
    let finalReportCount = 0;
    
    try {
      const files = await fs.readdir(lighthouseDir);
      finalReportCount = files.filter(file => file.endsWith('.report.html')).length;
    } catch (error) {
      console.log('Error reading final report count:', error.message);
    }
    
    console.log(`🏁 Optimization results:`);
    console.log(`   Total execution time: ${Math.round(totalTime / 1000)}s`);
    console.log(`   Average time per URL: ${Math.round(totalTime / urls.length)}ms`);
    console.log(`   Reports generated: ${finalReportCount}/${urls.length}`);
    console.log(`   Success rate: ${Math.round((finalReportCount / urls.length) * 100)}%`);
    
    // Memory usage report
    const memUsage = process.memoryUsage();
    console.log(`📊 Memory usage:`);
    console.log(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`   External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
    
    // Expect at least 80% success rate
    const successRate = finalReportCount / urls.length;
    expect(successRate).toBeGreaterThanOrEqual(0.8);
    
    // Expect at least one report to be generated
    expect(finalReportCount).toBeGreaterThan(0);
  });
  
  // Individual URL tests for detailed error reporting
  urls.forEach(url => {
    test(`Individual performance audit for ${url}`, async () => {
      const { reportName } = createSafeFilename(url);
      
      console.log(`🔍 Individual test for: ${url}`);
      
      // Ensure lighthouse directory exists
      const lighthouseDir = path.join(__dirname, 'lighthouse');
      if (!fsSync.existsSync(lighthouseDir)) {
        await fs.mkdir(lighthouseDir, { recursive: true });
      }
      
      const fullReportPath = path.join(lighthouseDir, reportName);
      
      // Skip if report already exists (from batch test)
      if (fsSync.existsSync(fullReportPath)) {
        const stats = fsSync.statSync(fullReportPath);
        if (stats.size > 1000) {
          console.log(`✅ Report already exists: ${reportName}`);
          return;
        }
      }
      
      await runOptimizedLighthouse(url, fullReportPath);
      
      // Verify the report was created
      const reportExists = fsSync.existsSync(fullReportPath);
      expect(reportExists).toBe(true);
      
      if (reportExists) {
        const stats = fsSync.statSync(fullReportPath);
        expect(stats.size).toBeGreaterThan(1000); // At least 1KB
        console.log(`✅ Individual test completed: ${reportName} (${Math.round(stats.size / 1024)}KB)`);
      }
    });
  });
});