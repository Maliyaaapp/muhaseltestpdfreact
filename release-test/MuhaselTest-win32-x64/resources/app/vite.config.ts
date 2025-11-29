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

// React initialization plugin to fix useLayoutEffect errors
const reactInitPlugin = () => {
  return {
    name: 'react-init-plugin',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Add React initialization script at the very beginning
        const reactInitScript = `
          <script>
            // React initialization fix for Electron
            (function() {
              if (typeof window !== 'undefined') {
                window.React = window.React || {};
                window.ReactDOM = window.ReactDOM || {};
                
                // Safe hook implementations to prevent undefined errors
                const safeHooks = {
                  useLayoutEffect: function(fn, deps) {
                    console.log('useLayoutEffect called, using fallback');
                    return typeof setTimeout !== 'undefined' ? setTimeout(fn, 0) : fn();
                  },
                  useEffect: function(fn, deps) {
                    console.log('useEffect called, using fallback');
                    return typeof setTimeout !== 'undefined' ? setTimeout(fn, 0) : fn();
                  },
                  useState: function(initialState) {
                    console.log('useState called, using fallback');
                    return [initialState, function() {}];
                  },
                  useRef: function(initialValue) {
                    console.log('useRef called, using fallback');
                    return { current: initialValue };
                  }
                };
                
                // Apply safe hooks to window.React
                Object.keys(safeHooks).forEach(function(hook) {
                  if (!window.React[hook]) {
                    window.React[hook] = safeHooks[hook];
                  }
                });
                
                console.log('React initialization completed');
              }
            })();
          </script>
        `;
        
        // Insert the script right after the opening <head> tag
        return html.replace('<head>', '<head>' + reactInitScript);
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
    reactInitPlugin(), // Add React initialization plugin first
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
      },
      output: {
        manualChunks: (id) => {
          // Split vendor libraries into separate chunks - prioritize React
          if (id.includes('node_modules')) {
            // React and ReactDOM must load first
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('react-dom')) return 'react-vendor';
            if (id.includes('@mui')) return 'mui-vendor';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-vendor';
            if (id.includes('xlsx') || id.includes('file-saver')) return 'excel-vendor';
            if (id.includes('date-fns') || id.includes('moment')) return 'date-vendor';
            return 'vendor';
          }
          
          // Split application code by features
          if (id.includes('/pages/admin/')) return 'admin-pages';
          if (id.includes('/pages/school/')) return 'school-pages';
          if (id.includes('/components/')) return 'components';
          if (id.includes('/services/')) return 'services';
          if (id.includes('/utils/')) return 'utils';
          
          return 'main';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/styles.[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
}));
