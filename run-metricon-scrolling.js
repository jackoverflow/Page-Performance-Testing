const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function runMetriconScrollingTest() {
  try {
    console.log('Running Metricon dashboard scrolling test...');
    
    const command = `npx playwright test metricon-scrolling.spec.ts --project=safari-scrolling --reporter=list`;
    console.log('Executing command:', command);
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 300000, // 5 minutes timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    console.log('Test stdout:', stdout);
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('Error running Metricon scrolling test:', stderr);
      return { success: false, error: stderr };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error executing Metricon scrolling test:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred',
      command: error.cmd || 'Unknown command'
    };
  }
}

module.exports = { runMetriconScrollingTest };