// Test script to check Supabase connection and data
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test 1: Check connection with a simple query
    console.log('\n1. Testing basic connection...');
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .limit(1);
    
    if (schoolsError) {
      console.error('Schools query error:', schoolsError);
    } else {
      console.log('Schools query successful:', schools?.length || 0, 'schools found');
    }
    
    // Test 2: Check fees table
    console.log('\n2. Testing fees table...');
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .select('id, due_date, student_name')
      .limit(5);
    
    if (feesError) {
      console.error('Fees query error:', feesError);
    } else {
      console.log('Fees query successful:', fees?.length || 0, 'fees found');
      if (fees && fees.length > 0) {
        console.log('Sample fee:', fees[0]);
      }
    }
    
    // Test 3: Check installments table
    console.log('\n3. Testing installments table...');
    const { data: installments, error: installmentsError } = await supabase
      .from('installments')
      .select('id, due_date, student_name, amount, status')
      .limit(5);
    
    if (installmentsError) {
      console.error('Installments query error:', installmentsError);
    } else {
      console.log('Installments query successful:', installments?.length || 0, 'installments found');
      if (installments && installments.length > 0) {
        console.log('Sample installment:', installments[0]);
      }
    }
    
    // Test 4: Check students table
    console.log('\n4. Testing students table...');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, grade')
      .limit(5);
    
    if (studentsError) {
      console.error('Students query error:', studentsError);
    } else {
      console.log('Students query successful:', students?.length || 0, 'students found');
    }
    
    // Test 5: Reload schema cache
    console.log('\n5. Reloading PostgREST schema cache...');
    const { error: notifyError } = await supabase.rpc('notify_pgrst_reload');
    if (notifyError) {
      console.log('Note: notify_pgrst_reload function not available, trying direct SQL...');
      // Try direct SQL execution
      const { error: sqlError } = await supabase
        .from('pg_notify')
        .select('*')
        .limit(1);
      console.log('SQL test result:', sqlError ? 'Error' : 'Success');
    } else {
      console.log('Schema cache reload successful');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testSupabaseConnection();