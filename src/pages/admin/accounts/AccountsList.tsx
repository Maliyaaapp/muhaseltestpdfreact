import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash, Key, Users, RefreshCw, Book, Filter, Search, School, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import * as hybridApi from '../../../services/hybridApi';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import AccountSyncStatus from '../../../components/AccountSyncStatus';
import GradeRestrictionsModal from './GradeRestrictionsModal';
import { cleanupAuthAccounts } from '../../../utils/authUtils';
import { runAccountDiagnostics, recoverAccounts } from '../../../utils/accountUtils';
import toast from 'react-hot-toast';

interface Account {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: string;
  schoolId: string;
  schoolName?: string;
  schoolLogo?: string;
  schoolStamp?: string;
  school?: string;
  gradeLevels?: string[];
  lastLogin: string;
  isLoggedIn?: boolean;
}

interface SchoolInfo {
  id: string;
  name: string;
  logo?: string;
}

const AuthCleanupButton = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleCleanup = async () => {
    if (isProcessing) return;
    
    const confirmed = window.confirm(
      'هذا سيقوم بمعالجة قائمة حذف حسابات المصادقة. ' +
      'يساعد هذا في حل مشكلة "البريد الإلكتروني مستخدم بالفعل" عند إنشاء حسابات جديدة.\n\n' +
      'هل تريد المتابعة؟'
    );
    
    if (!confirmed) return;
    
    setIsProcessing(true);
    
    try {
      const result = await cleanupAuthAccounts();
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error triggering auth cleanup:', error);
      toast.error('حدث خطأ أثناء معالجة قائمة الحذف');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDiagnostics = () => {
    console.log('🔍 Running account diagnostics...');
    runAccountDiagnostics();
    toast.success('تم تشغيل التشخيص - تحقق من وحدة التحكم للحصول على التفاصيل');
  };
  
  const handleRecoverAccounts = async () => {
    try {
      console.log('🔄 Attempting account recovery...');
      const recovered = recoverAccounts();
      if (recovered) {
        toast.success('تم استرداد الحسابات بنجاح');
        await loadAccounts(); // Reload data after recovery
      } else {
        toast.info('لم يتم العثور على حسابات جديدة للاسترداد');
      }
    } catch (error) {
      console.error('❌ Account recovery failed:', error);
      toast.error('فشل في استرداد الحسابات');
    }
  };
  
  return (
    <button
      onClick={handleCleanup}
      disabled={isProcessing}
      className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-2 rounded-md text-sm"
      title="معالجة قائمة حذف حسابات المصادقة"
    >
      {isProcessing ? (
        <>
          <RefreshCw size={16} className="animate-spin" />
          <span>جاري المعالجة...</span>
        </>
      ) : (
        <>
          <AlertTriangle size={16} />
          <span>تنظيف المصادقة</span>
        </>
      )}
    </button>
  );
};

const AccountsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { } = useSupabaseAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<'list' | 'school'>('school'); // default to school-based view
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean, id: string, name: string}>({
    show: false,
    id: '',
    name: ''
  });
  const [resetPassword, setResetPassword] = useState<{show: boolean, id: string, name: string, email: string}>({
    show: false,
    id: '',
    name: '',
    email: ''
  });
  const [gradeRestrictions, setGradeRestrictions] = useState<{
    show: boolean, 
    id: string, 
    name: string, 
    gradeLevels: string[]
  }>({
    show: false,
    id: '',
    name: '',
    gradeLevels: []
  });
  const [newPassword, setNewPassword] = useState<string>('');

  // Add a utility function for date formatting with error handling
  const formatLastLogin = (dateString: string | null | undefined): string => {
    if (!dateString) return 'لم يسجل الدخول بعد';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'لم يسجل الدخول بعد';
      }
      return date.toLocaleDateString('en-GB');
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'لم يسجل الدخول بعد';
    }
  };

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading accounts and schools data...');
      console.log('🌐 Connection status:', {
        isOnline: navigator.onLine,
        shouldUseSupabase: window.shouldUseSupabase ? window.shouldUseSupabase() : 'unknown'
      });
      
      // Fetch schools first to ensure we have the latest school data
      const schoolsResponse = await hybridApi.getSchools();
      if (schoolsResponse.success) {
        setSchools(schoolsResponse.data);
      } else {
        console.error('Error loading schools:', schoolsResponse.error);
      }
      
      // Fetch accounts with fallback to localStorage
      let accountsResponse = await hybridApi.getAccounts();
      
      // If Supabase fails or returns no data, try localStorage fallback
      if (!accountsResponse.success || accountsResponse.data.length === 0) {
        console.warn('⚠️ Supabase failed or returned no accounts, trying localStorage fallback...');
        try {
          const localAccountsRaw = JSON.parse(localStorage.getItem('accounts') || '[]');
          // Normalize snake_case to camelCase so UI can render school grouping
          const localAccounts = (Array.isArray(localAccountsRaw) ? localAccountsRaw : []).map((acc: any) => ({
            ...acc,
            schoolId: acc.school_id ?? acc.schoolId,
            gradeLevels: acc.grade_levels ?? acc.gradeLevels,
          }));
          if (localAccounts.length > 0) {
            console.log('✅ Found accounts in localStorage:', localAccounts.length);
            accountsResponse = {
              success: true,
              data: localAccounts
            };
          }
        } catch (error) {
          console.error('Error reading from localStorage:', error);
        }
      }
      
      if (accountsResponse.success) {
        console.log('📊 Loaded data:', {
          accounts: accountsResponse.data.length,
          schools: schoolsResponse.success ? schoolsResponse.data.length : 0,
          isOnline: navigator.onLine,
          source: accountsResponse.data.length > 0 ? 'hybrid/supabase' : 'localStorage'
        });
        
        if (accountsResponse.data.length === 0) {
          console.warn('⚠️ No accounts found in both Supabase and localStorage');
        }
        // Process accounts to add isLoggedIn status and ensure school info is up to date
        const processedAccounts = accountsResponse.data.map((account: Account) => {
          // Find matching school
          const school = schoolsResponse.success ? 
            schoolsResponse.data.find((s: any) => s.id === account.schoolId) : null;
          
          // Update school info if found
          const updatedAccount = {
            ...account,
            schoolName: school ? school.name : account.schoolName,
            schoolLogo: school ? school.logo : account.schoolLogo,
            schoolStamp: '' // Stamp functionality removed
          };
          
          // Add login status
          let isLoggedIn = false;
          try {
            if (account.lastLogin) {
              const lastLoginTime = new Date(account.lastLogin).getTime();
              if (!isNaN(lastLoginTime)) {
                const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
                isLoggedIn = lastLoginTime > twelveHoursAgo;
              }
            }
          } catch (error) {
            console.error('Error processing login status:', error, account);
          }
          
          return {
            ...updatedAccount,
            isLoggedIn
          };
        });
        
        setAccounts(processedAccounts);
      } else {
        console.error('Error loading accounts:', accountsResponse.error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAccounts();
    
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      handleManualSync();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  useEffect(() => {
    // Check for success message in location state
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      // Refresh accounts list when success message is received
      loadAccounts();
      // Clear the location state
      window.history.replaceState({}, document.title);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Filtered and sorted accounts based on search query, selected school, and roles
  const filteredAccounts = useMemo(() => {
    let result = [...accounts];
    
    // Apply school filter
    if (selectedSchool !== 'all') {
      result = result.filter(account => account.schoolId === selectedSchool);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(account => 
        account.name?.toLowerCase().includes(query) ||
        account.email?.toLowerCase().includes(query) ||
        (account.username && account.username.toLowerCase().includes(query))
      );
    }
    
    // Sort first by role priority (admin > schoolAdmin > gradeManager)
    const rolePriority = { admin: 0, schoolAdmin: 1, gradeManager: 2 };
    
    return result.sort((a, b) => {
      // First sort by school
      const schoolA = a?.schoolName || '';
      const schoolB = b?.schoolName || '';
      const schoolCompare = schoolA.localeCompare(schoolB);
      
      if (schoolCompare !== 0) return schoolCompare;
      
      // Then sort by role priority
      const roleA = rolePriority[a.role as keyof typeof rolePriority] || 999;
      const roleB = rolePriority[b.role as keyof typeof rolePriority] || 999;
      if (roleA !== roleB) return roleA - roleB;
      
      // Finally sort by name
      const nameA = a?.name || '';
      const nameB = b?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [accounts, selectedSchool, searchQuery]);

  // Group accounts by school for school-based view
  const accountsBySchool = useMemo(() => {
    const grouped: Record<string, {school: string, accounts: Account[]}> = {};
    
    filteredAccounts.forEach(account => {
      // Determine grouping key even if schoolId is missing
      const schoolKey = account.schoolId || (account as any).school_id || 'unknown';
      const schoolName = account.schoolName || 'مدرسة غير محددة';
      
      if (!grouped[schoolKey]) {
        grouped[schoolKey] = {
          school: schoolName,
          accounts: []
        };
      }
      
      // Sort accounts within each school by role and then name
      const rolePriority = { admin: 0, schoolAdmin: 1, gradeManager: 2 };
      grouped[schoolKey].accounts.push(account);
      grouped[schoolKey].accounts.sort((a, b) => {
        const roleA = rolePriority[a.role as keyof typeof rolePriority] || 999;
        const roleB = rolePriority[b.role as keyof typeof rolePriority] || 999;
        if (roleA !== roleB) return roleA - roleB;
        
        return (a.name || '').localeCompare(b.name || '');
      });
    });
    
    // Sort schools alphabetically
    return Object.values(grouped).sort((a, b) => {
      return (a.school || '').localeCompare(b.school || '');
    });
  }, [filteredAccounts]);

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('لا يمكن المزامنة في وضع عدم الاتصال');
      return;
    }
    
    setIsSyncing(true);
    try {
      console.log('🔄 Starting manual sync...');
      const syncResponse = await hybridApi.syncAllData();
      if (syncResponse.success) {
        await loadAccounts();
        toast.success('تم تحديث البيانات بنجاح');
      } else {
        throw new Error(syncResponse.error || 'Sync failed');
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
      toast.error('فشل في المزامنة');
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleSyncAccounts = async () => {
    await handleManualSync();
  };

  const handleAddAccount = () => {
    navigate('/admin/accounts/new');
  };
  
  const handleEditAccount = (id: string) => {
    navigate(`/admin/accounts/${id}`);
  };
  
  const handleDeleteAccount = (id: string, name: string) => {
    setDeleteConfirmation({
      show: true,
      id,
      name
    });
  };
  
  const confirmDelete = async () => {
    try {
      const response = await hybridApi.deleteAccount(deleteConfirmation.id);
      if (response.success) {
        // Refresh the accounts list
        const accountsResponse = await hybridApi.getAccounts();
        if (accountsResponse.success) {
          setAccounts(accountsResponse.data);
        }
      } else {
        alert(response.error || 'حدث خطأ أثناء حذف الحساب');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('حدث خطأ أثناء حذف الحساب');
    }
    setDeleteConfirmation({ show: false, id: '', name: '' });
  };
  
  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, id: '', name: '' });
  };
  
  const handleResetPassword = (id: string, name: string, email: string) => {
    setResetPassword({
      show: true,
      id,
      name,
      email
    });
    // Generate a random password
    const randomPassword = Math.random().toString(36).slice(-8);
    setNewPassword(randomPassword);
  };
  
  const confirmResetPassword = async () => {
    try {
      const accountResponse = await hybridApi.getAccount(resetPassword.id);
      if (accountResponse.success) {
        const account = accountResponse.data;
        const updateResponse = await hybridApi.updateAccount(resetPassword.id, {
          ...account,
          password: newPassword
        });
        
        if (updateResponse.success) {
          alert(`تم إعادة تعيين كلمة المرور للحساب ${resetPassword.name}`);
        } else {
          alert(updateResponse.error || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
        }
      } else {
        alert(accountResponse.error || 'حدث خطأ أثناء جلب بيانات الحساب');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('حدث خطأ أثناء إعادة تعيين كلمة المرور');
    }
    
    setResetPassword({ show: false, id: '', name: '', email: '' });
  };
  
  const cancelResetPassword = () => {
    setResetPassword({ show: false, id: '', name: '', email: '' });
    setNewPassword('');
  };
  
  const handleManageGradeRestrictions = (account: Account) => {
    setGradeRestrictions({
      show: true,
      id: account.id,
      name: account.name,
      gradeLevels: account.gradeLevels || []
    });
  };
  
  const handleSaveGradeRestrictions = async (gradeLevels: string[]) => {
    try {
      // Get current account data
      const accountResponse = await hybridApi.getAccount(gradeRestrictions.id);
      if (!accountResponse.success) {
        throw new Error(accountResponse.error || 'Failed to get account details');
      }
      
      // Update account with new grade levels
      const account = accountResponse.data;
      const updateResponse = await hybridApi.updateAccount(gradeRestrictions.id, {
        ...account,
        gradeLevels
      });
      
      if (updateResponse.success) {
        // Update local state
        setAccounts(accounts.map(acc => 
          acc.id === gradeRestrictions.id 
            ? { ...acc, gradeLevels } 
            : acc
        ));
        
        // Close modal
        setGradeRestrictions({
          show: false,
          id: '',
          name: '',
          gradeLevels: []
        });
      } else {
        alert(updateResponse.error || 'حدث خطأ أثناء تحديث صلاحيات الصفوف');
      }
    } catch (error) {
      console.error('Error saving grade restrictions:', error);
      alert('حدث خطأ أثناء حفظ صلاحيات الصفوف');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مدير النظام';
      case 'schoolAdmin':
        return 'مدير مدرسة';
      case 'gradeManager':
        return 'مدير صف';
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">إدارة الحسابات</h1>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi size={16} />
                <span className="text-sm">متصل</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <WifiOff size={16} />
                <span className="text-sm">غير متصل</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const authCleanup = new (class {
                constructor() {
                  this.isProcessing = false;
                }
                
                async handleCleanup() {
                  if (this.isProcessing) return;
                  
                  const confirmed = window.confirm(
                    'هذا سيقوم بمعالجة قائمة حذف حسابات المصادقة. ' +
                    'يساعد هذا في حل مشكلة "البريد الإلكتروني مستخدم بالفعل" عند إنشاء حسابات جديدة.\n\n' +
                    'هل تريد المتابعة؟'
                  );
                  
                  if (!confirmed) return;
                  
                  this.isProcessing = true;
                  
                  try {
                    const result = await cleanupAuthAccounts();
                    
                    if (result.success) {
                      toast.success(result.message);
                    } else {
                      toast.error(result.message);
                    }
                  } catch (error) {
                    console.error('Error triggering auth cleanup:', error);
                    toast.error('حدث خطأ أثناء معالجة قائمة الحذف');
                  } finally {
                    this.isProcessing = false;
                  }
                }
              })();
              
              authCleanup.handleCleanup();
            }}
            className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-2 rounded-md text-sm"
            title="معالجة قائمة حذف حسابات المصادقة"
          >
            <AlertTriangle size={16} />
            <span>تنظيف المصادقة</span>
          </button>
          <button
            onClick={() => {
              console.log('🔍 Running account diagnostics...');
              runAccountDiagnostics();
              toast.success('تم تشغيل التشخيص - تحقق من وحدة التحكم للحصول على التفاصيل');
            }}
            className="flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-md text-sm"
            title="تشغيل تشخيص الحسابات"
          >
            <AlertTriangle size={16} />
            <span>تشخيص</span>
          </button>
          <button
            onClick={async () => {
              try {
                console.log('🔄 Attempting account recovery...');
                const recovered = recoverAccounts();
                if (recovered) {
                  toast.success('تم استرداد الحسابات بنجاح');
                  await loadAccounts();
                } else {
                  toast.info('لم يتم العثور على حسابات جديدة للاسترداد');
                }
              } catch (error) {
                console.error('❌ Account recovery failed:', error);
                toast.error('فشل في استرداد الحسابات');
              }
            }}
            className="flex items-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-2 rounded-md text-sm"
            title="استرداد الحسابات المفقودة"
          >
            <RefreshCw size={16} />
            <span>استرداد</span>
          </button>
          <button
            onClick={handleManualSync}
            className="btn btn-secondary flex items-center gap-2"
            disabled={isSyncing || !isOnline}
            title={!isOnline ? 'المزامنة غير متاحة في وضع عدم الاتصال' : 'مزامنة البيانات مع الخادم'}
          >
            <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "جاري المزامنة..." : "مزامنة"}</span>
          </button>
          <button
            onClick={handleAddAccount}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>إضافة حساب</span>
          </button>
        </div>
      </div>
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-start">
          <div className="flex-shrink-0 mr-3">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary" />
            <h2 className="text-xl font-bold text-gray-800">قائمة الحسابات</h2>
            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
              {filteredAccounts.length}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex border rounded-md overflow-hidden">
              <button
                className={`px-4 py-2 text-sm ${displayMode === 'list' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setDisplayMode('list')}
              >
                عرض القائمة
              </button>
              <button
                className={`px-4 py-2 text-sm ${displayMode === 'school' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setDisplayMode('school')}
              >
                حسب المدرسة
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-600" />
              <span>تصفية:</span>
            </div>
            
            <select
              className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
            >
              <option value="all">جميع المدارس</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pr-10 border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="بحث عن مستخدم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <AccountSyncStatus />
        
        {filteredAccounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا توجد حسابات مطابقة لمعايير البحث
          </div>
        ) : displayMode === 'list' ? (
          // List View
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اسم المستخدم
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    البريد الإلكتروني
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الدور
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المدرسة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{account.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getRoleLabel(account.role)}
                      </span>
                      {account.role === 'gradeManager' && (
                        <button
                          onClick={() => handleManageGradeRestrictions(account)}
                          className="mr-2 text-xs text-primary hover:underline"
                        >
                          إدارة الصفوف
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{account.schoolName || account.school}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${account.isLoggedIn ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className={account.isLoggedIn ? 'text-green-600 font-medium' : 'text-gray-500'}>
                          {account.isLoggedIn 
                            ? 'متصل حالياً' 
                            : formatLastLogin(account.lastLogin)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEditAccount(account.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="تعديل"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleResetPassword(account.id, account.name, account.email)}
                          className="text-orange-600 hover:text-orange-900"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <Key size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id, account.name)}
                          className="text-red-600 hover:text-red-900"
                          title="حذف"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // School-based View
          <div className="space-y-6 p-4">
            {accountsBySchool.map(({school, accounts}) => (
              <div key={school} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <School size={18} className="text-primary" />
                    <h3 className="font-bold text-gray-800">{school}</h3>
                    <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                      {accounts.length}
                    </span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          اسم المستخدم
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          البريد الإلكتروني
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الدور
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الحالة
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {accounts.map((account) => (
                        <tr key={account.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{account.name}</div>
                            <div className="text-sm text-gray-500">{account.username}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{account.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {getRoleLabel(account.role)}
                            </span>
                            {account.role === 'gradeManager' && (
                              <button
                                onClick={() => handleManageGradeRestrictions(account)}
                                className="mr-2 text-xs text-primary hover:underline"
                              >
                                إدارة الصفوف
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center">
                              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${account.isLoggedIn ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                              <span className={account.isLoggedIn ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                {account.isLoggedIn 
                                  ? 'متصل حالياً' 
                                  : formatLastLogin(account.lastLogin)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <div className="flex space-x-2 space-x-reverse">
                              <button
                                onClick={() => handleEditAccount(account.id)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="تعديل"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleResetPassword(account.id, account.name, account.email)}
                                className="text-orange-600 hover:text-orange-900"
                                title="إعادة تعيين كلمة المرور"
                              >
                                <Key size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(account.id, account.name)}
                                className="text-red-600 hover:text-red-900"
                                title="حذف"
                              >
                                <Trash size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">تأكيد الحذف</h3>
            <p className="text-gray-700 mb-6">
              هل أنت متأكد من حذف حساب <strong>{deleteConfirmation.name}</strong>؟
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="btn btn-outline"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-danger"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset Password Dialog */}
      {resetPassword.show && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">إعادة تعيين كلمة المرور</h3>
            <p className="text-gray-700 mb-4">
              هل أنت متأكد من إعادة تعيين كلمة المرور لحساب <strong>{resetPassword.name}</strong>؟
            </p>
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-1">كلمة المرور الجديدة:</div>
              <div className="flex">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input input-bordered flex-1"
                />
                <button
                  onClick={() => setNewPassword(Math.random().toString(36).slice(-8))}
                  className="btn btn-outline mr-2"
                >
                  توليد
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelResetPassword}
                className="btn btn-outline"
              >
                إلغاء
              </button>
              <button
                onClick={confirmResetPassword}
                className="btn btn-warning"
              >
                تأكيد إعادة التعيين
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Grade Restrictions Modal */}
      {gradeRestrictions.show && (
        <GradeRestrictionsModal 
          userId={gradeRestrictions.id}
          userName={gradeRestrictions.name}
          currentGradeLevels={gradeRestrictions.gradeLevels}
          onClose={() => setGradeRestrictions({
            show: false,
            id: '',
            name: '',
            gradeLevels: []
          })}
          onSave={handleSaveGradeRestrictions}
        />
      )}
    </div>
  );
};

export default AccountsList;
 