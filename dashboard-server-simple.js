const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const methodOverride = require('method-override');

const app = express();
const port = 3002;
const execAsync = promisify(exec);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.use('/lighthouse', express.static('lighthouse'));

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create lighthouse directory if it doesn't exist
const lighthouseDir = path.join(__dirname, 'lighthouse');
if (!fs.existsSync(lighthouseDir)) {
    fs.mkdirSync(lighthouseDir, { recursive: true });
    console.log('Created lighthouse directory');
}

// Get reports
function getReports() {
    if (!fs.existsSync(lighthouseDir)) {
        return [];
    }
    
    try {
        const files = fs.readdirSync(lighthouseDir);
        return files
            .filter(file => file.endsWith('.report.html'))
            .map(file => {
                const stats = fs.statSync(path.join(lighthouseDir, file));
                const baseName = file.replace('.report.html', '');
                const parts = baseName.split('_');
                const hostname = parts[0] || 'unknown';
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
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (err) {
        console.error('Error reading reports:', err);
        return [];
    }
}

// Dashboard route
app.get('/', (req, res) => {
    const reports = getReports();
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
});

// Run tests
app.post('/run-tests', async (req, res) => {
    try {
        let urls = req.body['urls[]'];
        if (!Array.isArray(urls)) {
            urls = [urls].filter(Boolean);
        }
        
        if (!urls || urls.length === 0) {
            return res.redirect('/?message=No URLs provided&type=error');
        }

        const thresholds = {
            performance: parseInt(req.body.performanceThreshold) || 75,
            accessibility: parseInt(req.body.accessibilityThreshold) || 90,
            seo: parseInt(req.body.seoThreshold) || 85
        };

        // Write config
        const configPath = path.join(__dirname, 'test-config.json');
        fs.writeFileSync(configPath, JSON.stringify({ urls, thresholds }, null, 2));

        try {
            // Run tests
            const command = `npx playwright test performance.spec.ts --project=performance`;
            await execAsync(command, { timeout: 300000 });
            
            // Count reports
            const files = fs.readdirSync(lighthouseDir);
            const reportCount = files.filter(file => file.endsWith('.report.html')).length;
            
            return res.redirect(`/?message=Tests completed successfully. Generated ${reportCount} reports.&type=success`);
        } finally {
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        }
    } catch (error) {
        console.error('Error running tests:', error);
        return res.redirect(`/?message=Test error: ${error.message}&type=error`);
    }
});

// Delete report
app.post('/delete-report/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(lighthouseDir, filename);
    
    if (!filename.endsWith('.report.html') || filename.includes('..')) {
        return res.redirect('/?message=Invalid filename&type=error');
    }
    
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return res.redirect('/?message=Report deleted successfully&type=success');
        } else {
            return res.redirect('/?message=Report not found&type=error');
        }
    } catch (error) {
        return res.redirect(`/?message=Delete error: ${error.message}&type=error`);
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});