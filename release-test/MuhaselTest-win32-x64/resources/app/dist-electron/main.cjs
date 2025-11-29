const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Disable console logging in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// Set app name explicitly to override Squirrel name
app.setName('Muhasel');
app.setAppUserModelId('com.muhasel.app');

// Remove Squirrel startup handling - we're using NSIS instead
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

// Disable GPU hardware acceleration to avoid crashes
app.disableHardwareAcceleration();
// Disable smooth scrolling to reduce GPU load
app.commandLine.appendSwitch('disable-smooth-scrolling');
// Disable GPU rasterization
app.commandLine.appendSwitch('disable-gpu-rasterization');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Track offline capabilities initialization
let offlineServicesReady = false;

// Set environment variables
process.env.ELECTRON_APP = 'true';
// Force production mode for packaged app and for direct electron:test-dist script
process.env.NODE_ENV = app.isPackaged || process.argv.includes('--prod') ? 'production' : 'development';

// Enhanced logging for debugging
console.log(`App path: ${app.getAppPath()}`);
console.log(`App is packaged: ${app.isPackaged}`);
console.log(`__dirname: ${__dirname}`);
console.log(`process.cwd(): ${process.cwd()}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

// Set API URL based on environment
if (process.env.NODE_ENV === 'development') {
  // In development, connect to local Express.js server
  process.env.API_URL = process.env.API_URL || 'http://localhost:5000/api';
} else {
  // In production, connect to Render.com backend
  process.env.API_URL = process.env.API_URL || 'https://muhasel-finance-api.onrender.com/api';
}

console.log(`Using API URL: ${process.env.API_URL}`);

// Helper to determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;
console.log(`Running in ${isDev ? 'development' : 'production'} mode`);

// Get the proper base path for resources
function getBasePath() {
  // In packaged app, the path is different
  const isPackaged = app.isPackaged;
  
  // In development mode, use the current directory
  if (isDev) {
    return __dirname;
  }
  
  // In a packaged production app, resources are in the app.getAppPath() directory
  // or in the app.asar directory depending on if the app is packaged
  return isPackaged 
    ? process.resourcesPath 
    : path.join(app.getAppPath());
}

// Function to find the correct HTML file path
function findHtmlPath() {
  // In development mode, use localhost
  if (isDev) {
    return null; // Will be handled by startUrl logic
  }
  
  // In production, prioritize dist/index.html relative to various reference points
  const possiblePaths = [
    path.join(__dirname, '..', 'dist', 'index.html'),     // From one level up (when main.cjs is in dist-electron)
    path.join(process.cwd(), 'dist', 'index.html'),       // From current directory
    path.join(app.getAppPath(), 'dist', 'index.html'),    // From app path
  ];
  
  console.log('Checking for HTML file at these paths:');
  for (const p of possiblePaths) {
    const exists = fs.existsSync(p);
    console.log(`${p}: ${exists ? 'EXISTS' : 'MISSING'}`);
    if (exists) {
      return p;
    }
  }
  
  // If all failed, return the most likely path and hope for the best
  return path.join(__dirname, '..', 'dist', 'index.html');
}

// Get the correct path to the preload script
const getPreloadPath = () => {
  // When in development, use preload.cjs from project root
  // When in production (app.isPackaged or --prod flag), use preload.cjs from same directory as main.cjs
  const preloadPath = path.join(__dirname, 'preload.cjs');
  
  console.log('Using preload path:', preloadPath);
  console.log('Preload exists:', fs.existsSync(preloadPath));

  return preloadPath;
}

// Create the browser window
function createWindow() {
  console.log('Creating main window...');
  
  // Get correct preload path
  const preloadPath = getPreloadPath();  
  
  console.log('Preload path:', preloadPath);
  
  // Make sure preload file exists or log an error
  if (!fs.existsSync(preloadPath)) {
    console.error(`ERROR: Preload script not found at: ${preloadPath}`);
    // Do not attempt fallbacks with dist-electron/dist-electron paths
  } else {
    console.log(`Preload script found at: ${preloadPath}`);
  }
  
  // Detect screen resolution and calculate zoom factor
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  console.log(`Screen resolution: ${screenWidth}x${screenHeight}`);
  
  // Calculate zoom factor for smaller screens
  let zoomFactor = 1.0;
  if (screenWidth <= 1366 && screenHeight <= 768) {
    // For 1366x768 and smaller screens, scale down to fit
    zoomFactor = Math.min(screenWidth / 1920, screenHeight / 1080);
    // Ensure minimum zoom factor of 0.7 for readability
    zoomFactor = Math.max(zoomFactor, 0.7);
    console.log(`Applying zoom factor: ${zoomFactor} for screen ${screenWidth}x${screenHeight}`);
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#f9fafb',
    icon: path.join(__dirname, isDev ? '../build/icon.ico' : '../build/icon.ico'),
    title: 'Muhasel',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      devTools: true, // Always enable DevTools for debugging
      webSecurity: true,
      sandbox: false, // Set to false to allow preload script to access file system
      // Add GPU-related settings to improve stability
      offscreen: false,
      backgroundThrottling: false,
      disableBlinkFeatures: 'Accelerated2dCanvas,AcceleratedSmoothing',
      enableWebSQL: false
    },
    // Use native window controls
    frame: true,
    // Show window only when ready
    show: false
  });

  // Determine which URL to load based on environment
  let startUrl;
  
  if (isDev) {
    // In development mode, load from the Vite dev server
    startUrl = 'http://localhost:5175';
    console.log('Running in development mode, loading from dev server:', startUrl);
  } else {
    // In production mode, find and load the built HTML file
    const htmlPath = findHtmlPath();
    console.log(`Found HTML path: ${htmlPath}`);
    
    // Double-check file exists before attempting to load
    if (!fs.existsSync(htmlPath)) {
      console.error(`ERROR: HTML file not found at: ${htmlPath}`);
    }
    
    startUrl = url.format({
      pathname: htmlPath,
      protocol: 'file:',
      slashes: true,
      hash: '/' // Add hash for HashRouter compatibility in Electron
    });
    
    console.log('Running in production mode, loading from file:', startUrl);
  }
  
  console.log('Loading URL:', startUrl);
  
  // Load the URL
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('Failed to load URL:', err);
    
    // If in production and main URL load failed, try the most basic path
    if (!isDev) {
      // Try finding index.html in various locations
      const possibleFallbackPaths = [
        path.join(__dirname, '..', 'dist', 'index.html'),
        path.join(process.cwd(), 'dist', 'index.html')
      ];
      
      let fallbackPath = null;
      for (const p of possibleFallbackPaths) {
        if (fs.existsSync(p)) {
          fallbackPath = p;
          break;
        }
      }
      
      if (fallbackPath) {
        const basicPath = url.format({
          pathname: fallbackPath,
          protocol: 'file:',
          slashes: true
        });
        
        console.log('Trying fallback path:', basicPath);
        
        mainWindow.loadURL(basicPath).catch(err2 => {
          console.error('Still failed to load URL:', err2);
          showErrorScreen(`Failed to load application: ${err2.message}`);
        });
      } else {
        showErrorScreen(`No valid index.html found. Initial error: ${err.message}`);
      }
    } else {
      showErrorScreen(`Development server not running: ${err.message}`);
    }
  });

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    
    // Apply zoom factor if needed
    if (zoomFactor !== 1.0) {
      mainWindow.webContents.setZoomFactor(zoomFactor);
      console.log(`Zoom factor applied: ${zoomFactor}`);
    }
    
    mainWindow.show();
    mainWindow.focus();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Function to show an error screen
  function showErrorScreen(errorMessage) {
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error Loading Application</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .error { color: #e53e3e; margin: 20px 0; }
          .paths { text-align: left; margin: 20px auto; max-width: 80%; background: #f7fafc; padding: 15px; border-radius: 5px; }
          code { font-family: monospace; word-break: break-all; }
        </style>
      </head>
      <body>
        <h2>Failed to Load Application</h2>
        <p class="error">Error: ${errorMessage}</p>
        <div class="paths">
          <p><strong>App path:</strong> <code>${app.getAppPath()}</code></p>
          <p><strong>__dirname:</strong> <code>${__dirname}</code></p>
          <p><strong>process.cwd():</strong> <code>${process.cwd()}</code></p>
        </div>
        <p>Please contact support if this issue persists.</p>
      </body>
      </html>
    `));
  }

  // Log any load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    
    if (isDev) {
      // In dev mode, show a helpful message about the development server
      showErrorScreen(
        `Failed to connect to development server at http://localhost:5175. 
        Make sure to run npm run dev first.`
      );
    } else {
      // In production, show a detailed error screen
      showErrorScreen(
        `Failed to load application: ${errorDescription} (Code: ${errorCode})`
      );
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });
}

// Handle offline services IPC events
function setupOfflineServices() {
  // Listen for offline services ready event
  ipcMain.on('offline-services-ready', () => {
    console.log('Offline services initialized successfully');
    offlineServicesReady = true;
    
    // Notify renderer process
    if (mainWindow) {
      mainWindow.webContents.send('offline-status', { ready: true });
    }
  });
  
  // Listen for offline services error event
  ipcMain.on('offline-services-error', (event, errorMessage) => {
    console.error('Offline services initialization failed:', errorMessage);
    
    // Notify renderer process
    if (mainWindow) {
      mainWindow.webContents.send('offline-status', { 
        ready: false, 
        error: errorMessage 
      });
    }
    
    // Show error dialog
    dialog.showErrorBox(
      'Offline Services Error', 
      `Failed to initialize offline capabilities: ${errorMessage}\n\nThe application will continue to work in online-only mode.`
    );
  });
}

/**
 * Register PDF export handlers
 * This needs to be done after app is ready
 */
const registerPdfHandlers = async () => {
  console.log('Registering PDF export handlers...');
  
  // Handle PDF generation request from renderer process
  ipcMain.handle('generate-pdf', async (event, { html, fileName, options }) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const { BrowserWindow, dialog } = require('electron');
      
      // Create a temporary hidden window
      const tempWin = new BrowserWindow({ 
        width: 800,
        height: 1200,
        show: false,
        webPreferences: {
          offscreen: true,
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      // Write the HTML content to a temporary file
      const tempFile = path.join(app.getPath('temp'), `temp_pdf_${Date.now()}.html`);
      fs.writeFileSync(tempFile, html);
      
      // Load the HTML file (not data URL) to ensure all styles are properly loaded
      await tempWin.loadFile(tempFile);
      
      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 1000)); // Give it time to render
      
      // Generate PDF
      const pdf = await tempWin.webContents.printToPDF(options);
      
      // Close the temporary window
      tempWin.close();
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.warn('Failed to delete temporary file:', err);
      }
      
      // Show save dialog
      const { filePath, canceled } = await dialog.showSaveDialog({
        defaultPath: fileName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      
      if (canceled) return { canceled: true };
      
      // Save the PDF
      fs.writeFileSync(filePath, pdf);
      
      return { success: true, filePath };
    } catch (error) {
      console.error('Error generating PDF:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle WhatsApp messaging
  ipcMain.handle('send-whatsapp-message', async (event, { phone, message }) => {
    const p = (phone || '').replace(/[^+\d]/g, '').replace(/^00/, '+');
    const encodedMsg = encodeURIComponent(message || '');
    const base = 'https://api.whatsapp.com/send';
    const url = p ? `${base}?phone=${p}&text=${encodedMsg}` : `${base}?text=${encodedMsg}`;
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch {
      const webBase = 'https://web.whatsapp.com/send';
      const fallbackUrl = p ? `${webBase}?phone=${p}&text=${encodedMsg}` : `${webBase}?text=${encodedMsg}`;
      await shell.openExternal(fallbackUrl);
      return { success: true };
    }
  });

  // Handle PDF printing with specific path
  ipcMain.handle('print-to-pdf-with-path', async (event, { content, filePath, options }) => {
    try {
      console.log(`Printing PDF to path: ${filePath}`);
      
      // Create a temporary hidden window to properly render the HTML content
      const tempWindow = new BrowserWindow({
        width: 800,
        height: 1200,
        show: false, // Keep it hidden
        webPreferences: {
          offscreen: true,
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      // Write the HTML content to a temporary file
      const tempFile = path.join(app.getPath('temp'), `temp_pdf_path_${Date.now()}.html`);
      fs.writeFileSync(tempFile, content);
      
      // Load the HTML file (not data URL) to ensure all styles are properly loaded
      await tempWindow.loadFile(tempFile);
      
      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 1000)); // Give it time to render
      
      // Generate PDF
      const data = await tempWindow.webContents.printToPDF(options || {
        printBackground: true,
        landscape: false,
        margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
        pageSize: 'A4'
      });
      
      // Close the temporary window
      tempWindow.close();
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.warn('Failed to delete temporary file:', err);
      }
      
      // Save the PDF to the specified path
      fs.writeFileSync(filePath, data);
      console.log(`PDF saved to: ${filePath}`);
      return { success: true, filePath };
    } catch (error) {
      console.error('Error printing to PDF:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle direct PDF saving without dialog
  ipcMain.handle('direct-save-pdf', async (event, { content, fileName, options }) => {
    try {
      console.log(`Direct save PDF as: ${fileName}`);
      
      // Create a temporary hidden window to properly render the HTML content
      const tempWindow = new BrowserWindow({
        width: 800,
        height: 1200,
        show: false, // Keep it hidden
        webPreferences: {
          offscreen: true,
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      // Write the HTML content to a temporary file
      const tempFile = path.join(app.getPath('temp'), `temp_receipt_${Date.now()}.html`);
      fs.writeFileSync(tempFile, content);
      
      // Load the HTML file (not data URL) to ensure all styles are properly loaded
      await tempWindow.loadFile(tempFile);
      
      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 1000)); // Give it time to render
      
      // Generate PDF from the rendered content
      const data = await tempWindow.webContents.printToPDF(options || {
        printBackground: true,
        landscape: false,
        margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
        pageSize: 'A4'
      });
      
      // Close the temporary window
      tempWindow.close();
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.warn('Failed to delete temporary file:', err);
      }
      
      // Let the user choose where to save the file
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save PDF',
        defaultPath: fileName,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });
      
      if (!canceled && filePath) {
        fs.writeFileSync(filePath, data);
        console.log(`PDF saved to: ${filePath}`);
        return { success: true, filePath };
      } else {
        console.log('PDF save canceled');
        return { success: false, canceled: true };
      }
    } catch (error) {
      console.error('Error with direct save PDF:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle opening files
  ipcMain.handle('open-file', async (event, filePath) => {
    try {
      console.log(`Opening file: ${filePath}`);
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error opening file:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle file export dialog
  ipcMain.handle('show-save-dialog', async (event, options) => {
    try {
      console.log('Showing save dialog');
      const result = await dialog.showSaveDialog(options);
      return result;
    } catch (error) {
      console.error('Error showing save dialog:', error);
      return { canceled: true, error: error.message };
    }
  });

  // Handle file save
  ipcMain.handle('save-file', async (event, { filePath, data }) => {
    try {
      console.log(`Saving file to: ${filePath}`);
      fs.writeFileSync(filePath, data);
      return { success: true };
    } catch (error) {
      console.error('Error saving file:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle file open dialog
  ipcMain.handle('show-open-dialog', async (event, options) => {
    try {
      console.log('Showing open dialog');
      const result = await dialog.showOpenDialog(options);
      return result;
    } catch (error) {
      console.error('Error showing open dialog:', error);
      return { canceled: true, error: error.message };
    }
  });

  // Handle file read
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      console.log(`Reading file: ${filePath}`);
      const data = fs.readFileSync(filePath);
      return { success: true, data };
    } catch (error) {
      console.error('Error reading file:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle open external link
  ipcMain.on('open-external-link', async (event, url) => {
    try {
      console.log(`Opening external link: ${url}`);
      await shell.openExternal(url);
    } catch (error) {
      console.error('Error opening external link:', error);
    }
  });

  console.log('PDF export handlers registered successfully');
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('Electron app is ready');
  createWindow();
  registerPdfHandlers();
  setupOfflineServices();

  // On macOS it's common to re-create a window when the dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// These handlers are now registered in the registerPdfHandlers function
// DO NOT register them twice
