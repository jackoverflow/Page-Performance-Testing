const express = require('express');
const app = express();
const port = 3006;

// Serve static files
app.use(express.static('public'));

// Serve the original dashboard.html file directly
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/dashboard.html');
});

// Start server
app.listen(port, () => {
  console.log(`Basic server running at http://localhost:${port}`);
});