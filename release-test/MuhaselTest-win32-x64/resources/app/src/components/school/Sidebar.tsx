import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Users, CreditCard, Clock, MessageSquare, Settings, LogOut, RefreshCw,
  LayoutDashboard, User, BookOpen, FileText, PieChart, TrendingUp, BarChart,
  Sun, Moon, ChevronRight, Sparkles
} from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { useState, useEffect } from 'react';
import '../../styles/sidebar.css';
import storage from '../../utils/storage';

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
  const { logout, user } = useSupabaseAuth();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Default to dark mode if not set
    const theme = localStorage.getItem('tahseel-theme');
    return theme === null ? true : theme === 'dark';
  });

  // Check if path is exactly active (not partial)
  const isExactActive = (path: string) => {
    return location.pathname === path;
  };

  // Check if path is active or a subpath is active
  const isActive = (path: string) => {
    if (path === '/school') {
      return isExactActive(path); // Only exact match for dashboard
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
          path: '/school', 
          icon: <LayoutDashboard size={20} strokeWidth={2} />, 
          title: 'لوحة التحكم' 
        }
      ]
    },
    {
      title: "إدارة المدرسة",
      items: [
        { 
          path: '/school/students', 
          icon: <User size={20} strokeWidth={2} />, 
          title: 'الطلبة'
        },
        { 
          path: '/school/fees', 
          icon: <CreditCard size={20} strokeWidth={2} />, 
          title: 'الرسوم'
        },
        { 
          path: '/school/installments', 
          icon: <Clock size={20} strokeWidth={2} />, 
          title: 'الأقساط' 
        }
      ]
    },
    {
      title: "الإعدادات",
      items: [
        { 
          path: '/school/communications', 
          icon: <MessageSquare size={20} strokeWidth={2} />, 
          title: 'المراسلات' 
        },
        { 
          path: '/school/settings', 
          icon: <Settings size={20} strokeWidth={2} />, 
          title: 'الإعدادات' 
        }
      ]
    }
  ];

  const isGradeManager = user?.role === 'gradeManager';



  const themeClass = isDarkMode ? 'dark-theme' : 'light-theme';

  return (
    <div 
      className={`sidebar modern-sidebar fixed md:static inset-y-0 right-0 z-40 ${themeClass} h-full flex flex-col transform transition-all duration-500 ease-out no-auto-expand ${
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
            بوابة الإدارة المالية
          </h1>
          <h1 className={`text-2xl font-bold text-center transition-all duration-300 ${isOpen ? 'hidden' : 'md:block'}`}>
            م
          </h1>
          {user && isOpen && (
            <div className="mt-3 text-xs text-center user-badge">
              <div className="user-role-indicator">
                {user.role === 'gradeManager' && user.gradeLevels ? (
                  <span>مدير صف: {user.gradeLevels.join(' / ')}</span>
                ) : user.role === 'admin' ? (
                  <span>مدير النظام</span>
                ) : user.role === 'schoolAdmin' ? (
                  <span>مدير المدرسة</span>
                ) : user.role === 'teacher' ? (
                  <span>معلم</span>
                ) : user.role === 'accountant' ? (
                  <span>محاسب</span>
                ) : (
                  <span>مستخدم</span>
                )}
              </div>
            </div>
          )}
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
        {/* Dashboard and School Management Sections */}
        {menuSections.slice(0, 2).map((section, sectionIndex) => (
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
                      {isActive(item.path) && isOpen && (
                        <ChevronRight className="w-4 h-4 mr-auto text-current opacity-60" />
                      )}
                    </div>
                    {!isOpen && <span className="tooltip-text">{item.title}</span>}
                    <div className="menu-item-indicator"></div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        
        {/* Settings Section */}
        {menuSections.slice(2).map((section, sectionIndex) => (
          <div key={sectionIndex + 2} className="modern-sidebar-section">
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
                      {isActive(item.path) && isOpen && (
                        <ChevronRight className="w-4 h-4 mr-auto text-current opacity-60" />
                      )}
                    </div>
                    {!isOpen && <span className="tooltip-text">{item.title}</span>}
                    <div className="menu-item-indicator"></div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        
        {/* User Profile Section - Moved below settings */}
        {user && (
          <div className="modern-sidebar-section user-profile-section">
            {isOpen && (
              <div className="modern-section-title">
                <span className="section-title-text">الملف الشخصي</span>
                <div className="section-divider"></div>
              </div>
            )}
            <div className={`user-profile-container ${!isOpen && 'collapsed-profile'}`}>
              <div className="user-profile-card">
                <div className="user-avatar">
                  <User size={isOpen ? 24 : 20} strokeWidth={2} />
                </div>
                {isOpen && (
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-role">
                      {user.role === 'gradeManager' && user.gradeLevels ? (
                        <span>مدير صف: {user.gradeLevels.join(' / ')}</span>
                      ) : user.role === 'admin' ? (
                        <span>مدير النظام</span>
                      ) : user.role === 'schoolAdmin' ? (
                        <span>مدير المدرسة</span>
                      ) : user.role === 'teacher' ? (
                        <span>معلم</span>
                      ) : user.role === 'accountant' ? (
                        <span>محاسب</span>
                      ) : (
                        <span>مستخدم</span>
                      )}
                    </div>
                    {user.schoolName && (
                      <div className="user-school">{user.schoolName}</div>
                    )}
                  </div>
                )}
                {!isOpen && (
                  <span className="tooltip-text">{user.name}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modern Footer Actions */}
      <div className="modern-footer border-t border-divider">
        <div className="footer-content">
          {isOpen && (
            <div className="modern-section-title">
              <span className="section-title-text">الإجراءات</span>
              <div className="section-divider"></div>
            </div>
          )}
          <div className="footer-actions">
            <button
              onClick={toggleTheme}
              className="modern-action-button theme-toggle group"
              title={!isOpen ? (isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن') : undefined}
              data-tooltip={!isOpen ? (isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن') : undefined}
            >
              <div className="action-button-content">
                <span className="modern-sidebar-icon group-hover:rotate-12 transition-transform duration-300">
                  {isDarkMode ? (
                    <Sun size={20} strokeWidth={2} />
                  ) : (
                    <Moon size={20} strokeWidth={2} />
                  )}
                </span>
                <span className={`action-button-text ${!isOpen && 'md:hidden'}`}>
                  {isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
                </span>
              </div>
              <div className="action-button-indicator"></div>
            </button>
            
            <button
              onClick={logout}
              className="modern-action-button logout-button group"
              title={!isOpen ? 'تسجيل الخروج' : undefined}
              data-tooltip={!isOpen ? 'تسجيل الخروج' : undefined}
            >
              <div className="action-button-content">
                <span className="modern-sidebar-icon group-hover:scale-110 transition-transform duration-200">
                  <LogOut size={20} strokeWidth={2} />
                </span>
                <span className={`action-button-text ${!isOpen && 'md:hidden'}`}>
                  تسجيل الخروج
                </span>
              </div>
              <div className="action-button-indicator"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
 