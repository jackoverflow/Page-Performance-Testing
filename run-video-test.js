const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = promisify(exec);

async function runVideoTest() {
  try {
    console.log('Running Metricon scrolling test with video recording...');
    
    // Ensure test-videos directory exists
    const videosDir = path.join(__dirname, 'test-videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
      console.log(`Created videos directory: ${videosDir}`);
    }
    
    const command = `npx playwright test metricon-scrolling.spec.ts --project=metricon-scrolling --reporter=list`;
    console.log('Executing command:', command);
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 300000, // 5 minutes timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    console.log('Test stdout:', stdout);
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('Error running test with video:', stderr);
    }
    
    // Videos are stored in test-results directory in Playwright's structure
    console.log('Checking test-results directory for videos...');
    
    const testResultsDir = path.join(__dirname, 'test-results');
    if (fs.existsSync(testResultsDir)) {
      const testResultDirs = fs.readdirSync(testResultsDir);
      let videosFound = false;
      
      for (const dir of testResultDirs) {
        const fullPath = path.join(testResultsDir, dir);
        if (fs.statSync(fullPath).isDirectory()) {
          const subFiles = fs.readdirSync(fullPath);
          const videoFiles = subFiles.filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
          if (videoFiles.length > 0) {
            console.log(`✅ Found videos in ${dir}:`);
            videoFiles.forEach(video => {
              console.log(`   - ${video}`);
            });
            videosFound = true;
          }
        }
      }
      
      if (!videosFound) {
        console.log('❌ No videos were found in test-results subdirectories.');
        console.log('Available directories:', testResultDirs);
      }
    } else {
      console.log('❌ test-results directory does not exist.');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error executing test with video:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred',
      command: error.cmd || 'Unknown command'
    };
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  runVideoTest().then(result => {
    console.log('Test execution completed with result:', result.success ? 'SUCCESS' : 'FAILURE');
    if (!result.success) {
      console.error(result.error);
    }
  });
}

module.exports = { runVideoTest };