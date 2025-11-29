import { User, Menu, X, ChevronRight, ChevronLeft, Wifi, WifiOff } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import '../../styles/sidebar.css';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header = ({ isSidebarOpen, toggleSidebar }: HeaderProps) => {
  const { user } = useSupabaseAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Check online/offline status
  useEffect(() => {
    // Define event handlers
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال بالإنترنت', { 
        icon: '🌐',
        duration: 3000 
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('أنت غير متصل بالإنترنت - بعض الوظائف قد لا تعمل', {
        icon: '📴',
        duration: 5000
      });
    };
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial status check
    if (!navigator.onLine) {
      handleOffline();
    }
    
    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 h-16 z-30 shadow-sm">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left side for RTL - School logo and name */}
        <div className="flex items-center gap-3">
          {/* Sidebar toggle button */}
          <button 
            onClick={toggleSidebar}
            className={`sidebar-toggle p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors ${isSidebarOpen ? 'open' : ''}`}
            aria-label={isSidebarOpen ? "إخفاء القائمة الجانبية" : "إظهار القائمة الجانبية"}
          >
            <ChevronRight size={20} className="rtl:hidden" />
            <ChevronLeft size={20} className="hidden rtl:block" />
          </button>
          
          {user?.schoolLogo && (
            <img 
              src={user.schoolLogo} 
              alt={user.schoolName || ''} 
              className="h-10 w-10 object-cover rounded-md border border-gray-200"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/100x100/f5f5f5/800000?text=المدرسة';
              }}
            />
          )}
          <div className="flex flex-col">
            <div className="text-xl font-bold text-[#800000]">محصل</div>
            {user?.schoolName && (
              <div className="text-sm text-gray-600">{user.schoolName}</div>
            )}
          </div>
          
          {/* WiFi Status Indicator */}
          <div className={`flex items-center gap-1 px-3 py-1 rounded ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isOnline ? (
              <>
                <Wifi size={16} />
                <span className="text-sm">متصل</span>
              </>
            ) : (
              <>
                <WifiOff size={16} />
                <span className="text-sm">غير متصل</span>
              </>
            )}
          </div>
        </div>
        
        {/* Right side for RTL - Clean header */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button 
            className="md:hidden bg-gray-100 p-2 rounded-md"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-md">
          <div className="p-4">
            <button 
              onClick={toggleSidebar}
              className="flex items-center gap-2 w-full p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Menu size={18} />
              <span>{isSidebarOpen ? "إخفاء القائمة الجانبية" : "إظهار القائمة الجانبية"}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
 