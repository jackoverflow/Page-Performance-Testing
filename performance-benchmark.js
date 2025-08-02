const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PerformanceBenchmark {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            benchmarks: [],
            summary: {}
        };
        this.testUrls = [
            'https://example.com',
            'https://google.com',
            'https://github.com'
        ];
    }

    async measureFileSize(filename) {
        try {
            const stats = await fs.stat(filename);
            return stats.size;
        } catch {
            return 0;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async measureMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024), // MB
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
            external: Math.round(usage.external / 1024 / 1024) // MB
        };
    }

    async benchmarkFileOperations() {
        console.log('🔍 Benchmarking file operations...');
        
        const testData = { test: 'data', urls: this.testUrls, timestamp: Date.now() };
        const testFile = 'benchmark-test.json';
        
        // Synchronous write
        const syncStart = performance.now();
        fsSync.writeFileSync(testFile, JSON.stringify(testData));
        const syncWriteTime = performance.now() - syncStart;
        
        // Synchronous read
        const syncReadStart = performance.now();
        fsSync.readFileSync(testFile, 'utf8');
        const syncReadTime = performance.now() - syncReadStart;
        
        // Asynchronous write
        const asyncStart = performance.now();
        await fs.writeFile(testFile, JSON.stringify(testData));
        const asyncWriteTime = performance.now() - asyncStart;
        
        // Asynchronous read
        const asyncReadStart = performance.now();
        await fs.readFile(testFile, 'utf8');
        const asyncReadTime = performance.now() - asyncReadStart;
        
        // Cleanup
        await fs.unlink(testFile);
        
        return {
            sync: {
                write: Math.round(syncWriteTime * 100) / 100,
                read: Math.round(syncReadTime * 100) / 100
            },
            async: {
                write: Math.round(asyncWriteTime * 100) / 100,
                read: Math.round(asyncReadTime * 100) / 100
            }
        };
    }

    async benchmarkBundleSizes() {
        console.log('📦 Analyzing bundle sizes...');
        
        const files = [
            { name: 'dashboard.html', path: 'dashboard.html' },
            { name: 'dashboard-optimized.html', path: 'dashboard-optimized.html' },
            { name: 'dashboard-server.js', path: 'dashboard-server.js' },
            { name: 'dashboard-server-optimized.js', path: 'dashboard-server-optimized.js' },
            { name: 'package-lock.json', path: 'package-lock.json' }
        ];
        
        const sizes = {};
        
        for (const file of files) {
            const size = await this.measureFileSize(file.path);
            sizes[file.name] = {
                bytes: size,
                formatted: this.formatFileSize(size)
            };
        }
        
        return sizes;
    }

    async benchmarkServerStartup() {
        console.log('🚀 Benchmarking server startup times...');
        
        const servers = [
            { name: 'original', script: 'dashboard-server.js' },
            { name: 'optimized', script: 'dashboard-server-optimized.js' }
        ];
        
        const results = {};
        
        for (const server of servers) {
            if (!fsSync.existsSync(server.script)) {
                console.log(`⚠️  ${server.script} not found, skipping...`);
                continue;
            }
            
            const startTime = performance.now();
            
            try {
                // Start server in background and measure startup time
                const child = exec(`node ${server.script}`, { timeout: 5000 });
                
                // Wait for server to be ready (simple approach)
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        child.kill();
                        reject(new Error('Server startup timeout'));
                    }, 5000);
                    
                    child.stdout.on('data', (data) => {
                        if (data.includes('running on')) {
                            clearTimeout(timeout);
                            child.kill();
                            resolve();
                        }
                    });
                    
                    child.on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });
                
                const endTime = performance.now();
                results[server.name] = Math.round((endTime - startTime) * 100) / 100;
                
            } catch (error) {
                console.log(`❌ Failed to benchmark ${server.name}: ${error.message}`);
                results[server.name] = 'failed';
            }
        }
        
        return results;
    }

    async benchmarkLighthousePerformance() {
        console.log('⚡ Benchmarking Lighthouse execution...');
        
        // Create test config
        const testConfig = {
            urls: ['https://example.com'],
            thresholds: { performance: 75, accessibility: 90, seo: 85 }
        };
        
        const configPath = 'test-config.json';
        await fs.writeFile(configPath, JSON.stringify(testConfig));
        
        const tests = [
            { name: 'original', spec: 'performance.spec.ts' },
            { name: 'optimized', spec: 'performance-optimized.spec.ts' }
        ];
        
        const results = {};
        
        for (const test of tests) {
            if (!fsSync.existsSync(test.spec)) {
                console.log(`⚠️  ${test.spec} not found, skipping...`);
                continue;
            }
            
            const startTime = performance.now();
            const memoryBefore = await this.measureMemoryUsage();
            
            try {
                const { stdout, stderr } = await execAsync(
                    `npx playwright test ${test.spec} --project=performance --workers=1`,
                    { 
                        timeout: 120000, // 2 minutes
                        maxBuffer: 1024 * 1024 * 10 
                    }
                );
                
                const endTime = performance.now();
                const memoryAfter = await this.measureMemoryUsage();
                const executionTime = Math.round((endTime - startTime) * 100) / 100;
                
                results[test.name] = {
                    executionTime,
                    memoryBefore,
                    memoryAfter,
                    memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
                    success: true
                };
                
                console.log(`✅ ${test.name} completed in ${executionTime}ms`);
                
            } catch (error) {
                console.log(`❌ ${test.name} failed: ${error.message}`);
                results[test.name] = {
                    executionTime: 'failed',
                    error: error.message,
                    success: false
                };
            }
        }
        
        // Cleanup
        try {
            await fs.unlink(configPath);
        } catch {}
        
        return results;
    }

    async runAllBenchmarks() {
        console.log('🏁 Starting comprehensive performance benchmark...\n');
        
        const overallStart = performance.now();
        
        try {
            // Bundle size analysis
            this.results.benchmarks.push({
                name: 'Bundle Sizes',
                results: await this.benchmarkBundleSizes()
            });
            
            // File operations
            this.results.benchmarks.push({
                name: 'File Operations',
                results: await this.benchmarkFileOperations()
            });
            
            // Server startup times
            this.results.benchmarks.push({
                name: 'Server Startup',
                results: await this.benchmarkServerStartup()
            });
            
            // Lighthouse performance (if possible)
            // this.results.benchmarks.push({
            //     name: 'Lighthouse Performance',
            //     results: await this.benchmarkLighthousePerformance()
            // });
            
            const overallTime = performance.now() - overallStart;
            
            this.results.summary = {
                totalBenchmarkTime: Math.round(overallTime * 100) / 100,
                completedBenchmarks: this.results.benchmarks.length,
                finalMemoryUsage: await this.measureMemoryUsage()
            };
            
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            this.results.error = error.message;
        }
    }

    generateReport() {
        console.log('\n📊 PERFORMANCE BENCHMARK REPORT');
        console.log('=====================================\n');
        
        console.log(`📅 Timestamp: ${this.results.timestamp}`);
        console.log(`⏱️  Total benchmark time: ${this.results.summary.totalBenchmarkTime}ms`);
        console.log(`🧪 Completed benchmarks: ${this.results.summary.completedBenchmarks}\n`);
        
        this.results.benchmarks.forEach(benchmark => {
            console.log(`📋 ${benchmark.name}:`);
            console.log('-------------------');
            
            if (benchmark.name === 'Bundle Sizes') {
                Object.entries(benchmark.results).forEach(([file, data]) => {
                    console.log(`  ${file}: ${data.formatted}`);
                });
                
                // Calculate optimization savings
                const original = benchmark.results['dashboard.html'];
                const optimized = benchmark.results['dashboard-optimized.html'];
                if (original && optimized) {
                    const savings = original.bytes - optimized.bytes;
                    const percentage = Math.round((savings / original.bytes) * 100);
                    console.log(`  💡 Dashboard optimization: ${this.formatFileSize(savings)} saved (${percentage}%)`);
                }
                
            } else if (benchmark.name === 'File Operations') {
                console.log(`  Sync Write: ${benchmark.results.sync.write}ms`);
                console.log(`  Sync Read: ${benchmark.results.sync.read}ms`);
                console.log(`  Async Write: ${benchmark.results.async.write}ms`);
                console.log(`  Async Read: ${benchmark.results.async.read}ms`);
                
                const syncTotal = benchmark.results.sync.write + benchmark.results.sync.read;
                const asyncTotal = benchmark.results.async.write + benchmark.results.async.read;
                const improvement = Math.round(((syncTotal - asyncTotal) / syncTotal) * 100);
                console.log(`  💡 Async improvement: ${improvement}% faster`);
                
            } else if (benchmark.name === 'Server Startup') {
                Object.entries(benchmark.results).forEach(([server, time]) => {
                    console.log(`  ${server}: ${time}ms`);
                });
                
                if (benchmark.results.original && benchmark.results.optimized) {
                    const improvement = benchmark.results.original - benchmark.results.optimized;
                    const percentage = Math.round((improvement / benchmark.results.original) * 100);
                    console.log(`  💡 Startup optimization: ${improvement}ms faster (${percentage}%)`);
                }
                
            } else if (benchmark.name === 'Lighthouse Performance') {
                Object.entries(benchmark.results).forEach(([test, data]) => {
                    if (data.success) {
                        console.log(`  ${test}: ${data.executionTime}ms (Memory: ${data.memoryDelta}MB)`);
                    } else {
                        console.log(`  ${test}: Failed - ${data.error}`);
                    }
                });
            }
            
            console.log('');
        });
        
        console.log('💡 OPTIMIZATION RECOMMENDATIONS:');
        console.log('================================');
        console.log('1. ✅ Use optimized dashboard for smaller bundle size');
        console.log('2. ✅ Use async file operations for better performance');
        console.log('3. ✅ Enable gzip compression on the server');
        console.log('4. ✅ Implement response caching for API endpoints');
        console.log('5. ✅ Use batched Lighthouse execution for memory efficiency');
        console.log('6. 🔄 Consider implementing CDN for static assets');
        console.log('7. 🔄 Add database indexing for larger datasets');
        console.log('8. 🔄 Implement lazy loading for heavy components\n');
        
        console.log(`🧠 Final Memory Usage: ${this.results.summary.finalMemoryUsage.heapUsed}MB\n`);
    }

    async saveReport() {
        const reportPath = `performance-benchmark-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`💾 Detailed report saved to: ${reportPath}`);
    }
}

// Run benchmark if called directly
if (require.main === module) {
    async function runBenchmark() {
        const benchmark = new PerformanceBenchmark();
        
        try {
            await benchmark.runAllBenchmarks();
            benchmark.generateReport();
            await benchmark.saveReport();
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            process.exit(1);
        }
    }
    
    runBenchmark();
}

module.exports = PerformanceBenchmark;