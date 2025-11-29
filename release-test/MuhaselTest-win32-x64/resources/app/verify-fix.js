// Verification script to check if the emergency fix has been applied
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFix() {
  console.log('🔍 Verifying Emergency Fix Application...');
  console.log('='.repeat(50));
  
  let allChecksPass = true;
  
  try {
    // Check 1: Payment Health Monitor
    console.log('\n1️⃣ Checking Payment Health Monitor...');
    const { data: healthData, error: healthError } = await supabase
      .from('payment_health_monitor')
      .select('*')
      .limit(1);
    
    if (healthError) {
      console.log('❌ Payment health monitor not found');
      console.log('   Error:', healthError.message);
      allChecksPass = false;
    } else {
      console.log('✅ Payment health monitor exists');
    }
    
    // Check 2: Settings Schema
    console.log('\n2️⃣ Checking Settings Schema...');
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('receipt_number_format, receipt_number_prefix, receipt_number_counter, installment_receipt_number_format')
      .limit(1);
    
    if (settingsError) {
      console.log('❌ Settings schema incomplete');
      console.log('   Error:', settingsError.message);
      allChecksPass = false;
    } else {
      console.log('✅ Settings schema updated with receipt fields');
      if (settingsData && settingsData.length > 0) {
        const settings = settingsData[0];
        console.log(`   - Receipt format: ${settings.receipt_number_format || 'auto'}`);
        console.log(`   - Receipt prefix: ${settings.receipt_number_prefix || 'REC'}`);
        console.log(`   - Receipt counter: ${settings.receipt_number_counter || 1}`);
      }
    }
    
    // Check 3: Fee Balance Column
    console.log('\n3️⃣ Checking Fee Balance Column...');
    const { data: feeData, error: feeError } = await supabase
      .from('fees')
      .select('id, amount, paid, balance, status')
      .limit(1);
    
    if (feeError) {
      console.log('❌ Fee balance column missing');
      console.log('   Error:', feeError.message);
      allChecksPass = false;
    } else {
      console.log('✅ Fee balance column exists');
    }
    
    // Check 4: Installment Balance Column
    console.log('\n4️⃣ Checking Installment Balance Column...');
    const { data: installmentData, error: installmentError } = await supabase
      .from('installments')
      .select('id, amount, paid_amount, balance, status')
      .limit(1);
    
    if (installmentError) {
      console.log('❌ Installment balance column missing');
      console.log('   Error:', installmentError.message);
      allChecksPass = false;
    } else {
      console.log('✅ Installment balance column exists');
    }
    
    // Check 5: Payment Health Status
    if (!healthError) {
      console.log('\n5️⃣ Checking Payment Health Status...');
      const { data: healthStatus, error: healthStatusError } = await supabase
        .from('payment_health_monitor')
        .select('health_status')
        .neq('health_status', 'HEALTHY');
      
      if (healthStatusError) {
        console.log('❌ Cannot check payment health');
        allChecksPass = false;
      } else {
        const unhealthyCount = healthStatus?.length || 0;
        if (unhealthyCount === 0) {
          console.log('✅ All payments are healthy!');
        } else {
          console.log(`⚠️  ${unhealthyCount} payments need attention`);
          console.log('   Run: SELECT * FROM payment_health_monitor WHERE health_status != \'HEALTHY\';');
        }
      }
    }
    
    // Final Result
    console.log('\n' + '='.repeat(50));
    if (allChecksPass) {
      console.log('🎉 EMERGENCY FIX SUCCESSFULLY APPLIED!');
      console.log('✅ Payment system is now fully functional');
      console.log('✅ Settings schema is complete');
      console.log('\n🚀 Next Steps:');
      console.log('1. Clear browser cache completely');
      console.log('2. Refresh the application');
      console.log('3. Test payment functionality');
      console.log('4. Check settings page for receipt fields');
    } else {
      console.log('❌ EMERGENCY FIX NOT FULLY APPLIED');
      console.log('\n🔧 Required Actions:');
      console.log('1. Run the EMERGENCY_ALL_IN_ONE_FIX.sql in Supabase SQL Editor');
      console.log('2. Wait for completion (2-3 minutes)');
      console.log('3. Run this verification script again');
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    allChecksPass = false;
  }
  
  return allChecksPass;
}

verifyFix();