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

// Fix for React hooks in Electron - ensure React is available globally
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Setting up React environment...');
  
  // Create a global React hook resolver to prevent undefined errors
  if (typeof window !== 'undefined') {
    window.React = window.React || {};
    window.ReactDOM = window.ReactDOM || {};
    
    // Prevent useLayoutEffect undefined error by creating a safe hook resolver
    const safeHookResolver = {
      useLayoutEffect: (fn, deps) => {
        if (window.React && window.React.useLayoutEffect) {
          return window.React.useLayoutEffect(fn, deps);
        } else {
          console.warn('useLayoutEffect called before React loaded, using setTimeout fallback');
          return setTimeout(fn, 0);
        }
      },
      useEffect: (fn, deps) => {
        if (window.React && window.React.useEffect) {
          return window.React.useEffect(fn, deps);
        } else {
          console.warn('useEffect called before React loaded, using setTimeout fallback');
          return setTimeout(fn, 0);
        }
      }
    };
    
    // Override React hooks temporarily until React is fully loaded
    Object.defineProperty(window, 'React', {
      get() {
        return this._react || safeHookResolver;
      },
      set(value) {
        this._react = value;
        console.log('React loaded:', !!value);
        // Merge safe hooks with actual React once loaded
        if (value && value.useLayoutEffect) {
          Object.assign(value, safeHookResolver);
        }
      },
      configurable: true
    });
  }
});

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
  
  // Version info
  appVersion: process.env.APP_VERSION || '1.0.0'
});

// Export versions for CommonJS/Electron compatibility
module.exports = {
  versions: process.versions
};
