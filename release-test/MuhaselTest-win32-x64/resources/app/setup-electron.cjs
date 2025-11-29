/**
 * Setup script for Electron development environment
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up Electron development environment...');

// Ensure required packages are installed
console.log('Checking for required packages...');
try {
  // Install required packages if they don't exist
  execSync('npm install -D electron electron-builder @electron-forge/cli @electron-forge/maker-squirrel @electron-forge/maker-zip @electron-forge/maker-deb @electron-forge/maker-rpm @electron-forge/plugin-auto-unpack-natives concurrently', { stdio: 'inherit' });
  console.log('Required packages installed successfully');
} catch (error) {
  console.error('Error installing packages:', error.message);
  process.exit(1);
}

// Check if main.cjs and preload.cjs exist
console.log('Checking for Electron files...');
if (!fs.existsSync('main.cjs')) {
  console.error('Error: main.cjs not found. Please ensure it exists in the root directory');
  process.exit(1);
}

if (!fs.existsSync('preload.cjs')) {
  console.error('Error: preload.cjs not found. Please ensure it exists in the root directory');
  process.exit(1);
}

// Try to run electron -v
try {
  const electronVersion = execSync('npx electron -v').toString().trim();
  console.log(`Electron CLI version: ${electronVersion}`);
} catch (error) {
  console.error('Error running electron -v:', error.message);
}

console.log('Setup complete! Your environment is now ready for Electron development.');
console.log('To start the Electron app in development mode, run:');
console.log('npm run electron');
console.log('To build the Electron app for production, run:');
console.log('npm run build-electron'); 