import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  appName: 'Muhasel',
  version: '1.0.0',
  landingDownloadsDir: path.join(__dirname, 'landing', 'downloads'),
  releaseDir: path.join(__dirname, 'release'),
  platforms: {
    win: {
      installerPattern: 'Muhasel-Setup-*.exe',
      targetName: 'Muhasel-Setup-1.0.0.exe'
    },
    mac: {
      installerPattern: '*.dmg',
      targetName: 'Muhasel-1.0.0.dmg'
    },
    linux: {
      installerPattern: '*.AppImage',
      targetName: 'Muhasel-1.0.0.AppImage'
    }
  }
};

// Ensure landing/downloads directory exists
if (!fs.existsSync(config.landingDownloadsDir)) {
  console.log(`Creating downloads directory: ${config.landingDownloadsDir}`);
  fs.mkdirSync(config.landingDownloadsDir, { recursive: true });
}

// Build the app for all platforms
async function buildApp() {
  try {
    console.log('Building Electron app for all platforms...');
    console.log('Step 1: Building the Vite app...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('\nStep 2: Building Windows installer...');
    try {
      execSync('npx electron-builder --win', { stdio: 'inherit' });
      copyInstallerToLanding('win');
    } catch (error) {
      console.error('Error building Windows installer:', error.message);
    }
    
    // Uncomment these if you want to build for Mac and Linux as well
    // console.log('\nStep 3: Building macOS installer...');
    // try {
    //   execSync('npx electron-builder --mac', { stdio: 'inherit' });
    //   copyInstallerToLanding('mac');
    // } catch (error) {
    //   console.error('Error building macOS installer:', error.message);
    // }
    
    // console.log('\nStep 4: Building Linux installer...');
    // try {
    //   execSync('npx electron-builder --linux', { stdio: 'inherit' });
    //   copyInstallerToLanding('linux');
    // } catch (error) {
    //   console.error('Error building Linux installer:', error.message);
    // }

    console.log('\nBuild process completed!');
    
    // If we couldn't build the installers with electron-builder, create dummy files for testing
    createDummyInstallers();
    
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Copy installer to landing page downloads directory
function copyInstallerToLanding(platform) {
  const platformConfig = config.platforms[platform];
  const sourcePattern = platformConfig.installerPattern;
  const targetName = platformConfig.targetName;
  
  try {
    // Find the installer file
    const files = fs.readdirSync(config.releaseDir);
    const installerFile = files.find(file => 
      file.match(new RegExp(sourcePattern.replace('*', '.*'))));
    
    if (installerFile) {
      const sourcePath = path.join(config.releaseDir, installerFile);
      const targetPath = path.join(config.landingDownloadsDir, targetName);
      
      // Copy the file
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied ${platform} installer to: ${targetPath}`);
    } else {
      console.warn(`No ${platform} installer found matching pattern: ${sourcePattern}`);
    }
  } catch (error) {
    console.error(`Error copying ${platform} installer:`, error.message);
  }
}

// Create dummy installers for testing the landing page
function createDummyInstallers() {
  console.log('\nCreating dummy installers for testing...');
  
  Object.keys(config.platforms).forEach(platform => {
    const targetName = config.platforms[platform].targetName;
    const targetPath = path.join(config.landingDownloadsDir, targetName);
    
    if (!fs.existsSync(targetPath)) {
      const dummyContent = `This is a dummy ${platform} installer for ${config.appName} v${config.version}.\nIn production, this would be the actual installer.`;
      fs.writeFileSync(targetPath, dummyContent);
      console.log(`Created dummy ${platform} installer: ${targetPath}`);
    }
  });
}

// Run the build process
buildApp().catch(console.error); 