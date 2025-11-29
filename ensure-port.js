import { execSync } from 'child_process';
import path from 'path';

// Port to check
const PORT = 5175;

try {
  // Try to check if the port is in use
  console.log(`Checking if port ${PORT} is in use...`);
  
  // On Windows, use netstat
  if (process.platform === 'win32') {
    try {
      const output = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf8' });
      
      if (output.trim()) {
        console.log(`Port ${PORT} is in use. Attempting to kill the process...`);
        
        // Extract PID from netstat output (last column)
        const lines = output.trim().split('\n');
        if (lines.length > 0) {
          const firstLine = lines[0].trim();
          const columns = firstLine.split(/\s+/);
          const pid = columns[columns.length - 1];
          
          if (pid && !isNaN(parseInt(pid))) {
            console.log(`Killing process with PID: ${pid}`);
            execSync(`taskkill /F /PID ${pid}`);
            console.log(`Process with PID ${pid} killed successfully.`);
          }
        }
      } else {
        console.log(`Port ${PORT} is free.`);
      }
    } catch (e) {
      // If the findstr command doesn't find anything, it will return an error
      console.log(`Port ${PORT} is free.`);
    }
  } else {
    // On Unix-like systems, use lsof
    try {
      const output = execSync(`lsof -i :${PORT} -t`, { encoding: 'utf8' });
      
      if (output.trim()) {
        console.log(`Port ${PORT} is in use. Attempting to kill the process...`);
        execSync(`kill -9 ${output.trim()}`);
        console.log(`Process killed successfully.`);
      } else {
        console.log(`Port ${PORT} is free.`);
      }
    } catch (e) {
      // lsof returns non-zero exit code if no processes found
      console.log(`Port ${PORT} is free.`);
    }
  }
} catch (error) {
  console.error(`Error checking or freeing port ${PORT}:`, error.message);
}

console.log(`Proceeding with port ${PORT}...`); 