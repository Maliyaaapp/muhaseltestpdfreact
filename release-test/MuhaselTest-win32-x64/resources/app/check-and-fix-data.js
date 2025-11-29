// Check and fix missing data issues
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixData() {
  console.log('🔍 Checking data status...');
  
  try {
    // Check schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .limit(5);
    
    if (schoolsError) {
      console.log('❌ Error fetching schools:', schoolsError.message);
      return;
    }
    
    console.log(`📚 Found ${schools?.length || 0} schools`);
    schools?.forEach(school => {
      console.log(`- ${school.name} (${school.id})`);
    });
    
    if (!schools || schools.length === 0) {
      console.log('⚠️ No schools found. Creating a test school...');
      
      const { data: newSchool, error: createSchoolError } = await supabase
        .from('schools')
        .insert({
          name: 'Test School',
          english_name: 'Test School',
          email: 'test@school.com',
          phone: '123456789',
          address: 'Test Address',
          active: true
        })
        .select()
        .single();
      
      if (createSchoolError) {
        console.log('❌ Error creating school:', createSchoolError.message);
        return;
      }
      
      console.log('✅ Test school created:', newSchool.name);
      
      // Create settings for the new school
      const { error: settingsError } = await supabase
        .from('settings')
        .insert({
          school_id: newSchool.id,
          name: newSchool.name,
          english_name: newSchool.english_name,
          email: newSchool.email,
          phone: newSchool.phone,
          address: newSchool.address,
          receipt_number_format: 'auto',
          receipt_number_prefix: 'REC',
          receipt_number_counter: 1,
          installment_receipt_number_format: 'auto',
          installment_receipt_number_prefix: 'INST',
          installment_receipt_number_counter: 1
        });
      
      if (settingsError) {
        console.log('❌ Error creating settings:', settingsError.message);
      } else {
        console.log('✅ Settings created for test school');
      }
      
      // Create a test student
      const { data: newStudent, error: createStudentError } = await supabase
        .from('students')
        .insert({
          school_id: newSchool.id,
          name: 'Test Student',
          grade_level: '1',
          student_number: 'STU001',
          parent_name: 'Test Parent',
          parent_phone: '987654321'
        })
        .select()
        .single();
      
      if (createStudentError) {
        console.log('❌ Error creating student:', createStudentError.message);
      } else {
        console.log('✅ Test student created:', newStudent.name);
        
        // Create a test fee
        const { data: newFee, error: createFeeError } = await supabase
          .from('fees')
          .insert({
            school_id: newSchool.id,
            student_id: newStudent.id,
            student_name: newStudent.name,
            fee_type: 'tuition',
            amount: 1000,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            academic_year: '2024-2025',
            grade_level: newStudent.grade_level
          })
          .select()
          .single();
        
        if (createFeeError) {
          console.log('❌ Error creating fee:', createFeeError.message);
        } else {
          console.log('✅ Test fee created:', newFee.amount);
          
          // Make a partial payment to test the status
          const { error: paymentError } = await supabase
            .from('installments')
            .insert({
              school_id: newSchool.id,
              fee_id: newFee.id,
              student_id: newStudent.id,
              student_name: newStudent.name,
              amount: 300,
              payment_date: new Date().toISOString(),
              payment_method: 'cash',
              receipt_number: 'REC001'
            });
          
          if (paymentError) {
            console.log('❌ Error creating payment:', paymentError.message);
          } else {
            console.log('✅ Test payment created: 300');
            
            // Check the fee status after payment
            const { data: updatedFee, error: feeCheckError } = await supabase
              .from('fees')
              .select('id, student_name, amount, paid, balance, status')
              .eq('id', newFee.id)
              .single();
            
            if (feeCheckError) {
              console.log('❌ Error checking updated fee:', feeCheckError.message);
            } else {
              console.log('\n📊 Updated fee status:');
              console.log(`- ${updatedFee.student_name}: Amount=${updatedFee.amount}, Paid=${updatedFee.paid}, Balance=${updatedFee.balance}, Status=${updatedFee.status}`);
            }
          }
        }
      }
    } else {
      // Check if settings exist for existing schools
      const schoolId = schools[0].id;
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('school_id', schoolId)
        .single();
      
      if (settingsError || !settings) {
        console.log('⚠️ No settings found for existing school. Creating settings...');
        
        const { error: createSettingsError } = await supabase
          .from('settings')
          .insert({
            school_id: schoolId,
            name: schools[0].name,
            receipt_number_format: 'auto',
            receipt_number_prefix: 'REC',
            receipt_number_counter: 1,
            installment_receipt_number_format: 'auto',
            installment_receipt_number_prefix: 'INST',
            installment_receipt_number_counter: 1
          });
        
        if (createSettingsError) {
          console.log('❌ Error creating settings:', createSettingsError.message);
        } else {
          console.log('✅ Settings created for existing school');
        }
      } else {
        console.log('✅ Settings exist for school');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndFixData();