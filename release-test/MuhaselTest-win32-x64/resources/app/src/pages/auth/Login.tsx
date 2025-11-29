import { useState, FormEvent, useEffect } from 'react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';
import secureStorage from '../../services/secureStorage';
import { safeClearStorage } from '../../utils/storage';

const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorHelp, setShowErrorHelp] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(false);
  
  const { login } = useSupabaseAuth();
  
  // Load saved credentials and settings on mount
  useEffect(() => {
    console.log('Login component mounted, checking for saved credentials');
    
    try {
      // Check for Remember Me
      const savedRememberMe = secureStorage.getRememberMe();
      console.log('Remember Me status:', savedRememberMe);
      setRememberMe(savedRememberMe);
      
      // Check for Stay Signed In
      const savedStaySignedIn = secureStorage.getStaySignedIn();
      console.log('Stay Signed In status:', savedStaySignedIn);
      setStaySignedIn(savedStaySignedIn);
      
      // Always check for saved credentials
      const savedCredentials = secureStorage.getCredentials();
      console.log('Saved credentials found:', savedCredentials ? 'Yes' : 'No');
      
      // Check if password was saved (for backward compatibility, if password exists, assume it was saved)
      let savedRememberPassword = false;
      if (savedCredentials && savedCredentials.password) {
        savedRememberPassword = true;
      }
      setRememberPassword(savedRememberPassword);
      
      if (savedCredentials) {
        console.log('Setting saved credentials in form');
        setEmailOrUsername(savedCredentials.emailOrUsername);
        if (savedRememberPassword || savedStaySignedIn) {
          setPassword(savedCredentials.password);
        } else {
          setPassword('');
        }
        // Auto-login if Stay Signed In is enabled
        if (savedStaySignedIn && savedCredentials.password) {
          console.log('Auto-login triggered');
          handleAutoLogin(savedCredentials.emailOrUsername, savedCredentials.password);
        }
      } else if (savedRememberMe) {
        // If Remember Me is true but no credentials found, reset the flag
        console.log('Remember Me is true but no credentials found - resetting flag');
        secureStorage.setRememberMe(false);
      }
    } catch (err) {
      console.error('Error loading saved credentials:', err);
    }
  }, []);
  
  // Auto-login function
  const handleAutoLogin = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      await login(username, password);
      console.log('Auto-login successful');
    } catch (err) {
      // Silent fail for auto-login
      console.error('Auto-login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset login attempts after a cooldown period
  useEffect(() => {
    const attemptCount = parseInt(sessionStorage.getItem('login_attempts') || '0');
    setLoginAttempts(attemptCount);
    
    // Clear login counter if it's been more than 10 minutes
    const lastAttemptTime = parseInt(sessionStorage.getItem('last_login_attempt') || '0');
    const now = Date.now();
    if (now - lastAttemptTime > 10 * 60 * 1000) { // 10 minutes
      sessionStorage.removeItem('login_attempts');
      sessionStorage.removeItem('last_login_attempt');
      setLoginAttempts(0);
    }
  }, []);

  // Save settings and credentials based on checkboxes - moved to a separate function for clarity
  const saveLoginPreferences = () => {
    console.log('Saving login preferences');
    console.log('Remember Me:', rememberMe);
    console.log('Remember Password:', rememberPassword);
    console.log('Stay Signed In:', staySignedIn);
    
    // First save the preferences
    secureStorage.setRememberMe(rememberMe);
    secureStorage.setRememberPassword(rememberPassword);
    secureStorage.setStaySignedIn(staySignedIn);
    
    // Save credentials logic:
    // - If Stay Signed In or Remember Password is checked, save both email and password
    // - If only Remember Me is checked, save only email, clear password
    if (rememberMe || staySignedIn || rememberPassword) {
      const credToSave = {
        emailOrUsername,
        password: (staySignedIn || rememberPassword) ? password : ''
      };
      console.log('Saving credentials for:', emailOrUsername, 'with password:', !!credToSave.password);
      secureStorage.saveCredentials(credToSave);
    } else {
      console.log('Clearing saved credentials');
      secureStorage.clearCredentials();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!emailOrUsername.trim() || !password.trim()) {
      toast.error('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    
    // Track login attempts to detect potential issues
    const attempts = loginAttempts + 1;
    setLoginAttempts(attempts);
    sessionStorage.setItem('login_attempts', attempts.toString());
    sessionStorage.setItem('last_login_attempt', Date.now().toString());
    
    // If too many attempts, suggest clearing cache
    if (attempts >= 5) {
      const shouldReset = window.confirm(
        'تم تسجيل عدة محاولات للدخول. هل تريد محاولة مسح ذاكرة التخزين المؤقت لحل المشكلة؟'
      );
      
      if (shouldReset) {
        // Use the safe clear approach that preserves important app data
        safeClearStorage();
        
        // Only clear credentials if Remember Me is not checked
        // This preserves user's saved credentials preference
        if (!rememberMe) {
          secureStorage.clearCredentials();
        }
        
        // Reset counters
        sessionStorage.removeItem('login_attempts');
        sessionStorage.removeItem('last_login_attempt');
        sessionStorage.setItem('force_logout', 'true');
        
        toast.success('تم مسح ذاكرة التخزين المؤقت بأمان. سيتم إعادة تحميل الصفحة.');
        
        // Reload page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        
        return;
      }
    }
    
    setIsLoading(true);
    setShowErrorHelp(false);
    
    try {
      await login(emailOrUsername, password);
      
      // Reset login attempts on success
      sessionStorage.removeItem('login_attempts');
      sessionStorage.removeItem('last_login_attempt');
      
      // Save settings and credentials based on checkboxes
      saveLoginPreferences();
      
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (err: any) {
      const errorMessage = err.message || 'فشل تسجيل الدخول';
      toast.error(errorMessage);
      
      // Show error help if we have multiple failed attempts
      if (attempts >= 3) {
        setShowErrorHelp(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthCache = () => {
    // Use the safe clear method that preserves important app data
    safeClearStorage();
    
    // Only clear credentials if Remember Me is not checked
    // This preserves user's saved credentials preference
    if (!rememberMe) {
      secureStorage.clearCredentials();
    } else {
      // If Remember Me is checked, we should save the credentials
      // instead of clearing them
      if (emailOrUsername) {
        const credToSave = {
          emailOrUsername,
          password: rememberPassword ? password : ''
        };
        secureStorage.saveCredentials(credToSave);
      }
    }
  };

  const handleError = (error: Error) => {
    setError('حدث خطأ أثناء تسجيل الدخول');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 rtl">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="w-24 h-24 mx-auto bg-white rounded-full p-2 shadow-sm">
            <img src="./images/logo.png" alt="Muhasel Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            مرحباً بك في نظام محصّل
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            نظام الإدارة المالية المتكامل للمدارس والمؤسسات التعليمية
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-or-username" className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني أو اسم المستخدم
              </label>
              <input
                id="email-or-username"
                name="email"
                type="text"
                required
                disabled={isLoading}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-maroon focus:border-maroon focus:z-10 sm:text-sm"
                placeholder="البريد الإلكتروني أو اسم المستخدم"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isLoading}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-maroon focus:border-maroon focus:z-10 sm:text-sm"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {/* Remember Me and Stay Signed In checkboxes */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-maroon focus:ring-maroon border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-900">
                  تذكرني
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="remember-password"
                  name="remember-password"
                  type="checkbox"
                  className="h-4 w-4 text-maroon focus:ring-maroon border-gray-300 rounded"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                />
                <label htmlFor="remember-password" className="mr-2 block text-sm text-gray-900">
                  تذكر كلمة المرور
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="stay-signed-in"
                  name="stay-signed-in"
                  type="checkbox"
                  className="h-4 w-4 text-maroon focus:ring-maroon border-gray-300 rounded"
                  checked={staySignedIn}
                  onChange={(e) => setStaySignedIn(e.target.checked)}
                />
                <label htmlFor="stay-signed-in" className="mr-2 block text-sm text-gray-900">
                  البقاء متصلاً
                </label>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-maroon hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon"
            >
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </div>
        </form>
        
        {showErrorHelp && (
          <div className="mt-6 bg-blue-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">هل تواجه مشكلة في تسجيل الدخول؟</h3>
            <p className="text-sm text-blue-700 mb-3">
              إذا كنت تواجه مشاكل متكررة في تسجيل الدخول، قد تحتاج إلى إعادة ضبط الإعدادات.
            </p>
          </div>
        )}
        
        <p className="mt-6 text-center text-xs text-gray-500">
          {`محصّل ${new Date().getFullYear()} © جميع الحقوق محفوظة`}
        </p>
      </div>
    </div>
  );
};

export default Login;
 