/**
 * Type definitions for PDF generation services
 */

/**
 * Receipt data interface
 */
export interface ReceiptData {
  receiptNumber: string;
  date: string;
  studentName: string;
  studentNameEn?: string; // English name for the student (used when language is English)
  studentId: string;
  grade: string;
  feeType: string;
  amount: number;
  discount?: number;
  originalAmount?: number;
  schoolName: string;
  englishSchoolName?: string; // English school name field
  schoolId?: string;
  schoolLogo?: string;
  schoolPhone?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolEmail?: string;
  showWatermark?: boolean;
  showLogoBackground?: boolean;
  showLogoBackgroundOnReceipt?: boolean; // Add document-specific logo background setting
  academicYear?: string;
  paymentMethod?: string;
  paymentDate?: string; // Added field for payment date
  totalAmount: number;
  isPartialPayment?: boolean;

  // Signature settings for different receipt types
  showSignature?: boolean;
  showSignatureOnArabicReceipt?: boolean;
  showSignatureOnEnglishReceipt?: boolean;
  showSignatureOnInstallmentReceipt?: boolean;
  showSignatureOnPartialPayment?: boolean;
  // Other settings
  showFooter?: boolean;

  paymentNote?: string;
  checkNumber?: string; // Added field for check number
  checkDate?: string; // Added field for check date
  bankName?: string; // Added bank name field
  bankNameArabic?: string; // Added Arabic bank name field
  bankNameEnglish?: string; // Added English bank name field
  installmentMonth?: string; // Added field for installment month
  installmentNumber?: string; // Added field for installment number
  installmentDetails?: string; // Added field for combined installment details

  language?: 'arabic' | 'english'; // Language support for receipts
  tuitionFees?: number; // Added field for tuition fees specifically
  transportationFees?: number; // Added field for transportation fees specifically
  paidAmount?: number; // Added field for the amount that has been paid
  includesTransportation?: boolean; // Flag indicating this fee was paid as part of a bulk payment that included transportation
}

/**
 * Student report data interface
 */
export interface StudentReportData {
  studentName: string;
  studentId: string;
  grade: string;
  fees: Array<{
    type: string;
    amount: number;
    paid: number;
    balance: number;
    discount?: number;
  }>;
  schoolName: string;
  schoolLogo?: string;

  schoolPhone?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolEmail?: string;
  showWatermark?: boolean;
  showLogoBackground?: boolean;
  showLogoBackgroundOnStudentReport?: boolean; // Add document-specific logo background setting

  showSignature?: boolean;
  showFooter?: boolean; // Added for footer visibility control

  invoiceNumber?: string;
  date?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  // Add missing properties
  amount?: number;
  status?: string;
  paid?: boolean;
  paymentDate?: string;
  totalAmount?: number;
  receiptNumber?: string; // Add this property

}

/**
 * Interface for student installments report data
 */
export interface StudentInstallmentsReportData {
  studentName: string;
  studentId: string;
  grade: string;
  schoolId?: string; // Added schoolId for school settings lookup
  installments: Array<{
    id: string;
    feeType: string;
    amount: number;
    paidAmount?: number;
    dueDate: string;
    paidDate: string | null;
    status: 'paid' | 'upcoming' | 'overdue' | 'partial';
    installmentCount: number;
    installmentMonth?: string;
    discount?: number;
    paymentMethod?: string;
    paymentNote?: string;
    checkNumber?: string;
  }>;
  schoolName: string;
  schoolLogo?: string;
  schoolPhone?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolEmail?: string;
  showWatermark?: boolean;
  showLogoBackground?: boolean;
  showLogoBackgroundOnInstallmentReport?: boolean; // Add document-specific logo background setting
  // New options for signature
  showSignature?: boolean;
  showFooter?: boolean; // Added to control footer visibility consistently
  receiptNumber?: string;
  date?: string;
  paymentMethod?: string;
  paymentNote?: string;
  checkNumber?: string;

}



/**
 * Interface for fees collection report data
 */
export interface FeesCollectionReportData {
  title: string;
  date: string;
  reportDate: string;
  language?: 'arabic' | 'english';
  academicYear?: string;
  grade?: string;
  section?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  fees: Array<{
    id: string;
    studentName: string;
    studentNameEn?: string;
    studentId: string;
    grade: string;
    feeType: string;
    amount: number;
    discount?: number;
    paid: number;
    balance: number;
    totalFees: number;
    paidAmount: number;
    remainingAmount: number;
    status: 'paid' | 'partial' | 'unpaid';
    dueDate: string;
    paymentDate?: string;
  }>;
  schoolName: string;
  englishSchoolName?: string;
  schoolLogo?: string;
  schoolPhone?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolEmail?: string;
  showWatermark?: boolean;
  showLogoBackground?: boolean;
  showLogoBackgroundOnFeeReport?: boolean; // Add document-specific logo background setting

  showSignature?: boolean;
  showFooter?: boolean; // Added for footer visibility control

}

/**
 * Interface for subscription invoice data
 */
export interface SubscriptionInvoiceData {
  invoiceNumber: string;
  date: string;
  schoolName: string;
  schoolId: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  amount: number;
  paid: boolean;
  paymentDate?: string;
  status?: string;
  showWatermark?: boolean;
  schoolLogo?: string;
  schoolPhone?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolEmail?: string;
  showLogoBackground?: boolean;
  showLogoBackgroundOnInvoice?: boolean; // Add document-specific logo background setting

  showSignatureOnInvoice?: boolean; // Added option to control signature visibility

}

/**
 * PDF Generation Settings interface
 */
export interface PDFGenerationSettings {
  showFooter: boolean;
  showInReports?: boolean;
  showInReceipts?: boolean;
  showInInstallments?: boolean;
}

/**
 * Installment Report Data
 */
export interface InstallmentReportData {
  // School information
  schoolName: string;
  englishSchoolName?: string;
  schoolLogo?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolAddress?: string;
  
  // Student information
  studentId: string;
  studentName: string;
  studentNameEn?: string;
  grade: string;
  academicYear: string;
  
  // Report metadata
  reportDate: string;
  language?: 'arabic' | 'english';
  showWatermark?: boolean;
  showLogoBackground?: boolean;
  
  // Installment data
  installments: Array<{
    installmentNumber: number | string;
    month: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    dueDate: string;
    status: 'paid' | 'partial' | 'unpaid';
  }>;
}