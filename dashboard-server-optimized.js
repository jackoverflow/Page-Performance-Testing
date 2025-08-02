const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { promisify } = require('util');
const compression = require('compression');
const { runMetriconScrollingTest } = require('./run-metricon-scrolling');

const app = express();
const port = process.env.PORT || 8899;
const execAsync = promisify(exec);

// Performance optimizations
const responseCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Middleware for performance
app.use(compression()); // Enable gzip compression
app.use(express.json({ limit: '10mb' })); // Increase JSON limit
app.use(express.static('.', {
    maxAge: '1h', // Cache static files for 1 hour
    etag: true,
    lastModified: true
}));

// Serve optimized dashboard first
app.get('/', (req, res) => {
    if (fsSync.existsSync(path.join(__dirname, 'dashboard-optimized.html'))) {
        res.sendFile(path.join(__dirname, 'dashboard-optimized.html'));
    } else {
        res.sendFile(path.join(__dirname, 'dashboard.html'));
    }
});

// Static file serving with caching
app.use('/safari-scrolling', express.static(path.join(__dirname, 'safari-scrolling'), {
    maxAge: '1h',
    etag: true
}));
app.use('/safari-reports', express.static(path.join(__dirname, 'safari-reports'), {
    maxAge: '1h',
    etag: true
}));
app.use('/test-results', express.static(path.join(__dirname, 'test-results'), {
    maxAge: '1h',
    etag: true
}));
app.use('/test-videos', express.static(path.join(__dirname, 'test-videos'), {
    maxAge: '1h',
    etag: true
}));

// Cache helper functions
function getCachedResponse(key) {
    const cached = responseCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }
    responseCache.delete(key);
    return null;
}

function setCachedResponse(key, data) {
    responseCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

// Async directory creation helper
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}

// Async file operations helper
async function writeConfigFile(configPath, data) {
    try {
        await fs.writeFile(configPath, JSON.stringify(data, null, 2));
        console.log('✅ Config file created successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to create config file:', error);
        return false;
    }
}

async function cleanupConfigFile(configPath) {
    try {
        await fs.access(configPath);
        await fs.unlink(configPath);
    } catch {
        // File doesn't exist, ignore
    }
}

// Optimized API endpoint to run performance tests
app.post('/api/run-tests', async (req, res) => {
    const startTime = Date.now();
    let configPath;
    
    try {
        const { urls, thresholds } = req.body;

        console.log('Received URLs:', urls);
        console.log('Received thresholds:', thresholds);

        if (!urls || urls.length === 0) {
            return res.status(400).json({ error: 'No URLs provided' });
        }

        console.log('Running performance tests for URLs:', urls);
        console.log('Using thresholds:', thresholds);

        // Write config to JSON file asynchronously
        configPath = path.join(__dirname, 'test-config.json');
        const configWritten = await writeConfigFile(configPath, { urls, thresholds });
        
        if (!configWritten) {
            return res.status(500).json({ error: 'Failed to create test-config.json' });
        }

        try {
            // Ensure lighthouse directory exists
            await ensureDirectoryExists(path.join(__dirname, 'lighthouse'));

            // Run performance tests with optimized settings
            const command = `npx playwright test performance.spec.ts --project=performance --reporter=list --workers=2`;
            console.log('Executing command:', command);

            const { stdout, stderr } = await execAsync(command, {
                timeout: 300000, // 5 minutes timeout
                maxBuffer: 1024 * 1024 * 20, // 20MB buffer (increased)
                env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
            });

            console.log('Test stdout:', stdout);
            if (stderr && !stderr.includes('Warning')) {
                console.log('Test stderr:', stderr);
            }

            // Count generated reports asynchronously
            let reportCount = 0;
            const lighthouseDir = path.join(__dirname, 'lighthouse');

            try {
                const files = await fs.readdir(lighthouseDir);
                reportCount = files.filter(file => file.endsWith('.report.html')).length;
                console.log('Found report files:', files.filter(file => file.endsWith('.report.html')));
            } catch (error) {
                console.log('Error reading lighthouse directory:', error.message);
            }

            const executionTime = Date.now() - startTime;
            console.log(`Tests completed successfully in ${executionTime}ms`);
            console.log(`Generated ${reportCount} reports`);

            res.json({
                success: true,
                reportCount: reportCount,
                executionTime: executionTime,
                message: `Performance tests completed successfully for ${urls.length} URLs`,
                urls: urls
            });

        } finally {
            // Always clean up config file
            await cleanupConfigFile(configPath);
        }

    } catch (error) {
        console.error('Error running tests:', error);
        
        // Clean up config file on error
        if (configPath) {
            await cleanupConfigFile(configPath);
        }
        
        res.status(500).json({
            error: 'Failed to run tests',
            details: error.message || 'Unknown error occurred',
            command: error.cmd || 'Unknown command',
            executionTime: Date.now() - startTime
        });
    }
});

// Optimized scroll test endpoint
app.post('/api/run-scroll-test', async (req, res) => {
    const startTime = Date.now();
    let configPath;
    
    try {
        const config = req.body;

        if (!config.contractId) {
            return res.status(400).json({ error: 'Contract ID is required' });
        }

        console.log('Starting Safari iPhone 16 scrolling test...');

        configPath = path.join(__dirname, 'test-config.json');
        const configData = {
            scrollTest: true,
            loginUrl: config.loginUrl,
            dashboardUrl: config.dashboardUrl,
            contractId: config.contractId,
            email: config.email,
            password: config.password,
            orientation: config.orientation || 'portrait'
        };

        const configWritten = await writeConfigFile(configPath, configData);
        if (!configWritten) {
            return res.status(500).json({ error: 'Failed to create test-config.json' });
        }

        try {
            // Ensure directories exist
            await Promise.all([
                ensureDirectoryExists(path.join(__dirname, 'safari-scrolling')),
                ensureDirectoryExists(path.join(__dirname, 'test-results'))
            ]);

            // Run scroll test with optimized settings
            const command = `npx playwright test safari-scrolling.spec.ts --project=safari-iphone-16 --reporter=list --workers=1`;
            console.log('Executing scroll test command:', command);

            const { stdout, stderr } = await execAsync(command, {
                timeout: 300000,
                maxBuffer: 1024 * 1024 * 20,
                env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
            });

            console.log('Scroll test stdout:', stdout);
            if (stderr && !stderr.includes('Warning')) {
                console.log('Scroll test stderr:', stderr);
            }

            const executionTime = Date.now() - startTime;
            console.log(`Safari scrolling test completed in ${executionTime}ms`);

            res.json({
                success: true,
                executionTime: executionTime,
                message: 'Safari iPhone 16 scrolling test completed successfully'
            });

        } finally {
            await cleanupConfigFile(configPath);
        }

    } catch (error) {
        console.error('Error running scroll test:', error);
        
        if (configPath) {
            await cleanupConfigFile(configPath);
        }
        
        res.status(500).json({
            error: 'Failed to run scroll test',
            details: error.message,
            executionTime: Date.now() - startTime
        });
    }
});

// Optimized Metricon test endpoint
app.post('/api/run-metricon-test', async (req, res) => {
    const startTime = Date.now();
    let configPath;
    
    try {
        const config = req.body;

        if (!config.contractId) {
            return res.status(400).json({ error: 'Contract ID is required' });
        }

        console.log('Starting Metricon Dashboard test...');

        configPath = path.join(__dirname, 'test-config.json');
        const configData = {
            metriconTest: true,
            loginUrl: config.loginUrl,
            dashboardUrl: config.dashboardUrl,
            contractId: config.contractId,
            email: config.email,
            password: config.password,
            orientation: config.orientation || 'portrait'
        };

        const configWritten = await writeConfigFile(configPath, configData);
        if (!configWritten) {
            return res.status(500).json({ error: 'Failed to create test-config.json' });
        }

        try {
            // Ensure directories exist
            await Promise.all([
                ensureDirectoryExists(path.join(__dirname, 'safari-reports')),
                ensureDirectoryExists(path.join(__dirname, 'test-results'))
            ]);

            // Run Metricon test with optimized settings
            const command = `npx playwright test metricon-dashboard.spec.ts --project=safari-iphone-16 --reporter=list --workers=1`;
            console.log('Executing Metricon test command:', command);

            const { stdout, stderr } = await execAsync(command, {
                timeout: 300000,
                maxBuffer: 1024 * 1024 * 20,
                env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
            });

            console.log('Metricon test stdout:', stdout);
            if (stderr && !stderr.includes('Warning')) {
                console.log('Metricon test stderr:', stderr);
            }

            const executionTime = Date.now() - startTime;
            console.log(`Metricon Dashboard test completed in ${executionTime}ms`);

            res.json({
                success: true,
                executionTime: executionTime,
                message: 'Metricon Dashboard test completed successfully'
            });

        } finally {
            await cleanupConfigFile(configPath);
        }

    } catch (error) {
        console.error('Error running Metricon test:', error);
        
        if (configPath) {
            await cleanupConfigFile(configPath);
        }
        
        res.status(500).json({
            error: 'Failed to run Metricon test',
            details: error.message,
            executionTime: Date.now() - startTime
        });
    }
});

// Optimized reports endpoint with caching
app.get('/api/reports', async (req, res) => {
    try {
        const cacheKey = 'all-reports';
        const cached = getCachedResponse(cacheKey);
        
        if (cached) {
            return res.json(cached);
        }

        const allReports = await loadAllReports();
        setCachedResponse(cacheKey, allReports);
        
        res.json(allReports);
    } catch (error) {
        console.error('Error loading reports:', error);
        res.status(500).json({ error: 'Failed to load reports' });
    }
});

// Async report loading function
async function loadAllReports() {
    const directories = [
        { dir: 'lighthouse', type: 'lighthouse', label: 'Lighthouse' },
        { dir: 'safari-scrolling', type: 'scrolling', label: 'Safari Scrolling' },
        { dir: 'safari-reports', type: 'metricon', label: 'Metricon Dashboard' }
    ];

    const allReports = [];

    await Promise.all(directories.map(async ({ dir, type, label }) => {
        try {
            const dirPath = path.join(__dirname, dir);
            const files = await fs.readdir(dirPath);
            
            const reports = await Promise.all(
                files
                    .filter(file => file.endsWith('.html') || file.endsWith('.report.html'))
                    .map(async (file) => {
                        const filePath = path.join(dirPath, file);
                        const stats = await fs.stat(filePath);
                        
                        return {
                            name: file.replace(/\.(report\.)?html$/, ''),
                            filename: file,
                            path: `/${dir}/${file}`,
                            size: formatFileSize(stats.size),
                            date: stats.mtime.toLocaleDateString(),
                            type: type,
                            label: label,
                            hasArtifacts: await checkForArtifacts(file.replace(/\.(report\.)?html$/, ''))
                        };
                    })
            );
            
            allReports.push(...reports);
        } catch (error) {
            console.log(`Directory ${dir} not found or empty`);
        }
    }));

    // Sort by date (newest first)
    return allReports.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Check for test artifacts
async function checkForArtifacts(reportName) {
    const dirs = ['test-results', 'test-videos'];
    
    for (const dir of dirs) {
        try {
            const dirPath = path.join(__dirname, dir);
            const files = await fs.readdir(dirPath);
            if (files.some(file => file.includes(reportName))) {
                return true;
            }
        } catch {
            // Directory doesn't exist
        }
    }
    
    return false;
}

// Optimized delete report endpoint
app.delete('/api/reports/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        console.log('Attempting to delete report:', filename);

        const directories = ['lighthouse', 'safari-scrolling', 'safari-reports'];
        let deleted = false;

        await Promise.all(directories.map(async (dir) => {
            try {
                const filePath = path.join(__dirname, dir, filename);
                await fs.access(filePath);
                await fs.unlink(filePath);
                console.log(`Deleted: ${filePath}`);
                deleted = true;
            } catch {
                // File not found in this directory
            }
        }));

        if (!deleted) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Clear cache
        responseCache.clear();

        res.json({ success: true, message: `Report "${filename}" deleted successfully` });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

// Test artifacts endpoint with caching
app.get('/api/test-artifacts/:reportName', async (req, res) => {
    try {
        const { reportName } = req.params;
        const cacheKey = `artifacts-${reportName}`;
        const cached = getCachedResponse(cacheKey);
        
        if (cached) {
            return res.json(cached);
        }

        const artifacts = await loadTestArtifacts(reportName);
        setCachedResponse(cacheKey, artifacts);
        
        res.json(artifacts);
    } catch (error) {
        console.error('Error loading test artifacts:', error);
        res.status(500).json({ error: 'Failed to load test artifacts' });
    }
});

// Load test artifacts function
async function loadTestArtifacts(reportName) {
    const screenshots = [];
    const videos = [];

    // Check test-results for screenshots
    try {
        const testResultsPath = path.join(__dirname, 'test-results');
        const files = await fs.readdir(testResultsPath);
        
        await Promise.all(files
            .filter(file => file.includes(reportName) && (file.endsWith('.png') || file.endsWith('.jpg')))
            .map(async (file) => {
                const filePath = path.join(testResultsPath, file);
                const stats = await fs.stat(filePath);
                
                screenshots.push({
                    name: file,
                    path: `/test-results/${file}`,
                    size: stats.size,
                    type: determineScreenshotType(file)
                });
            })
        );
    } catch {
        // Directory doesn't exist
    }

    // Check test-videos for videos
    try {
        const testVideosPath = path.join(__dirname, 'test-videos');
        const files = await fs.readdir(testVideosPath);
        
        await Promise.all(files
            .filter(file => file.includes(reportName) && file.endsWith('.webm'))
            .map(async (file) => {
                const filePath = path.join(testVideosPath, file);
                const stats = await fs.stat(filePath);
                
                videos.push({
                    name: file,
                    path: `/test-videos/${file}`,
                    size: stats.size
                });
            })
        );
    } catch {
        // Directory doesn't exist
    }

    return { screenshots, videos };
}

// Helper functions
function determineScreenshotType(filename) {
    if (filename.includes('initial')) return 'initial';
    if (filename.includes('scroll')) return 'scroll';
    if (filename.includes('debug')) return 'debug';
    if (filename.includes('before_login')) return 'before_login';
    if (filename.includes('after_login')) return 'after_login';
    return 'other';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cacheSize: responseCache.size,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Cleanup cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            responseCache.delete(key);
        }
    }
}, CACHE_TTL);

// Start server
app.listen(port, () => {
    console.log(`🚀 Optimized Performance Dashboard server running on http://localhost:${port}`);
    console.log(`📊 Performance optimizations enabled:`);
    console.log(`   - Gzip compression: ✅`);
    console.log(`   - Response caching: ✅`);
    console.log(`   - Async file operations: ✅`);
    console.log(`   - Static file caching: ✅`);
    console.log(`   - Optimized buffer sizes: ✅`);
});

module.exports = app;