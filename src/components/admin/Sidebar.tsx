import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart2, Users, Settings, LogOut, RefreshCw, School, Shield, FileText, PieChart, TrendingUp, CreditCard, Sparkles
} from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { useState, useEffect } from 'react';
import '../../styles/sidebar.css';
import storage, { safeClearStorage } from '../../utils/storage';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface MenuItem {
  path: string;
  icon: React.ReactNode;
  title: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const location = useLocation();
  const { logout } = useSupabaseAuth();
  const [isClearing, setIsClearing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Default to dark mode if not set
    const theme = localStorage.getItem('tahseel-theme');
    return theme === null ? true : theme === 'dark';
  });

  // Check if path is active or a subpath is active
  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === path; // Only exact match for dashboard
    }
    return location.pathname.startsWith(path);
  };

  // Apply theme class to document on mount and when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('tahseel-theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  const menuSections: MenuSection[] = [
    {
      title: "الرئيسية",
      items: [
        { 
          path: '/admin', 
          icon: <BarChart2 size={20} strokeWidth={2} />, 
          title: 'لوحة التحكم' 
        }
      ]
    },
    {
      title: "إدارة النظام",
      items: [
        { 
          path: '/admin/schools', 
          icon: <School size={20} strokeWidth={2} />, 
          title: 'المدارس'
        },
        { 
          path: '/admin/subscriptions', 
          icon: <CreditCard size={20} strokeWidth={2} />, 
          title: 'الاشتراكات'
        },
        { 
          path: '/admin/accounts', 
          icon: <Users size={20} strokeWidth={2} />, 
          title: 'الحسابات'
        }
      ]
    }
  ];

  const handleClearCache = () => {
    if (confirm('هل تريد مسح ذاكرة التخزين المؤقت؟ سيؤدي هذا إلى تحسين أداء التطبيق.')) {
      setIsClearing(true);
      
      try {
        // Safely clear session data while preserving important application data
        safeClearStorage();
        
        // Restore theme preference
        localStorage.setItem('tahseel-theme', isDarkMode ? 'dark' : 'light');
        
        alert('تم مسح ذاكرة التخزين المؤقت بنجاح. سيتم إعادة تحميل التطبيق.');
        
        // Reload the page
        window.location.reload();
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('حدث خطأ أثناء مسح ذاكرة التخزين المؤقت');
        setIsClearing(false);
      }
    }
  };

  const themeClass = isDarkMode ? 'dark-theme' : 'light-theme';

  return (
    <div 
      className={`sidebar modern-sidebar admin-sidebar fixed md:static inset-y-0 right-0 z-40 ${themeClass} h-full flex flex-col transform transition-all duration-500 ease-out no-auto-expand ${
        isOpen ? 'translate-x-0 w-72' : 'translate-x-full md:translate-x-0 md:w-20 sidebar-collapsed'
      }`}
    >
      {/* Modern Sidebar Header */}
      <div className="sidebar-header p-4 border-b border-divider relative overflow-hidden">
        <div className="header-gradient absolute inset-0 opacity-10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-2">
            <div className="logo-container">
              <Sparkles className={`w-8 h-8 text-accent ${!isOpen && 'md:w-6 md:h-6'}`} />
            </div>
          </div>
          <h1 className={`text-xl font-bold text-center sidebar-header-text transition-all duration-300 ${!isOpen && 'md:hidden'}`}>
            لوحة المشرف
          </h1>
          <h1 className={`text-2xl font-bold text-center transition-all duration-300 ${isOpen ? 'hidden' : 'md:block'}`}>
            م
          </h1>
        </div>
      </div>
      
      {/* Toggle button for mobile */}
      {!isOpen && (
        <button 
          onClick={toggleSidebar}
          className="absolute top-3 left-0 transform translate-x-full bg-primary text-white rounded-tr-md rounded-br-md p-1 md:hidden z-50"
          aria-label="Expand sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7"></polyline>
            <polyline points="6 17 11 12 6 7"></polyline>
          </svg>
        </button>
      )}
      
      {/* Modern Main Menu */}
      <div className="flex-1 overflow-y-auto py-3 menu-container">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="modern-sidebar-section">
            {isOpen && (
              <div className="modern-section-title">
                <span className="section-title-text">{section.title}</span>
                <div className="section-divider"></div>
              </div>
            )}
            <ul className={`menu-list ${!isOpen && 'collapsed-menu'}`}>
              {section.items.map((item) => (
                <li key={item.path} className="modern-sidebar-item">
                  <Link
                    to={item.path}
                    className={`modern-menu-link group ${
                      isActive(item.path)
                        ? 'active-menu-item'
                        : 'inactive-menu-item'
                    }`}
                    title={!isOpen ? item.title : undefined}
                    data-tooltip={!isOpen ? item.title : undefined}
                  >
                    <div className="menu-item-content">
                      <span className="modern-sidebar-icon group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                      <span className={`menu-item-text ${!isOpen && 'md:hidden'}`}>{item.title}</span>
                    </div>
                    {!isOpen && <span className="tooltip-text">{item.title}</span>}
                    <div className="menu-item-indicator"></div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      {/* Footer Actions styled as modern menu */}
      <div className="p-3 border-t border-divider">
        <div className="modern-sidebar-section">
          {isOpen && (
            <div className="modern-section-title">
              <span className="section-title-text">الإجراءات</span>
              <div className="section-divider"></div>
            </div>
          )}
          <ul className="menu-list">
            <li className="modern-sidebar-item">
              <button
                onClick={toggleTheme}
                className="modern-menu-link group inactive-menu-item w-full text-left"
                title={!isOpen ? (isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن') : undefined}
                data-tooltip={!isOpen ? (isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن') : undefined}
              >
                <div className="menu-item-content">
                  <span className="modern-sidebar-icon">
                    {isDarkMode ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                      </svg>
                    )}
                  </span>
                  <span className="menu-item-text">{isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
                </div>
              </button>
            </li>
            <li className="modern-sidebar-item">
              <button
                onClick={handleClearCache}
                className="modern-menu-link group inactive-menu-item w-full text-left"
                disabled={isClearing}
                title={!isOpen ? 'تنظيف ذاكرة التخزين' : undefined}
                data-tooltip={!isOpen ? 'تنظيف ذاكرة التخزين' : undefined}
              >
                <div className="menu-item-content">
                  <span className="modern-sidebar-icon">
                    <RefreshCw size={20} strokeWidth={2} className={isClearing ? 'animate-spin' : ''} />
                  </span>
                  <span className="menu-item-text">{isClearing ? 'جاري مسح الذاكرة...' : 'تنظيف ذاكرة التخزين'}</span>
                </div>
              </button>
            </li>
            <li className="modern-sidebar-item">
              <button
                onClick={logout}
                className="modern-menu-link group inactive-menu-item w-full text-left"
                title={!isOpen ? 'تسجيل الخروج' : undefined}
                data-tooltip={!isOpen ? 'تسجيل الخروج' : undefined}
              >
                <div className="menu-item-content">
                  <span className="modern-sidebar-icon">
                    <LogOut size={20} strokeWidth={2} />
                  </span>
                  <span className="menu-item-text">تسجيل الخروج</span>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
 