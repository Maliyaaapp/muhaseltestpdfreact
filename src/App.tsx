import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from './contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';
import NetworkStatus from './components/NetworkStatus';
import SupabaseSyncStatus from './components/SupabaseSyncStatus';

import { ReportSettingsProvider } from './contexts/ReportSettingsContext';
import { ensureStorageConsistency, setupRealtimeSync } from './services/hybridApi';
import storage, { safeClearStorage } from './utils/storage';
import { processSyncQueue } from './services/hybridApi';

// Auth Components
import Login from './pages/auth/Login';

// Layout Components (kept non-lazy for immediate rendering)
import AdminLayout from './layouts/AdminLayout';
import SchoolLayout from './layouts/SchoolLayout';

// Lazy load heavy components
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const SchoolsList = lazy(() => import('./pages/admin/schools/SchoolsList'));
const SchoolForm = lazy(() => import('./pages/admin/schools/SchoolForm'));
const AdminAccountsList = lazy(() => import('./pages/admin/accounts/AccountsList'));
const AdminAccountForm = lazy(() => import('./pages/admin/accounts/AccountForm'));
const SubscriptionsList = lazy(() => import('./pages/admin/subscriptions/SubscriptionsList'));
const ResetApp = lazy(() => import('./pages/admin/ResetApp'));

// School Components - lazy load the heaviest ones
const SchoolDashboard = lazy(() => import('./pages/school/Dashboard'));
const Students = lazy(() => import('./pages/school/students/Students'));
const StudentForm = lazy(() => import('./pages/school/students/StudentForm'));
const Fees = lazy(() => import('./pages/school/fees/Fees'));
const FeeForm = lazy(() => import('./pages/school/fees/FeeForm'));
const Installments = lazy(() => import('./pages/school/installments/Installments'));
const InstallmentForm = lazy(() => import('./pages/school/installments/InstallmentForm'));
const Communications = lazy(() => import('./pages/school/communications/Communications'));
const Settings = lazy(() => import('./pages/school/settings/Settings'));

// Loading component for lazy-loaded routes
const LazyLoadingComponent = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon mx-auto mb-4"></div>
      <p className="text-gray-600">جاري تحميل الصفحة...</p>
    </div>
  </div>
);

// Add this function at the top level, outside any components
const setupLocalStorageCleanupSchedule = () => {
  // Check localStorage integrity every hour
  const HOUR_MS = 60 * 60 * 1000;
  
  // Use a ref to track if the app is still mounted
  let isAppMounted = true;
  
  // Function to validate localStorage
  const validateLocalStorage = () => {
    try {
      // Don't run validation if unmounted or in safe mode or recovery
      if (!isAppMounted || 
          sessionStorage.getItem('use_safe_mode') === 'true' || 
          localStorage.getItem('recovered_from_crash') === 'true') {
        console.log('Skipping localStorage validation in safe/recovery mode or unmounted state');
        return;
      }
      
      // Simple validation of essential keys
      const keysToValidate = ['schools', 'accounts', 'students', 'fees', 'installments', 'messages'];
      
      let foundCorruption = false;
      keysToValidate.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              JSON.parse(data);
            } catch (e) {
              // Corrupted data found, reset it
              console.warn(`Periodic check: Corrupted data found for ${key}, resetting...`);
              localStorage.setItem(key, JSON.stringify([]));
              foundCorruption = true;
            }
          }
        } catch (e) {
          console.error(`Error checking ${key}:`, e);
        }
      });
      
      if (foundCorruption && isAppMounted) {
        console.log('Corrupted localStorage data was fixed during periodic check');
        toast.success('تم إصلاح بيانات مخزنة معطوبة', { duration: 3000 });
      }
      
      // Record when the last cleanup ran
      localStorage.setItem('lastLocalStorageCleanup', new Date().toISOString());
    } catch (error) {
      console.error('Error in scheduled localStorage validation:', error);
    }
  };
  
  // Run immediately on startup with a delay
  const initialCheckTimeout = setTimeout(validateLocalStorage, 5000);
  
  // Schedule regular validation
  const intervalId = setInterval(validateLocalStorage, HOUR_MS);
  
  // Return unsubscribe function
  return () => {
    isAppMounted = false;
    clearTimeout(initialCheckTimeout);
    clearInterval(intervalId);
  };
};

const App = () => {
  const { isAuthenticated, isAuthLoading, user } = useSupabaseAuth();
  const [appReady, setAppReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Delay initial rendering to ensure auth state is properly loaded
    const readyTimer = setTimeout(() => {
      setAppReady(true);
    }, 500);
    
    // Ensure storage is using consistent keys
    try {
      console.log('Running storage consistency check on app initialization');
      ensureStorageConsistency();
    } catch (e) {
      console.error('Error ensuring storage consistency:', e);
    }

    // Setup real-time synchronization
    try {
      console.log('Setting up real-time synchronization');
      setupRealtimeSync();
    } catch (e) {
      console.error('Error setting up real-time sync:', e);
    }
    
    // Check for crash recovery flag and show toast notification
    if (localStorage.getItem('recovered_from_crash') === 'true') {
      console.log('Showing crash recovery notification');
      toast.success(
        'النظام استعاد حالته بنجاح بعد خطأ. تم مسح ذاكرة التخزين المؤقت لحل المشكلة.',
        { 
          duration: 5000,
          icon: '🔄',
          style: {
            borderRadius: '10px',
            background: '#F0F9FF',
            color: '#003366',
          }
        }
      );
      // Remove the flag after showing the notification
      setTimeout(() => {
        localStorage.removeItem('recovered_from_crash');
      }, 5000);
    }
    
    // Setup localStorage cleanup schedule when the app starts
    const cleanupUnsubscribe = setupLocalStorageCleanupSchedule();
    
    // Add keyboard shortcut for admin to clear localStorage
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+Alt+C to clear localStorage - hidden admin function
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'C') {
        if (confirm('هل تريد حقًا مسح ذاكرة التخزين المؤقت؟ سيتم تسجيل خروجك.')) {
          try {
            // Use safe clearing approach to preserve important data
            safeClearStorage();
            toast.success('تم مسح ذاكرة التخزين المؤقت بنجاح. سيتم إعادة تحميل التطبيق.', { 
              duration: 3000
            });
            setTimeout(() => window.location.href = '/', 1000);
          } catch (e) {
            console.error('Error clearing localStorage:', e);
            toast.error('حدث خطأ أثناء مسح ذاكرة التخزين المؤقت');
          }
        }
      }
    };
    
    // Add the keyboard shortcut listener
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearTimeout(readyTimer);
      cleanupUnsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Pre-load essential data function
  const preloadEssentialData = async () => {
    try {
      console.log('📦 Pre-loading essential data for offline use...');
      const { warmCache } = await import('./services/hybridApi');
      await warmCache();
      console.log('✅ Essential data pre-loaded successfully');
    } catch (error) {
      console.error('❌ Failed to pre-load essential data:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  // Initialize data when app is ready
  useEffect(() => {
    if (appReady && !isAuthLoading) {
      preloadEssentialData();
    }
  }, [appReady, isAuthLoading]);



  const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles?: string[] }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }

    if (roles && user && !roles.includes(user.role)) {
      return user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/school" />;
    }

    return children;
  };
  
  // Show loading state until authentication is determined
  if (!appReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-lg bg-maroon flex items-center justify-center">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <p className="mt-4 text-gray-600">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  // Show a loading indicator while both auth and data are initializing
  if (isAuthLoading || isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  return (
    <ReportSettingsProvider>
      <Suspense fallback={<LazyLoadingComponent />}>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : (user?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/school" />)} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="schools" element={<SchoolsList />} />
            <Route path="schools/new" element={<SchoolForm />} />
            <Route path="schools/:id" element={<SchoolForm />} />
            <Route path="accounts" element={<AdminAccountsList />} />
            <Route path="accounts/new" element={<AdminAccountForm />} />
            <Route path="accounts/:id" element={<AdminAccountForm />} />
            <Route path="subscriptions" element={<SubscriptionsList />} />
            <Route path="reset" element={<ResetApp />} />
          </Route>

          {/* School Routes */}
          <Route path="/school" element={
            <ProtectedRoute roles={['schoolAdmin', 'gradeManager']}>
              <SchoolLayout />
            </ProtectedRoute>
          }>
            <Route index element={<SchoolDashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/new" element={<StudentForm />} />
            <Route path="students/:id" element={<StudentForm />} />
            <Route path="fees" element={<Fees />} />
            <Route path="fees/new" element={<FeeForm />} />
            <Route path="fees/:id" element={<FeeForm />} />
            <Route path="installments" element={<Installments />} />
            <Route path="installments/new" element={<InstallmentForm />} />
            <Route path="installments/:id" element={<InstallmentForm />} />
            <Route path="communications" element={<Communications />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="/debug-pdf" element={
            <div style={{ padding: '20px' }}>
              <iframe src="/debug-pdf.html" style={{ width: '100%', height: '80vh', border: 'none' }}></iframe>
            </div>
          } />

          <Route path="/" element={<Navigate to={isAuthenticated ? (user?.role === 'admin' ? '/admin' : '/school') : '/login'} />} />
        </Routes>
      </Suspense>
      <NetworkStatus />
      <SupabaseSyncStatus />
    </ReportSettingsProvider>
  );
};

export default App;
 