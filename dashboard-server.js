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

        if (!urls || urls.length === 0) {
            return res.status(400).json({ error: 'No URLs provided' });
        }

        console.log('Running performance tests for URLs:', urls);
        console.log('Using thresholds:', thresholds);

        // Write config to JSON file for the test to read
        const configPath = path.join(__dirname, 'test-config.json');
        fs.writeFileSync(configPath, JSON.stringify({ urls, thresholds }, null, 2));

        try {
            // Run the existing performance.spec.ts
            const command = `npx playwright test performance.spec.ts --project=performance --reporter=json`;
            const { stdout, stderr } = await execAsync(command);

            // Parse the test results
            let testResults;
            try {
                testResults = JSON.parse(stdout);
            } catch (parseError) {
                console.error('Error parsing test results:', parseError);
                return res.status(500).json({ error: 'Error parsing test results', details: parseError.message });
            }

            console.log('Tests completed successfully');
            res.json({ success: true, testResults: testResults.suites || [] });

        } finally {
            // Always clean up config file
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        }

    } catch (error) {
        console.error('Error running tests:', error);
        res.status(500).json({ error: 'Failed to run tests', details: error.message || 'Unknown error occurred' });
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



// Start the server
app.listen(port, () => {
    console.log(`🚀 Page Speed Dashboard running at http://localhost:${port}`);
    console.log('📊 Dashboard features:');
    console.log('  • Add/remove URLs dynamically');
    console.log('  • Configure performance thresholds');
    console.log('  • Run Playwright + Lighthouse tests');
    console.log('  • View generated reports');
    console.log('');
    console.log('💡 Make sure you have the following dependencies installed:');
    console.log('  npm install express playwright playwright-lighthouse');
});

module.exports = app; 