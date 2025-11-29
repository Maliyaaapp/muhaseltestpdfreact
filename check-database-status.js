// Quick test to check if database fixes have been applied
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...');
  
  try {
    // Check if payment_health_monitor view exists
    const { data: healthData, error: healthError } = await supabase
      .from('payment_health_monitor')
      .select('*')
      .limit(1);
    
    if (healthError) {
      console.log('❌ payment_health_monitor view not found - EMERGENCY_ALL_IN_ONE_FIX.sql not applied');
      console.log('Error:', healthError.message);
    } else {
      console.log('✅ payment_health_monitor view exists - Database fixes applied');
    }
    
    // Check a sample fee record to see if status is being calculated correctly
    const { data: feeData, error: feeError } = await supabase
      .from('fees')
      .select('id, student_name, amount, paid, balance, status')
      .limit(5);
    
    if (feeError) {
      console.log('❌ Error fetching fees:', feeError.message);
    } else {
      console.log('\n📊 Sample fee records:');
      feeData?.forEach(fee => {
        console.log(`- ${fee.student_name}: Amount=${fee.amount}, Paid=${fee.paid}, Balance=${fee.balance}, Status=${fee.status}`);
      });
    }
    
    // Check settings table for receipt number fields
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('school_id, receipt_number_format, receipt_number_prefix, receipt_number_counter')
      .limit(1);
    
    if (settingsError) {
      console.log('❌ Error fetching settings:', settingsError.message);
    } else {
      console.log('\n⚙️ Settings schema check:');
      if (settingsData && settingsData.length > 0) {
        const settings = settingsData[0];
        console.log('✅ Settings table accessible');
        console.log(`- Receipt format: ${settings.receipt_number_format || 'Not set'}`);
        console.log(`- Receipt prefix: ${settings.receipt_number_prefix || 'Not set'}`);
        console.log(`- Receipt counter: ${settings.receipt_number_counter || 'Not set'}`);
      } else {
        console.log('⚠️ No settings records found');
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
}

checkDatabaseStatus();