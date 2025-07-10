# 🚀 Page Speed Testing Dashboard

A modern web dashboard for running Page Speed tests using Playwright and Lighthouse. This dashboard provides an intuitive interface to test multiple URLs and view performance reports.

## ✨ Features

- **Dynamic URL Management**: Add/remove URLs with a clean interface
- **Configurable Thresholds**: Set custom performance, accessibility, and SEO thresholds
- **Real-time Testing**: Run Playwright + Lighthouse tests directly from the browser
- **Report Visualization**: View and access generated performance reports
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright Browsers** (if not already installed):
   ```bash
   npx playwright install
   ```

## 🚀 Usage

1. **Start the Dashboard**:
   ```bash
   npm start
   # or
   npm run dashboard
   ```

2. **Open the Dashboard**:
   Navigate to `http://localhost:3000` in your browser

3. **Add URLs**:
   - The dashboard comes with sample URLs pre-loaded
   - Click the "➕ Add URL" button to add more URLs
   - Remove URLs by clicking the 🗑️ button

4. **Configure Thresholds**:
   - Adjust Performance, Accessibility, and SEO thresholds as needed
   - Default values: Performance (75), Accessibility (90), SEO (85)

5. **Run Tests**:
   - Click "🧪 Run Performance Tests"
   - Tests will run in the background (may take several minutes)
   - View progress and results in the status area

6. **View Reports**:
   - Generated reports appear in the "Recent Reports" section
   - Click on any report link to view detailed Lighthouse results
   - Reports are saved in the `lighthouse/` directory

## 📊 Report Structure

- **HTML Reports**: Detailed Lighthouse performance reports
- **CSV Reports**: Raw performance data for analysis
- **Organized by URL**: Each URL gets its own directory
- **Timestamped**: Reports include generation timestamps

## 🔧 Configuration

### Custom Test Configuration

You can modify the test thresholds and other settings:

- **Performance Threshold**: Minimum acceptable performance score (0-100)
- **Accessibility Threshold**: Minimum acceptable accessibility score (0-100)
- **SEO Threshold**: Minimum acceptable SEO score (0-100)

### Advanced Usage

For direct Playwright testing without the dashboard:

```bash
# Run your existing performance tests
npm run test:perf

# Run all tests
npm test
```

## 📁 File Structure

```
tests/
├── dashboard.html              # Main dashboard interface
├── dashboard-server.js         # Express server backend
├── performance.spec.ts         # Original performance test
├── package.json               # Dependencies and scripts
├── lighthouse/                # Generated Lighthouse reports
├── performance-reports/       # Performance report data
└── test-results/             # Playwright test results
```

## 🚨 Troubleshooting

### Common Issues

1. **Port 9222 in use**:
   - Make sure Chrome isn't running with debugging enabled
   - Kill any Chrome processes: `pkill -f chrome`

2. **Tests fail to run**:
   - Ensure all dependencies are installed: `npm install`
   - Check that Playwright browsers are installed: `npx playwright install`

3. **Reports not generating**:
   - Check that the `lighthouse/` directory has write permissions
   - Verify URLs are accessible and properly formatted

4. **Dashboard not loading**:
   - Ensure port 3000 is available
   - Check the console for any error messages

### Debug Mode

To run with more verbose logging:

```bash
DEBUG=* npm start
```

## 🤝 Contributing

Feel free to improve this dashboard by:

- Adding new features (e.g., historical trend analysis)
- Improving the UI/UX
- Adding more test configurations
- Enhancing error handling

## 📝 License

This project is open source and available under the MIT License.

---

**Happy Testing!** 🎯 