import { supabase } from '../services/supabase';
import { dataStore } from '../services/dataStore';

// Helper function to format data for Supabase (camelCase to snake_case)
function formatForSupabase(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const formatted: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    let newKey = key;
    
    // Convert camelCase to snake_case
    newKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // Handle special field mappings
    switch (key) {
      case 'gradeLevels':
        newKey = 'grade_levels';
        break;
      case 'grades':
        newKey = 'grades';
        break;
      case 'englishName':
        newKey = 'english_name';
        break;
      case 'phoneWhatsapp':
        newKey = 'phone_whatsapp';
        break;
      case 'phoneCall':
        newKey = 'phone_call';
        break;
      case 'subscriptionStart':
        newKey = 'subscription_start';
        break;
      case 'subscriptionEnd':
        newKey = 'subscription_end';
        break;
      case 'defaultInstallments':
        newKey = 'default_installments';
        break;
      case 'tuitionFeeCategory':
        newKey = 'tuition_fee_category';
        break;
      case 'transportationFeeOneWay':
        newKey = 'transportation_fee_one_way';
        break;
      case 'transportationFeeTwoWay':
        newKey = 'transportation_fee_two_way';
        break;
      case 'receiptNumberFormat':
        newKey = 'receipt_number_format';
        break;
      case 'receiptNumberCounter':
        newKey = 'receipt_number_counter';
        break;
      case 'receiptNumberPrefix':
        newKey = 'receipt_number_prefix';
        break;
      case 'showReceiptWatermark':
        newKey = 'show_receipt_watermark';
        break;
      case 'showStudentReportWatermark':
        newKey = 'show_student_report_watermark';
        break;
      case 'showInvoiceWatermark':
        newKey = 'show_invoice_watermark';
        break;
      case 'showLogoBackground':
        newKey = 'show_logo_background';
        break;
      case 'showLogoBackgroundOnReceipt':
        newKey = 'show_logo_background_on_receipt';
        break;
      case 'showLogoBackgroundOnStudentReport':
        newKey = 'show_logo_background_on_student_report';
        break;
      case 'showLogoBackgroundOnInstallmentReport':
        newKey = 'show_logo_background_on_installment_report';
        break;
      case 'showLogoBackgroundOnInvoice':
        newKey = 'show_logo_background_on_invoice';
        break;
      case 'showLogoBackgroundOnFeeReport':
        newKey = 'show_logo_background_on_fee_report';
        break;
      case 'showStampOnInvoice':
        newKey = 'show_stamp_on_invoice';
        break;
      case 'showStampOnReceipt':
        newKey = 'show_stamp_on_receipt';
        break;
      case 'showStampOnStudentReport':
        newKey = 'show_stamp_on_student_report';
        break;
      case 'showStampOnInstallmentReport':
        newKey = 'show_stamp_on_installment_report';
        break;
      case 'showStampOnPartialPayment':
        newKey = 'show_stamp_on_partial_payment';
        break;
      case 'showSignatureOnInvoice':
        newKey = 'show_signature_on_invoice';
        break;
      case 'showSignatureOnReceipt':
        newKey = 'show_signature_on_receipt';
        break;
      case 'showSignatureOnStudentReport':
        newKey = 'show_signature_on_student_report';
        break;
      case 'showSignatureOnInstallmentReport':
        newKey = 'show_signature_on_installment_report';
        break;
      case 'showSignatureOnPartialPayment':
        newKey = 'show_signature_on_partial_payment';
        break;
      case 'showFooter':
        newKey = 'show_footer';
        break;
      case 'showFooterInReports':
        newKey = 'show_footer_in_reports';
        break;
      case 'showFooterInReceipts':
        newKey = 'show_footer_in_receipts';
        break;
      case 'showFooterInInstallments':
        newKey = 'show_footer_in_installments';
        break;
      case 'footerContactInfo':
        newKey = 'footer_contact_info';
        break;
      case 'footerAddress':
        newKey = 'footer_address';
        break;
      case 'academicYear':
        newKey = 'academic_year';
        break;
      case 'installmentReceiptNumberCounter':
        newKey = 'installment_receipt_number_counter';
        break;
      case 'installmentReceiptNumberFormat':
        newKey = 'installment_receipt_number_format';
        break;
      case 'installmentReceiptNumberPrefix':
        newKey = 'installment_receipt_number_prefix';
        break;
      case 'receiptNumberYear':
        newKey = 'receipt_number_year';
        break;
      case 'installmentReceiptNumberYear':
        newKey = 'installment_receipt_number_year';
        break;
      case 'schoolId':
        newKey = 'school_id';
        break;
      case 'schoolName':
        newKey = 'school_name';
        break;
      case 'schoolLogo':
        newKey = 'school_logo';
        break;
      case 'schoolStamp':
        newKey = 'school_stamp';
        break;
      case 'lastLogin':
        newKey = 'last_login';
        break;
      case 'studentId':
        newKey = 'student_id';
        break;
      case 'englishGrade':
        newKey = 'english_grade';
        break;
      case 'parentName':
        newKey = 'parent_name';
        break;
      case 'parentEmail':
        newKey = 'parent_email';
        break;
      case 'transportationDirection':
        newKey = 'transportation_direction';
        break;
      case 'transportationFee':
        newKey = 'transportation_fee';
        break;
      case 'customTransportationFee':
        newKey = 'custom_transportation_fee';
        break;
      case 'studentName':
        newKey = 'student_name';
        break;
      case 'feeType':
        newKey = 'fee_type';
        break;
      case 'dueDate':
        newKey = 'due_date';
        break;
      case 'transportationType':
        newKey = 'transportation_type';
        break;
      case 'paymentDate':
        newKey = 'payment_date';
        break;
      case 'paymentMethod':
        newKey = 'payment_method';
        break;
      case 'paymentNote':
        newKey = 'payment_note';
        break;
      case 'installmentNumber':
        newKey = 'installment_number';
        break;
      case 'paidDate':
        newKey = 'paid_date';
        break;
      case 'receiptNumber':
        newKey = 'receipt_number';
        break;
      case 'feeId':
        newKey = 'fee_id';
        break;
      case 'installmentCount':
        newKey = 'installment_count';
        break;
      case 'installmentMonth':
        newKey = 'installment_month';
        break;
      case 'paidAmount':
        newKey = 'paid_amount';
        break;
      case 'checkNumber':
        newKey = 'check_number';
        break;
      case 'sentAt':
        newKey = 'sent_at';
        break;
      case 'financialSettings':
        newKey = 'financial_settings';
        break;
      case 'displaySettings':
        newKey = 'display_settings';
        break;
      case 'receiptSettings':
        newKey = 'receipt_settings';
        break;
      case 'createdAt':
        newKey = 'created_at';
        break;
      case 'updatedAt':
        newKey = 'updated_at';
        break;
    }
    
    formatted[newKey] = value;
  }
  
  return formatted;
}

// Migrate a single table
async function migrateTable(tableName: string, data: any[]) {
  if (!data || data.length === 0) {
    console.log(`No data to migrate for ${tableName}`);
    return;
  }

  console.log(`Migrating ${data.length} records to ${tableName}...`);
  
  // Format data for Supabase
  const formattedData = data.map(formatForSupabase);
  
  // Batch upsert (insert or update)
  const { data: result, error } = await supabase
    .from(tableName)
    .upsert(formattedData, { onConflict: 'id' });
    
  if (error) {
    console.error(`Error migrating ${tableName}:`, error);
    throw error;
  }
  
  console.log(`Successfully migrated ${tableName}`);
  return result;
}

// Main migration function
export async function migrateToSupabase() {
  try {
    console.log('Starting migration to Supabase...');
    
    // Get all data from local storage
    const schools = dataStore.getAll('schools');
    const accounts = dataStore.getAll('accounts');
    const students = dataStore.getAll('students');
    const fees = dataStore.getAll('fees');
    const installments = dataStore.getAll('installments');
    const messages = dataStore.getAll('messages');
    const settings = dataStore.getAll('settings');
    const templates = dataStore.getAll('templates');
    
    // Migrate in order (schools first, then accounts, then others)
    await migrateTable('schools', schools);
    await migrateTable('accounts', accounts);
    await migrateTable('students', students);
    await migrateTable('fees', fees);
    await migrateTable('installments', installments);
    await migrateTable('messages', messages);
    await migrateTable('settings', settings);
    await migrateTable('templates', templates);
    
    console.log('Migration completed successfully!');
    
    // Mark migration as completed
    localStorage.setItem('migrationCompleted', 'true');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Check if migration is needed
export function isMigrationNeeded(): boolean {
  return localStorage.getItem('migrationCompleted') !== 'true';
}

// Run migration from UI
export async function runMigration() {
  if (!isMigrationNeeded()) {
    console.log('Migration already completed');
    return;
  }
  
  await migrateToSupabase();
}