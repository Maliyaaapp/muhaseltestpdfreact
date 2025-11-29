// Copy CSS files script
const fs = require('fs');
const path = require('path');

// Create directories if they don't exist
const createDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Copy all CSS files from src to dist
const copyCSS = () => {
  console.log('Copying CSS files...');
  
  // Create directories
  createDir('./dist/src');
  createDir('./dist/src/styles');
  
  // Copy index.css
  if (fs.existsSync('./src/index.css')) {
    fs.copyFileSync('./src/index.css', './dist/src/index.css');
    console.log('Copied index.css');
  }
  
  // Copy all CSS files from styles directory
  if (fs.existsSync('./src/styles')) {
    const files = fs.readdirSync('./src/styles');
    files.forEach(file => {
      if (file.endsWith('.css')) {
        fs.copyFileSync(`./src/styles/${file}`, `./dist/src/styles/${file}`);
        console.log(`Copied ${file}`);
      }
    });
  }
  
  console.log('CSS files copied successfully!');
};

// Run the copy function
copyCSS(); 