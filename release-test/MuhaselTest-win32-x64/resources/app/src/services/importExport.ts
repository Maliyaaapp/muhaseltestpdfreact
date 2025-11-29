import { GRADE_LEVELS, TRANSPORTATION_TYPES, PAYMENT_METHODS } from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import { generateReceiptNumber } from '../utils/helpers';
import { reserveReceiptNumbers } from '../utils/receiptCounter';
import { FEE_TYPES } from '../utils/constants';
import { getFirstDayOfMonth } from '../utils/dateUtils';
import hybridApi, { invalidateCache } from './hybridApi';
import { supabase, shouldUseSupabase } from './supabase';

// ------------------------------
// Supabase batch import helpers
// ------------------------------
const chunk = <T>(arr: T[], size = 1000): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const mapStudentRow = (s: any) => ({
  id: s.id,
  name: s.name,
  student_id: s.studentId ?? null,
  grade: s.grade ?? null,
  english_name: s.englishName ?? null,
  english_grade: s.englishGrade ?? null,
  division: s.division ?? null,
  parent_name: s.parentName ?? null,
  phone: s.phone ?? null,
  whatsapp: s.whatsapp ?? null,
  address: s.address ?? null,
  transportation: s.transportation ?? 'none',
  transportation_direction: s.transportationDirection ?? null,
  school_id: s.schoolId,
  created_at: s.createdAt ?? new Date().toISOString(),
  updated_at: s.updatedAt ?? new Date().toISOString(),
});

const mapFeeRow = (f: any) => ({
  id: f.id,
  school_id: f.schoolId,
  student_id: f.studentId,
  student_name: f.studentName,
  grade: f.grade ?? null,
  fee_type: f.feeType,
  description: f.description ?? '',
  amount: Number(f.amount || 0),
  discount: Number(f.discount || 0),
  paid: Number(f.paid || 0),
  balance: Number(
    f.balance ?? Math.max(0, (f.amount || 0) - (f.discount || 0) - (f.paid || 0))
  ),
  status: f.status ?? 'unpaid',
  due_date: f.dueDate ?? null,
  payment_method: f.paymentMethod ?? null,
  payment_note: f.paymentNote ?? null,
  check_number: f.checkNumber ?? null,
  check_date: f.checkDate ?? null,
  bank_name_arabic: f.bankNameArabic ?? null,
  bank_name_english: f.bankNameEnglish ?? null,
  created_at: f.createdAt ?? new Date().toISOString(),
  updated_at: f.updatedAt ?? new Date().toISOString(),
});

const mapInstallmentRow = (i: any) => ({
  id: i.id,
  school_id: i.schoolId,
  student_id: i.studentId,
  fee_id: i.feeId,
  student_name: i.studentName,
  grade: i.grade ?? null,
  amount: Number(i.amount || 0),
  due_date: i.dueDate ?? null,
  paid_date: i.paidDate ?? null,
  status: i.status ?? (i.paidDate ? 'paid' : 'upcoming'),
  fee_type: i.feeType ?? null,
  note: i.note ?? null,
  installment_count: i.totalInstallments ?? null,
  installment_number: i.installmentNumber ?? null,
  installment_month: i.installmentMonth ?? null,
  paid_amount: Number(i.paidAmount || 0),
  discount: Number(i.discount || 0),
  payment_method: i.paymentMethod ?? null,
  payment_note: i.paymentNote ?? null,
  check_number: i.checkNumber ?? null,
  check_date: i.checkDate ?? null,
  bank_name_arabic: i.bankNameArabic ?? null,
  bank_name_english: i.bankNameEnglish ?? null,
  created_at: i.createdAt ?? new Date().toISOString(),
  updated_at: i.updatedAt ?? new Date().toISOString(),
});

const batchUpsert = async (table: string, rows: any[], onConflict = 'id') => {
  if (!rows.length) return;
  for (const part of chunk(rows, 1000)) {
    const { error } = await supabase
      .from(table)
      .upsert(part, { onConflict, returning: 'minimal' });
    if (error) throw new Error(`Batch upsert failed for ${table}: ${error.message}`);
  }
};

async function supabaseBatchImport(
  students: ImportedStudent[],
  fees: ImportedFee[],
  schoolId: string,
  installments: ImportedInstallment[] = []
) {
  // Preassign UUIDs and wire references
  const studentsWithIds = students.map((s) => ({
    ...s,
    id: (s as any).id || uuidv4(),
    schoolId,
    createdAt: (s as any).createdAt || new Date().toISOString(),
    updatedAt: (s as any).updatedAt || new Date().toISOString(),
  }));

  const studentIdMap = new Map<string, string>();
  for (const s of studentsWithIds) {
    const key = (s as any).studentId || s.id;
    if (key) studentIdMap.set(key, s.id);
  }

  const feesWithIds = fees.map((f) => {
    const incomingKey = (f as any).studentId;
    const resolvedStudentId = studentIdMap.get(incomingKey) || incomingKey;
    return {
      ...f,
      id: (f as any).id || uuidv4(),
      schoolId,
      studentId: resolvedStudentId,
      createdAt: (f as any).createdAt || new Date().toISOString(),
      updatedAt: (f as any).updatedAt || new Date().toISOString(),
    };
  });

  const feeIdMap = new Map<string, string>();
  for (const f of feesWithIds) {
    const mapKey = `${(f as any).studentId}:${(f as any).feeType}`;
    feeIdMap.set(mapKey, (f as any).id);
  }

  const installmentsWithIds = installments.map((inst) => {
    const incomingKey = (inst as any).studentId;
    const resolvedStudentId = studentIdMap.get(incomingKey) || incomingKey;
    const feeKey = `${resolvedStudentId}:${(inst as any).feeType}`;
    const resolvedFeeId = (inst as any).feeId || feeIdMap.get(feeKey);
    return {
      ...inst,
      id: (inst as any).id || uuidv4(),
      schoolId,
      studentId: resolvedStudentId,
      feeId: resolvedFeeId,
      createdAt: (inst as any).createdAt || new Date().toISOString(),
      updatedAt: (inst as any).updatedAt || new Date().toISOString(),
    };
  });

  // Batch upsert
  await batchUpsert('students', studentsWithIds.map(mapStudentRow));
  await batchUpsert('fees', feesWithIds.map(mapFeeRow));
  await batchUpsert('installments', installmentsWithIds.map(mapInstallmentRow));

  // Single cache invalidation
  try {
    invalidateCache('students');
    invalidateCache('fees');
    invalidateCache('installments');
  } catch (e) {
    console.warn('Cache invalidation warning:', e);
  }

  return {
    studentsCount: studentsWithIds.length,
    feesCount: feesWithIds.length,
    installmentsCount: installmentsWithIds.length,
  };
}

// Define Fee interface locally
interface Fee {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  feeType: string;
  description: string;
  amount: number;
  discount: number;
  paid: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
  paymentMethod?: string;
  paymentNote?: string;
}

// Define interfaces for imported data
interface ImportedStudent {
  name: string;
  englishName?: string;  // Add English name field
  studentId: string;
  grade: string;
  englishGrade?: string;  // Add English grade field
  division?: string;
  parentName: string;
  phone: string;
  whatsapp?: string;  // Add WhatsApp field
  address?: string;   // Add address field
  transportation: 'none' | 'one-way' | 'two-way';
  transportationDirection?: 'to-school' | 'from-school';
  transportationFee?: number;
  customTransportationFee?: boolean;
  tuitionFee?: number;
  tuitionDiscount?: number;
}

interface ImportedFee {
  studentId: string;
  feeType: string;
  amount: number;
  discount?: number;
  discountPercentage?: number;
  paid?: number;
  balance?: number;
  status?: 'paid' | 'partial' | 'unpaid';
  dueDate?: string;
  paymentMethod?: 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other';
  paymentNote?: string;
}

interface ImportedInstallment {
  studentId: string;
  feeType: string;
  amount: number;
  dueDate: string;
  installmentNumber: number;
  totalInstallments: number;
  note?: string;
  isPaid?: boolean;
  paidDate?: string;
  paidAmount?: number;
  installmentMonth?: string;
  paymentMethod?: 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other';
  paymentNote?: string;
  checkNumber?: string;  // Add checkNumber field
}

/**
 * Safely converts a date to ISO string format (YYYY-MM-DD).
 * Returns a valid date string even if the input is invalid.
 */
export const safeToISODateString = (date: Date | string | undefined): string => {
  if (!date) {
    return new Date().toISOString().split('T')[0];
  }
  
  try {
    // If it's already a string in YYYY-MM-DD format, return it
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Create a Date object if it's a string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    
    // Return the ISO date string
    return dateObj.toISOString().split('T')[0];
  } catch (e) {
    console.error('Error converting date to ISO string:', e);
    return new Date().toISOString().split('T')[0];
  }
};

// Function to parse CSV files with proper Arabic support
export const parseCSV = (text: string): Array<any> => {
  // Make sure we have the BOM prefix for UTF-8
  const BOM = "\uFEFF";
  let content = text;
  if (!text.startsWith(BOM)) {
    content = BOM + text;
  }
  // Split lines robustly (CRLF/LF) and skip empty
  const lines = content.split(/\r?\n/).filter(l => l !== '');
  if (lines.length < 2) return [];

  // Quote-aware CSV line parser
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };
  
  // Process headers - clean up and normalize
  const headers = parseLine(lines[0].replace(BOM, ''));
  
   // Map Arabic headers to English properties
  const headerMap: Record<string, string> = {
    // Student headers
    'اسم الطالب': 'name',
    'رقم الطالب': 'studentId',
    'الصف': 'grade',
    'الشعبة': 'division',
    'اسم ولي الأمر': 'parentName',
    'رقم الهاتف': 'phone',
    'واتساب': 'whatsapp',  // WhatsApp mapping
    'WhatsApp': 'whatsapp',
    'Whatsapp': 'whatsapp',
    'WHATSAPP': 'whatsapp',
    'العنوان': 'address',  // Address mapping
    'Address': 'address',
    'ADDRESS': 'address',
    'Location': 'address', // Treat location as address for students
    'LOCATION': 'address',
    'النقل': 'transportation',
    'اتجاه النقل': 'transportationDirection',
    'رسوم النقل': 'transportationFee',
    'Transportation Fee': 'transportationFee',
    'TRANSPORTATION FEE': 'transportationFee',
    
    // Fee headers
    'نوع الرسوم': 'feeType',
    'Fee Type': 'feeType',
    'FEE TYPE': 'feeType',
    'المبلغ': 'amount',
    'Amount': 'amount',
    'AMOUNT': 'amount',
    'الخصم': 'discount',
    'خصم': 'discount',
    'Discount': 'discount',
    'DISCOUNT': 'discount',
    'Discount Amount': 'discount',
    'خصم %': 'discountPercentage',
    'نسبة الخصم %': 'discountPercentage',
    // 'نسبة الخصم': 'discountPercentage', // Duplicate - already defined above
    'Discount %': 'discountPercentage',
    'Discount Percentage': 'discountPercentage',
    'تاريخ الاستحقاق': 'dueDate',
    'Due Date': 'dueDate',
    'DUE DATE': 'dueDate',
    'طريقة الدفع': 'paymentMethod',
    'ملاحظات الدفع': 'paymentNote',
    
    // Additional headers for direct tuition fee input
    'الرسوم الدراسية': 'tuitionFee',
    'خصم الرسوم الدراسية': 'tuitionDiscount',
    'Tuition Fee': 'tuitionFee',
    'Tuition Discount': 'tuitionDiscount',
    'TUITION FEE': 'tuitionFee',
    'TUITION DISCOUNT': 'tuitionDiscount',
    'المبلغ المدفوع': 'paidAmount',
    'Paid Amount': 'paidAmount',
    'PAID AMOUNT': 'paidAmount',
    'نسبة الخصم': 'discountPercentage',
    'نسبة خصم الرسوم': 'tuitionDiscountPercentage',
    'نوع الرسوم المدمجة': 'combinedFeeType',  // Keep this for backward compatibility
    'رسوم مدمجة': 'combinedFees',  // Add new mapping for yes/no field
    
    // Installment headers
    'رقم القسط': 'installmentNumber',
    'عدد الأقساط': 'numberOfInstallments',
    'مدفوع': 'isPaid',
    'تاريخ الدفع': 'paidDate',
    'شهر القسط': 'installmentMonth',
    'رقم الشيك': 'checkNumber',
    'ملاحظات': 'note',
    
    // New headers for student import with installments
    'تاريخ بداية الأقساط': 'installmentStartDate',
    'Student English Name': 'englishName',
    'Grade (English)': 'englishGrade'
  }; 
  
  // Normalize headers
  const normalizedHeaders = headers.map(header => headerMap[header] || header);
  
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = parseLine(line);
    const entry: any = {};
    
    normalizedHeaders.forEach((header, index) => {
      if (index < values.length) {
        entry[header] = values[index];
      }
    });
    
    result.push(entry);
  }
  
  return result;
};

// Function to convert Excel file to CSV using SheetJS (client-side)
export const excelToCSV = async (file: File): Promise<string> => {
  // In a real implementation we would use SheetJS or a server-side approach
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsText(file, 'UTF-8');
  });
};

// Process imported students data
export const processImportedStudents = (
  data: Array<any>, 
  schoolId: string, 
  settings: any
): { students: ImportedStudent[], fees: ImportedFee[], installments: ImportedInstallment[] } => {
  const students: ImportedStudent[] = [];
  const fees: ImportedFee[] = [];
  const installments: ImportedInstallment[] = [];
  
  // Define Arabic to English field mappings
  const headerMap: Record<string, string> = {
    'اسم الطالب': 'name',
    'Student English Name': 'englishName',  // Add English name mapping
    'رقم الطالب': 'studentId',
    'الصف': 'grade',
    'Grade (English)': 'englishGrade',  // Add English grade mapping
    'الشعبة': 'division',
    'اسم ولي الأمر': 'parentName',
    'رقم الهاتف': 'phone',
    'واتساب': 'whatsapp',  // WhatsApp mapping
    'WhatsApp': 'whatsapp',
    'Whatsapp': 'whatsapp',
    'WHATSAPP': 'whatsapp',
    'العنوان': 'address',  // Address mapping
    'Address': 'address',
    'ADDRESS': 'address',
    'Location': 'address',
    'LOCATION': 'address',
    'النقل': 'transportation',
    'اتجاه النقل': 'transportationDirection',
    'رسوم النقل': 'transportationFee',
    'الرسوم الدراسية': 'tuitionFee',
    'خصم الرسوم الدراسية': 'tuitionDiscount',
    'نوع الرسوم المدمجة': 'combinedFeeType',
    'رسوم مدمجة': 'combinedFees',
    'المبلغ المدفوع': 'paidAmount',
    'عدد الأقساط': 'numberOfInstallments',
    'تاريخ بداية الأقساط': 'installmentStartDate',
    'طريقة الدفع': 'paymentMethod',
    'ملاحظات الدفع': 'paymentNote',
    
    // Fee fields
    'نوع الرسوم': 'feeType',
    'المبلغ': 'amount',
    'الخصم': 'discount',
    'نسبة الخصم %': 'discountPercentage',
    'تاريخ الاستحقاق': 'dueDate',
    
    // Installment fields
    'رقم القسط': 'installmentNumber',
    'إجمالي الأقساط': 'totalInstallments',
    'مدفوع': 'isPaid',
    'تاريخ الدفع': 'paidDate',
    'شهر القسط': 'installmentMonth',
    'رقم الشيك': 'checkNumber',  // Add mapping for checkNumber
    'ملاحظات': 'note'
  };
  
  // Map rows to their corresponding object structure
  data.forEach(row => {
    // Map Arabic headers to English fields
    const mappedRow: Record<string, any> = {};
    Object.keys(row).forEach(key => {
      const englishKey = headerMap[key] || key;
      mappedRow[englishKey] = row[key];
    });
    
    // Check if this is a student row
    if (mappedRow.name && mappedRow.studentId) {
      // Process student
      const student: ImportedStudent = {
        name: mappedRow.name,
        studentId: mappedRow.studentId,
        grade: mappedRow.grade || '',
        division: mappedRow.division,
        parentName: mappedRow.parentName || '',
        phone: mappedRow.phone || '',
        transportation: 'none' as 'none' | 'one-way' | 'two-way'
      };
      
      // Normalize KG grade formats
      if (student.grade) {
        const gradeLower = student.grade.toLowerCase();
        
        // KG1 normalization
        if (gradeLower.includes('kg1') || 
            gradeLower.includes('الروضة kg1') ||
            (student.grade.includes('الروضة') && !gradeLower.includes('kg2'))) {
          student.grade = 'الروضة KG1';
          student.englishGrade = student.englishGrade || 'KG 1';
          console.log('Normalized KG1 grade from:', student.grade, 'to: الروضة KG1');
        }
        // KG2 normalization
        else if (gradeLower.includes('kg2') || 
                student.grade.includes('التمهيدي') || 
                (student.grade.includes('الروضة') && (student.grade.includes('2') || student.grade.includes('٢')))) {
          student.grade = 'التمهيدي KG2';
          student.englishGrade = student.englishGrade || 'KG 2';
          console.log('Normalized KG2 grade from:', student.grade, 'to: التمهيدي KG2');
        }
      }
      
      // Keep any explicitly provided englishGrade
      if (mappedRow.englishGrade) {
        student.englishGrade = mappedRow.englishGrade;
      }
      
      // Also set englishName if provided
      if (mappedRow.englishName) {
        student.englishName = mappedRow.englishName;
      }
      
      // Set WhatsApp if provided
      if (mappedRow.whatsapp) {
        student.whatsapp = mappedRow.whatsapp;
      }
      
      // Set address if provided
      if (mappedRow.address) {
        student.address = mappedRow.address;
      }
      
      // Determine if combined fees are requested for this student
      let hasCombinedFees = false;
      if (mappedRow.combinedFees !== undefined) {
        const flagText = String(mappedRow.combinedFees).trim().toLowerCase();
        hasCombinedFees = ['yes','true','نعم','1','y'].includes(flagText);
      }
      if (!hasCombinedFees && mappedRow.combinedFeeType) {
        const typeText = String(mappedRow.combinedFeeType).trim().toLowerCase();
        hasCombinedFees = typeText.includes('transportation_and_tuition') || typeText.includes('combined');
      }

      // Process transportation
      if (mappedRow.transportation) {
        const transportText = String(mappedRow.transportation).trim().toLowerCase();
        
        // First check if a transportation fee is directly provided regardless of type
        if (mappedRow.transportationFee) {
          const parsedFee = parseFloat(mappedRow.transportationFee);
          if (!isNaN(parsedFee)) {
            // Always use the exact amount provided by the user
            student.transportationFee = parsedFee;
            student.customTransportationFee = true;
            console.log(`IMPORTANT: Using exact transportation fee for ${student.name}: ${parsedFee} (original value)`);
          }
        }
        
        // Check for Arabic transportation terms using constants
        const arabicToEnglishTransport = new Map(
          TRANSPORTATION_TYPES.map(type => [type.name.toLowerCase(), type.id])
        );
        
        // First try to match with Arabic terms from constants
        const transportType = arabicToEnglishTransport.get(transportText);
        if (transportType) {
          student.transportation = transportType as 'none' | 'one-way' | 'two-way';
        }
        // Then try the legacy text checks if no match was found
        else if (transportText.includes('اتجاه واحد') || transportText.includes('one-way')) {
          student.transportation = 'one-way';
          
          if (mappedRow.transportationDirection) {
            const directionText = String(mappedRow.transportationDirection).trim().toLowerCase();
            if (directionText.includes('إلى المدرسة') || directionText.includes('to-school')) {
              student.transportationDirection = 'to-school';
            } else if (directionText.includes('من المدرسة') || directionText.includes('from-school')) {
              student.transportationDirection = 'from-school';
            }
          }
          
          // Only set default fee if none was provided
          if (!student.transportationFee) {
            student.transportationFee = settings.transportationFeeOneWay || 150;
            console.log(`Using default one-way transportation fee for ${student.name}: ${student.transportationFee}`);
          }
        } else if (transportText.includes('اتجاهين') || transportText.includes('two-way')) {
          student.transportation = 'two-way';
          
          // Only set default fee if none was provided
          if (!student.transportationFee) {
            student.transportationFee = settings.transportationFeeTwoWay || 300;
            console.log(`Using default two-way transportation fee for ${student.name}: ${student.transportationFee}`);
          }
        }
      } else if (mappedRow.transportationFee) {
        // If transportation fee is provided but no transportation type is set,
        // create a transportation fee anyway and set transportation to one-way
        const parsedFee = parseFloat(mappedRow.transportationFee);
        if (!isNaN(parsedFee) && parsedFee > 0) {
          console.log(`Creating transportation fee from direct fee input for ${student.name}: ${parsedFee}`);
          
          // Update student transportation info
          student.transportation = 'one-way';
          student.transportationFee = parsedFee;
          student.customTransportationFee = true;
          
          // Create the fee
          const transportationFee: ImportedFee = {
            studentId: student.studentId,
            feeType: 'transportation',
            amount: Math.round(parsedFee),
            discount: 0,
            dueDate: safeToISODateString(new Date()),
            paymentMethod: mappedRow.paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
            paymentNote: mappedRow.paymentNote
          };
          if (!hasCombinedFees) {
            fees.push(transportationFee);
          }
        }
      }
      
      // Process tuition fee
      if (mappedRow.tuitionFee) {
        const tuitionFee = parseFloat(mappedRow.tuitionFee);
        if (!isNaN(tuitionFee)) {
          student.tuitionFee = Math.round(tuitionFee);
          
          // Process tuition discount
          if (mappedRow.tuitionDiscount) {
            const tuitionDiscount = parseFloat(mappedRow.tuitionDiscount);
            if (!isNaN(tuitionDiscount)) {
              student.tuitionDiscount = Math.round(tuitionDiscount);
            }
          }
        }
      }
      
      students.push(student);
      
      // Create fees based on student data
      
      // 1. Tuition fee (skip if combined fees are enabled)
      if (student.tuitionFee && !hasCombinedFees) {
        // Map payment method from Arabic to English if needed
        let paymentMethodValue = mappedRow.paymentMethod;
        
        if (paymentMethodValue) {
          // Convert to string and lowercase for comparison
          const paymentMethodText = String(paymentMethodValue).trim().toLowerCase();
          
          // Check for Arabic payment terms using constants
          const arabicToEnglishPayment = new Map(
            PAYMENT_METHODS.map(method => [method.name.toLowerCase(), method.id])
          );
          
          // Try to match with Arabic terms from constants
          const paymentMethod = arabicToEnglishPayment.get(paymentMethodText);
          if (paymentMethod) {
            paymentMethodValue = paymentMethod;
          }
          // If no match, keep the original value
        }
        
        // Calculate paid amount for this fee from CSV
        const paidAmountFromCSV = parseFloat(mappedRow.paidAmount) || 0;
        const feeAmount = Math.round(student.tuitionFee);
        const feeDiscount = Math.round(student.tuitionDiscount || 0);
        const feeBalance = feeAmount - feeDiscount;
        
        // Determine fee status based on paid amount
        let feeStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        let feePaidAmount = 0;
        
        if (paidAmountFromCSV > 0) {
          feePaidAmount = Math.min(paidAmountFromCSV, feeBalance);
          if (feePaidAmount >= feeBalance) {
            feeStatus = 'paid';
          } else {
            feeStatus = 'partial';
          }
        }
        
        const tuitionFee: ImportedFee = {
          studentId: student.studentId,
          feeType: 'tuition',
          amount: feeAmount,
          discount: feeDiscount,
          paid: feePaidAmount,
          balance: feeBalance - feePaidAmount,
          status: feeStatus,
          dueDate: safeToISODateString(new Date()), // Today as default
          paymentMethod: paymentMethodValue as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote: mappedRow.paymentNote
        };
        fees.push(tuitionFee);
        
        // Check if we need to create installments
        const numberOfInstallments = mappedRow.numberOfInstallments ? parseInt(mappedRow.numberOfInstallments, 10) : 0;
        
        if (numberOfInstallments > 0) {
          // Create installments
          const installmentStartDate = mappedRow.installmentStartDate || new Date().toISOString().split('T')[0];
          
          // Check if we need to use combined fee type (support both old and new format)
          const useCombinedFeeType = 
            mappedRow.combinedFeeType === 'transportation_and_tuition' || 
            mappedRow.combinedFees === 'نعم' || 
            mappedRow.combinedFees === 'yes' || 
            mappedRow.combinedFees === 'true' || 
            mappedRow.combinedFees === '1';
          
          // Calculate the total amount based on fee type
          let totalAmount = student.tuitionFee - (student.tuitionDiscount || 0);
          let feeType = 'tuition';
          
          // If using combined fee type, add transportation fee to the total
          if (useCombinedFeeType) {
            totalAmount += student.transportationFee || 0;
            feeType = 'transportation_and_tuition';
            console.log(`Using combined fee type for ${student.name}: Tuition ${student.tuitionFee} + Transportation ${student.transportationFee} = ${totalAmount}`);
          }
          
          // Check if there's a pre-paid amount
          const paidAmount = parseFloat(mappedRow.paidAmount) || 0;
          let remainingAmount = totalAmount - paidAmount;
          
          // If there's a pre-payment, create a paid installment for it
          if (paidAmount > 0) {
            console.log(`Pre-payment detected for ${student.name}: ${paidAmount}`);
            
            // Create a paid installment for the pre-payment
            const paidInstallment: ImportedInstallment = {
              studentId: student.studentId,
              feeType: feeType,
              amount: Math.round(paidAmount),
              dueDate: safeToISODateString(new Date(installmentStartDate)),
              installmentNumber: 0,
              totalInstallments: numberOfInstallments,
              note: `دفعة مقدمة`,
              installmentMonth: String(new Date(installmentStartDate).getMonth() + 1),
              isPaid: true,
              paidDate: safeToISODateString(new Date()),
              paidAmount: Math.round(paidAmount),
              paymentMethod: mappedRow.paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
              paymentNote: mappedRow.paymentNote,
              checkNumber: mappedRow.checkNumber
            };
            
            installments.push(paidInstallment);
            
            // If the pre-payment covers the entire amount, we're done
            if (paidAmount >= totalAmount) {
              console.log(`Full pre-payment for ${student.name}: ${paidAmount} >= ${totalAmount}`);
              return;
            }
          }
          
          // Calculate installment amounts for the remaining balance
          const installmentAmount = Math.floor(remainingAmount / numberOfInstallments);
          const remainder = remainingAmount % numberOfInstallments;
          
          // Create installments for the remaining balance
          for (let i = 0; i < numberOfInstallments; i++) {
            // Calculate installment amount (add remainder to first installment)
            const amount = i === 0 ? installmentAmount + remainder : installmentAmount;
            
            // Calculate due date (first installment is on start date, others are monthly)
            const dueDate = new Date(installmentStartDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            
            // Determine month name
            const monthNames = [
              'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
              'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
            ];
            const installmentMonth = monthNames[dueDate.getMonth()];
            
            // Create installment
            const installment: ImportedInstallment = {
              studentId: student.studentId,
              feeType: feeType,  // Use the determined fee type
              amount: Math.round(amount),
              dueDate: safeToISODateString(dueDate),
              installmentNumber: i,
              totalInstallments: numberOfInstallments,
              note: `القسط ${i + 1} من ${numberOfInstallments}`,
              installmentMonth,
              paymentMethod: mappedRow.paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
              paymentNote: mappedRow.paymentNote,
              checkNumber: mappedRow.checkNumber
            };
            
            installments.push(installment);
            
            console.log(`Created installment for ${student.name}: ${installmentMonth} - ${amount} - Fee Type: ${feeType}`);
          }
        }
      }

      // 2. Combined fee (transportation + tuition) when requested
      if (hasCombinedFees) {
        const combinedAmount = Math.round((student.tuitionFee || 0) + (student.transportationFee || 0));
        const combinedDiscount = Math.round(student.tuitionDiscount || 0);
        const paidAmountFromCSV = parseFloat(mappedRow.paidAmount) || 0;
        const feeBalance = Math.max(0, combinedAmount - combinedDiscount);
        let feeStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        let feePaidAmount = 0;
        if (paidAmountFromCSV > 0) {
          feePaidAmount = Math.min(paidAmountFromCSV, feeBalance);
          if (feePaidAmount >= feeBalance) feeStatus = 'paid';
          else feeStatus = 'partial';
        }

        const combinedFee: ImportedFee = {
          studentId: student.studentId,
          feeType: 'transportation_and_tuition',
          amount: combinedAmount,
          discount: combinedDiscount,
          paid: feePaidAmount,
          balance: feeBalance - feePaidAmount,
          status: feeStatus,
          dueDate: safeToISODateString(new Date()),
          paymentMethod: mappedRow.paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote: mappedRow.paymentNote
        };
        fees.push(combinedFee);

        // Create installments for combined fee if specified
        const numberOfInstallments = mappedRow.numberOfInstallments ? parseInt(mappedRow.numberOfInstallments, 10) : 0;
        const installmentStartDate = mappedRow.installmentStartDate || getFirstDayOfMonth(new Date());
        if (numberOfInstallments > 0) {
          const totalAmount = feeBalance; // net after discount
          const paidAmount = 0; // already accounted above; installments cover remaining
          let remainingAmount = totalAmount - paidAmount;
          const installmentAmount = Math.floor(remainingAmount / numberOfInstallments);
          const remainder = remainingAmount % numberOfInstallments;
          for (let i = 0; i < numberOfInstallments; i++) {
            const amount = i === 0 ? installmentAmount + remainder : installmentAmount;
            const dueDate = new Date(installmentStartDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
            const installmentMonth = monthNames[dueDate.getMonth()];
            const installment: ImportedInstallment = {
              studentId: student.studentId,
              feeType: 'transportation_and_tuition',
              amount: Math.round(amount),
              dueDate: safeToISODateString(dueDate),
              installmentNumber: i,
              totalInstallments: numberOfInstallments,
              note: `القسط ${i + 1} من ${numberOfInstallments}`,
              installmentMonth,
              paymentMethod: mappedRow.paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
              paymentNote: mappedRow.paymentNote
            };
            installments.push(installment);
          }
        }
      }
      
      // 2. Transportation fee
      if (student.transportation !== 'none') {
        // ALWAYS use the exact transportation fee specified for the student
        // Never override with default values if a custom value was provided
        const transportFee = student.transportationFee !== undefined ? 
                              student.transportationFee : 
                              (student.transportation === 'one-way' ? 
                                settings.transportationFeeOneWay || 150 : 
                                settings.transportationFeeTwoWay || 300);
                                
        console.log(`FINAL: Creating transportation fee for ${student.name}: ${transportFee} (${student.transportation})`);
        
        const transportationFee: ImportedFee = {
          studentId: student.studentId,
          feeType: 'transportation',
          amount: Math.round(transportFee),
          discount: 0,
          dueDate: safeToISODateString(new Date()), // Today as default
          paymentMethod: mappedRow.paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote: mappedRow.paymentNote
        };
        fees.push(transportationFee);
      } else if (mappedRow.transportationFee) {
        // If transportation fee is provided but no transportation type is set,
        // create a transportation fee anyway and set transportation to one-way
        const parsedFee = parseFloat(mappedRow.transportationFee);
        if (!isNaN(parsedFee) && parsedFee > 0) {
          console.log(`Creating transportation fee from direct fee input for ${student.name}: ${parsedFee}`);
          
          // Update student transportation info
          student.transportation = 'one-way';
          student.transportationFee = parsedFee;
          student.customTransportationFee = true;
          
          // Create the fee
          const transportationFee: ImportedFee = {
            studentId: student.studentId,
            feeType: 'transportation',
            amount: Math.round(parsedFee),
            discount: 0,
            dueDate: safeToISODateString(new Date()),
            paymentMethod: mappedRow.paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
            paymentNote: mappedRow.paymentNote
          };
          fees.push(transportationFee);
        }
      }
    }
    // Check if this is a fee row
    else if (mappedRow.studentId && mappedRow.feeType && mappedRow.amount) {
      // Process fee
      const amount = parseFloat(mappedRow.amount);
      if (isNaN(amount)) return;
      
      let discount = 0;
      if (mappedRow.discount) {
        discount = parseFloat(mappedRow.discount);
        if (isNaN(discount)) discount = 0;
      } else if (mappedRow.discountPercentage) {
        const discountPercentage = parseFloat(mappedRow.discountPercentage);
        if (!isNaN(discountPercentage)) {
          discount = (amount * discountPercentage) / 100;
        }
      }
      
      // Calculate paid amount for this fee from CSV
      const paidAmountFromCSV = parseFloat(mappedRow.paidAmount) || 0;
      const feeBalance = amount - discount;
      
      // Determine fee status based on paid amount
      let feeStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      let feePaidAmount = 0;
      
      if (paidAmountFromCSV > 0) {
        feePaidAmount = Math.min(paidAmountFromCSV, feeBalance);
        if (feePaidAmount >= feeBalance) {
          feeStatus = 'paid';
        } else {
          feeStatus = 'partial';
        }
      }
      
      const fee: ImportedFee = {
        studentId: mappedRow.studentId,
        feeType: mappedRow.feeType,
        amount: Math.round(amount),
        discount: Math.round(discount),
        paid: feePaidAmount,
        balance: feeBalance - feePaidAmount,
        status: feeStatus,
        dueDate: mappedRow.dueDate ? safeToISODateString(mappedRow.dueDate) : safeToISODateString(new Date())
      };
      
      fees.push(fee);
    }
    // Check if this is an installment row
    else if (mappedRow.studentId && mappedRow.feeType && mappedRow.amount && 
             (mappedRow.installmentNumber !== undefined || mappedRow.installmentMonth)) {
      // If feeType is 'transportation_and_tuition', sum tuitionFee and transportationFee for the student
      if (mappedRow.feeType === 'transportation_and_tuition') {
        const student = students.find(s => s.studentId === mappedRow.studentId);
        if (student) {
          const tuition = student.tuitionFee || 0;
          const transportation = student.transportationFee || 0;
          
          // Update the amount to be the sum of tuition and transportation
          mappedRow.amount = tuition + transportation;
          console.log(`Combined fee for student ${student.name}: Tuition ${tuition} + Transportation ${transportation} = ${mappedRow.amount}`);
        }

        // Ensure a fee record exists for combined fees, including discount if provided in installment row
        // Parse discount from installment row (amount or percentage)
        let combinedDiscount = 0;
        if (mappedRow.discount) {
          const parsedDisc = parseFloat(mappedRow.discount);
          if (!isNaN(parsedDisc)) combinedDiscount = parsedDisc;
        } else if (mappedRow.discountPercentage) {
          const parsedPct = parseFloat(mappedRow.discountPercentage);
          const baseAmount = parseFloat(mappedRow.amount);
          if (!isNaN(parsedPct) && !isNaN(baseAmount)) {
            combinedDiscount = (baseAmount * parsedPct) / 100;
          }
        }

        // Create the fee only once per student for combined type
        const existingCombinedFee = fees.find(f => f.studentId === mappedRow.studentId && f.feeType === 'transportation_and_tuition');
        if (!existingCombinedFee) {
          const baseAmount = parseFloat(mappedRow.amount);
          const paidAmountFromCSV = mappedRow.paidAmount ? Math.min(parseFloat(String(mappedRow.paidAmount)) || 0, Math.max(0, baseAmount - combinedDiscount)) : 0;
          const feeBalance = Math.max(0, baseAmount - combinedDiscount - paidAmountFromCSV);
          let feeStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
          if (paidAmountFromCSV > 0) {
            feeStatus = feeBalance === 0 ? 'paid' : 'partial';
          }

          const combinedFee: ImportedFee = {
            studentId: mappedRow.studentId,
            feeType: 'transportation_and_tuition',
            amount: Math.round(baseAmount),
            discount: Math.round(combinedDiscount),
            paid: Math.round(paidAmountFromCSV),
            balance: Math.round(feeBalance),
            status: feeStatus,
            dueDate: mappedRow.dueDate ? safeToISODateString(mappedRow.dueDate) : safeToISODateString(new Date())
          };
          fees.push(combinedFee);
        }
      }
      
      const amount = parseFloat(mappedRow.amount);
      if (isNaN(amount)) return;
      
      let installmentNumber = 0;
      if (mappedRow.installmentNumber !== undefined) {
        const parsedNumber = parseInt(mappedRow.installmentNumber, 10);
        if (!isNaN(parsedNumber)) {
          installmentNumber = parsedNumber;
        }
      }
      
      let totalInstallments = 1;
      if (mappedRow.totalInstallments) {
        const parsedTotal = parseInt(mappedRow.totalInstallments, 10);
        if (!isNaN(parsedTotal)) {
          totalInstallments = parsedTotal;
        }
      }
      
      // Parse isPaid flag
      let isPaid = false;
      if (mappedRow.isPaid !== undefined) {
        if (typeof mappedRow.isPaid === 'boolean') {
          isPaid = mappedRow.isPaid;
        } else if (typeof mappedRow.isPaid === 'string') {
          const isPaidText = mappedRow.isPaid.trim().toLowerCase();
          isPaid = isPaidText === 'true' || isPaidText === 'yes' || isPaidText === 'نعم' || isPaidText === '1';
        } else if (typeof mappedRow.isPaid === 'number') {
          isPaid = mappedRow.isPaid === 1;
        }
      }
      
      // Parse paidAmount if available
      let paidAmount;
      if (mappedRow.paidAmount !== undefined) {
        paidAmount = parseFloat(mappedRow.paidAmount);
        if (isNaN(paidAmount)) paidAmount = undefined;
      }
      
      // Determine installment month if not provided
      let installmentMonth = mappedRow.installmentMonth;
      if (!installmentMonth && mappedRow.dueDate) {
        try {
          const dueDate = new Date(mappedRow.dueDate);
          const monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
          ];
          installmentMonth = monthNames[dueDate.getMonth()];
        } catch (e) {
          // If date parsing fails, leave installmentMonth as undefined
          console.error('Error parsing due date for installment month:', e);
        }
      }
      
      // Create installment object
      const installment: ImportedInstallment = {
        studentId: mappedRow.studentId,
        feeType: mappedRow.feeType,
        amount: Math.round(amount),
        dueDate: mappedRow.dueDate ? safeToISODateString(mappedRow.dueDate) : safeToISODateString(new Date()),
        installmentNumber,
        totalInstallments,
        note: mappedRow.note,
        isPaid,
        paidDate: isPaid ? (mappedRow.paidDate ? safeToISODateString(mappedRow.paidDate) : safeToISODateString(new Date())) : undefined,
        paidAmount: isPaid ? (paidAmount !== undefined ? Math.round(paidAmount) : undefined) : undefined,
        installmentMonth,
        paymentMethod: mappedRow.paymentMethod,
        paymentNote: mappedRow.paymentNote,
        checkNumber: mappedRow.checkNumber  // Add checkNumber
      };
      
      installments.push(installment);
      
      console.log(`Processed installment for student ${mappedRow.studentId}: ${installmentMonth || 'No month'} - ${amount}`);
    }
  });
  
  console.log(`Processed ${students.length} students, ${fees.length} fees, and ${installments.length} installments`);
  
  return { students, fees, installments };
};

// Save imported students and fees to the dataStore
export const saveImportedData = async (
  students: ImportedStudent[], 
  fees: ImportedFee[],
  schoolId: string,
  installments: ImportedInstallment[] = []
): Promise<{ studentsCount: number, feesCount: number, installmentsCount: number }> => {
  let savedStudentsCount = 0;
  let savedFeesCount = 0;
  let savedInstallmentsCount = 0;
  
  // Map to store imported student IDs to saved student IDs
  const studentIdMap = new Map<string, string>();
  // Map to store imported fee IDs to saved fee IDs
  const feeIdMap = new Map<string, string>();
  
  try {
    // Get existing students to check for duplicates
    const existingStudentsResponse = await hybridApi.getStudents(schoolId);
    const existingStudents = existingStudentsResponse.success ? existingStudentsResponse.data : [];
    const existingStudentIds = new Set(existingStudents.map((s: any) => s.studentId || s.student_id));
    
    console.log('Students to save:', students.length);
    console.log('Fees to save:', fees.length);
    console.log('Installments to save:', installments.length);
    
    // Make sure the school is marked as active if we're importing students for it
    if (students.length > 0 || installments.length > 0) {
      const schoolResponse = await hybridApi.getSchool(schoolId);
      const school = schoolResponse.success ? schoolResponse.data : null;
      if (school) {
        const wasActive = school.active;
        
        // Update the school to be active with subscription dates
        const updatedSchool = {
          ...school,
          active: true,
          subscriptionStart: school.subscriptionStart || safeToISODateString(new Date()),
          subscriptionEnd: school.subscriptionEnd || safeToISODateString(new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
        };
        
        // Save the school with updated info
        await hybridApi.updateSchool(schoolId, updatedSchool);
        
        // If the school wasn't active before, ensure it has a subscription
        if (!wasActive) {
          // This is now handled by updateSchool, but we'll double-check
          try {
            // Note: hybridApi doesn't have ensureSchoolSubscription method
            console.log('School subscription handling moved to hybridApi');
          } catch (error) {
            console.error('Error ensuring subscription during import:', error);
          }
        }
      }
    }
    
    // Note: hybridApi doesn't have performBatchOperation, so we'll process sequentially
    // Save students
    for (const student of students) {
      if (!student.name) continue;
      
      // Skip duplicates by studentId
      if (existingStudentIds.has(student.studentId)) {
        console.log(`Skipping duplicate student: ${student.studentId} - ${student.name}`);
        
        // Find the existing student to get its real ID
        const existingStudent = existingStudents.find((s: any) => (s.studentId || s.student_id) === student.studentId);
        if (existingStudent) {
          studentIdMap.set(student.studentId, existingStudent.id);
          // UPDATE existing student's WhatsApp/address if provided in CSV and currently empty
          const updateFields: any = {};
          const hasWhatsapp = typeof student.whatsapp === 'string' && student.whatsapp.trim() !== '';
          const hasAddress = typeof student.address === 'string' && student.address.trim() !== '';
          if (hasWhatsapp && (!existingStudent.whatsapp || existingStudent.whatsapp.trim() === '')) {
            updateFields.whatsapp = student.whatsapp.trim();
          }
          if (hasAddress && (!existingStudent.address || existingStudent.address.trim() === '')) {
            updateFields.address = student.address.trim();
          }
          if (Object.keys(updateFields).length > 0) {
            try {
              await hybridApi.updateStudent(existingStudent.id, updateFields);
              console.log(`Updated student contact fields: ${existingStudent.name} (whatsapp/address)`);
            } catch (e) {
              console.error('Error updating existing student contact fields:', e);
            }
          }
        }
        
        continue;
      }
        
        try {
          // Check if student already exists
          const existingStudent = existingStudents.find((s: any) => (s.studentId || s.student_id) === student.studentId);
          
          // Create the new student data (using snake_case for Supabase)
          const newStudentData = {
            name: student.name,
            english_name: student.englishName || existingStudent?.english_name || '',
            student_id: student.studentId,
            grade: student.grade,
            english_grade: student.englishGrade || existingStudent?.english_grade || '',
            division: student.division || existingStudent?.division || '',
            parent_name: student.parentName,
            phone: student.phone,
            whatsapp: student.whatsapp ?? existingStudent?.whatsapp ?? '',
            address: student.address ?? existingStudent?.address ?? '',
            transportation: student.transportation,
            transportation_direction: student.transportationDirection,
            // CRITICAL: Preserve the exact transportation fee for this student
            transportation_fee: student.transportationFee !== undefined ? student.transportationFee : existingStudent?.transportation_fee,
            custom_transportation_fee: student.transportationFee !== undefined ? true : existingStudent?.custom_transportation_fee,
            school_id: schoolId
          };
          
          // Log the transportation fee being saved
          if (student.transportationFee !== undefined) {
            console.log(`SAVING CUSTOM FEE: Student ${student.name} - custom transportation fee: ${student.transportationFee}`);
          }
          
          // Double-check KG grade normalization before saving
          if (newStudentData.grade) {
            const gradeLower = newStudentData.grade.toLowerCase();
            
            // KG1 normalization
            if (gradeLower.includes('kg1') || 
                gradeLower.includes('الروضة kg1') ||
                (newStudentData.grade.includes('الروضة') && !gradeLower.includes('kg2'))) {
              newStudentData.grade = 'الروضة KG1';
              if (!newStudentData.english_grade) {
                newStudentData.english_grade = 'KG 1';
              }
              console.log('Final KG1 normalization - changed to:', newStudentData.grade);
            }
            // KG2 normalization
            else if (gradeLower.includes('kg2') || 
                    newStudentData.grade.includes('التمهيدي') || 
                    (newStudentData.grade.includes('الروضة') && (newStudentData.grade.includes('2') || newStudentData.grade.includes('٢')))) {
              newStudentData.grade = 'التمهيدي KG2';
              if (!newStudentData.english_grade) {
                newStudentData.english_grade = 'KG 2';
              }
              console.log('Final KG2 normalization - changed to:', newStudentData.grade);
            }
          }
          
          let savedStudent;
          if (existingStudent) {
            const updateResponse = await hybridApi.updateStudent(existingStudent.id, newStudentData);
            savedStudent = updateResponse.success ? updateResponse.data : null;
          } else {
            const createResponse = await hybridApi.createStudent(newStudentData);
            savedStudent = createResponse.success ? createResponse.data : null;
          }
          
          if (savedStudent) {
            // Store the mapping between imported ID and saved ID
            studentIdMap.set(student.studentId, savedStudent.id);
            savedStudentsCount++;
            
            // Add to existing IDs to prevent duplicates within import
            existingStudentIds.add(student.studentId);
            
            console.log(`Saved student: ${student.name} with ID ${savedStudent.id}`);
          } else {
            console.error(`Failed to save student: ${student.name}`);
          }
        } catch (error) {
          console.error('Error saving student:', error);
        }
      }
      
      console.log('Student ID map size:', studentIdMap.size);
      
      // Save fees
      for (const fee of fees) {
        // Skip fees without a valid student ID mapping
        const mappedStudentId = studentIdMap.get(fee.studentId);
        const existingStudent = existingStudents.find(s => s.studentId === fee.studentId);
        
        let realStudentId: string;
        
        if (mappedStudentId) {
          realStudentId = mappedStudentId;
        } else if (existingStudent) {
          realStudentId = existingStudent.id;
          // Add mapping for future use
          studentIdMap.set(fee.studentId, existingStudent.id);
        } else {
          console.log(`Skipping fee for non-existent student: ${fee.studentId}`);
          continue;
        }
        
        // Get student details for the fee
        const studentResponse = await hybridApi.getStudent(realStudentId);
        const student = studentResponse.success ? studentResponse.data : null;
        if (!student) {
          console.log(`Student not found with ID: ${realStudentId}`);
          continue;
        }
        
        try {
          // Prepare description based on fee type
          let description = '';
          if (fee.feeType === 'transportation') {
            const direction = student.transportationDirection 
              ? (student.transportationDirection === 'to-school' ? ' - إلى المدرسة' : ' - من المدرسة')
              : '';
            
            description = `رسوم النقل المدرسي - ${student.transportation === 'one-way' 
              ? 'اتجاه واحد' + direction 
              : 'اتجاهين'}`;
          } else if (fee.feeType === 'tuition') {
            description = `الرسوم الدراسية - ${student.name}`;
          } else {
            description = `${fee.feeType} - ${student.name}`;
          }
          
          // Calculate the balance
          const amount = fee.amount;
          const discount = fee.discount || 0;
          const balance = amount - discount;
          
          // Use paid amount and status from ImportedFee if provided, otherwise calculate from installments
        let paidAmount = fee.paid !== undefined ? fee.paid : 0;
        let feeStatus: 'unpaid' | 'paid' | 'partial' = fee.status || 'unpaid';
        let finalBalance = fee.balance !== undefined ? fee.balance : (amount - discount);
        
        // If not provided in ImportedFee, calculate from installments
        if (fee.paid === undefined || fee.status === undefined) {
          // Check if there are any paid installments for this fee
          const relatedInstallments = installments.filter(inst => 
            inst.studentId === fee.studentId && inst.feeType === fee.feeType
          );
          
          if (relatedInstallments.length > 0) {
            // Calculate total paid from installments
            paidAmount = relatedInstallments.reduce((total, inst) => {
              if (inst.isPaid) {
                return total + (inst.paidAmount !== undefined ? inst.paidAmount : inst.amount);
              }
              return total;
            }, 0);
          }
          
          // Calculate final balance and status
          finalBalance = Math.max(0, amount - discount - paidAmount);
          
          if (paidAmount >= (amount - discount)) {
            feeStatus = 'paid';
          } else if (paidAmount > 0) {
            feeStatus = 'partial';
          }
        }
        
        // Create fee object with all required fields
        const feeToSave: any = {
          studentId: realStudentId,
          studentName: student.name,
          grade: student.grade,
          division: student.division,
          feeType: fee.feeType,
          description,
          amount: Math.round(amount),
          discount: Math.round(discount),
          paid: Math.round(paidAmount),
          balance: Math.round(finalBalance),
          status: feeStatus,
          dueDate: fee.dueDate ? safeToISODateString(fee.dueDate) : safeToISODateString(new Date()),
          schoolId,
          ...(fee.feeType === 'transportation' && { transportationType: student.transportation }),
          paymentMethod: fee.paymentMethod,
          paymentNote: fee.paymentNote
        };
          
          const feeResponse = await hybridApi.createFee(feeToSave);
          if (feeResponse.success && feeResponse.data) {
            feeIdMap.set(`${fee.studentId}-${fee.feeType}`, feeResponse.data.id);
            savedFeesCount++;
            console.log(`Saved fee: ${fee.feeType} for student ${student.name} (${amount})`);
          } else {
            console.error(`Failed to save fee for student ${student.name}`);
          }
        } catch (error) {
          console.error('Error saving fee:', error);
        }
      }
      
      // Save installments
      for (const installment of installments) {
        // Skip installments without a valid student ID mapping
        const mappedStudentId = studentIdMap.get(installment.studentId);
        const existingStudent = existingStudents.find(s => s.studentId === installment.studentId);
        
        let realStudentId: string;
        
        if (mappedStudentId) {
          realStudentId = mappedStudentId;
        } else if (existingStudent) {
          realStudentId = existingStudent.id;
          // Add mapping for future use
          studentIdMap.set(installment.studentId, existingStudent.id);
        } else {
          console.log(`Skipping installment for non-existent student: ${installment.studentId}`);
          continue;
        }
        
        // Get student details for the installment
        const studentResponse = await hybridApi.getStudent(realStudentId);
        const student = studentResponse.success ? studentResponse.data : null;
        if (!student) {
          console.log(`Student not found with ID: ${realStudentId}`);
          continue;
        }
        
        try {
          // Find or create a fee for this installment
          let feeId = feeIdMap.get(`${installment.studentId}-${installment.feeType}`);
          let fee: Fee | null = null;
          
          if (!feeId) {
            // Look for existing fee
            const feesResponse = await hybridApi.getFees(schoolId, realStudentId);
            const existingFees = feesResponse.success ? feesResponse.data : [];
            const matchingFee = existingFees.find((f: any) => f.feeType === installment.feeType);
            
            if (matchingFee) {
              feeId = matchingFee.id;
              fee = matchingFee;
              // Add mapping for future use
              feeIdMap.set(`${installment.studentId}-${installment.feeType}`, feeId);
            } else {
              // Special handling for combined fee type
              if (installment.feeType === 'transportation_and_tuition') {
                // Look for tuition or transportation fees
                const tuitionFee = existingFees.find(f => f.feeType === 'tuition');
                const transportationFee = existingFees.find(f => f.feeType === 'transportation');
                
                if (tuitionFee || transportationFee) {
                  // Use one of them as the base fee ID
                  const selectedFeeId = tuitionFee?.id || transportationFee?.id;
                  if (selectedFeeId && selectedFeeId.trim() !== '') {
                    feeId = selectedFeeId;
                    fee = tuitionFee || transportationFee;
                    feeIdMap.set(`${installment.studentId}-${installment.feeType}`, feeId);
                  }
                }
              }
              
              // If still no fee ID, create a new fee
              if (!feeId) {
                // Create a new fee
                fee = {
                  id: uuidv4(),
                  studentId: realStudentId,
                  studentName: student.name,
                  grade: student.grade,
                  feeType: installment.feeType,
                  description: `${installment.feeType} - ${student.name}`,
                  amount: Math.round(installment.amount * (installment.totalInstallments || 1)),
                  discount: 0,
                  paid: 0,
                  balance: Math.round(installment.amount * (installment.totalInstallments || 1)),
                  status: 'unpaid',
                  dueDate: installment.dueDate ? safeToISODateString(installment.dueDate) : safeToISODateString(new Date()),
                  schoolId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  paymentMethod: installment.paymentMethod,
                  paymentNote: installment.paymentNote
                };
                
                const feeResponse = await hybridApi.createFee(fee);
                if (feeResponse.success && feeResponse.data) {
                  feeId = feeResponse.data.id;
                  feeIdMap.set(`${installment.studentId}-${installment.feeType}`, feeId);
                  savedFeesCount++;
                }
              }
            }
          } else {
            // Get the fee by ID
            const feeResponse = await hybridApi.getFee(feeId);
            fee = feeResponse.success ? feeResponse.data : null;
          }
          
          // Determine installment month if not provided
          let installmentMonth = installment.installmentMonth;
          if (!installmentMonth) {
            try {
              const dueDate = new Date(installment.dueDate);
              const monthNames = [
                'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
              ];
              installmentMonth = monthNames[dueDate.getMonth()];
            } catch (e) {
              // If date parsing fails, leave installmentMonth as undefined
              console.error('Error parsing due date for installment month:', e);
            }
          }
          
          // Validate required UUID fields before creating installment
          if (!realStudentId || realStudentId.trim() === '') {
            console.error('Invalid realStudentId for installment:', realStudentId, typeof realStudentId);
            throw new Error(`معرف الطالب غير صحيح للطالب ${student.name}`);
          }
          if (!feeId || feeId.trim() === '') {
            console.error('Invalid feeId for installment:', feeId, typeof feeId);
            throw new Error(`معرف الرسوم غير صحيح للطالب ${student.name}`);
          }
          if (!schoolId || schoolId.trim() === '') {
            console.error('Invalid schoolId for installment:', schoolId, typeof schoolId);
            throw new Error(`معرف المدرسة غير صحيح`);
          }
          
          // Prepare school settings for receipt numbering
          let schoolSettings: any = {};
          try {
            const settingsResp = await hybridApi.getSettings(schoolId);
            schoolSettings = (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) ? settingsResp.data[0] : {};
          } catch (e) {
            console.warn('Failed to load school settings during import, using defaults for receipt numbering');
          }

          // Generate receipt number for paid installments at import time to avoid duplicates later
          let importReceiptNumber: string | undefined;
          if (installment.isPaid) {
            try {
              // Use atomic reservation system for better duplicate prevention
              const reservedNumbers = await reserveReceiptNumbers(schoolId, 'installment', 1);
              importReceiptNumber = reservedNumbers[0];
            } catch (error) {
              console.error('Error reserving receipt number for CSV import, falling back to direct generation:', error);
              // Fallback to direct generation if reservation fails
              importReceiptNumber = generateReceiptNumber(schoolSettings, realStudentId, undefined, 'installment');
            }
          } else {
            importReceiptNumber = undefined;
          }

          // Create installment object
          const installmentToSave: any = {
            studentId: realStudentId,
            studentName: student.name,
            grade: student.grade,
            amount: Math.round(installment.amount),
            dueDate: installment.dueDate ? safeToISODateString(installment.dueDate) : safeToISODateString(new Date()),
            paidDate: installment.isPaid ? (installment.paidDate ? safeToISODateString(installment.paidDate) : safeToISODateString(new Date())) : null,
            paidAmount: installment.isPaid ? (installment.paidAmount !== undefined ? Math.round(installment.paidAmount) : Math.round(installment.amount)) : 0,
            status: installment.isPaid ? 'paid' : 'upcoming',
            feeId: feeId,
            feeType: installment.feeType,
            note: installment.note || `القسط ${installment.installmentNumber + 1} من ${installment.totalInstallments}`,
            schoolId,
            installmentCount: installment.totalInstallments || 1,
            installmentMonth: installmentMonth,
            paymentMethod: installment.paymentMethod,
            paymentNote: installment.paymentNote,
            checkNumber: installment.checkNumber,
            ...(importReceiptNumber ? { receiptNumber: importReceiptNumber } : {})
          };
          
          console.log('Creating installment with validated IDs (import):', {
            studentId: realStudentId,
            feeId: feeId,
            schoolId: schoolId,
            studentName: student.name,
            amount: installment.amount
          });
          
          const installmentResponse = await hybridApi.createInstallment(installmentToSave);
          if (installmentResponse.success) {
            savedInstallmentsCount++;
            // Increment installment receipt counter if we reserved a number
            if (importReceiptNumber) {
              try {
                const settingsResp2 = await hybridApi.getSettings(schoolId);
                if (settingsResp2?.success && settingsResp2?.data && settingsResp2.data.length > 0) {
                  const currentSettings = settingsResp2.data[0];
                  const updatedSettings = {
                    ...currentSettings,
                    installmentReceiptNumberCounter: (currentSettings.installmentReceiptNumberCounter || 0) + 1
                  };
                  await hybridApi.updateSettings(schoolId, updatedSettings);
                }
              } catch (err) {
                console.error('Error incrementing installment receipt counter during import:', err);
              }
            }
            
            // Update the fee's paid amount if this is a paid installment
            if (installment.isPaid && fee) {
              const paidAmount = installment.paidAmount !== undefined ? Math.round(installment.paidAmount) : Math.round(installment.amount);
              
              // CRITICAL FIX: Only update paid amount, let database triggers calculate balance and status
              fee.paid = (fee.paid || 0) + paidAmount;
              
              // Save the updated fee - triggers will calculate balance and status
              await hybridApi.updateFee(fee.id, fee);
              console.log(`Updated fee ${fee.id} with payment of ${paidAmount}. New status: ${fee.status}`);
            }
          } else {
            console.error(`Failed to save installment for student ${student.name}`);
          }
          
          console.log(`Saved installment: ${installment.feeType} for student ${student.name} (${installment.amount})`);
        } catch (error) {
          console.error('Error saving installment:', error);
        }
      }
    
    // Force refresh of localStorage data
    const installmentsData = localStorage.getItem('installments');
    if (installmentsData) {
      localStorage.setItem('installments', installmentsData);
    }
    
    const feesData = localStorage.getItem('fees');
    if (feesData) {
      localStorage.setItem('fees', feesData);
    }
    
    const studentsData = localStorage.getItem('students');
    if (studentsData) {
      localStorage.setItem('students', studentsData);
    }
    
    // Force refresh of subscriptions data
    try {
      // Get all schools
      const schoolsResponse = await hybridApi.getSchools();
      const schools = schoolsResponse.success ? schoolsResponse.data : [];
      
      // Get existing subscriptions
      const subscriptionsData = localStorage.getItem('subscriptions');
      let subscriptions: Array<{
        id: string;
        schoolId: string;
        schoolName: string;
        contactEmail: string;
        contactPhone: string;
        subscriptionStart: string;
        subscriptionEnd: string;
        amount: number;
        paid: boolean;
        paymentDate: string;
        status: string;
        createdAt: string;
      }> = [];
      
      if (subscriptionsData) {
        subscriptions = JSON.parse(subscriptionsData);
      }
      
      // Check if we need to create a subscription for the school
      const school = schools.find(s => s.id === schoolId);
      if (school) {
        // Ensure school is marked as active
        if (!school.active) {
          const updatedSchoolData = {
            ...school,
            active: true,
            subscription_start: school.subscription_start || safeToISODateString(new Date()),
            subscription_end: school.subscription_end || safeToISODateString(new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
          };
          await hybridApi.updateSchool(school.id, updatedSchoolData);
        }
        
        // Check if subscription exists for this school
        const existingSubscription = subscriptions.find(s => s.schoolId === schoolId);
        
        if (!existingSubscription) {
          // Create a new subscription
          const newSubscription = {
            id: `sub_${schoolId}`,
            schoolId: schoolId,
            schoolName: school.name,
            contactEmail: school.email,
            contactPhone: school.phone,
            subscriptionStart: school.subscriptionStart || safeToISODateString(new Date()),
            subscriptionEnd: school.subscriptionEnd || safeToISODateString(new Date(new Date().setFullYear(new Date().getFullYear() + 1))),
            amount: 1000, // Default amount
            paid: true,
            paymentDate: new Date().toISOString().split('T')[0],
            status: 'active',
            createdAt: new Date().toISOString()
          };
          
          subscriptions.push(newSubscription);
          localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
          console.log('Created new subscription for school:', school.name);
        }
      }
    } catch (error) {
      console.error('Error refreshing subscriptions:', error);
    }
    
    // Note: hybridApi doesn't have notifyListeners method
    // Components will be updated through React state management
    
    console.log(`Import finished: ${savedStudentsCount} students, ${savedFeesCount} fees, ${savedInstallmentsCount} installments`);
    
  } catch (error) {
    console.error('Error in saveImportedData:', error);
    throw error;
  }
  
  return { studentsCount: savedStudentsCount, feesCount: savedFeesCount, installmentsCount: savedInstallmentsCount };
};

// New function that uses hybridApi for proper Supabase synchronization
export const saveImportedDataWithSync = async (
  students: ImportedStudent[], 
  fees: ImportedFee[],
  schoolId: string,
  installments: ImportedInstallment[] = []
): Promise<{ studentsCount: number, feesCount: number, installmentsCount: number }> => {
  // Fast path: use Supabase batch upserts when configured and online
  try {
    if (shouldUseSupabase()) {
      return await supabaseBatchImport(students, fees, schoolId, installments);
    }
  } catch (e) {
    console.warn('Supabase batch import failed or unavailable, falling back to legacy per-record import:', e);
  }
  let savedStudentsCount = 0;
  let savedFeesCount = 0;
  let savedInstallmentsCount = 0;
  
  // Map to store imported student IDs to saved student IDs
  const studentIdMap = new Map<string, string>();
  // Map to store imported fee IDs to saved fee IDs
  const feeIdMap = new Map<string, string>();
  
  try {
    console.log('Starting import with Supabase sync...');
    console.log('Students to save:', students.length);
    console.log('Fees to save:', fees.length);
    console.log('Installments to save:', installments.length);
    console.log('School ID for import:', schoolId);
    console.log('School ID type:', typeof schoolId);
    console.log('School ID length:', schoolId?.length);
    console.log('School ID trimmed:', schoolId?.trim());
    
    // Additional validation for schoolId
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
      throw new Error(`معرف المدرسة غير صحيح: "${schoolId}". يجب أن يكون نص غير فارغ.`);
    }
    
    console.log('Sample student data:', students.slice(0, 2));
    console.log('Sample fee data:', fees.slice(0, 2));
    console.log('Sample installment data:', installments.slice(0, 2));
    
    // Get existing students to check for duplicates
    const existingStudentsResponse = await hybridApi.getStudents(schoolId);
    const existingStudents = existingStudentsResponse.success ? existingStudentsResponse.data : [];
    const existingStudentIds = new Set(existingStudents.map((s: any) => s.studentId || s.student_id));
    
    // Make sure the school is marked as active if we're importing students for it
    if (students.length > 0 || installments.length > 0) {
      const schoolResponse = await hybridApi.getSchool(schoolId);
      if (schoolResponse.success && schoolResponse.data) {
        const school = schoolResponse.data;
        const wasActive = school.active;
        
        // Update the school to be active with subscription dates
        const updatedSchool = {
          ...school,
          active: true,
          subscription_start: school.subscription_start || safeToISODateString(new Date()),
          subscription_end: school.subscription_end || safeToISODateString(new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
        };
        
        // Save the school with updated info
        await hybridApi.updateSchool(schoolId, updatedSchool);
        console.log('Updated school activation status');
      }
    }
    
    // Save students
    for (const student of students) {
      if (!student.name) continue;
      
      // Skip duplicates by studentId
      if (existingStudentIds.has(student.studentId)) {
        console.log(`Skipping duplicate student: ${student.studentId} - ${student.name}`);
        
        // Find the existing student to get its real ID
        const existingStudent = existingStudents.find((s: any) => (s.studentId || s.student_id) === student.studentId);
        if (existingStudent) {
          studentIdMap.set(student.studentId, existingStudent.id);
        }
        
        continue;
      }
      
      try {
        // Check if student already exists
        const existingStudent = existingStudents.find((s: any) => (s.studentId || s.student_id) === student.studentId);
        
        // Normalize KG grades
        let normalizedGrade = student.grade;
        let normalizedEnglishGrade = student.englishGrade;
        
        if (normalizedGrade) {
          const gradeLower = normalizedGrade.toLowerCase();
          
          // KG1 normalization
          if (gradeLower.includes('kg1') || 
              gradeLower.includes('الروضة kg1') ||
              (normalizedGrade.includes('الروضة') && !gradeLower.includes('kg2'))) {
            normalizedGrade = 'الروضة KG1';
            if (!normalizedEnglishGrade) {
              normalizedEnglishGrade = 'KG 1';
            }
          }
          // KG2 normalization
          else if (gradeLower.includes('kg2') || 
                  normalizedGrade.includes('التمهيدي') || 
                  (normalizedGrade.includes('الروضة') && (normalizedGrade.includes('2') || normalizedGrade.includes('٢')))) {
            normalizedGrade = 'التمهيدي KG2';
            if (!normalizedEnglishGrade) {
              normalizedEnglishGrade = 'KG 2';
            }
          }
        }
        
        // Create the new student data (using snake_case for Supabase)
        const newStudentData = {
          name: student.name,
          englishName: student.englishName || existingStudent?.english_name || '',
          studentId: student.studentId,
          grade: normalizedGrade,
          englishGrade: normalizedEnglishGrade || existingStudent?.english_grade || '',
          division: student.division || existingStudent?.division || '',
          parentName: student.parentName,
          phone: student.phone,
          transportation: student.transportation,
          transportationDirection: student.transportationDirection,
          transportationFee: student.transportationFee !== undefined ? student.transportationFee : existingStudent?.transportation_fee,
          customTransportationFee: student.transportationFee !== undefined ? true : existingStudent?.custom_transportation_fee,
          schoolId: schoolId
        };
        
        console.log('About to create/update student with data:', {
          studentName: newStudentData.name,
          studentId: newStudentData.studentId,
          schoolId: newStudentData.schoolId,
          schoolIdType: typeof newStudentData.schoolId,
          isExistingStudent: !!existingStudent
        });
        
        let savedStudent;
        if (existingStudent) {
          // Update existing student
          const updateResponse = await hybridApi.updateStudent(existingStudent.id, newStudentData);
          if (updateResponse.success) {
            savedStudent = updateResponse.data;
          } else {
            throw new Error(updateResponse.error || 'Failed to update student');
          }
        } else {
          // Create new student
          const createResponse = await hybridApi.createStudent(newStudentData);
          if (createResponse.success) {
            savedStudent = createResponse.data;
          } else {
            throw new Error(createResponse.error || 'Failed to create student');
          }
        }
        
        // Store the mapping between imported ID and saved ID
        studentIdMap.set(student.studentId, savedStudent.id);
        savedStudentsCount++;
        
        // Add to existing IDs to prevent duplicates within import
        existingStudentIds.add(student.studentId);
        
        console.log(`Saved student: ${student.name} with ID ${savedStudent.id}`);
      } catch (error: any) {
        console.error('Error saving student:', error);
        
        // Check for specific RLS policy violation
        if (error.message && error.message.includes('row-level security policy')) {
          throw new Error(`خطأ في الصلاحيات: المستخدم لا يملك صلاحية إضافة طلاب في هذه المدرسة. يرجى التأكد من ربط المستخدم بالمدرسة الصحيحة.`);
        }
        
        // Re-throw the error to be handled by the calling function
        throw error;
      }
    }
    
    console.log('Student ID map size:', studentIdMap.size);
    
    // Save fees
    for (const fee of fees) {
      // Skip fees without a valid student ID mapping
      const mappedStudentId = studentIdMap.get(fee.studentId);
      const existingStudent = existingStudents.find((s: any) => (s.studentId || s.student_id) === fee.studentId);
      
      let realStudentId: string;
      
      if (mappedStudentId) {
        realStudentId = mappedStudentId;
      } else if (existingStudent) {
        realStudentId = existingStudent.id;
        // Add mapping for future use
        studentIdMap.set(fee.studentId, existingStudent.id);
      } else {
        console.log(`Skipping fee for non-existent student: ${fee.studentId}`);
        continue;
      }
      
      // Get student details for the fee
      const studentResponse = await hybridApi.getStudent(realStudentId);
      if (!studentResponse.success || !studentResponse.data) {
        console.log(`Student not found with ID: ${realStudentId}`);
        continue;
      }
      
      const student = studentResponse.data;
      
      try {
        // Prepare description based on fee type
        let description = '';
        if (fee.feeType === 'transportation') {
          const direction = student.transportation_direction 
            ? (student.transportation_direction === 'to-school' ? ' - إلى المدرسة' : ' - من المدرسة')
            : '';
          
          description = `رسوم النقل المدرسي - ${student.transportation === 'one-way' 
            ? 'اتجاه واحد' + direction 
            : 'اتجاهين'}`;
        } else if (fee.feeType === 'tuition') {
          description = `الرسوم الدراسية - ${student.name}`;
        } else {
          description = `${fee.feeType} - ${student.name}`;
        }
        
        // Calculate the balance
        const amount = fee.amount;
        const discount = fee.discount || 0;
        const balance = amount - discount;
        
        // Use paid amount and status from ImportedFee if provided, otherwise calculate from installments
        let paidAmount = fee.paid !== undefined ? fee.paid : 0;
        let feeStatus: 'unpaid' | 'paid' | 'partial' = fee.status || 'unpaid';
        let finalBalance = fee.balance !== undefined ? fee.balance : (amount - discount);
        
        // If not provided in ImportedFee, calculate from installments
        if (fee.paid === undefined || fee.status === undefined) {
          // Check if there are any paid installments for this fee
          const relatedInstallments = installments.filter(inst => 
            inst.studentId === fee.studentId && inst.feeType === fee.feeType
          );
          
          if (relatedInstallments.length > 0) {
            // Calculate total paid from installments
            paidAmount = relatedInstallments.reduce((total, inst) => {
              if (inst.isPaid) {
                return total + (inst.paidAmount !== undefined ? inst.paidAmount : inst.amount);
              }
              return total;
            }, 0);
          }
          
          // Calculate final balance and status
          finalBalance = Math.max(0, amount - discount - paidAmount);
          
          if (paidAmount >= (amount - discount)) {
            feeStatus = 'paid';
          } else if (paidAmount > 0) {
            feeStatus = 'partial';
          }
        }
        
        // Create fee object with all required fields (using camelCase for hybridApi)
        const feeToSave = {
          studentId: realStudentId,
          studentName: student.name,
          grade: student.grade,
          division: student.division,
          feeType: fee.feeType,
          description,
          amount: Math.round(amount),
          discount: Math.round(discount),
          paid: Math.round(paidAmount),
          balance: Math.round(finalBalance),
          status: feeStatus,
          dueDate: fee.dueDate ? safeToISODateString(fee.dueDate) : safeToISODateString(new Date()),
          schoolId: schoolId,
          ...(fee.feeType === 'transportation' && { transportationType: student.transportation }),
          paymentMethod: fee.paymentMethod,
          paymentNote: fee.paymentNote
        };
        
        const createFeeResponse = await hybridApi.createFee(feeToSave);
        if (createFeeResponse.success) {
          const savedFee = createFeeResponse.data;
          feeIdMap.set(`${fee.studentId}-${fee.feeType}`, savedFee.id);
          savedFeesCount++;
          console.log(`Saved fee: ${fee.feeType} for student ${student.name} (${amount})`);
        } else {
          throw new Error(createFeeResponse.error || 'Failed to create fee');
        }
      } catch (error) {
        console.error('Error saving fee:', error);
      }
    }
    
    // Save installments
    for (const installment of installments) {
      // Skip installments without a valid student ID mapping
      const mappedStudentId = studentIdMap.get(installment.studentId);
      const existingStudent = existingStudents.find((s: any) => (s.studentId || s.student_id) === installment.studentId);
      
      let realStudentId: string;
      
      if (mappedStudentId) {
        realStudentId = mappedStudentId;
      } else if (existingStudent) {
        realStudentId = existingStudent.id;
        // Add mapping for future use
        studentIdMap.set(installment.studentId, existingStudent.id);
      } else {
        console.log(`Skipping installment for non-existent student: ${installment.studentId}`);
        continue;
      }
      
      // Get student details for the installment
      const studentResponse = await hybridApi.getStudent(realStudentId);
      if (!studentResponse.success || !studentResponse.data) {
        console.log(`Student not found with ID: ${realStudentId}`);
        continue;
      }
      
      const student = studentResponse.data;
      
      try {
        // Find or create a fee for this installment
        let feeId = feeIdMap.get(`${installment.studentId}-${installment.feeType}`);
        let fee: Fee | null = null;
        
        if (!feeId) {
          // Look for existing fee
          const existingFeesResponse = await hybridApi.getFees(schoolId, realStudentId);
          const existingFees = existingFeesResponse.success ? existingFeesResponse.data : [];
          const matchingFee = existingFees.find((f: any) => f.fee_type === installment.feeType);
          
          if (matchingFee) {
            feeId = matchingFee.id;
            fee = matchingFee;
            // Add mapping for future use
            feeIdMap.set(`${installment.studentId}-${installment.feeType}`, feeId);
          } else {
            // Create a new fee
            const newFeeData = {
              studentId: realStudentId,
              studentName: student.name,
              grade: student.grade,
              feeType: installment.feeType,
              description: `${installment.feeType} - ${student.name}`,
              amount: Math.round(installment.amount * (installment.totalInstallments || 1)),
              discount: 0,
              paid: 0,
              balance: Math.round(installment.amount * (installment.totalInstallments || 1)),
              status: 'unpaid',
              dueDate: installment.dueDate ? safeToISODateString(installment.dueDate) : safeToISODateString(new Date()),
              schoolId: schoolId,
              paymentMethod: installment.paymentMethod,
              paymentNote: installment.paymentNote
            };
            
            const createFeeResponse = await hybridApi.createFee(newFeeData);
            if (createFeeResponse.success) {
              fee = createFeeResponse.data;
              feeId = fee.id;
              feeIdMap.set(`${installment.studentId}-${installment.feeType}`, feeId);
              savedFeesCount++;
            } else {
              throw new Error(createFeeResponse.error || 'Failed to create fee for installment');
            }
          }
        } else {
          // Get the fee by ID
          const feeResponse = await hybridApi.getFee(feeId);
          if (feeResponse.success) {
            fee = feeResponse.data;
          }
        }
        
        // Determine installment month if not provided
        let installmentMonth = installment.installmentMonth;
        if (!installmentMonth) {
          try {
            const dueDate = new Date(installment.dueDate);
            const monthNames = [
              'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
              'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
            ];
            installmentMonth = monthNames[dueDate.getMonth()];
          } catch (e) {
            console.error('Error parsing due date for installment month:', e);
          }
        }
        
        // Validate required UUID fields before creating installment
        if (!realStudentId || realStudentId.trim() === '') {
          console.error('Invalid realStudentId for installment:', realStudentId, typeof realStudentId);
          throw new Error(`معرف الطالب غير صحيح للطالب ${student.name}`);
        }
        if (!feeId || feeId.trim() === '') {
          console.error('Invalid feeId for installment:', feeId, typeof feeId);
          throw new Error(`معرف الرسوم غير صحيح للطالب ${student.name}`);
        }
        if (!schoolId || schoolId.trim() === '') {
          console.error('Invalid schoolId for installment:', schoolId, typeof schoolId);
          throw new Error(`معرف المدرسة غير صحيح`);
        }
        
        // Load school settings for receipt numbering
        let schoolSettings: any = {};
        try {
          const settingsResp = await hybridApi.getSettings(schoolId);
          schoolSettings = (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) ? settingsResp.data[0] : {};
        } catch (e) {
          console.warn('Failed to load school settings during import (sync), using defaults for receipt numbering');
        }

        // Generate receipt number for paid installments at import time
        const importReceiptNumber = (installment.isPaid)
          ? generateReceiptNumber(schoolSettings, realStudentId, undefined, 'installment')
          : undefined;

        // Create installment object (using camelCase for hybridApi)
        const installmentToSave = {
          studentId: realStudentId,
          studentName: student.name,
          grade: student.grade,
          installmentNumber: installment.installmentNumber + 1,
          amount: Math.round(installment.amount),
          paidAmount: installment.isPaid ? (installment.paidAmount !== undefined ? Math.round(installment.paidAmount) : Math.round(installment.amount)) : 0,
          balance: installment.isPaid ? 0 : Math.round(installment.amount),
          dueDate: installment.dueDate ? safeToISODateString(installment.dueDate) : safeToISODateString(new Date()),
          paidDate: installment.isPaid ? (installment.paidDate ? safeToISODateString(installment.paidDate) : safeToISODateString(new Date())) : null,
          status: installment.isPaid ? 'paid' : 'upcoming',
          feeId: feeId,
          schoolId: schoolId,
          paymentMethod: installment.paymentMethod,
          paymentNote: installment.paymentNote || `القسط ${installment.installmentNumber + 1} من ${installment.totalInstallments}`,
          ...(importReceiptNumber ? { receiptNumber: importReceiptNumber } : {})
        };
        
        console.log('Creating installment with validated IDs:', {
          studentId: realStudentId,
          feeId: feeId,
          schoolId: schoolId,
          studentName: student.name,
          amount: installment.amount
        });
        
        const createInstallmentResponse = await hybridApi.createInstallment(installmentToSave);
        if (createInstallmentResponse.success) {
          savedInstallmentsCount++;
          // Increment installment receipt counter if we reserved a number
          if (importReceiptNumber) {
            try {
              const settingsResp2 = await hybridApi.getSettings(schoolId);
              if (settingsResp2?.success && settingsResp2?.data && settingsResp2.data.length > 0) {
                const currentSettings = settingsResp2.data[0];
                const updatedSettings = {
                  ...currentSettings,
                  installmentReceiptNumberCounter: (currentSettings.installmentReceiptNumberCounter || 0) + 1
                };
                await hybridApi.updateSettings(schoolId, updatedSettings);
              }
            } catch (err) {
              console.error('Error incrementing installment receipt counter during import (sync):', err);
            }
          }
          
          // Note: Fee payment amounts will be recalculated from installments after all installments are created
          // This prevents double-counting of payments during import
          
          console.log(`Saved installment: ${installment.feeType} for student ${student.name} (${installment.amount})`);
        } else {
          throw new Error(createInstallmentResponse.error || 'Failed to create installment');
        }
      } catch (error) {
        console.error('Error saving installment:', error);
      }
    }
    
    // Recalculate fee payment amounts from installments to ensure accuracy
    console.log('Recalculating fee payment amounts from installments...');
    const allFeesResponse = await hybridApi.getFees(schoolId);
    const allInstResponse = await hybridApi.getInstallments(schoolId);
    if (allFeesResponse.success) {
      const savedFeeIds = Array.from(feeIdMap.values());
      const feesToUpdate = allFeesResponse.data.filter(fee => 
        savedFeeIds.includes(fee.id)
      );
      const allInstallments = (allInstResponse?.success && allInstResponse?.data) ? allInstResponse.data : [];
      
      for (const fee of feesToUpdate) {
        try {
          const feeInstallments = allInstallments.filter((inst: any) => inst.feeId === fee.id);
          const totalPaid = feeInstallments.reduce((sum, inst) => {
            return sum + (inst.paidDate ? (inst.paidAmount || inst.amount) : 0);
          }, 0);
            
            // CRITICAL FIX: Only update paid amount, let database triggers calculate balance and status
            await hybridApi.updateFee(fee.id, {
              paid: totalPaid
            });

            // Compute expected balance/status for logging (DB triggers will persist actual values)
            const netAmount = (fee.amount || 0) - (fee.discount || 0);
            const newBalance = Math.max(0, netAmount - totalPaid);
            const newStatus = totalPaid === 0
              ? 'unpaid'
              : (totalPaid >= netAmount ? 'paid' : 'partial');
            
            console.log(`Recalculated fee ${fee.id}: paid=${totalPaid}, balance=${newBalance}, status=${newStatus}`);
        } catch (error) {
          console.error(`Error recalculating fee ${fee.id}:`, error);
        }
      }
    }
    
    console.log(`Import with sync finished: ${savedStudentsCount} students, ${savedFeesCount} fees, ${savedInstallmentsCount} installments`);
    
  } catch (error) {
    console.error('Error in saveImportedDataWithSync:', error);
    throw error;
  }
  
  return { studentsCount: savedStudentsCount, feesCount: savedFeesCount, installmentsCount: savedInstallmentsCount };
};

// Generate a template for student import - fully in Arabic
export const generateStudentTemplateCSV = (): string => {
  // Create BOM for UTF-8
  const BOM = "\uFEFF";
  
  // Define headers
  const headers = [
    'اسم الطالب',
    'Student English Name',  // Add English name column
    'رقم الطالب',
    'الصف',
    'Grade (English)',  // Add English grade column
    'الشعبة',
    'اسم ولي الأمر',
    'رقم الهاتف',
    'واتساب',  // WhatsApp number
    'العنوان',  // Address
    'النقل',
    'رسوم النقل', // Added transportation fees column
    'الرسوم الدراسية',
    'خصم الرسوم الدراسية',
    'رسوم مدمجة',  // RENAMED: Simple yes/no field for combined fees
    'المبلغ المدفوع',  // NEW: Paid amount column
    'عدد الأقساط',  // Number of installments - IMPORTANT
    'تاريخ بداية الأقساط',  // Start date for installments - IMPORTANT
    'طريقة الدفع',  // Payment method
    'ملاحظات الدفع',  // Payment notes
    'رقم الشيك'  // Check number
  ];
  
  // Get Arabic transportation type
  const noneTransportArabic = TRANSPORTATION_TYPES.find(t => t.id === 'none')?.name || 'لا يوجد';
  const oneWayTransportArabic = TRANSPORTATION_TYPES.find(t => t.id === 'one-way')?.name || 'اتجاه واحد';
  const twoWayTransportArabic = TRANSPORTATION_TYPES.find(t => t.id === 'two-way')?.name || 'ذهاب وإياب';
  
  // Get Arabic payment method
  const cashPaymentArabic = PAYMENT_METHODS.find(p => p.id === 'cash')?.name || 'نقداً';
  const visaPaymentArabic = PAYMENT_METHODS.find(p => p.id === 'visa')?.name || 'بطاقة ائتمان';
  const checkPaymentArabic = PAYMENT_METHODS.find(p => p.id === 'check')?.name || 'شيك';
  
  // Create empty template data
  const exampleRows = [
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  ];
  
  // Join headers and rows
  const csvContent = [
    headers.join(','),
    ...exampleRows.map(row => row.join(','))
  ].join('\n');
  
  return BOM + csvContent;
};

// Generate a template for fee import - fully in Arabic
export const generateFeeTemplateCSV = (): string => {
  // Add BOM for UTF-8
  const BOM = "\uFEFF";
  
  // Get Arabic payment method
  const cashPaymentArabic = PAYMENT_METHODS.find(p => p.id === 'cash')?.name || 'نقداً';
  
  // Define headers
  const headers = [
    'رقم الطالب',
    'نوع الرسوم',
    'المبلغ',
    'الخصم',
    'تاريخ الاستحقاق',
    'طريقة الدفع',
    'ملاحظات الدفع'
  ];
  
  // Define empty template row
  const sampleRow = [
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ];
  
  // Create the CSV content
  const rows = [
    headers.join(','),
    sampleRow.join(',')
  ];
  
  return BOM + rows.join('\n');
};

// Generate a template for installment import - fully in Arabic
export const generateInstallmentTemplateCSV = (): string => {
  // Create BOM for UTF-8
  const BOM = "\uFEFF";
  
  // Define headers
  const headers = [
    'رقم الطالب',
    'اسم الطالب',
    'الصف',
    'نوع الرسوم',
    'المبلغ',
    'تاريخ الاستحقاق',
    'رقم القسط',
    'إجمالي الأقساط',
    'ملاحظات',
    'مدفوع',
    'تاريخ الدفع',
    'المبلغ المدفوع',
    'طريقة الدفع',
    'ملاحظات الدفع',
    'رقم الشيك'  // Check number
  ];
  
  // Get Arabic payment method
  const cashPaymentArabic = PAYMENT_METHODS.find(p => p.id === 'cash')?.name || 'نقداً';
  const visaPaymentArabic = PAYMENT_METHODS.find(p => p.id === 'visa')?.name || 'بطاقة ائتمان';
  const checkPaymentArabic = PAYMENT_METHODS.find(p => p.id === 'check')?.name || 'شيك';
  
  // Create empty template data
  const exampleRows = [
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  ];
  
  // Join headers and rows
  const csvContent = [
    headers.join(','),
    ...exampleRows.map(row => row.join(','))
  ].join('\n');
  
  return BOM + csvContent;
};

// Export fees data to Excel-compatible CSV with color coding
export const exportFeesToCSV = async (schoolId: string): Promise<string> => {
  // Get all fees for the school
  const feesResponse = await hybridApi.getFees(schoolId);
  if (!feesResponse.success) {
    console.error('Failed to fetch fees for export:', feesResponse.error);
    return '';
  }
  const fees = feesResponse.data;
  
  // Headers for the export
  const headers = [
    'رقم الطالب',
    'اسم الطالب',
    'الصف',
    'نوع الرسوم',
    'المبلغ',
    'الخصم',
    'نسبة الخصم',
    'المدفوع',
    'المتبقي',
    'نسبة الدفع',
    'الحالة',
    'تاريخ الاستحقاق',
    'تاريخ الدفع',
    'طريقة الدفع',
    'ملاحظات الدفع'
  ];
  
  // Create a mapping of fee types for quick lookup
  const feeTypeMap = FEE_TYPES.reduce((map, type) => {
    map[type.id] = type.name;
    return map;
  }, {} as Record<string, string>);
  
  // Create a mapping of payment methods for quick lookup
  const paymentMethodMap = PAYMENT_METHODS.reduce((map, method) => {
    map[method.id] = method.name;
    return map;
  }, {} as Record<string, string>);
  
  // Map fees to rows with color coding
  const rows = await Promise.all(fees.map(async (fee, index) => {
    // Determine status text and color
    let statusText = '';
    
    switch(fee.status) {
      case 'paid':
        statusText = 'مدفوع';
        break;
      case 'partial':
        statusText = 'مدفوع جزئياً';
        break;
      case 'unpaid':
        // Check if overdue
        const dueDate = new Date(fee.dueDate);
        const today = new Date();
        if (dueDate < today) {
          statusText = 'متأخر';
        } else {
          statusText = 'غير مدفوع';
        }
        break;
    }
    
    // Calculate discount percentage and payment percentage
    const discountPercentage = fee.amount > 0 ? (fee.discount / fee.amount) * 100 : 0;
    const paymentPercentage = (fee.amount - fee.discount) > 0 ? (fee.paid / (fee.amount - fee.discount)) * 100 : 0;
    const remainingAmount = fee.amount - fee.discount - fee.paid;
    
    // Get the student to retrieve the formatted studentId
    const studentResponse = await hybridApi.getStudent(fee.studentId);
    const student = studentResponse.success ? studentResponse.data : null;
    const formattedStudentId = student ? student.studentId || student.student_id : fee.studentId;
    
    // Translate fee type to Arabic using the lookup map
    const arabicFeeType = feeTypeMap[fee.feeType] || fee.feeType;
    
    // Translate payment method to Arabic using the lookup map
    const arabicPaymentMethod = fee.paymentMethod ? (paymentMethodMap[fee.paymentMethod] || fee.paymentMethod) : '';
    
    return [
      formattedStudentId,
      fee.studentName,
      fee.grade,
      arabicFeeType,
      fee.amount,
      fee.discount,
      discountPercentage.toFixed(2) + '%', // Pre-calculated percentage
      fee.paid,
      remainingAmount.toFixed(2), // Pre-calculated remaining amount
      paymentPercentage.toFixed(2) + '%', // Pre-calculated payment percentage
      statusText,
      safeToISODateString(fee.dueDate),
      fee.paymentDate ? safeToISODateString(fee.paymentDate) : '',
      arabicPaymentMethod,
      fee.paymentNote || ''
    ].join(',');
  }));
  
  // Add totals row
  const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const totalDiscount = fees.reduce((sum, fee) => sum + fee.discount, 0);
  const totalPaid = fees.reduce((sum, fee) => sum + fee.paid, 0);
  const totalRemaining = totalAmount - totalDiscount - totalPaid;
  const totalPaymentPercentage = (totalAmount - totalDiscount) > 0 ? 
    (totalPaid / (totalAmount - totalDiscount)) * 100 : 0;
  
  const totalRow = [
    '',
    'المجموع',
    '',
    '',
    totalAmount.toFixed(2),
    totalDiscount.toFixed(2),
    ((totalDiscount / totalAmount) * 100).toFixed(2) + '%',
    totalPaid.toFixed(2),
    totalRemaining.toFixed(2),
    totalPaymentPercentage.toFixed(2) + '%',
    '',
    '',
    '',
    ''
  ].join(',');
  
  // Add BOM for UTF-8
  const BOM = "\uFEFF";
  return BOM + [headers.join(','), ...rows, totalRow].join('\n');
};

// Export installments data to Excel-compatible CSV with color coding
export const exportInstallmentsToCSV = async (schoolId: string): Promise<string> => {
  // Get all installments for the school
  const installmentsResponse = await hybridApi.getInstallments(schoolId);
  if (!installmentsResponse.success) {
    console.error('Failed to fetch installments for export:', installmentsResponse.error);
    return '';
  }
  const rawInstallments = installmentsResponse.data;
  
  // Get all students for reference
  const studentsResponse = await hybridApi.getStudents(schoolId);
  if (!studentsResponse.success) {
    console.error('Failed to fetch students for export:', studentsResponse.error);
    return '';
  }
  const students = studentsResponse.data;
  
  // Define local interface for installment with installmentMonth
  interface InstallmentWithMonth {
    id: string;
    studentId: string;
    studentName: string;
    grade: string;
    amount: number;
    paidAmount?: number;
    dueDate: string;
    paidDate: string | null;
    status: 'paid' | 'upcoming' | 'overdue' | 'partial';
    feeId: string;
    feeType: string;
    installmentCount: number;
    installmentMonth?: string;
    note?: string;
    paymentMethod?: string;
    checkNumber?: string;
  }
  
  // Create a mapping of fee types for quick lookup
  const feeTypeMap = FEE_TYPES.reduce((map, type) => {
    map[type.id] = type.name;
    return map;
  }, {} as Record<string, string>);
  
  // Create a mapping of payment methods for quick lookup
  const paymentMethodMap = PAYMENT_METHODS.reduce((map, method) => {
    map[method.id] = method.name;
    return map;
  }, {} as Record<string, string>);
  
  // Ensure all needed data and sort
  const installments: InstallmentWithMonth[] = rawInstallments.map(installment => {
    const student = students.find(s => s.id === installment.studentId) || {
      name: 'طالب غير معروف',
      grade: 'غير محدد',
      studentId: installment.studentId // Default to the UUID if student not found
    };
    
    return {
      ...installment,
      studentName: student.name,
      grade: student.grade
    };
  }).sort((a, b) => {
    if (a.studentName !== b.studentName) {
      return a.studentName.localeCompare(b.studentName);
    }
    
    if (a.dueDate !== b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    return a.installmentCount - b.installmentCount;
  });
  
  // Headers for the export
  const headers = [
    'رقم الطالب',
    'اسم الطالب',
    'الصف',
    'رقم القسط',
    'نوع الرسوم',
    'تاريخ الاستحقاق',
    'المبلغ',
    'المبلغ المدفوع',
    'الحالة',
    'تاريخ الدفع',
    'طريقة الدفع',
    'رقم الشيك'  // Add checkNumber column
  ];
  
  // Map installments to CSV rows with status
  const rows = installments.map(installment => {
    // Determine status text
    let statusText = '';
    
    // Check status
    if (installment.paidDate) {
      statusText = 'مدفوع';
    } else {
      const dueDate = new Date(installment.dueDate);
      const today = new Date();
      if (dueDate < today) {
        statusText = 'متأخر';
      } else {
        statusText = 'الدفعة القادمة';
      }
    }
    
    // Add paid amount if available
    const paidAmount = installment.paidAmount !== undefined ? installment.paidAmount : (installment.paidDate ? installment.amount : 0);
    
    // Get the student to retrieve the formatted studentId
    const student = students.find(s => s.id === installment.studentId);
    const formattedStudentId = student ? (student.studentId || student.student_id) : installment.studentId;
    
    // Translate fee type to Arabic using the lookup map
    const arabicFeeType = feeTypeMap[installment.feeType] || installment.feeType;
    
    // Translate payment method to Arabic using the lookup map
    const arabicPaymentMethod = installment.paymentMethod ? (paymentMethodMap[installment.paymentMethod] || installment.paymentMethod) : '';
    
    return [
      formattedStudentId,
      installment.studentName,
      installment.grade,
      String(installment.installmentCount || 1),
      arabicFeeType,
      safeToISODateString(installment.dueDate),
      installment.amount,
      paidAmount,
      statusText,
      installment.paidDate ? safeToISODateString(installment.paidDate) : '',
      arabicPaymentMethod,
      installment.checkNumber || ''  // Add checkNumber column
    ].join(',');
  });
  
  // Calculate totals
  const totalAmount = installments.reduce((sum, installment) => sum + installment.amount, 0);
  const totalPaid = installments.reduce((sum, installment) => {
    const paidAmount = installment.paidAmount !== undefined 
      ? installment.paidAmount 
      : (installment.paidDate ? installment.amount : 0);
    return sum + paidAmount;
  }, 0);
  
  // Add total row
  const totalRow = [
    '',
    'المجموع',
    '',
    '',
    '',
    '',
    totalAmount.toFixed(2),
    totalPaid.toFixed(2),
    '',
    '',
    '',
    ''  // Add empty cell for checkNumber column
  ].join(',');
  
  // Add BOM for UTF-8
  const BOM = "\uFEFF";
  return BOM + [headers.join(','), ...rows, totalRow].join('\n');
};

// Process imported installments
export const processImportedInstallments = (
  rows: Record<string, string>[],
  studentMap: Record<string, any>
): ImportedInstallment[] => {
  const installments: ImportedInstallment[] = [];
  
  rows.forEach((row, index) => {
    try {
      // Skip header row or empty rows
      if (index === 0 || !row.studentId) return;
      
      // Find student by ID
      const student = studentMap[row.studentId];
      if (!student) {
        console.error(`Student with ID ${row.studentId} not found`);
        return;
      }
      
      // Map fee type from Arabic to system value
      let feeType = 'tuition';
      if (row.feeType === 'رسوم النقل') {
        feeType = 'transportation';
      } else if (row.feeType === 'رسوم دراسية ونقل') {
        feeType = 'transportation_and_tuition';
      }
      
      // Convert isPaid from Arabic to boolean
      const isPaid = row.isPaid === 'نعم' || row.isPaid === 'true' || row.isPaid === '1' || row.isPaid === 'yes';
      
      // Handle paid amount
      let paidAmount = 0;
      if (isPaid && row.paidAmount) {
        paidAmount = parseFloat(row.paidAmount) || parseFloat(row.amount) || 0;
      }
      
      // Create installment object
      const installment: ImportedInstallment = {
        studentId: row.studentId,
        feeType,
        amount: parseFloat(row.amount) || 0,
        dueDate: row.dueDate || new Date().toISOString().split('T')[0],
        installmentNumber: parseInt(row.installmentNumber) || 0,
        totalInstallments: parseInt(row.totalInstallments) || 1,
        note: row.note || '',
        installmentMonth: row.installmentMonth || '',
        isPaid,
        paidDate: isPaid ? (row.paidDate ? safeToISODateString(row.paidDate) : safeToISODateString(new Date())) : undefined,
        paidAmount: isPaid ? paidAmount : undefined,
        paymentMethod: isPaid ? (row.paymentMethod as any) : undefined,
        paymentNote: isPaid ? (row.paymentNote || '') : undefined,
        checkNumber: isPaid ? (row.checkNumber || '') : undefined
      };
      
      installments.push(installment);
      console.log(`Processed installment for ${student.name}: ${installment.amount} - ${feeType}`);
    } catch (error) {
      console.error(`Error processing installment at row ${index + 1}:`, error);
    }
  });
  
  return installments;
};

export default {
  parseCSV,
  excelToCSV,
  processImportedStudents,
  saveImportedData,
  saveImportedDataWithSync,
  generateStudentTemplateCSV,
  generateFeeTemplateCSV,
  generateInstallmentTemplateCSV,
  exportInstallmentsToCSV,
  exportFeesToCSV
};
 