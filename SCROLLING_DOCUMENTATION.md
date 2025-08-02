# Scrolling Functionality Documentation

## Overview

The scrolling functionality provides automated testing of mobile scrolling performance on Safari iPhone 16, specifically designed for testing the Metricon dashboard application. It simulates real user scrolling behavior and generates detailed performance reports with visual documentation including screenshots and video recordings.

## Configuration

### Dynamic Authentication Configuration

The system now supports dynamic configuration through the web dashboard interface. You can configure:

- **Login URL**: The authentication page URL
- **Dashboard URL**: The target page URL after authentication
- **Email**: Login email address
- **Password**: Login password

**Default Configuration** (if not specified):
```typescript
const LOGIN_URL = 'https://mymetricon-nextjs-dev.vercel.app/';
const DASHBOARD_URL = 'https://mymetricon-nextjs-dev.vercel.app/dashboard/select-contract';
const EMAIL = 'pio@ypdigital.com.au';
const PASSWORD = 'YPD1g1t4l*';
```

**Security Note**: These credentials are for the development environment only. Always use test accounts with minimal permissions for automated testing.

### Device Configuration

The tests simulate an iPhone 16 device with configurable orientation:

#### Portrait Mode (Default)
- **Viewport**: 390x844 pixels
- **Device Scale Factor**: 3x (Retina display)
- **User Agent**: iPhone iOS 16.0 Safari
- **Location**: Manila, Philippines (14.5995°N, 120.9842°E)
- **Browser**: Safari (WebKit engine)

#### Landscape Mode
- **Viewport**: 844x390 pixels
- **Device Scale Factor**: 3x (Retina display)
- **User Agent**: iPhone iOS 16.0 Safari
- **Location**: Manila, Philippines (14.5995°N, 120.9842°E)
- **Browser**: Safari (WebKit engine)

## Test Files

### 1. `metricon-scrolling.spec.ts`
- **Purpose**: Dedicated Metricon dashboard scrolling tests
- **Authentication**: Built-in login flow for Metricon platform
- **Target**: Specific dashboard URL with hardcoded credentials

### 2. `safari-scrolling.spec.ts`
- **Purpose**: Generic scrolling tests for any URL
- **Configuration**: Reads URLs from `test-config.json`
- **Authentication**: Automatic detection and handling of login pages

## How to Run Scrolling Tests

### Method 1: Through Dashboard (Recommended)

1. **Start the dashboard server**:
   ```bash
   npm run dashboard
   ```

2. **Access the web interface**:
   Open `http://localhost:8899` in your browser

3. **Configure URLs**:
   - Add the URLs you want to test in the "URLs to Test" section

4. **Configure Scrolling Authentication**:
   - **Login URL**: Enter the authentication page URL
   - **Dashboard URL**: Enter the target page URL after login
   - **Email**: Enter the login email address
   - **Password**: Enter the login password
   - **Device Orientation**: Choose between Portrait (390x844) or Landscape (844x390)

5. **Run tests**:
   - Click "📱 Run Safari iPhone 16 Scrolling Test" button
   - Tests will run with your configured credentials

### Method 2: Direct Playwright Execution

For Metricon-specific tests:
```bash
npx playwright test metricon-scrolling.spec.ts --project=metricon-scrolling
```

For generic scrolling tests:
```bash
npx playwright test safari-scrolling.spec.ts --project=safari-scrolling
```

## Authentication Flow

### Automatic Login Process

1. **Detection**: System detects if a login page is present
2. **Credential Input**: Automatically fills in the configured email and password
3. **Submission**: Submits the login form
4. **Navigation**: Waits for successful authentication
5. **Verification**: Confirms successful login before proceeding with tests

### Dynamic Authentication Flow

For URLs requiring authentication, the system:

1. Navigates to the configured **Login URL**
2. Fills credentials from dashboard configuration:
   - **Email**: From dashboard input field
   - **Password**: From dashboard input field
3. Submits the form and waits for authentication
4. Navigates directly to the configured **Dashboard URL**
5. Verifies successful access to the target page

### Configuration Storage

The authentication configuration is stored in `test-config.json` during test execution:

```json
{
  "urls": ["https://example.com/dashboard"],
  "thresholds": { "performance": 75, "accessibility": 90, "seo": 85 },
  "scrollingConfig": {
    "loginUrl": "https://example.com/login",
    "dashboardUrl": "https://example.com/dashboard",
    "email": "user@example.com",
    "password": "password123",
    "orientation": "portrait"
  }
}
```

## Scrolling Test Process

### Test Execution Steps

1. **Initial Setup**:
   - Configure iPhone 16 viewport (390x844)
   - Set geolocation to Manila, Philippines
   - Navigate to target URL with authentication

2. **Baseline Capture**:
   - Take initial screenshot
   - Measure initial page metrics (DOM load time, document height, etc.)

3. **Scrolling Simulation**:
   - Perform up to 5 scroll steps
   - Each scroll moves down by one viewport height (844px)
   - Uses smooth scrolling behavior for realistic simulation
   - Captures screenshot after each scroll step

4. **Performance Measurement**:
   - Records scroll duration for each step
   - Tracks scroll position after each step
   - Measures total scroll distance
   - Stops automatically when reaching page bottom

5. **Report Generation**:
   - Creates HTML report with visual documentation
   - Includes all screenshots and performance metrics
   - Saves to `safari-scrolling/` directory

### Scroll Behavior

```typescript
// Smooth scroll implementation
window.scrollTo({
    top: finalY,
    behavior: 'smooth'
});
```

- **Scroll Distance**: One viewport height per step (844px for iPhone 16)
- **Scroll Type**: Smooth scrolling (mimics natural user behavior)
- **Wait Time**: 800ms between scroll actions
- **Bottom Detection**: Automatically stops when reaching page bottom

## Generated Reports

### Report Structure

Each test generates:

1. **HTML Report**: `{hostname}_{timestamp}_scrolling.report.html`
2. **Screenshots**: 
   - Initial view: `{hostname}_{timestamp}_initial.png`
   - Scroll steps: `{hostname}_{timestamp}_scroll_{step}.png`

### Report Contents

- **Device Information**: iPhone 16 specifications
- **Page Metrics**: Document height, scroll distance, completion time
- **Performance Data**: Scroll step durations and positions
- **Visual Documentation**: Screenshots of each scroll position
- **Technical Details**: User agent, viewport size, geolocation

### Sample Report Metrics

```html
Document Height: 2400px
Total Scroll Distance: 1688px
Scroll Steps Completed: 3

Scroll Performance:
Step 1: Scrolled to 844px in 850ms
Step 2: Scrolled to 1688px in 820ms
Step 3: Scrolled to 1688px in 800ms (reached bottom)
```

## File Organization

### Directory Structure

```
├── safari-scrolling/                    # Generated reports and screenshots
│   ├── mymetricon_nextjs_dev_dashboard_2025-01-08_14-30-15_scrolling.report.html
│   ├── mymetricon_nextjs_dev_dashboard_2025-01-08_14-30-15_initial.png
│   ├── mymetricon_nextjs_dev_dashboard_2025-01-08_14-30-15_scroll_1.png
│   └── mymetricon_nextjs_dev_dashboard_2025-01-08_14-30-15_scroll_2.png
├── metricon-scrolling.spec.ts           # Metricon-specific scrolling tests
├── safari-scrolling.spec.ts             # Generic scrolling tests
└── test-config.json                     # URL configuration (auto-generated)
```

### Naming Conventions

- **Reports**: `{hostname}_{timestamp}_scrolling.report.html`
- **Screenshots**: `{hostname}_{timestamp}_{type}_{step}.png`
- **Timestamps**: `YYYY-MM-DD_HH-MM-SS` format
- **Hostnames**: Sanitized (special characters replaced with underscores)

## Orientation Options

### Portrait Mode (390x844) - Default
- **Best for**: Mobile-first designs, vertical content layouts
- **Use case**: Testing how users scroll through content on mobile devices in normal holding position
- **Viewport**: 390 pixels wide × 844 pixels tall
- **Scroll behavior**: Vertical scrolling with more content visible per scroll step

### Landscape Mode (844x390)  
- **Best for**: Horizontal layouts, dashboard interfaces, media content
- **Use case**: Testing how content adapts when device is rotated horizontally
- **Viewport**: 844 pixels wide × 390 pixels tall
- **Scroll behavior**: Vertical scrolling with wider content area, less vertical space

## Configuration Options

### Playwright Config Settings

```typescript
{
  name: 'safari-scrolling',
  testMatch: '**/*scrolling.spec.ts',
  timeout: 180000, // 3 minutes
  retries: 1,
  use: {
    ...devices['iPhone 16'],
    browserName: 'webkit',
    headless: true,
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    locale: 'en-US',
    geolocation: { latitude: 14.5995, longitude: 120.9842 }
  }
}
```

### Customizable Parameters

- **Max Scrolls**: Currently set to 5 steps (can be modified)
- **Scroll Wait Time**: 800ms between scrolls (adjustable)
- **Timeout**: 3 minutes per test (configurable)
- **Retries**: 1 retry on failure (configurable)

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Verify credentials are correct
   - Check if login page structure has changed
   - Ensure network connectivity to Metricon servers

2. **Scroll Test Failures**:
   - Page might be too short (less than viewport height)
   - JavaScript errors preventing smooth scrolling
   - Network timeouts during page load

3. **Report Generation Issues**:
   - Insufficient disk space
   - Permission issues in output directory
   - File path length limitations on Windows

### Debug Information

The tests provide extensive console logging:

```
Starting Safari iPhone 16 scrolling test for Metricon Dashboard
Navigating to login page: https://mymetricon-nextjs-dev.vercel.app/
Login form found, authenticating...
Email filled correctly: true
Password filled correctly: true
Login submitted, current URL: https://mymetricon-nextjs-dev.vercel.app/dashboard/select-contract
On select-contract page, looking for contract to select...
Contract selected, waiting for navigation...
After contract selection, URL: https://mymetricon-nextjs-dev.vercel.app/dashboard/123456
Reached bottom of page at scroll step 3
Safari iPhone 16 scrolling test completed for Metricon Dashboard
Report saved to: /path/to/safari-scrolling/report.html
Screenshots saved: 5 images
```

## Security Considerations

### Credential Management

**Current Implementation** (Dynamic Configuration):
```typescript
// Credentials are now configurable through the dashboard
const scrollingConfig = config.scrollingConfig || {};
const EMAIL = scrollingConfig.email || 'default@example.com';
const PASSWORD = scrollingConfig.password || 'defaultPassword';
```

**Dashboard Configuration**:
- Credentials are entered through the web interface
- Stored temporarily in `test-config.json` during test execution
- Automatically cleaned up after tests complete

**Recommended for Production**:
```typescript
const EMAIL = process.env.TEST_EMAIL || scrollingConfig.email;
const PASSWORD = process.env.TEST_PASSWORD || scrollingConfig.password;
```

### Best Practices

1. **Environment Variables**: Store credentials in environment variables
2. **Credential Rotation**: Regularly update test account passwords
3. **Access Control**: Limit test account permissions to minimum required
4. **Audit Logging**: Monitor test account usage
5. **Secure Storage**: Use secure credential management systems

## Performance Optimization

### Test Efficiency

- **Headless Mode**: Tests run without GUI for faster execution
- **Parallel Execution**: Multiple URLs can be tested simultaneously
- **Smart Stopping**: Tests stop automatically when reaching page bottom
- **Optimized Screenshots**: Only viewport screenshots (not full page)

### Resource Management

- **Memory Usage**: Browser instances are properly closed after tests
- **Disk Space**: Old reports can be cleaned up manually
- **Network**: Tests respect rate limiting and connection timeouts

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Scrolling Tests
  run: |
    npm run dashboard &
    sleep 10
    npx playwright test safari-scrolling.spec.ts --project=safari-scrolling
```

### Jenkins Pipeline

```groovy
stage('Scrolling Tests') {
    steps {
        sh 'npm run dashboard &'
        sh 'sleep 10'
        sh 'npx playwright test safari-scrolling.spec.ts --project=safari-scrolling'
    }
}
```

## Future Enhancements

### Planned Features

1. **Multiple Device Support**: iPad, Android devices
2. **Performance Thresholds**: Configurable pass/fail criteria
3. **Accessibility Testing**: Integration with axe-core
4. **Video Recording**: Full scroll session recordings
5. **API Integration**: Automated report sharing

### Configuration Improvements

1. **Dynamic Credentials**: Runtime credential configuration
2. **Custom Scroll Patterns**: User-defined scroll behaviors
3. **Advanced Metrics**: Core Web Vitals during scrolling
4. **Report Customization**: Branded report templates