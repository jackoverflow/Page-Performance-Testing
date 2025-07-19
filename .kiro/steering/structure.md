# Project Structure

## Root Level Files

- `dashboard-server.js`: Express server providing REST API and serving the web dashboard
- `dashboard.html`: Frontend web interface for URL management and test execution
- `performance.spec.ts`: Playwright test suite for running Lighthouse audits
- `playwright.config.ts`: Playwright configuration with multiple browser projects
- `package.json`: Node.js dependencies and npm scripts
- `start-dashboard.sh`: Shell script to start the dashboard server

## Directory Organization

```
├── lighthouse/                 # Generated Lighthouse HTML reports
│   └── *.report.html          # Individual performance audit reports
├── performance-reports/        # Playwright HTML test reports
│   └── index.html             # Aggregated test results
├── test-results/              # Playwright test execution metadata
│   └── .last-run.json         # Last test run information
├── node_modules/              # npm dependencies
└── .git/                      # Git repository data
```

## File Naming Conventions

### Lighthouse Reports
- Format: `{hostname}_{timestamp}.report.html`
- Example: `annix_com_au_2025-07-17_01-23-09.report.html`
- Stored in `lighthouse/` directory

### Configuration Files
- `test-config.json`: Temporary file created during test runs (auto-managed)
- Contains URLs and thresholds passed from dashboard to test suite

## Key Architectural Patterns

- **API-driven testing**: Tests are triggered via REST API, not direct CLI
- **Dynamic configuration**: URLs and thresholds configured at runtime through web interface
- **Separation of concerns**: Dashboard server handles UI/API, test files handle execution
- **Report persistence**: All generated reports are stored and accessible via web interface

## Important File Relationships

- `dashboard-server.js` creates `test-config.json` before running tests
- `performance.spec.ts` reads `test-config.json` for URLs and thresholds
- Generated reports in `lighthouse/` are served by the dashboard server
- `performance-reports/` contains Playwright's own HTML reports