import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

// Simple plugin to create _redirects file
const createRedirectsFile = () => {
  return {
    name: 'create-redirects-file',
    closeBundle: async () => {
      try {
        const distDir = path.resolve(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        
        fs.writeFileSync(path.resolve(distDir, '_redirects'), '/* /index.html 200\n');
        console.log('Created _redirects file for Netlify');
      } catch (error) {
        console.error('Error creating _redirects file:', error);
      }
    }
  };
};


// Create dist-electron directory for Electron main and preload scripts
const createElectronFilesPlugin = () => {
  return {
    name: 'create-electron-files',
    closeBundle: async () => {
      try {
        const distElectronDir = path.resolve(__dirname, 'dist-electron');
        if (!fs.existsSync(distElectronDir)) {
          fs.mkdirSync(distElectronDir, { recursive: true });
        }
        
        // Copy main.cjs to dist-electron
        fs.copyFileSync(
          path.resolve(__dirname, 'main.cjs'),
          path.resolve(distElectronDir, 'main.cjs')
        );
        
        // Copy preload.cjs to dist-electron
        fs.copyFileSync(
          path.resolve(__dirname, 'preload.cjs'),
          path.resolve(distElectronDir, 'preload.cjs')
        );
        
        console.log('Copied Electron files to dist-electron');
      } catch (error) {
        console.error('Error copying Electron files:', error);
      }
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './', // Ensure assets use relative paths
  plugins: [
    react(),
    createRedirectsFile(),
    createElectronFilesPlugin()
  ],
  esbuild: {
    // Remove console.log, console.info, and console.debug in production
    // Keep console.error and console.warn for critical logs
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    pure: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : []
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    cssCodeSplit: false, // Force one CSS file
    minify: true, // Enable minification for production
    sourcemap: process.env.NODE_ENV !== 'production', // Enable sourcemaps for debugging only in dev
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
}));
