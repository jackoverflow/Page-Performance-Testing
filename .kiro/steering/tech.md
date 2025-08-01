# Technology Stack

## Core Technologies

- **Node.js**: Runtime environment
- **Express.js**: Web server framework for the dashboard API
- **Playwright**: Browser automation and testing framework
- **Lighthouse**: Performance auditing tool
- **TypeScript**: Used for test files and configuration

## Key Dependencies

- `@playwright/test`: Testing framework
- `playwright-lighthouse`: Integration between Playwright and Lighthouse
- `express`: Web server for dashboard
- `lighthouse`: Performance auditing CLI tool

## Build System & Commands

### Essential Commands

```bash
# Install dependencies
npm install

# Start the dashboard server
npm run dashboard
# or
npm start
# or
./start-dashboard.sh

# Run performance tests (through dashboard only)
npm run test:perf

# Run all Playwright tests
npm test
```

### Important Notes

- **No build step required** - JavaScript/Node.js project runs directly
- **Dashboard must be running** before executing performance tests
- Use `npm run dashboard` to start the web interface on port 3001
- Performance tests cannot be run directly via CLI - they require dashboard configuration

## Configuration Files

- `playwright.config.ts`: Playwright test configuration with multiple projects
- `package.json`: Dependencies and npm scripts
- `test-config.json`: Temporary file generated during test runs (auto-managed)

## Development Workflow

1. Start dashboard: `npm run dashboard`
2. Access web interface at `http://localhost:8899`
3. Configure URLs through the dashboard
4. Trigger tests via dashboard interface
5. View generated reports in `lighthouse/` directory