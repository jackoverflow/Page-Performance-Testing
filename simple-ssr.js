const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3007;

// Create lighthouse directory if needed
const lighthouseDir = path.join(__dirname, 'lighthouse');
if (!fs.existsSync(lighthouseDir)) {
  fs.mkdirSync(lighthouseDir, { recursive: true });
}

// Basic middleware
app.use(express.urlencoded({ extended: true }));
app.use('/lighthouse', express.static('lighthouse'));

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Get reports
function getReports() {
  try {
    if (!fs.existsSync(lighthouseDir)) return [];
    
    return fs.readdirSync(lighthouseDir)
      .filter(file => file.endsWith('.report.html'))
      .map(file => ({
        name: file,
        url: 'https://example.com',
        path: `/lighthouse/${file}`
      }));
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Main route
app.get('/', (req, res) => {
  res.render('simple', {
    reports: getReports(),
    message: req.query.message || null
  });
});

// Run tests route (simplified)
app.post('/run-tests', (req, res) => {
  // Just redirect with a message for testing
  res.redirect('/?message=Test functionality would run here');
});

// Start server
app.listen(port, () => {
  console.log(`Simple SSR server running at http://localhost:${port}`);
});