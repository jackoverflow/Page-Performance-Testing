const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const methodOverride = require('method-override');

const app = express();
const port = process.env.PORT || 3002;
const execAsync = promisify(exec);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.use('/lighthouse', express.static('lighthouse'));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Function to get reports
async function getReports() {
    const reportsDir = path.join(__dirname, 'lighthouse');
    
    if (!fs.existsSync(reportsDir)) {
        return [];
    }
    
    try {
        const files = await fs.promises.readdir(reportsDir);
        
        // Filter for HTML report files and create proper report objects
        const reports = files
            .filter(file => file.endsWith('.report.html'))
            .map(file => {
                const filePath = path.join(reportsDir, file);
                const stats = fs.statSync(filePath);
                
                // Parse filename to extract hostname and timestamp
                const baseName = file.replace('.report.html', '');
                const parts = baseName.split('_');
                const hostname = parts[0] || 'unknown';
                
                // Reconstruct URL from hostname (best guess)
                const url = hostname.includes('_') ? 
                    `https://${hostname.replace(/_/g, '.')}` : 
                    `https://${hostname}`;
                
                return {
                    name: file,
                    url: url,
                    date: stats.mtime.toISOString(),
                    path: `/lighthouse/${file}`
                };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by newest first

        return reports;
    } catch (err) {
        console.error('Error reading reports directory:', err);
        return [];
    }
}

// Serve the dashboard
app.get('/', async (req, res) => {
    try {
        // Get reports for initial render
        const reports = await getReports();
        
        // Render the dashboard with initial data
        res.render('dashboard', {
            reports: reports,
            urls: [],
            thresholds: {
                performance: 75,
                accessibility: 90,
                seo: 85
            },
            message: req.query.message || null,
            messageType: req.query.type || 'info'
        });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// Handle form submission for running tests
app.post('/run-tests', async (req, res) => {
    try {
        // Get URLs from form data (handle both array and single value)
        let urls = req.body['urls[]'];
        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        
        // Filter out empty URLs
        urls = urls.filter(url => url && url.trim().length > 0);
        
        // Get thresholds from form data
        const thresholds = {
            performance: parseInt(req.body.performanceThreshold) || 75,
            accessibility: parseInt(req.body.accessibilityThreshold) || 90,
            seo: parseInt(req.body.seoThreshold) || 85
        };

        console.log('Received URLs:', urls);
        console.log('Received thresholds:', thresholds);

        if (!urls || urls.length === 0) {
            return res.redirect('/?message=No URLs provided&type=error');
        }

        console.log('Running performance tests for URLs:', urls);
        console.log('Using thresholds:', thresholds);

        // Write config to JSON file for the test to read
        const configPath = path.join(__dirname, 'test-config.json');
        fs.writeFileSync(configPath, JSON.stringify({ urls, thresholds }, null, 2));

        // Check if the config file was created successfully
        if (!fs.existsSync(configPath)) {
            console.error('❌ Failed to create test-config.json');
            return res.redirect('/?message=Failed to create test configuration&type=error');
        }

        console.log('✅ Config file created successfully');

        try {
            // Run only the performance.spec.ts file with the performance project
            const command = `npx playwright test performance.spec.ts --project=performance --reporter=list`;
            console.log('Executing command:', command);
            
            const result = await execAsync(command, { 
                timeout: 300000, // 5 minutes timeout
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            console.log('Test stdout:', result.stdout);
            if (result.stderr) {
                console.log('Test stderr:', result.stderr);
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
            
            // Redirect back to dashboard with success message
            return res.redirect(`/?message=Performance tests completed successfully for ${urls.length} URLs. Generated ${reportCount} reports.&type=success`);

        } finally {
            // Always clean up config file
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        }

    } catch (error) {
        console.error('Error running tests:', error);
        return res.redirect(`/?message=Failed to run tests: ${error.message}&type=error`);
    }
});

// Handle form submission for deleting a report
app.post('/delete-report/:filename', (req, res) => {
    const filename = req.params.filename;
    const reportsDir = path.join(__dirname, 'lighthouse');
    const filePath = path.join(reportsDir, filename);
    
    // Validate filename to prevent directory traversal
    if (!filename.endsWith('.report.html') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.redirect('/?message=Invalid filename&type=error');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.redirect('/?message=Report not found&type=error');
    }
    
    try {
        fs.unlinkSync(filePath);
        console.log(`Deleted report: ${filename}`);
        return res.redirect(`/?message=Report ${filename} deleted successfully&type=success`);
    } catch (error) {
        console.error('Error deleting report:', error);
        return res.redirect(`/?message=Failed to delete report: ${error.message}&type=error`);
    }
});

// API endpoints for backward compatibility
app.get('/api/reports', async (req, res) => {
    try {
        const reports = await getReports();
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: 'Error reading reports directory' });
    }
});

app.post('/api/run-tests', async (req, res) => {
    try {
        const { urls, thresholds } = req.body;

        if (!urls || urls.length === 0) {
            return res.status(400).json({ error: 'No URLs provided' });
        }

        // Write config to JSON file for the test to read
        const configPath = path.join(__dirname, 'test-config.json');
        fs.writeFileSync(configPath, JSON.stringify({ urls, thresholds }, null, 2));

        try {
            // Run only the performance.spec.ts file with the performance project
            const command = `npx playwright test performance.spec.ts --project=performance --reporter=list`;
            
            const result = await execAsync(command, { 
                timeout: 300000, // 5 minutes timeout
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            // Count generated reports directly in lighthouse directory
            let reportCount = 0;
            const lighthouseDir = path.join(__dirname, 'lighthouse');
            
            if (fs.existsSync(lighthouseDir)) {
                const files = fs.readdirSync(lighthouseDir);
                reportCount = files.filter(file => file.endsWith('.report.html')).length;
            }
            
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

app.delete('/api/reports/:filename', (req, res) => {
    const filename = req.params.filename;
    const reportsDir = path.join(__dirname, 'lighthouse');
    const filePath = path.join(reportsDir, filename);
    
    // Validate filename to prevent directory traversal
    if (!filename.endsWith('.report.html') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Report not found' });
    }
    
    try {
        fs.unlinkSync(filePath);
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
    console.log(`Open http://localhost:${port} in your browser`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please free the port and restart the server.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});

module.exports = app;