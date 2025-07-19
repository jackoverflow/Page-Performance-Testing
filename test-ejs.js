const express = require('express');
const path = require('path');

const app = express();
const port = 3004;

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Simple test route
app.get('/', (req, res) => {
  res.render('test', { message: 'EJS is working!' });
});

// Start server
app.listen(port, () => {
  console.log(`Test EJS server running at http://localhost:${port}`);
});