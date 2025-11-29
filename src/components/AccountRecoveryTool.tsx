import React, { useState } from 'react';
import { findAllAccounts, fullRecoveryAttempt } from '../utils/accountUtils';

const AccountRecoveryTool: React.FC = () => {
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  
  const handleDiagnostics = () => {
    try {
      setMessage('Running account diagnostics... check browser console for detailed results.');
      findAllAccounts();
    } catch (error) {
      console.error('Error running diagnostics:', error);
      setMessage('Error running diagnostics. Check console for details.');
    }
  };
  
  const handleRecover = () => {
    try {
      setIsRecovering(true);
      setMessage('Attempting full account recovery... check browser console for details.');
      
      // Use the enhanced recovery function
      const recovered = fullRecoveryAttempt();
      
      // Always refresh after recovery attempt to ensure consistent state
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
      if (recovered) {
        setMessage('Account recovery successful! Page will reload in 3 seconds...');
      } else {
        setMessage('Recovery process complete but no new accounts were recovered. Page will reload in 3 seconds...');
      }
    } catch (error) {
      console.error('Error recovering accounts:', error);
      setMessage('Error during recovery. Check console for details.');
    } finally {
      setIsRecovering(false);
    }
  };
  
  return (
    <div className="border rounded-md p-4 mb-4 bg-gray-50">
      <h3 className="text-lg font-bold mb-2">Account Recovery Tool</h3>
      <p className="mb-4 text-sm text-gray-700">
        This tool helps recover accounts that may have been saved in different storage locations
        or disappeared due to storage key inconsistencies.
      </p>
      
      <div className="flex flex-col gap-3">
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          onClick={handleDiagnostics}
          disabled={isRecovering}
        >
          Run Account Diagnostics
        </button>
        
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          onClick={handleRecover}
          disabled={isRecovering}
        >
          {isRecovering ? 'Recovering Accounts...' : 'Recover All Accounts'}
        </button>
        
        <div className="mt-2 text-xs text-gray-500">
          <p>The recovery process:</p>
          <ol className="list-decimal pl-5 mt-1 space-y-1">
            <li>Finds all accounts across multiple storage locations</li>
            <li>Restores school information for each account</li>
            <li>Consolidates accounts into a single, consistent storage</li>
            <li>Cleans up duplicate accounts and old storage keys</li>
          </ol>
        </div>
      </div>
      
      {message && (
        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          {message}
        </div>
      )}
    </div>
  );
};

export default AccountRecoveryTool; 