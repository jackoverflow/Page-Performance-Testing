# Page Speed Testing Dashboard

A comprehensive performance testing solution using Playwright and Lighthouse.

## Features

- **Dynamic URL Management**: Add/remove URLs through the web dashboard
- **Configurable Thresholds**: Set performance, accessibility, and SEO thresholds
- **Lighthouse Integration**: Automated performance audits with detailed reports
- **Real-time Results**: View test results and generated reports

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the dashboard:
```bash
npm run dashboard
# or
./start-dashboard.sh
```

3. Open your browser to `http://localhost:3000`

4. Add URLs through the dashboard interface

5. Click "Run Performance Tests" to start testing

## Important Notes

- **Tests must be run through the dashboard** - the performance test file (`performance.spec.ts`) now requires URLs to be configured via the web interface
- Running `npx playwright test performance.spec.ts` directly will fail with an error message directing you to use the dashboard
- URLs added in the dashboard are dynamically passed to the test suite
- Test results and Lighthouse reports are automatically generated and accessible through the dashboard

## File Structure

- `dashboard.html` - Web interface for managing URLs and viewing results
- `dashboard-server.js` - Express server handling API requests
- `performance.spec.ts` - Playwright test suite (requires dashboard configuration)
- `test-config.json` - Temporary config file (auto-generated during tests)
- `lighthouse/` - Generated Lighthouse reports
- `performance-reports/` - Aggregated performance reports

## Configuration

The dashboard allows you to:
- Add/remove URLs dynamically
- Set performance thresholds (Performance, Accessibility, SEO)
- View historical test results
- Access generated Lighthouse reports 