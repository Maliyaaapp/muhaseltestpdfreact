import { Outlet } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import Sidebar from '../components/school/Sidebar';
import Header from '../components/school/Header';
import { useState, useEffect } from 'react';

const SchoolLayout = () => {
  const { user } = useSupabaseAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Close sidebar on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 rtl">
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar positioned on the right for RTL layout */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto">
          <div className="py-4 md:py-6 px-4 md:px-6">
          <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SchoolLayout;
 