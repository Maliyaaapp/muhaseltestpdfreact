import React, { useState, useEffect } from 'react';
import { runMigration, isMigrationNeeded } from '../scripts/migrateToSupabase';
import { shouldUseSupabase } from '../services/supabase';

interface MigrationState {
  needed: boolean;
  inProgress: boolean;
  completed: boolean;
  success: boolean;
  message: string;
  details: any;
}

const SupabaseMigration: React.FC = () => {
  const [state, setState] = useState<MigrationState>({
    needed: false,
    inProgress: false,
    completed: false,
    success: false,
    message: '',
    details: null
  });
  
  // Check if migration is needed on component mount
  useEffect(() => {
    const checkMigration = () => {
      const needed = isMigrationNeeded() && shouldUseSupabase();
      setState(prev => ({ ...prev, needed }));
    };
    
    checkMigration();
  }, []);
  
  // Handle migration button click
  const handleMigrate = async () => {
    try {
      setState(prev => ({ 
        ...prev, 
        inProgress: true,
        message: 'Migration in progress... Please do not close the application.'
      }));
      
      const result = await runMigration();
      
      setState(prev => ({
        ...prev,
        inProgress: false,
        completed: true,
        success: result.success,
        message: result.message,
        details: result.details,
        needed: !result.success && prev.needed // Still needed if failed
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        inProgress: false,
        completed: true,
        success: false,
        message: `Migration error: ${error.message || 'Unknown error'}`,
        details: error
      }));
    }
  };
  
  // If migration is not needed, don't render anything
  if (!state.needed && !state.inProgress && !state.completed) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4 text-center">
          {state.completed 
            ? (state.success ? '✅ Migration Complete' : '❌ Migration Failed') 
            : 'Supabase Migration'}
        </h2>
        
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {state.message || 'Your local data needs to be migrated to Supabase for cloud storage and synchronization.'}
          </p>
          
          {state.inProgress && (
            <div className="flex justify-center my-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {state.completed && state.success && (
            <div className="bg-green-50 dark:bg-green-900 dark:bg-opacity-20 p-3 rounded-md text-sm">
              <p className="font-medium text-green-800 dark:text-green-300">Migration Summary:</p>
              <ul className="list-disc list-inside mt-2 text-green-700 dark:text-green-400">
                {state.details && Object.entries(state.details).map(([table, result]: [string, any]) => (
                  <li key={table}>
                    {table}: {result.inserted} records migrated
                    {result.errors?.length > 0 && ` (${result.errors.length} errors)`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {state.completed && !state.success && state.details && (
            <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 p-3 rounded-md text-sm overflow-auto max-h-40">
              <p className="font-medium text-red-800 dark:text-red-300">Error Details:</p>
              <pre className="mt-2 text-red-700 dark:text-red-400 text-xs">
                {JSON.stringify(state.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="flex justify-center space-x-4">
          {!state.completed && !state.inProgress && (
            <>
              <button
                onClick={handleMigrate}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Migrate Data
              </button>
              
              <button
                onClick={() => setState(prev => ({ ...prev, needed: false }))}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                Remind Me Later
              </button>
            </>
          )}
          
          {state.completed && (
            <button
              onClick={() => setState(prev => ({ ...prev, needed: false, completed: false }))}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              {state.success ? 'Continue' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseMigration;