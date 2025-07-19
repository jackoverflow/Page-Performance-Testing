const express = require('express');
const path = require('path');

const app = express();
const port = 3003;

// Basic middleware
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Simple route that just renders the dashboard
app.get('/', (req, res) => {
  res.render('dashboard', {
    reports: [],
    urls: ['https://example.com'],
    thresholds: {
      performance: 75,
      accessibility: 90,
      seo: 85
    },
    message: 'Server is working!',
    messageType: 'success'
  });
});

// Start server
app.listen(port, () => {
  console.log(`Minimal server running at http://localhost:${port}`);
});