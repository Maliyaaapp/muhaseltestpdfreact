import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const MainLayout = () => {
  const { user } = useSupabaseAuth();

  useEffect(() => {
    // Initialize any required app state
    if (user) {
      // Handle user-specific initialization if needed
    }
  }, [user]);

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 py-8 h-full overflow-y-auto">
        <main className="bg-white rounded-lg shadow-sm max-h-full overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;