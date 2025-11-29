import React, { useState } from 'react';
import { runSettingsAddressMigration, getMigrationInstructions } from '../utils/runMigration';

interface FixSettingsErrorProps {
  onClose?: () => void;
}

const FixSettingsError: React.FC<FixSettingsErrorProps> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleRunMigration = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const migrationResult = await runSettingsAddressMigration();
      setResult(migrationResult);
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to run migration. Please follow manual instructions.'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const instructions = getMigrationInstructions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-red-600">Database Schema Error (PGRST204)</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>

        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            The settings table is missing the 'address' column, which is causing receipt generation to fail.
          </p>
          <p className="text-sm text-gray-600">
            Error: "Could not find the 'address' column of 'settings' in the schema cache"
          </p>
        </div>

        {/* Auto-fix option */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Option 1: Automatic Fix</h3>
          <button
            onClick={handleRunMigration}
            disabled={isRunning}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running Migration...' : 'Run Database Migration'}
          </button>
          
          {result && (
            <div className={`mt-2 p-3 rounded ${
              result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {result.message}
            </div>
          )}
        </div>

        {/* Manual instructions */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Option 2: Manual Fix</h3>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {showInstructions ? 'Hide' : 'Show'} Manual Instructions
          </button>
        </div>

        {showInstructions && (
          <div className="bg-gray-50 p-4 rounded mb-4">
            <h4 className="font-medium mb-2">{instructions.title}</h4>
            <ol className="space-y-1 text-sm">
              {instructions.instructions.map((instruction, index) => {
                if (instruction.startsWith('```')) {
                  return (
                    <li key={index} className="font-mono bg-gray-800 text-green-400 p-2 rounded text-xs">
                      {instruction.replace(/```sql?/g, '').replace(/```/g, '')}
                    </li>
                  );
                }
                return (
                  <li key={index} className={instruction === '' ? 'h-2' : ''}>
                    {instruction}
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-gray-600 mt-2">
              Migration file: {instructions.sqlFile}
            </p>
          </div>
        )}

        {/* Copy SQL button */}
        <div className="mb-4">
          <button
            onClick={() => {
              const sql = `-- Add missing address column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS address TEXT;

-- Update existing records with empty address
UPDATE settings SET address = '' WHERE address IS NULL;
ALTER TABLE settings ALTER COLUMN address SET NOT NULL;

-- Add other potentially missing columns
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS english_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_call TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';`;
              navigator.clipboard.writeText(sql);
              alert('SQL copied to clipboard!');
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Copy SQL to Clipboard
          </button>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>Note:</strong> After running the migration, refresh your application and try generating the receipt again.</p>
        </div>
      </div>
    </div>
  );
};

export default FixSettingsError;