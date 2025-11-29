import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const sourceHtml = path.join(__dirname, 'dist', 'index.html');
const targetExeDir = path.join(__dirname, 'release', 'Muhasel-win32-x64');
const resourcesDir = path.join(targetExeDir, 'resources');

console.log('Updating Electron app with React fix...');
console.log('Source HTML:', sourceHtml);
console.log('Target directory:', targetExeDir);

// Check if source exists
if (!fs.existsSync(sourceHtml)) {
  console.error('❌ Source index.html not found');
  process.exit(1);
}

// Check if target executable exists
if (!fs.existsSync(path.join(targetExeDir, 'Muhasel.exe'))) {
  console.error('❌ Muhasel.exe not found in target directory');
  process.exit(1);
}

// Look for the app.asar file which contains the web content
const possibleAsarPaths = [
  path.join(resourcesDir, 'app.asar'),
  path.join(targetExeDir, 'resources', 'app.asar'),
  path.join(targetExeDir, 'app.asar')
];

let asarPath = null;
for (const p of possibleAsarPaths) {
  if (fs.existsSync(p)) {
    asarPath = p;
    console.log('✅ Found app.asar at:', asarPath);
    break;
  }
}

if (!asarPath) {
  console.log('⚠️  Could not find app.asar, checking for unpacked resources...');
  
  // Check for unpacked app directory
  const unpackedPaths = [
    path.join(resourcesDir, 'app'),
    path.join(targetExeDir, 'resources', 'app'),
    path.join(targetExeDir, 'app')
  ];
  
  let appDir = null;
  for (const p of unpackedPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      appDir = p;
      console.log('✅ Found app directory at:', appDir);
      break;
    }
  }
  
  if (appDir) {
    const targetHtml = path.join(appDir, 'dist', 'index.html');
    const targetDir = path.dirname(targetHtml);
    
    if (!fs.existsSync(targetDir)) {
      console.log('Creating directory:', targetDir);
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    console.log('Copying index.html to:', targetHtml);
    fs.copyFileSync(sourceHtml, targetHtml);
    console.log('✅ Successfully updated index.html in unpacked app');
  } else {
    console.error('❌ Could not find app resources to update');
    process.exit(1);
  }
} else {
  console.log('⚠️  Found app.asar - cannot modify compressed archive');
  console.log('💡 The app needs to be rebuilt with the React fix');
  process.exit(1);
}

console.log('✅ Update completed successfully!');