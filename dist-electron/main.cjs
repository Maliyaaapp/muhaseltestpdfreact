const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// ============= GLOBAL PLAYWRIGHT BROWSER INSTANCE =============
// Keep browser alive at module level for instant PDF generation
let _playwrightBrowser = null;
let _playwrightContext = null;
let _browserLastUsed = 0;
const _BROWSER_IDLE_TIMEOUT = 120000; // 2 minutes

// Pre-warm browser on app start
const warmUpBrowser = async () => {
  if (_playwrightBrowser) return;
  try {
    const { chromium } = require('playwright');
    console.log('[Playwright] Pre-warming browser...');
    _playwrightBrowser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--no-zygote', '--disable-extensions', '--disable-background-networking', '--disable-sync', '--metrics-recording-only', '--mute-audio', '--no-first-run']
    });
    _playwrightContext = await _playwrightBrowser.newContext({
      viewport: { width: 794, height: 1123 },
      deviceScaleFactor: 1,
      bypassCSP: true
    });
    _browserLastUsed = Date.now();
    console.log('[Playwright] Browser pre-warmed and ready!');
  } catch (e) {
    console.log('[Playwright] Pre-warm failed:', e.message);
  }
};

// Auto-close idle browser
setInterval(() => {
  if (_playwrightBrowser && Date.now() - _browserLastUsed > _BROWSER_IDLE_TIMEOUT) {
    console.log('[Playwright] Closing idle browser');
    _playwrightBrowser.close().catch(() => {});
    _playwrightBrowser = null;
    _playwrightContext = null;
  }
}, 30000);

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

// Disable GPU hardware acceleration to avoid cras ashes
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
      // Use async write for better performance
      await fs.promises.writeFile(filePath, Buffer.from(data));
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

  // Provide temp directory path
  ipcMain.handle('get-temp-dir', async () => {
    try {
      return { success: true, path: app.getPath('temp') };
    } catch (error) {
      console.error('Error getting temp dir:', error);
      return { success: false, error: error.message };
    }
  });

  // Ensure a directory exists
  ipcMain.handle('ensure-dir', async (event, dirPath) => {
    try {
      const fs = require('fs');
      const path = require('path');
      fs.mkdirSync(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      console.error('Error ensuring directory:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete a file
  ipcMain.handle('delete-file', async (event, filePath) => {
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate PDF bytes without saving (for zipping)
  ipcMain.handle('generate-pdf-bytes', async (event, { html, options }) => {
    try {
      const { BrowserWindow } = require('electron');
      const fs = require('fs');
      const path = require('path');
      const tempWindow = new BrowserWindow({
        width: 800,
        height: 1200,
        show: false,
        webPreferences: { offscreen: true, nodeIntegration: false, contextIsolation: true }
      });
      const tempFile = path.join(app.getPath('temp'), `temp_pdf_bytes_${Date.now()}.html`);
      fs.writeFileSync(tempFile, html);
      await tempWindow.loadFile(tempFile);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const data = await tempWindow.webContents.printToPDF(options || {
        printBackground: true,
        landscape: false,
        margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
        pageSize: 'A4'
      });
      tempWindow.close();
      try { fs.unlinkSync(tempFile); } catch {}
      return { success: true, data };
    } catch (error) {
      console.error('Error generating PDF bytes:', error);
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

  // Use global browser instance for maximum speed
  const getOrCreateBrowser = async () => {
    if (_playwrightBrowser && _playwrightContext) {
      _browserLastUsed = Date.now();
      return { browser: _playwrightBrowser, context: _playwrightContext, reused: true };
    }
    
    // Create new browser if not exists
    await warmUpBrowser();
    _browserLastUsed = Date.now();
    return { browser: _playwrightBrowser, context: _playwrightContext, reused: false };
  };

  // ULTRA-FAST Playwright bulk PDF generation with persistent browser
  ipcMain.handle('playwright-bulk-pdf', async (event, { htmlContents, fileNames }) => {
    const startTime = Date.now();
    
    // Use more workers for speed
    const os = require('os');
    const cpuCount = os.cpus().length;
    const CONCURRENCY = Math.min(12, Math.max(4, cpuCount));
    
    console.log(`[Playwright] ${htmlContents?.length} PDFs | ${CONCURRENCY} workers (${cpuCount} cores)`);
    
    try {
      const { context, reused } = await getOrCreateBrowser();
      if (reused) {
        console.log('[Playwright] Reusing browser instance');
      }
      
      // Pre-create page pool
      const pagePool = await Promise.all(
        Array(CONCURRENCY).fill(null).map(async (_, i) => {
          const page = await context.newPage();
          return { page, id: i };
        })
      );
      
      // Results array (maintains order)
      const results = new Array(htmlContents.length).fill(null);
      let completed = 0;
      let lastLogTime = startTime;
      
      // Process single PDF - no retry for speed
      const processPdf = async (index, html, fileName, pageInfo) => {
        const { page } = pageInfo;
        
        try {
          // Set content with minimal wait - use 'commit' for fastest loading
          await page.setContent(html, { 
            waitUntil: 'commit',
            timeout: 5000
          });
          
          // Generate PDF in memory with minimal options
          const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', bottom: '0', left: '0', right: '0' }
          });
          
          // Skip validation for speed
          if (pdfBuffer.length < 500) {
            throw new Error('PDF too small');
          }
          
          results[index] = {
            success: true,
            fileName,
            data: pdfBuffer
          };
          
        } catch (err) {
          results[index] = { success: false, fileName, error: err.message };
        }
        
        completed++;
        
        // Minimal logging - only at milestones
        const now = Date.now();
        if (completed === 1 || completed % 5 === 0 || completed === htmlContents.length) {
          const avgMs = Math.round((now - startTime) / completed);
          console.log(`[Playwright] ${completed}/${htmlContents.length} @ ${avgMs}ms/PDF`);
        }
      };
      
      // Parallel processing with worker pool - use atomic counter for speed
      let nextIndex = 0;
      const getNextItem = () => {
        const idx = nextIndex++;
        return idx < htmlContents.length ? { index: idx, html: htmlContents[idx], fileName: fileNames[idx] } : null;
      };
      
      const runWorker = async (pageInfo) => {
        let item;
        while ((item = getNextItem()) !== null) {
          await processPdf(item.index, item.html, item.fileName, pageInfo);
        }
      };
      
      // Start all workers simultaneously
      await Promise.all(pagePool.map(runWorker));
      
      // Cleanup pages only (keep browser alive for next call)
      await Promise.all(pagePool.map(({ page }) => page.close().catch(() => {})));
      
      const elapsed = Date.now() - startTime;
      const successCount = results.filter(r => r?.success).length;
      console.log(`[Playwright] DONE: ${successCount}/${htmlContents.length} in ${elapsed}ms (${Math.round(elapsed / htmlContents.length)}ms/PDF)`);
      
      return { success: true, results: results.filter(r => r) };
    } catch (error) {
      console.error('Playwright error:', error);
      // Reset browser on error
      if (_playwrightBrowser) {
        try { await _playwrightBrowser.close(); } catch {}
        _playwrightBrowser = null;
        _playwrightContext = null;
      }
      return { success: false, error: error.message };
    }
  });

  // ULTRA-FAST: Generate PDFs and save ZIP directly in main process (no IPC transfer)
  ipcMain.handle('playwright-bulk-pdf-to-zip', async (event, { htmlContents, fileNames, zipPath }) => {
    const startTime = Date.now();
    const os = require('os');
    const cpuCount = os.cpus().length;
    // Use more workers - each page is lightweight
    const CONCURRENCY = Math.min(16, Math.max(6, cpuCount));
    
    console.log(`[ZIP] ${htmlContents?.length} PDFs | ${CONCURRENCY} workers | ${zipPath}`);
    
    try {
      const { context, reused } = await getOrCreateBrowser();
      if (reused) console.log('[ZIP] Browser ready');
      
      // Pre-create page pool
      const pagePool = await Promise.all(
        Array(CONCURRENCY).fill(null).map(async () => {
          const page = await context.newPage();
          return { page };
        })
      );
      
      // Store PDF buffers directly
      const pdfBuffers = new Array(htmlContents.length).fill(null);
      let completed = 0;
      let nextIndex = 0;
      
      const processPdf = async (index, html, pageInfo) => {
        try {
          // Use 'commit' for fastest loading - don't wait for full render
          await pageInfo.page.setContent(html, { waitUntil: 'commit', timeout: 3000 });
          pdfBuffers[index] = await pageInfo.page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', bottom: '0', left: '0', right: '0' }
          });
        } catch (err) {
          pdfBuffers[index] = null;
        }
        completed++;
        // Minimal logging
        if (completed === htmlContents.length) {
          console.log(`[ZIP] ${completed}/${htmlContents.length} PDFs done`);
        }
      };
      
      const getNextItem = () => {
        const idx = nextIndex++;
        return idx < htmlContents.length ? { index: idx, html: htmlContents[idx] } : null;
      };
      
      const runWorker = async (pageInfo) => {
        let item;
        while ((item = getNextItem()) !== null) {
          await processPdf(item.index, item.html, pageInfo);
        }
      };
      
      await Promise.all(pagePool.map(runWorker));
      await Promise.all(pagePool.map(({ page }) => page.close().catch(() => {})));
      
      // Build ZIP directly in main process (no IPC transfer!)
      // Simple ZIP builder (store method, no compression for speed)
      const buildZipBuffer = (files) => {
        const crc32Table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
          crc32Table[i] = c >>> 0;
        }
        const crc32 = (buf) => {
          let c = 0xffffffff;
          for (let i = 0; i < buf.length; i++) c = crc32Table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
          return (c ^ 0xffffffff) >>> 0;
        };
        
        const now = new Date();
        const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((Math.floor(now.getSeconds() / 2) & 0x1f));
        const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0xf) << 5) | (now.getDate() & 0x1f);
        
        const parts = [];
        const centralParts = [];
        let offset = 0;
        
        for (const { name, data } of files) {
          const nameBytes = Buffer.from(name, 'utf8');
          const crc = crc32(data);
          
          // Local header
          const lh = Buffer.alloc(30 + nameBytes.length);
          lh.writeUInt32LE(0x04034b50, 0);
          lh.writeUInt16LE(20, 4);
          lh.writeUInt16LE(0x0800, 6);
          lh.writeUInt16LE(0, 8);
          lh.writeUInt16LE(dosTime, 10);
          lh.writeUInt16LE(dosDate, 12);
          lh.writeUInt32LE(crc, 14);
          lh.writeUInt32LE(data.length, 18);
          lh.writeUInt32LE(data.length, 22);
          lh.writeUInt16LE(nameBytes.length, 26);
          lh.writeUInt16LE(0, 28);
          nameBytes.copy(lh, 30);
          parts.push(lh, data);
          
          // Central header
          const ch = Buffer.alloc(46 + nameBytes.length);
          ch.writeUInt32LE(0x02014b50, 0);
          ch.writeUInt16LE(20, 4);
          ch.writeUInt16LE(20, 6);
          ch.writeUInt16LE(0x0800, 8);
          ch.writeUInt16LE(0, 10);
          ch.writeUInt16LE(dosTime, 12);
          ch.writeUInt16LE(dosDate, 14);
          ch.writeUInt32LE(crc, 16);
          ch.writeUInt32LE(data.length, 20);
          ch.writeUInt32LE(data.length, 24);
          ch.writeUInt16LE(nameBytes.length, 28);
          ch.writeUInt16LE(0, 30);
          ch.writeUInt16LE(0, 32);
          ch.writeUInt16LE(0, 34);
          ch.writeUInt16LE(0, 36);
          ch.writeUInt32LE(0, 38);
          ch.writeUInt32LE(offset, 42);
          nameBytes.copy(ch, 46);
          centralParts.push(ch);
          
          offset += lh.length + data.length;
        }
        
        const centralSize = centralParts.reduce((s, b) => s + b.length, 0);
        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(0x06054b50, 0);
        eocd.writeUInt16LE(0, 4);
        eocd.writeUInt16LE(0, 6);
        eocd.writeUInt16LE(files.length, 8);
        eocd.writeUInt16LE(files.length, 10);
        eocd.writeUInt32LE(centralSize, 12);
        eocd.writeUInt32LE(offset, 16);
        eocd.writeUInt16LE(0, 20);
        
        return Buffer.concat([...parts, ...centralParts, eocd]);
      };
      
      const zipFiles = [];
      let successCount = 0;
      
      for (let i = 0; i < pdfBuffers.length; i++) {
        if (pdfBuffers[i] && pdfBuffers[i].length > 500) {
          zipFiles.push({ name: fileNames[i], data: pdfBuffers[i] });
          successCount++;
        }
      }
      
      // Write ZIP directly to disk
      const zipBuffer = buildZipBuffer(zipFiles);
      await fs.promises.writeFile(zipPath, zipBuffer);
      
      const elapsed = Date.now() - startTime;
      console.log(`[Playwright->ZIP] DONE: ${successCount}/${htmlContents.length} in ${elapsed}ms, saved to ${zipPath}`);
      
      return { success: true, count: successCount, elapsed };
    } catch (error) {
      console.error('Playwright->ZIP error:', error);
      if (_playwrightBrowser) {
        try { await _playwrightBrowser.close(); } catch {}
        _playwrightBrowser = null;
        _playwrightContext = null;
      }
      return { success: false, error: error.message };
    }
  });

  // FAST: Single PDF generation using Playwright (reuses same browser instance)
  ipcMain.handle('playwright-single-pdf', async (event, { html, fileName }) => {
    const startTime = Date.now();
    console.log(`[Playwright-Single] Generating: ${fileName}`);
    
    try {
      const { context, reused } = await getOrCreateBrowser();
      if (reused) {
        console.log('[Playwright-Single] Reusing browser instance');
      }
      
      // Create a single page for this PDF
      const page = await context.newPage();
      
      try {
        // Set content with minimal wait
        await page.setContent(html, { 
          waitUntil: 'commit',
          timeout: 10000
        });
        
        // Generate PDF in memory
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0', bottom: '0', left: '0', right: '0' }
        });
        
        // Validate PDF
        if (pdfBuffer.length < 500) {
          throw new Error('PDF too small - generation may have failed');
        }
        
        const elapsed = Date.now() - startTime;
        console.log(`[Playwright-Single] Generated in ${elapsed}ms (${pdfBuffer.length} bytes)`);
        
        // Return buffer to renderer for save dialog
        return { 
          success: true, 
          data: pdfBuffer,
          fileName,
          elapsed 
        };
        
      } finally {
        // Always close the page
        await page.close().catch(() => {});
      }
      
    } catch (error) {
      console.error('[Playwright-Single] Error:', error);
      // Reset browser on error
      if (_playwrightBrowser) {
        try { await _playwrightBrowser.close(); } catch {}
        _playwrightBrowser = null;
        _playwrightContext = null;
      }
      return { success: false, error: error.message };
    }
  });

  console.log('PDF export handlers registered successfully');
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  console.log('Electron app is ready');
  createWindow();
  registerPdfHandlers();
  setupOfflineServices();
  
  // Pre-warm Playwright browser immediately for instant PDF generation
  warmUpBrowser();

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
