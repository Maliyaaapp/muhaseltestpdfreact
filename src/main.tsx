// Disable console logging in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// Import our storage utility
import storage, { safeClearStorage } from './utils/storage';

// App version - declared at the top so it can be used everywhere
const APP_VERSION = '1.0.8'; // Incremented to force cache clear

// Service worker registration removed to fix SecurityError issues

// Check if we're in recovery mode and prevent further redirects
const urlParams = new URLSearchParams(window.location.search);
const isInRecoveryMode = urlParams.get('recovery') === 'true';

// Track how many times we've cleared localStorage to prevent infinite loops
const clearCount = parseInt(sessionStorage.getItem('clear_storage_count') || '0');
const MAX_CLEAR_COUNT = 2; // Maximum number of storage clears allowed in one session

// Crash detection and recovery system
(function setupCrashRecovery() {
  try {
    if (isInRecoveryMode) {
      console.log('Already in recovery mode, skipping reload detection');
      sessionStorage.removeItem('reloadTimestamps');
      return;
    }

    if (clearCount >= MAX_CLEAR_COUNT) {
      console.log('Maximum storage clear attempts reached. Entering safe mode...');
      sessionStorage.setItem('use_safe_mode', 'true');
      sessionStorage.removeItem('reloadTimestamps');
      return;
    }

    const now = Date.now();
    const reloadTimestamps = JSON.parse(sessionStorage.getItem('reloadTimestamps') || '[]');
    reloadTimestamps.push(now);

    while (reloadTimestamps.length > 5) {
      reloadTimestamps.shift();
    }

    sessionStorage.setItem('reloadTimestamps', JSON.stringify(reloadTimestamps));

    if (reloadTimestamps.length >= 3) {
      const firstReload = reloadTimestamps[0];
      const timeSpan = now - firstReload;

      if (timeSpan < 10000) {
        console.error('CRASH LOOP DETECTED! Clearing session data and stopping reloads');

        sessionStorage.setItem('clear_storage_count', (clearCount + 1).toString());

        console.log('Using safe clear to recover from crash loop');
        safeClearStorage();

        console.log('Clearing indexedDB to recover from crash loop');

        storage.set('app_version', APP_VERSION);
        storage.set('recovered_from_crash', 'true');
        storage.set('prevent_reload_loops', 'true');

        if (clearCount + 1 >= MAX_CLEAR_COUNT) {
          sessionStorage.setItem('use_safe_mode', 'true');
        }

        sessionStorage.removeItem('reloadTimestamps');

        setTimeout(() => {
          window.location.replace('./');
        }, 1000);

        return;
      }
    }

    if (storage.get('recovered_from_crash') === 'true') {
      console.log('App recovered from crash loop');
    }

  } catch (error) {
    console.error('Error in crash recovery system:', error);
  }
})();

// CRITICAL: Set React as global BEFORE any other imports to prevent vendor bundle errors
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

// Regular imports and React setup
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import App from './App';
import './index.css';

// Detect if running in Electron (file:// protocol)
const isElectron = window.location.protocol === 'file:' ||
                   window.navigator.userAgent.indexOf('Electron') >= 0;

// Use appropriate router based on environment
const Router = isElectron ? HashRouter : BrowserRouter;

// Force clear localStorage cache when app version changes
const LAST_VERSION = storage.get('app_version');

if (LAST_VERSION !== APP_VERSION) {
  console.log(`Updating from version ${LAST_VERSION} to ${APP_VERSION}, clearing session cache...`);

  safeClearStorage();

  storage.set('app_version', APP_VERSION);

  if (LAST_VERSION && !isInRecoveryMode) {
    window.location.reload();
  }
}

// Special handling for recovery URL parameter
if (isInRecoveryMode) {
  window.history.replaceState({}, document.title, './');

  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display: flex; height: 100vh; justify-content: center; align-items: center; flex-direction: column; font-family: sans-serif; text-align: center; direction: rtl;">
        <div style="width: 80px; height: 80px; margin: 0 auto 20px; background-color: #800000; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold;">
          M
        </div>
        <h1 style="margin-bottom: 20px; color: #800000;">تم استعادة النظام</h1>
        <p style="margin-bottom: 20px;">تم إصلاح مشكلة التحميل المتكرر وتنظيف ذاكرة التخزين المؤقت</p>
        <button onclick="localStorage.removeItem('prevent_reload_loops'); sessionStorage.removeItem('clear_storage_count'); window.location.href='./'" style="padding: 12px 24px; background-color: #800000; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
          الدخول إلى النظام
        </button>
      </div>
    `;
  }
}

// Initialize React app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <SupabaseAuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
              fontFamily: 'Tajawal, sans-serif',
              direction: 'rtl',
            },
          }}
        />
      </SupabaseAuthProvider>
    </Router>
  </React.StrictMode>
);
