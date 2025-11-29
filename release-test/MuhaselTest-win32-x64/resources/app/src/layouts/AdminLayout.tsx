import { Outlet } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import Sidebar from '../components/admin/Sidebar';
import Header from '../components/admin/Header';
import { useState } from 'react';

const AdminLayout = () => {
  const { user } = useSupabaseAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!user) return null;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#f9fafb'
    }}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Header />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
 