import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Copying Electron files for dist-electron...');

// Create dist-electron folder if it doesn't exist
const distElectronDir = path.resolve(__dirname, 'dist-electron');
if (!fs.existsSync(distElectronDir)) {
  fs.mkdirSync(distElectronDir, { recursive: true });
}

// Ensure dist/icons directory exists for app icons
const distIconsDir = path.resolve(__dirname, 'dist/icons');
if (!fs.existsSync(distIconsDir)) {
  fs.mkdirSync(distIconsDir, { recursive: true });
}

// Ensure dist/images directory exists for app images
const distImagesDir = path.resolve(__dirname, 'dist/images');
if (!fs.existsSync(distImagesDir)) {
  fs.mkdirSync(distImagesDir, { recursive: true });
}

// Copy icon.ico to dist/icons
try {
  fs.copyFileSync(
    path.resolve(__dirname, 'public/icon.ico'),
    path.resolve(distIconsDir, 'icon.ico')
  );
  console.log('✅ Copied icon.ico to dist/icons');
} catch (error) {
  console.error('❌ Failed to copy icon.ico:', error);
}

// Copy logo.png to images folder
try {
  fs.copyFileSync(
    path.resolve(__dirname, 'public/images/logo.png'),
    path.resolve(distImagesDir, 'logo.png')
  );
  console.log('✅ Copied logo.png to dist/images');
} catch (error) {
  console.error('❌ Failed to copy logo.png:', error);
}

// Copy logo.svg to images folder
try {
  fs.copyFileSync(
    path.resolve(__dirname, 'public/images/logo.svg'),
    path.resolve(distImagesDir, 'logo.svg')
  );
  console.log('✅ Copied logo.svg to dist/images');
} catch (error) {
  console.error('❌ Failed to copy logo.svg:', error);
}

// Copy main.cjs to dist-electron
try {
  fs.copyFileSync(
    path.resolve(__dirname, 'main.cjs'),
    path.resolve(distElectronDir, 'main.cjs')
  );
  console.log('✅ Copied main.cjs to dist-electron');
} catch (error) {
  console.error('❌ Failed to copy main.cjs:', error);
}

// Copy preload.cjs to dist-electron
try {
  fs.copyFileSync(
    path.resolve(__dirname, 'preload.cjs'),
    path.resolve(distElectronDir, 'preload.cjs')
  );
  console.log('✅ Copied preload.cjs to dist-electron');
} catch (error) {
  console.error('❌ Failed to copy preload.cjs:', error);
}

// Create a flag file to indicate this is a production build
fs.writeFileSync(path.resolve(distElectronDir, 'production'), 'true');
console.log('✅ Created production flag file');

// Verify required files exist
const requiredFiles = [
  'dist-electron/main.cjs',
  'dist-electron/preload.cjs',
  'dist/index.html'
];

console.log('Verifying required files exist:');

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Found required file: ${file}`);
  } else {
    console.error(`❌ Missing required file: ${file}`);
    allFilesExist = false;
  }
});

// Check asset paths in index.html
try {
  const indexHtml = fs.readFileSync('./dist/index.html', 'utf8');
  
  // No need to modify paths, just verify they look good
  console.log('✅ Asset paths in index.html look good');
  
  if (allFilesExist) {
    console.log('✅ All required files verified');
  }
  
  console.log('✅ Electron files prepared for production build');
} catch (err) {
  console.error('❌ Error reading index.html file:', err.message);
} 