# Product Overview

Page Speed Testing Dashboard is a comprehensive performance testing solution that combines Playwright and Lighthouse for automated web performance auditing.

## Core Features

- **Dynamic URL Management**: Web-based dashboard for adding/removing test URLs
- **Configurable Performance Thresholds**: Set custom thresholds for performance, accessibility, and SEO scores
- **Automated Lighthouse Audits**: Generate detailed performance reports with HTML output
- **Real-time Results**: View test results and access generated reports through the web interface
- **Report Management**: View, access, and delete historical performance reports

## Key Workflow

1. Users access the web dashboard at `http://localhost:3000`
2. URLs are added dynamically through the dashboard interface
3. Performance tests are triggered via the dashboard (not directly via CLI)
4. Lighthouse reports are generated and stored in the `lighthouse/` directory
5. Results are accessible through the dashboard with historical tracking

## Important Constraints

- Tests **must** be run through the dashboard - direct CLI execution of `performance.spec.ts` will fail
- URLs are dynamically configured via the web interface, not hardcoded
- The system requires the dashboard server to be running for test execution