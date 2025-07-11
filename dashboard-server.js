const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const app = express();
const port = 3000;
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
            // Run only the performance.spec.ts file
            const command = `npx playwright test performance.spec.ts --reporter=list`;
            console.log('Executing command:', command);
            
            const { stdout, stderr } = await execAsync(command, { 
                timeout: 300000, // 5 minutes timeout
                maxBuffer: 1024 * 1024 // 1MB buffer
            });

            console.log('Test stdout:', stdout);
            if (stderr) {
                console.log('Test stderr:', stderr);
            }

            // Count generated reports
            let reportCount = 0;
            if (fs.existsSync('lighthouse')) {
                const subdirs = fs.readdirSync('lighthouse', { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory());
                
                subdirs.forEach(subdir => {
                    const subdirPath = path.join('lighthouse', subdir.name);
                    const files = fs.readdirSync(subdirPath);
                    reportCount += files.filter(file => file.endsWith('.html')).length;
                });
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

// API endpoint to get available reports
app.get('/api/reports', (req, res) => {
    try {
        const reports = [];
        
        // Check for performance reports
        const performanceReportsDir = path.join(__dirname, 'performance-reports');
        if (fs.existsSync(performanceReportsDir)) {
            const indexPath = path.join(performanceReportsDir, 'index.html');
            if (fs.existsSync(indexPath)) {
                reports.push({
                    name: 'Performance Reports Dashboard',
                    url: 'Multiple URLs',
                    date: fs.statSync(indexPath).mtime,
                    path: '/performance-reports/index.html'
                });
            }
        }

        // Check for lighthouse reports
        const lighthouseDir = path.join(__dirname, 'lighthouse');
        if (fs.existsSync(lighthouseDir)) {
            const subdirs = fs.readdirSync(lighthouseDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            subdirs.forEach(subdir => {
                const subdirPath = path.join(lighthouseDir, subdir);
                const files = fs.readdirSync(subdirPath);
                const htmlReports = files.filter(file => file.endsWith('.html'));
                
                htmlReports.forEach(report => {
                    const reportPath = path.join(subdirPath, report);
                    const stats = fs.statSync(reportPath);
                    
                    reports.push({
                        name: `${subdir} - ${report}`,
                        url: subdir,
                        date: stats.mtime,
                        path: `/lighthouse/${subdir}/${report}`
                    });
                });
            });
        }

        // Sort reports by date (newest first)
        reports.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(reports);
    } catch (error) {
        console.error('Error getting reports:', error);
        res.status(500).json({ error: 'Failed to get reports' });
    }
});

app.get('/reports', (req, res) => {
  const reportsDir = path.join(__dirname, 'lighthouse');
  fs.readdir(reportsDir, (err, files) => {
    if (err) {
      return res.status(500).send('Error reading reports directory.');
    }
    const reports = files.filter(file => file.endsWith('.report.html'));
    res.json(reports);
  });
});


// Start the server
const server = app.listen(3000, () => {
    console.log('Dashboard server is running on port 3000');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('Port 3000 is already in use. Please free the port and restart the server.');
        process.exit(1);
    }
});

module.exports = app; 