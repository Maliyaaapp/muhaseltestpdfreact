export interface ReceiptData {
  studentName: string;
  studentId: string;
  grade: string;
  academicYear: string;
  schoolName: string;
  schoolLogo?: string;
  schoolPhone?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolEmail?: string;
  showLogoBackground?: boolean;
  showWatermark?: boolean;
  showStamp?: boolean;
  showSignature?: boolean;
  showFooter?: boolean;

  receiptNumber: string;
  date: string;
  amount: number;
  totalAmount: number;
  paymentMethod: string;
  discount?: number;
  isPartialPayment?: boolean;
  isInstallment?: boolean;
  feeType: string;
}

export interface EnglishReceiptData extends ReceiptData {
  englishName?: string;           // Student's name in English
  englishGrade?: string;          // Student's grade in English
  englishFeeType?: string;        // Fee type in English
  englishSchoolName?: string;     // School name in English (optional)
  englishPaymentMethod?: string;  // Payment method in English
  englishPaymentNote?: string;    // Payment note in English
  englishInstallmentDetails?: string; // Installment details in English
}