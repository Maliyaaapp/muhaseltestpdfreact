import { contextBridge, ipcRenderer } from 'electron';

// Log when preload script starts
console.log('Preload script starting...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  saveFile: (filePath: string, data: string) => ipcRenderer.invoke('save-file', { filePath, data }),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  
  // Environment information
  isElectron: true,
  platform: process.platform,
  
  // App information
  getAppVersion: () => '1.0.0',
  
  // Testing function to verify preload is working
  testPreload: () => 'الاتصال بواجهة برمجة التطبيقات ناجح!'
});

// Add a simple console API for debugging
contextBridge.exposeInMainWorld('electronConsole', {
  log: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
  info: (...args: any[]) => console.info(...args)
});

// Notify the renderer process that the preload script has completed
contextBridge.exposeInMainWorld('preloadComplete', true);

// Log when preload is complete
console.log('Preload script executed successfully');

// Define valid channels for type safety
const validInvokeChannels = [
  'generate-pdf', 
  'direct-save-pdf', 
  'print-to-pdf-with-path',
  'show-save-dialog',
  'save-file',
  'show-open-dialog',
  'read-file',
  'open-file'
] as const;

const validListenChannels = [
  'pdf-generated',
  'offline-status'
] as const;

type InvokeChannel = typeof validInvokeChannels[number];
type ListenChannel = typeof validListenChannels[number];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Add PDF generation methods
  ipcRenderer: {
    // Add invoke method for PDF generation
    invoke: (channel: InvokeChannel, ...args: any[]) => {
      console.log(`IPC invoke request for channel: ${channel}`);
      if (validInvokeChannels.includes(channel as any)) {
        console.log(`Allowing IPC invoke for channel: ${channel}`);
        return ipcRenderer.invoke(channel, ...args);
      }
      console.error(`Unauthorized IPC channel: ${channel}`);
      return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
    },
    
    // Add on method for PDF generation notifications
    on: (channel: ListenChannel, func: (...args: any[]) => void) => {
      if (validListenChannels.includes(channel as any)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (_event, ...args) => func(...args));
        return () => {
          ipcRenderer.removeListener(channel, func as any);
        };
      }
      return () => {};
    }
  }
}); 