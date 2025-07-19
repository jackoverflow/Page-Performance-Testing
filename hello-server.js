const express = require('express');
const app = express();
const port = 3008;

app.get('/', (req, res) => {
  res.send('<h1>Hello World!</h1><p>Server is working correctly.</p>');
});

app.listen(port, () => {
  console.log(`Hello server running at http://localhost:${port}`);
});

// Handle any errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});