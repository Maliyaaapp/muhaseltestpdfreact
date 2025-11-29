// Script to check if payment triggers are installed and working
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

async function checkPaymentTriggers() {
  console.log('🔍 Checking payment triggers and database status...');
  console.log('');

  try {
    // Check if triggers exist
    console.log('📋 Checking database triggers...');
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table, action_timing, event_manipulation')
      .in('event_object_table', ['fees', 'installments']);

    if (triggerError) {
      console.log('⚠️  Cannot check triggers directly (normal for anon key)');
    } else if (triggers && triggers.length > 0) {
      console.log('✅ Found triggers:');
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} on ${trigger.event_object_table} (${trigger.action_timing} ${trigger.event_manipulation})`);
      });
    } else {
      console.log('❌ No payment triggers found!');
    }
    console.log('');

    // Check if required columns exist in fees table
    console.log('📋 Checking fees table structure...');
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .select('*')
      .limit(1);

    if (feesError) {
      console.log('❌ Error accessing fees table:', feesError.message);
    } else {
      console.log('✅ Fees table accessible');
      if (fees && fees.length > 0) {
        const feeColumns = Object.keys(fees[0]);
        const requiredColumns = ['paid', 'balance', 'status', 'payment_method', 'payment_note'];
        const missingColumns = requiredColumns.filter(col => !feeColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log('❌ Missing columns in fees table:', missingColumns.join(', '));
        } else {
          console.log('✅ All required columns present in fees table');
        }
      }
    }
    console.log('');

    // Check if required columns exist in installments table
    console.log('📋 Checking installments table structure...');
    const { data: installments, error: installmentsError } = await supabase
      .from('installments')
      .select('*')
      .limit(1);

    if (installmentsError) {
      console.log('❌ Error accessing installments table:', installmentsError.message);
    } else {
      console.log('✅ Installments table accessible');
      if (installments && installments.length > 0) {
        const installmentColumns = Object.keys(installments[0]);
        const requiredColumns = ['paid_amount', 'balance', 'status', 'payment_method', 'payment_note'];
        const missingColumns = requiredColumns.filter(col => !installmentColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log('❌ Missing columns in installments table:', missingColumns.join(', '));
        } else {
          console.log('✅ All required columns present in installments table');
        }
      }
    }
    console.log('');

    // Check for problematic fees (paid > amount or negative balance)
    console.log('📋 Checking for problematic fees...');
    const { data: problematicFees, error: problemError } = await supabase
      .from('fees')
      .select('id, amount, discount, paid, balance, status')
      .or('paid.gt.amount,balance.lt.0')
      .limit(10);

    if (problemError) {
      console.log('⚠️  Cannot check for problematic fees:', problemError.message);
    } else if (problematicFees && problematicFees.length > 0) {
      console.log('❌ Found problematic fees:');
      problematicFees.forEach(fee => {
        console.log(`   - Fee ${fee.id}: amount=${fee.amount}, paid=${fee.paid}, balance=${fee.balance}, status=${fee.status}`);
      });
      console.log('   ⚠️  These fees need to be fixed!');
    } else {
      console.log('✅ No problematic fees found');
    }
    console.log('');

    // Check for combined payment issues
    console.log('📋 Checking for combined payment issues...');
    const { data: combinedPayments, error: combinedError } = await supabase
      .from('installments')
      .select('id, fee_type, paid_amount')
      .eq('fee_type', 'transportation_and_tuition')
      .gt('paid_amount', 0)
      .limit(5);

    if (combinedError) {
      console.log('⚠️  Cannot check for combined payments:', combinedError.message);
    } else if (combinedPayments && combinedPayments.length > 0) {
      console.log('⚠️  Found combined payments that may need distribution:');
      combinedPayments.forEach(payment => {
        console.log(`   - Installment ${payment.id}: ${payment.fee_type}, paid=${payment.paid_amount}`);
      });
    } else {
      console.log('✅ No combined payment issues found');
    }
    console.log('');

    console.log('🎯 RECOMMENDATIONS:');
    console.log('');
    
    if (triggerError || !triggers || triggers.length === 0) {
      console.log('1. ❌ CRITICAL: Payment triggers are missing!');
      console.log('   → Run URGENT_COMPLETE_PAYMENT_FIX.sql in Supabase SQL Editor');
      console.log('');
    }
    
    if (problematicFees && problematicFees.length > 0) {
      console.log('2. ❌ CRITICAL: Found problematic fees with incorrect balances!');
      console.log('   → Run fix_double_payment_issue.sql to correct these');
      console.log('');
    }
    
    if (combinedPayments && combinedPayments.length > 0) {
      console.log('3. ⚠️  WARNING: Found combined payments that may need distribution!');
      console.log('   → Run fix_combined_fee_payment_distribution.sql');
      console.log('');
    }
    
    console.log('4. 🔄 After running SQL fixes:');
    console.log('   → Clear browser cache completely');
    console.log('   → Restart the application');
    console.log('   → Test payment functionality');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }
}

checkPaymentTriggers();