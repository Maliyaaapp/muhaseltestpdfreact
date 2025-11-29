export interface SchoolSettings {
  id?: string;
  schoolId: string;
  name: string;
  englishName?: string;
  email: string;
  phone: string;
  phoneWhatsapp: string;
  phoneCall: string;
  address: string;
  logo: string;

  defaultInstallments: number;
  tuitionFeeCategory: string;
  transportationFeeOneWay: number;
  transportationFeeTwoWay: number;
  receiptNumberFormat: string;
  receiptNumberPrefix: string;
  receiptNumberCounter: number;
  installmentReceiptNumberFormat: string;
  installmentReceiptNumberPrefix: string;
  installmentReceiptNumberCounter: number;
  receiptNumberYear?: number;
  installmentReceiptNumberYear?: number;
  showReceiptWatermark: boolean;
  showStudentReportWatermark: boolean;
  showInvoiceWatermark: boolean;
  showLogoBackground: boolean;

  showSignatureOnInvoice: boolean;
  showSignatureOnReceipt: boolean;
  showSignatureOnStudentReport: boolean;
  showSignatureOnInstallmentReport: boolean;
  showSignatureOnPartialPayment: boolean;
  showLogoBackgroundOnReceipt: boolean;
  showLogoBackgroundOnStudentReport: boolean;
  showLogoBackgroundOnInstallmentReport: boolean;
  showLogoBackgroundOnInvoice: boolean;
  showLogoBackgroundOnFeeReport: boolean;
  showFooterInReceipts: boolean;
  footerContactInfo: boolean;
  footerAddress: boolean;
  academicYear?: string;
}