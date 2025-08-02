const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { runMetriconScrollingTest } = require('./run-metricon-scrolling');

const app = express();
const port = process.env.PORT || 8899;
const execAsync = promisify(exec);

// Middleware
app.use(express.json());
app.use(express.static('.'));
app.use('/safari-scrolling', express.static(path.join(__dirname, 'safari-scrolling')));
app.use('/safari-reports', express.static(path.join(__dirname, 'safari-reports')));
app.use('/test-results', express.static(path.join(__dirname, 'test-results')));
app.use('/test-videos', express.static(path.join(__dirname, 'test-videos')));

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API endpoint to run performance tests
app.post('/api/run-tests', async (req, res) => {
    try {
        const { urls, thresholds } = req.body;

        console.log('Received URLs:', urls); // Debugging log
        console.log('Received thresholds:', thresholds); // Debugging log

        // URLs are not required for scrolling tests since Dashboard URL and Contract ID are used

        console.log('Running performance tests for URLs:', urls);
        console.log('Using thresholds:', thresholds);

        // Write config to JSON file for the test to read
        const configPath = path.join(__dirname, 'test-config.json');
        fs.writeFileSync(configPath, JSON.stringify({ urls, thresholds }, null, 2));

        // Check if the config file was created successfully
        if (!fs.existsSync(configPath)) {
            console.error('❌ Failed to create test-config.json');
            return res.status(500).json({ error: 'Failed to create test-config.json' });
        }

        console.log('✅ Config file created successfully');

        try {
            // Run only the performance.spec.ts file with the performance project
            const command = `npx playwright test performance.spec.ts --project=performance --reporter=list`;
            console.log('Executing command:', command);

            const { stdout, stderr } = await execAsync(command, {
                timeout: 300000, // 5 minutes timeout
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            console.log('Test stdout:', stdout);
            if (stderr) {
                console.log('Test stderr:', stderr);
            }

            // Count generated reports directly in lighthouse directory
            let reportCount = 0;
            const lighthouseDir = path.join(__dirname, 'lighthouse');

            if (fs.existsSync(lighthouseDir)) {
                const files = fs.readdirSync(lighthouseDir);
                reportCount = files.filter(file => file.endsWith('.report.html')).length;
                console.log('Found report files:', files.filter(file => file.endsWith('.report.html')));
            }

            console.log('Tests completed successfully');
            console.log(`Generated ${reportCount} reports`);

            res.json({
                success: true,
                reportCount: reportCount,
                message: `Performance tests completed successfully for ${urls.length} URLs`,
                urls: urls
            });

        } finally {
            // Always clean up config file
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        }

    } catch (error) {
        console.error('Error running tests:', error);
        res.status(500).json({
            error: 'Failed to run tests',
            details: error.message || 'Unknown error occurred',
            command: error.cmd || 'Unknown command'
        });
    }
});

// API endpoint to run Safari iPhone 16 scrolling tests
app.post('/api/run-scrolling-tests', async (req, res) => {
    try {
        const { urls, thresholds, scrollingConfig } = req.body;

        console.log('Received URLs for scrolling tests:', urls); // Debugging log
        console.log('Received thresholds for scrolling tests:', thresholds); // Debugging log
        console.log('Received scrolling config:', scrollingConfig); // Debugging log

        // URLs are not required for scrolling tests since Dashboard URL and Contract ID are used

        // Ensure safari-scrolling directory exists
        const scrollingReportsDir = path.join(__dirname, 'safari-scrolling');
        if (!fs.existsSync(scrollingReportsDir)) {
            fs.mkdirSync(scrollingReportsDir, { recursive: true });
            console.log(`Created safari-scrolling directory: ${scrollingReportsDir}`);
        }

        // Ensure config file is created with scrolling configuration
        const configPath = path.join(__dirname, 'test-config.json');
        console.log('Creating test-config.json at:', configPath);

        const configData = { 
            thresholds,
            scrollingConfig: {
                ...(scrollingConfig || {}),
                loginUrl: 'https://mymetricon-nextjs-dev.vercel.app/',
                dashboardUrl: scrollingConfig?.dashboardUrl || 'https://mymetricon-nextjs-dev.vercel.app/dashboard/select-contract',
                contractId: scrollingConfig?.contractId || '',
                email: 'pio@ypdigital.com.au',
                password: 'YPD1g1t4l*',
                orientation: 'portrait'
            }
        };

        try {
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
            console.log('test-config.json content:', fs.readFileSync(configPath, 'utf8'));
        } catch (writeError) {
            console.error('Error writing test-config.json:', writeError);
            return res.status(500).json({ error: 'Failed to create test-config.json', details: writeError.message });
        }

        if (!fs.existsSync(configPath)) {
            throw new Error('Failed to create test-config.json');
        }

        // Use the Metricon test if the loginUrl or dashboardUrl contains 'mymetricon-nextjs-dev.vercel.app'
        const isMetriconUrl = (scrollingConfig.loginUrl && scrollingConfig.loginUrl.includes('mymetricon-nextjs-dev.vercel.app')) || 
                            (scrollingConfig.dashboardUrl && scrollingConfig.dashboardUrl.includes('mymetricon-nextjs-dev.vercel.app'));
        
        if (isMetriconUrl) {
            // Use specialized Metricon test
            const command = `npx playwright test metricon-scrolling.spec.ts --project=safari-scrolling --reporter=list`;
            console.log('Executing Metricon command:', command);
            
            try {
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 300000, // 5 minutes timeout
                    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                });
                
                console.log('Metricon test stdout:', stdout);
                
                if (stderr && !stderr.includes('Warning')) {
                    console.error('Error running Metricon scrolling tests:', stderr);
                    return res.status(500).json({ error: 'Error running Metricon scrolling tests', details: stderr });
                }
            } catch (execError) {
                console.error('Error executing Metricon command:', execError);
                return res.status(500).json({ 
                    error: 'Failed to execute Metricon scrolling tests', 
                    details: execError.message || 'Unknown error occurred',
                    command: execError.cmd || 'Unknown command'
                });
            }
        } else {
            // Use regular safari-scrolling test for other URLs
            const command = `npx playwright test safari-scrolling.spec.ts --project=safari-scrolling --reporter=list`;
            console.log('Executing regular scrolling command:', command);

            try {
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 300000, // 5 minutes timeout
                    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                });

                console.log('Regular test stdout:', stdout);

                if (stderr && !stderr.includes('Warning')) {
                    console.error('Error running regular scrolling tests:', stderr);
                    return res.status(500).json({ error: 'Error running regular scrolling tests', details: stderr });
                }
            } catch (execError) {
                console.error('Error executing regular command:', execError);
                return res.status(500).json({
                    error: 'Failed to execute regular scrolling tests',
                    details: execError.message || 'Unknown error occurred',
                    command: execError.cmd || 'Unknown command'
                });
            }
        }

        // Count reports and respond
        let reportCount = 0;

        if (fs.existsSync(scrollingReportsDir)) {
            const files = fs.readdirSync(scrollingReportsDir);
            reportCount = files.filter(file => file.endsWith('.report.html')).length;
            console.log('Found scrolling report files:', files.filter(file => file.endsWith('.report.html')));
        }

        console.log('Scrolling tests completed successfully');
        console.log(`Generated ${reportCount} scrolling reports`);

        res.json({
            success: true,
            reportCount: reportCount,
            message: `Safari iPhone 16 scrolling tests completed successfully`,
            dashboardUrl: scrollingConfig.dashboardUrl,
            contractId: scrollingConfig.contractId
        });

    } catch (error) {
        console.error('Error in scrolling tests endpoint:', error);
        res.status(500).json({ error: 'Failed to run scrolling tests', details: error.message });
    } finally {
        // Clean up config file
        const configPath = path.join(__dirname, 'test-config.json');
        if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
        }
    }
});

// API endpoint to run Metricon Dashboard test
app.post('/api/run-metricon-test', async (req, res) => {
    try {
        console.log('Running Metricon Dashboard test');

        // Run the Metricon dashboard test command
        const command = `npx playwright test metricon-dashboard.spec.ts --project=metricon-dashboard --reporter=list`;
        const { stdout, stderr } = await execAsync(command, {
            timeout: 300000, // 5 minutes timeout
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        console.log('Test stdout:', stdout);
        if (stderr) {
            console.log('Test stderr:', stderr);
        }

        // Count reports and respond
        let reportCount = 0;
        const reportsDir = path.join(__dirname, 'safari-reports');

        if (fs.existsSync(reportsDir)) {
            const files = fs.readdirSync(reportsDir);
            reportCount = files.filter(file => file.endsWith('.report.html')).length;
            console.log('Found Metricon report files:', files.filter(file => file.endsWith('.report.html')));
        }

        console.log('Metricon Dashboard test completed successfully');
        console.log(`Generated ${reportCount} reports`);

        res.json({
            success: true,
            reportCount: reportCount,
            message: `Metricon Dashboard test completed successfully`,
            url: 'https://mymetricon-nextjs-dev.vercel.app/dashboard/752662'
        });

    } catch (error) {
        console.error('Error running Metricon Dashboard test:', error);
        res.status(500).json({
            error: 'Failed to run Metricon Dashboard test',
            details: error.message || 'Unknown error occurred',
            command: error.cmd || 'Unknown command'
        });
    }
});

// API endpoint to get test artifacts (screenshots and videos)
app.get('/api/test-artifacts/:reportName', (req, res) => {
    const reportName = req.params.reportName;
    const artifacts = {
        screenshots: [],
        videos: [],
        reportPath: ''
    };

    try {
        // Extract base name from report filename
        const baseName = reportName.replace('.report.html', '').replace('_scrolling', '');
        
        // Check safari-scrolling directory for screenshots
        const safariScrollingDir = path.join(__dirname, 'safari-scrolling');
        if (fs.existsSync(safariScrollingDir)) {
            const files = fs.readdirSync(safariScrollingDir);
            
            // Find related screenshots
            const relatedScreenshots = files.filter(file => 
                file.startsWith(baseName) && file.endsWith('.png')
            );
            
            artifacts.screenshots = relatedScreenshots.map(file => ({
                name: file,
                path: `/safari-scrolling/${file}`,
                type: file.includes('initial') ? 'initial' : 
                      file.includes('scroll_') ? 'scroll' : 
                      file.includes('debug') ? 'debug' :
                      file.includes('before_submit') ? 'before_login' :
                      file.includes('after_login') ? 'after_login' : 'other'
            }));
            
            // Set report path
            if (files.includes(reportName)) {
                artifacts.reportPath = `/safari-scrolling/${reportName}`;
            }
        }

        // Check test-results directory for videos
        const testResultsDir = path.join(__dirname, 'test-results');
        if (fs.existsSync(testResultsDir)) {
            const findVideos = (dir) => {
                const items = fs.readdirSync(dir, { withFileTypes: true });
                let videos = [];
                
                for (const item of items) {
                    const fullPath = path.join(dir, item.name);
                    if (item.isDirectory()) {
                        videos = videos.concat(findVideos(fullPath));
                    } else if (item.name.endsWith('.webm') || item.name.endsWith('.mp4')) {
                        const relativePath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
                        const stats = fs.statSync(fullPath);
                        videos.push({
                            name: item.name,
                            path: `/${relativePath}`,
                            size: stats.size,
                            date: stats.mtime.toISOString()
                        });
                    }
                }
                return videos;
            };
            
            // Get all videos and filter for recent ones related to this test
            const allVideos = findVideos(testResultsDir);
            console.log('Found all videos:', allVideos);
            
            // For now, include all videos (we can filter later if needed)
            artifacts.videos = allVideos;
        }

        res.json(artifacts);
    } catch (error) {
        console.error('Error getting test artifacts:', error);
        res.status(500).json({ error: 'Failed to get test artifacts' });
    }
});

// Endpoint to fetch reports dynamically
app.get('/api/reports', (req, res) => {
    const lighthouseDir = path.join(__dirname, 'lighthouse');
    const scrollingDir = path.join(__dirname, 'safari-scrolling');
    const metriconDir = path.join(__dirname, 'safari-reports');

    let allReports = [];

    // Helper function to process reports from a directory
    const processReportsFromDir = (dir, pathPrefix, reportType) => {
        if (!fs.existsSync(dir)) {
            return [];
        }

        try {
            const files = fs.readdirSync(dir);
            return files
                .filter(file => file.endsWith('.report.html'))
                .map(file => {
                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);

                    // Parse filename to extract hostname and timestamp
                    const baseName = file.replace('.report.html', '');
                    let hostname, url;

                    if (reportType === 'scrolling') {
                        // Scrolling reports: hostname_timestamp_scrolling.report.html
                        const parts = baseName.replace('_scrolling', '').split('_');
                        hostname = parts[0] || 'unknown';
                        url = hostname.includes('_') ?
                            `https://${hostname.replace(/_/g, '.')}` :
                            `https://${hostname}`;
                    } else if (reportType === 'metricon') {
                        // Metricon reports: mymetricon_nextjs_dev_dashboard_timestamp_scrolling.report.html
                        hostname = 'mymetricon-nextjs-dev';
                        url = 'https://mymetricon-nextjs-dev.vercel.app/dashboard/752662';
                    } else {
                        // Lighthouse reports: hostname_timestamp.report.html
                        const parts = baseName.split('_');
                        hostname = parts[0] || 'unknown';
                        url = hostname.includes('_') ?
                            `https://${hostname.replace(/_/g, '.')}` :
                            `https://${hostname}`;
                    }

                    // Count related artifacts
                    let screenshotCount = 0;
                    let videoCount = 0;
                    
                    if (reportType === 'scrolling') {
                        const baseName = file.replace('_scrolling.report.html', '');
                        const dirFiles = fs.readdirSync(dir);
                        screenshotCount = dirFiles.filter(f => f.startsWith(baseName) && f.endsWith('.png')).length;
                        
                        // Count videos in test-results directory
                        const testResultsDir = path.join(__dirname, 'test-results');
                        if (fs.existsSync(testResultsDir)) {
                            const findVideoCount = (searchDir) => {
                                let count = 0;
                                try {
                                    const items = fs.readdirSync(searchDir, { withFileTypes: true });
                                    for (const item of items) {
                                        const fullPath = path.join(searchDir, item.name);
                                        if (item.isDirectory()) {
                                            count += findVideoCount(fullPath);
                                        } else if (item.name.endsWith('.webm') || item.name.endsWith('.mp4')) {
                                            count++;
                                        }
                                    }
                                } catch (error) {
                                    console.error('Error counting videos:', error);
                                }
                                return count;
                            };
                            videoCount = findVideoCount(testResultsDir);
                        }
                    }

                    return {
                        name: file,
                        url: url,
                        date: stats.mtime.toISOString(),
                        path: `/${pathPrefix}/${file}`,
                        type: reportType,
                        screenshotCount: screenshotCount,
                        videoCount: videoCount
                    };
                });
        } catch (error) {
            console.error(`Error reading ${reportType} reports directory:`, error);
            return [];
        }
    };

    // Get reports from all directories
    const lighthouseReports = processReportsFromDir(lighthouseDir, 'lighthouse', 'lighthouse');
    const scrollingReports = processReportsFromDir(scrollingDir, 'safari-scrolling', 'scrolling');
    const metriconReports = processReportsFromDir(metriconDir, 'safari-reports', 'metricon');

    // Combine and sort all reports by date (newest first)
    allReports = [...lighthouseReports, ...scrollingReports, ...metriconReports]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log('Found reports:', allReports);
    res.json(allReports);
});

app.get('/reports', (req, res) => {
    const reportsDir = path.join(__dirname, 'lighthouse');

    if (!fs.existsSync(reportsDir)) {
        return res.json([]);
    }

    fs.readdir(reportsDir, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading reports directory.');
        }
        const reports = files.filter(file => file.endsWith('.report.html'));
        console.log('Reports endpoint found:', reports);
        res.json(reports);
    });
});

// Endpoint to delete a specific report
app.delete('/api/reports/:filename', (req, res) => {
    const filename = req.params.filename;

    // Validate filename to prevent directory traversal
    if (!filename.endsWith('.report.html') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    // Determine which directory based on filename
    let reportsDir;
    if (filename.includes('scrolling')) {
        reportsDir = path.join(__dirname, 'safari-scrolling');
    } else {
        reportsDir = path.join(__dirname, 'lighthouse');
    }

    const filePath = path.join(reportsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Report not found' });
    }

    try {
        fs.unlinkSync(filePath);

        // Also try to delete associated screenshots for scrolling reports
        if (filename.includes('scrolling')) {
            const baseFileName = filename.replace('_scrolling.report.html', '');
            const files = fs.readdirSync(reportsDir);

            // Delete initial and scroll screenshots
            files.forEach(file => {
                if (file.startsWith(baseFileName) && file.endsWith('.png')) {
                    const screenshotPath = path.join(reportsDir, file);
                    try {
                        fs.unlinkSync(screenshotPath);
                        console.log(`Also deleted screenshot: ${file}`);
                    } catch (err) {
                        console.log(`Could not delete screenshot ${file}:`, err.message);
                    }
                }
            });
        }

        console.log(`Deleted report: ${filename}`);
        res.json({ success: true, message: `Report ${filename} deleted successfully` });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

// Start the server
const server = app.listen(port, () => {
    console.log(`Dashboard server is running on port ${port}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please free the port and restart the server.`);
        process.exit(1);
    }
});

module.exports = app;