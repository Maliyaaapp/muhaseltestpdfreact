const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

// Log that preload script is running
console.log('Preload script is running...');

// Set up proper error handlers
window.addEventListener('error', (event) => {
  console.error('Uncaught error in preload:', event.error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in preload:', error);
});

// Do not modify React globals here; use contextBridge only

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System info for debugging
  system: {
    platform: process.platform,
    arch: process.arch,
    version: process.versions.electron,
    nodeVersion: process.versions.node,
    osInfo: {
      platform: os.platform(),
      release: os.release(),
      type: os.type(),
    }
  },
  
  // Test function to verify preload is working
  testPreload: () => 'Preload script is working!',
  
  // Send info to main process
  sendToMain: (channel, data) => {
    const validChannels = ['export-pdf', 'print-pdf', 'save-pdf', 'show-dialog', 'offline-services-ready', 'offline-services-error'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Receive info from main process
  receiveFromMain: (channel, func) => {
    const validChannels = ['pdf-exported', 'pdf-saved', 'dialog-response', 'pdf-error', 'offline-status'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  
  // Open external links
  openExternalLink: (url) => {
    ipcRenderer.send('open-external-link', url);
  },

  // PDF generation API
  generatePDF: (html, fileName, options) => 
    ipcRenderer.invoke('generate-pdf', { html, fileName, options }),

  // WhatsApp messaging API
  sendWhatsAppMessage: (phone, message) => 
    ipcRenderer.invoke('send-whatsapp-message', { phone, message }),

  // Additional PDF and file handling methods
  generatePdf: (html, fileName, options) => {
    return ipcRenderer.invoke('generate-pdf', { html, fileName, options });
  },

  printToPdfWithPath: (content, filePath, options) => {
    return ipcRenderer.invoke('print-to-pdf-with-path', { content, filePath, options });
  },

  directSavePdf: (content, fileName, options) => {
    return ipcRenderer.invoke('direct-save-pdf', { content, fileName, options });
  },

  openFile: (filePath) => {
    return ipcRenderer.invoke('open-file', filePath);
  },

  showSaveDialog: (options) => {
    return ipcRenderer.invoke('show-save-dialog', options);
  },

  saveFile: (filePath, data) => {
    return ipcRenderer.invoke('save-file', { filePath, data });
  },

  showOpenDialog: (options) => {
    return ipcRenderer.invoke('show-open-dialog', options);
  },

  readFile: (filePath) => {
    return ipcRenderer.invoke('read-file', filePath);
  },
  // Generate PDF bytes without saving (for zipping)
  generatePdfBytes: (html, options) => {
    return ipcRenderer.invoke('generate-pdf-bytes', { html, options });
  },
  // Temp dir and filesystem helpers
  getTempDir: () => ipcRenderer.invoke('get-temp-dir'),
  ensureDir: (dirPath) => ipcRenderer.invoke('ensure-dir', dirPath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  
  // Playwright-based bulk PDF generation for high-fidelity receipts
  // Generates multiple PDFs efficiently by reusing browser instance
  playwrightBulkPdf: (htmlContents, fileNames) => {
    return ipcRenderer.invoke('playwright-bulk-pdf', { htmlContents, fileNames });
  },
  
  // ULTRA-FAST: Generate PDFs and save ZIP directly (no IPC transfer)
  playwrightBulkPdfToZip: (htmlContents, fileNames, zipPath) => {
    return ipcRenderer.invoke('playwright-bulk-pdf-to-zip', { htmlContents, fileNames, zipPath });
  },
  
  // FAST: Single PDF generation using Playwright (reuses same browser instance)
  // Returns PDF buffer for renderer to handle save dialog
  playwrightSinglePdf: (html, fileName) => {
    return ipcRenderer.invoke('playwright-single-pdf', { html, fileName });
  },
  
  // Version info
  appVersion: process.env.APP_VERSION || '1.0.0'
});

// Export versions for CommonJS/Electron compatibility
module.exports = {
  versions: process.versions
};
