# Video Recording Guide for Safari iPhone 16 Scrolling Tests

## Overview

This document explains how to generate and access video recordings of your Safari iPhone 16 scrolling tests. Videos are automatically recorded during test execution to help you analyze scrolling behavior and debug issues.

## How Video Recording Works

### Automatic Video Generation

Videos are **automatically generated** when you run the Metricon scrolling test. No additional setup is required - the video recording is built into the test configuration.

### When Videos Are Created

Videos are recorded in the following scenarios:

1. **Dashboard Button**: When you press the 📱 **Run Safari iPhone 16 Scrolling Test** button in the dashboard (at `http://localhost:3001`)
2. **Command Line**: When you run the test via command line using the scripts provided
3. **Batch File**: When you execute the `run-video-test.bat` file

### Answer to Your Question

**Yes, videos are automatically generated after pressing the 📱 Run Safari iPhone 16 Scrolling Test button!** You don't need to do anything special - just click the button and wait for the test to complete.

## How to Generate Videos

### Method 1: Dashboard Interface (Recommended)

1. Start the dashboard server:
   ```bash
   npm run dashboard
   ```

2. Open your browser and navigate to: `http://localhost:3001`

3. Add at least one URL to test in the "URLs to Test" section (or use the default URL)

4. Click the 📱 **Run Safari iPhone 16 Scrolling Test** button

5. The video will be automatically recorded during the test execution

6. Wait for the test to complete (you'll see a success message when done)

### Method 2: Command Line

Run the test directly using Playwright:

```bash
npx playwright test metricon-scrolling.spec.ts --project=metricon-scrolling
```

### Method 3: Using the Video Test Script

Execute the dedicated video test script:

```bash
node run-video-test.js
```

Or use the batch file on Windows:

```bash
run-video-test.bat
```

## Video Storage Location

### Primary Location

Videos are stored in the `test-results` directory with the following structure:

```
test-results/
└── metricon-scrolling-[test-identifier]/
    └── video.webm
```

### Example Path

A typical video file path looks like:
```
test-results/metricon-scrolling-Metrico-e07a9-test-for-Metricon-Dashboard-metricon-scrolling/video.webm
```

### Directory Naming Convention

The directory name follows this pattern:
- `metricon-scrolling` - Project name
- `Metrico-e07a9` - Shortened test identifier
- `test-for-Metricon-Dashboard` - Test description
- `metricon-scrolling` - Project name (repeated)

## Video Specifications

### Format and Quality

- **Format**: WebM (`.webm`)
- **Resolution**: 390x844 pixels (iPhone 16 dimensions)
- **Browser**: Safari (WebKit engine)
- **Recording Mode**: Continuous during test execution

### What's Recorded

The video captures:
- ✅ Login process and form interactions
- ✅ Page navigation and loading
- ✅ Scrolling animations and behavior
- ✅ All user interactions (clicks, taps, scrolls)
- ✅ Page rendering and visual changes

## Accessing Videos

### Opening Video Files

You can open the `.webm` video files with:

- **Web Browsers**: Chrome, Firefox, Edge, Safari
- **Media Players**: VLC Media Player, Windows Media Player (with codec)
- **Video Editors**: Any editor that supports WebM format

### Viewing Through File Explorer

1. Navigate to your project directory
2. Open the `test-results` folder
3. Look for the most recent test directory (sorted by date)
4. Double-click on `video.webm` to open

## Video Configuration

### Current Settings

The video recording is configured in `playwright.config.ts`:

```typescript
{
  name: 'metricon-scrolling',
  testMatch: '**/metricon-scrolling.spec.ts',
  use: {
    video: 'on',  // Always record videos
    // ... other settings
  }
}
```

### Recording Modes Available

- `'on'` - Record video for all tests (current setting)
- `'retain-on-failure'` - Only save videos for failed tests
- `'off'` - Disable video recording

## Troubleshooting

### No Video Generated

If no video is created, check:

1. **Test Completion**: Ensure the test runs to completion without errors
2. **Directory Permissions**: Verify write permissions to the `test-results` directory
3. **Disk Space**: Ensure sufficient disk space for video files
4. **Configuration**: Verify `video: 'on'` is set in the project configuration

### Video Quality Issues

If video quality is poor:

1. **Resolution**: Videos are recorded at iPhone 16 resolution (390x844)
2. **Performance**: Slow scrolling may appear choppy in recordings
3. **Browser Rendering**: Some visual effects may not render perfectly in headless mode

### Finding Recent Videos

To find the most recent video:

1. Sort the `test-results` directory by date (newest first)
2. Look for directories starting with `metricon-scrolling`
3. The most recent directory contains the latest video

## File Management

### Automatic Cleanup

- Videos are **not automatically deleted**
- Old test results accumulate over time
- Manual cleanup may be needed periodically

### Manual Cleanup

To clean up old videos:

```bash
# Remove all test results (including videos)
rmdir /s /q test-results

# Or selectively delete old directories
```

## Integration with Reports

### HTML Reports

The test also generates HTML reports with screenshots in:
```
safari-scrolling/mymetricon_nextjs_dev_dashboard_[timestamp]_scrolling.report.html
```

### Complementary Assets

Each test run creates:
- 📹 **Video recording** (in `test-results/`)
- 📊 **HTML report** (in `safari-scrolling/`)
- 📸 **Screenshots** (in `safari-scrolling/`)

## Best Practices

### When to Use Videos

Videos are most useful for:
- 🔍 **Debugging scroll issues**
- 📈 **Performance analysis**
- 👀 **Visual regression testing**
- 📋 **Documentation and reporting**

### Storage Considerations

- Video files are typically 1-5 MB per test
- Consider periodic cleanup of old test results
- Videos provide valuable debugging information

## Quick Reference

| Action | Command |
|--------|---------|
| Run test with video | `npx playwright test metricon-scrolling.spec.ts --project=metricon-scrolling` |
| Run via script | `node run-video-test.js` |
| Run via batch file | `run-video-test.bat` |
| Video location | `test-results/[test-directory]/video.webm` |
| Video format | WebM |
| Video resolution | 390x844 (iPhone 16) |

---

**Note**: Videos are automatically generated with every test run. No additional configuration or manual steps are required beyond running the test itself.