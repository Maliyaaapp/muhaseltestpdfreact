interface ElectronAPI {
  showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
  saveFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  showOpenDialog: (options: any) => Promise<string | null>;
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  isElectron: boolean;
  platform: string;
  getAppVersion: () => string;
  testPreload: () => string;
  sendWhatsAppMessage: (phone: string, message: string) => Promise<{ success: boolean }>;
  generatePDF: (html: string, fileName: string, options?: any) => Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }>;
  directSavePdf: (content: string, fileName: string, options?: any) => Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }>;
}

interface ElectronConsole {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

interface ElectronIPCRenderer {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, func: (...args: any[]) => void) => () => void;
}

interface Window {
  electronAPI: ElectronAPI;
  electronConsole: ElectronConsole;
  electron: {
    ipcRenderer: ElectronIPCRenderer;
  };
  preloadComplete: boolean;
} 