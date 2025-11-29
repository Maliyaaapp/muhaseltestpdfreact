import { supabaseAdmin } from '../services/supabaseAdmin';

/**
 * Utility function to run SQL migrations programmatically
 * This can be used to fix PGRST204 errors by adding missing columns
 */
export const runSettingsAddressMigration = async (): Promise<{ success: boolean; message: string }> => {
  try {
    if (!supabaseAdmin) {
      return {
        success: false,
        message: 'Supabase admin client not configured. Please run the migration manually in Supabase SQL Editor.'
      };
    }

    // Execute the migration SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Add missing columns to settings table
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo TEXT;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS english_name TEXT;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_call TEXT;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_installments INTEGER;
        
        -- Update existing settings records to have default values
        UPDATE settings SET 
          address = COALESCE(address, ''),
          logo = COALESCE(logo, ''),
          english_name = COALESCE(english_name, ''),
          phone_whatsapp = COALESCE(phone_whatsapp, ''),
          phone_call = COALESCE(phone_call, ''),
          default_installments = COALESCE(default_installments, 10)
        WHERE address IS NULL OR logo IS NULL OR english_name IS NULL OR phone_whatsapp IS NULL OR phone_call IS NULL OR default_installments IS NULL;
        
        -- Make required columns NOT NULL after setting defaults
        ALTER TABLE settings ALTER COLUMN address SET NOT NULL;
        ALTER TABLE settings ALTER COLUMN logo SET NOT NULL;
        ALTER TABLE settings ALTER COLUMN default_installments SET NOT NULL;
        
        -- Reload PostgREST schema cache
        NOTIFY pgrst, 'reload schema';
      `
    });

    if (error) {
      console.error('Migration error:', error);
      return {
        success: false,
        message: `Migration failed: ${error.message}. Please run the migration manually in Supabase SQL Editor.`
      };
    }

    return {
      success: true,
      message: 'Settings table migration completed successfully. The missing columns have been added and the schema cache has been reloaded.'
    };
  } catch (error) {
    console.error('Migration execution error:', error);
    return {
      success: false,
      message: `Migration execution failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please run the migration manually in Supabase SQL Editor.`
    };
  }
};

/**
 * Instructions for manually running the migration
 */
export const getMigrationInstructions = () => {
  return {
    title: "Fix Settings Table Schema Error",
    description: "The settings table is missing required columns. Please run the following SQL in your Supabase SQL Editor:",
    sql: `-- Add missing columns to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS english_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_call TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_installments INTEGER;

-- Update existing settings records to have default values
UPDATE settings SET 
  address = COALESCE(address, ''),
  logo = COALESCE(logo, ''),
  english_name = COALESCE(english_name, ''),
  phone_whatsapp = COALESCE(phone_whatsapp, ''),
  phone_call = COALESCE(phone_call, ''),
  default_installments = COALESCE(default_installments, 10)
WHERE address IS NULL OR logo IS NULL OR english_name IS NULL OR phone_whatsapp IS NULL OR phone_call IS NULL OR default_installments IS NULL;

-- Make required columns NOT NULL after setting defaults
ALTER TABLE settings ALTER COLUMN address SET NOT NULL;
ALTER TABLE settings ALTER COLUMN logo SET NOT NULL;
ALTER TABLE settings ALTER COLUMN default_installments SET NOT NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';`,
    steps: [
      "1. Open your Supabase project dashboard",
      "2. Go to the SQL Editor",
      "3. Copy and paste the SQL above",
      "4. Click 'Run' to execute the migration",
      "5. Refresh this page after the migration completes"
    ]
  };
};