// Script to initialize sample data and migrate to Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// Generate sample data
function generateSampleData() {
  const now = new Date().toISOString();
  const schoolId = uuidv4();
  
  // Create school
  const school = {
    id: schoolId,
    name: 'المدرسة النموذجية',
    english_name: 'Model School',
    email: 'school@example.com',
    phone: '96800000000',
    phone_whatsapp: '96800000000',
    phone_call: '96800000000',
    address: 'مسقط، عمان',
    location: 'مسقط',
    active: true,
    subscription_start: now,
    subscription_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    logo: 'https://placehold.co/200x200/teal/white?text=School',
    payment: 1000.00,
    created_at: now,
    updated_at: now
  };
  
  // Create students
  const students = [
    {
      id: uuidv4(),
      school_id: schoolId,
      name: 'احمد محمد سعيد',
      english_name: 'Ahmed Mohammed Said',
      student_id: 'ST10001',
      grade: 'الصف الأول',
      english_grade: 'Grade 1',
      division: 'أ',
      parent_name: 'محمد سعيد',
      parent_email: 'parent1@example.com',
      phone: '968123456789',
      whatsapp: '968123456789',
      address: 'مسقط، عمان',
      transportation: 'two-way',
      transportation_direction: null,
      transportation_fee: 500.00,
      custom_transportation_fee: false,
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      school_id: schoolId,
      name: 'فاطمة علي حسن',
      english_name: 'Fatima Ali Hassan',
      student_id: 'ST10002',
      grade: 'الصف الثاني',
      english_grade: 'Grade 2',
      division: 'ب',
      parent_name: 'علي حسن',
      parent_email: 'parent2@example.com',
      phone: '968987654321',
      whatsapp: '968987654321',
      address: 'صلالة، عمان',
      transportation: 'one-way',
      transportation_direction: 'to-school',
      transportation_fee: 300.00,
      custom_transportation_fee: false,
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      school_id: schoolId,
      name: 'خالد سالم الرشيدي',
      english_name: 'Khalid Salem Al-Rashidi',
      student_id: 'ST10003',
      grade: 'الصف الثالث',
      english_grade: 'Grade 3',
      division: 'أ',
      parent_name: 'سالم الرشيدي',
      parent_email: 'parent3@example.com',
      phone: '968123498765',
      whatsapp: '968123498765',
      address: 'صحار، عمان',
      transportation: 'none',
      transportation_direction: null,
      transportation_fee: 0.00,
      custom_transportation_fee: false,
      created_at: now,
      updated_at: now
    }
  ];
  
  // Create fees for each student
  const fees = [];
  const installments = [];
  
  students.forEach(student => {
    // Tuition fee
    const tuitionFeeId = uuidv4();
    const tuitionFee = {
      id: tuitionFeeId,
      school_id: schoolId,
      student_id: student.id,
      student_name: student.name,
      grade: student.grade,
      division: student.division,
      fee_type: 'tuition',
      description: 'رسوم دراسية للفصل الأول',
      amount: 2000.00,
      discount: 0.00,
      paid: 0.00,
      balance: 2000.00,
      status: 'unpaid',
      due_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      transportation_type: null,
      payment_date: null,
      payment_method: null,
      payment_note: null,
      check_number: null,
      check_date: null,
      bank_name_arabic: null,
      bank_name_english: null,
      created_at: now,
      updated_at: now
    };
    fees.push(tuitionFee);
    
    // Create installments for tuition fee (4 installments of 500 each)
    for (let i = 1; i <= 4; i++) {
      const installmentDueDate = new Date();
      installmentDueDate.setMonth(installmentDueDate.getMonth() + i);
      
      const installment = {
        id: uuidv4(),
        school_id: schoolId,
        student_id: student.id,
        fee_id: tuitionFeeId,
        student_name: student.name,
        grade: student.grade,
        amount: 500.00,
        due_date: installmentDueDate.toISOString(),
        paid_date: null,
        status: 'unpaid',
        fee_type: 'tuition',
        note: `القسط ${i} من 4`,
        installment_count: i,
        installment_month: installmentDueDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
        paid_amount: 0.00,
        discount: 0.00,
        payment_method: null,
        payment_note: null,
        check_number: null,
        check_date: null,
        bank_name_arabic: null,
        bank_name_english: null,
        created_at: now,
        updated_at: now
      };
      installments.push(installment);
    }
    
    // Transportation fee (if applicable)
    if (student.transportation !== 'none') {
      const transportationFee = {
        id: uuidv4(),
        school_id: schoolId,
        student_id: student.id,
        student_name: student.name,
        grade: student.grade,
        division: student.division,
        fee_type: 'transportation',
        description: 'رسوم النقل المدرسي',
        amount: student.transportation_fee,
        discount: 0.00,
        paid: 0.00,
        balance: student.transportation_fee,
        status: 'unpaid',
        due_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        transportation_type: student.transportation,
        payment_date: null,
        payment_method: null,
        payment_note: null,
        check_number: null,
        check_date: null,
        bank_name_arabic: null,
        bank_name_english: null,
        created_at: now,
        updated_at: now
      };
      fees.push(transportationFee);
    }
  });
  
  return { school, students, fees, installments };
}

async function initializeData() {
  console.log('Generating sample data...');
  const { school, students, fees, installments } = generateSampleData();
  
  try {
    // Insert school
    console.log('Inserting school...');
    const { error: schoolError } = await supabase
      .from('schools')
      .insert([school]);
    
    if (schoolError) {
      console.error('Error inserting school:', schoolError);
      return;
    }
    console.log('School inserted successfully');
    
    // Insert students
    console.log('Inserting students...');
    const { error: studentsError } = await supabase
      .from('students')
      .insert(students);
    
    if (studentsError) {
      console.error('Error inserting students:', studentsError);
      return;
    }
    console.log(`${students.length} students inserted successfully`);
    
    // Insert fees
    console.log('Inserting fees...');
    const { error: feesError } = await supabase
      .from('fees')
      .insert(fees);
    
    if (feesError) {
      console.error('Error inserting fees:', feesError);
      return;
    }
    console.log(`${fees.length} fees inserted successfully`);
    
    // Insert installments
    console.log('Inserting installments...');
    const { error: installmentsError } = await supabase
      .from('installments')
      .insert(installments);
    
    if (installmentsError) {
      console.error('Error inserting installments:', installmentsError);
      return;
    }
    console.log(`${installments.length} installments inserted successfully`);
    
    console.log('\n✅ Sample data initialization completed successfully!');
    console.log(`Created: 1 school, ${students.length} students, ${fees.length} fees, ${installments.length} installments`);
    
  } catch (error) {
    console.error('Error during data initialization:', error);
  }
}

initializeData();