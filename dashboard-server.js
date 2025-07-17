const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const app = express();
const port = process.env.PORT || 3001;
const execAsync = promisify(exec);

// Middleware
app.use(express.json());
app.use(express.static('.'));

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

        if (!urls || urls.length === 0) {
            return res.status(400).json({ error: 'No URLs provided' });
        }

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

// Endpoint to fetch reports dynamically
app.get('/api/reports', (req, res) => {
    const reportsDir = path.join(__dirname, 'lighthouse');
    
    if (!fs.existsSync(reportsDir)) {
        return res.json([]);
    }
    
    fs.readdir(reportsDir, (err, files) => {
        if (err) {
            console.error('Error reading reports directory:', err);
            return res.status(500).send('Error reading reports directory');
        }

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
                const timestamp = parts.slice(1).join('_') || 'unknown';
                
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

        console.log('Found reports:', reports);
        res.json(reports);
    });
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
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please free the port and restart the server.`);
        process.exit(1);
    }
});

module.exports = app; 