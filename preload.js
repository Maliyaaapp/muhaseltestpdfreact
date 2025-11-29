const { contextBridge, ipcRenderer } = require('electron');

// Log when preload script starts
console.log('Preload script starting...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  saveFile: (filePath, data) => ipcRenderer.invoke('save-file', { filePath, data }),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // Environment information
  isElectron: true,
  platform: process.platform,
  
  // App information
  getAppVersion: () => '1.0.0',
  
  // Testing function to verify preload is working
  testPreload: () => 'الاتصال بواجهة برمجة التطبيقات ناجح!',
  
  // PDF generation
  generatePDF: (html, fileName, options) => 
    ipcRenderer.invoke('generate-pdf', { html, fileName, options }),
    
  // WhatsApp messaging
  sendWhatsAppMessage: (phone, message) => 
    ipcRenderer.invoke('send-whatsapp-message', { phone, message })
});

// Add a simple console API for debugging
contextBridge.exposeInMainWorld('electronConsole', {
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args),
  info: (...args) => console.info(...args)
});

// Notify the renderer process that the preload script has completed
contextBridge.exposeInMainWorld('preloadComplete', true);

// Log when preload is complete
console.log('Preload script executed successfully');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => {
      // List of allowed channels for explicit clarity, though currently allowing all
      const validChannels = [
        'generate-pdf', 
        'direct-save-pdf', 
        'print-to-pdf-with-path',
        'show-save-dialog',
        'save-file',
        'show-open-dialog',
        'read-file',
        'send-whatsapp-message'
      ];
      console.log(`IPC invoke request for channel: ${channel}`);
      return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, func) => {
      const subscription = (_event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once: (channel, func) => {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    }
  }
}); 