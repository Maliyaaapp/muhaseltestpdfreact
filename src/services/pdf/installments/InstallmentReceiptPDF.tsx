/**
 * InstallmentReceiptPDF.tsx
 * Centered header, white table, watermark in front centered on page
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer';

// ============================================================================
// FONT REGISTRATION
// ============================================================================

try {
  Font.register({
    family: 'Tajawal',
    fonts: [
      { src: '/fonts/Tajawal-Regular.ttf', fontWeight: 'normal' },
      { src: '/fonts/Tajawal-Bold.ttf', fontWeight: 'bold' },
      { src: '/fonts/Tajawal-Medium.ttf', fontWeight: 500 },
    ],
  });
} catch (error) {
  console.error('Error registering Tajawal font:', error);
}

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface InstallmentReceiptData {
  receiptNumber: string;
  date: string;
  studentName: string;
  studentNumber: string;
  className: string;
  paymentType: string;
  paymentMethod: string;
  installmentNumber: string;
  installmentMonth?: string;
  installmentAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentNote?: string;
  checkNumber?: string;
  status?: 'paid' | 'partial' | 'unpaid';
}

export interface SchoolSettings {
  schoolNameArabic: string;
  schoolNameEnglish?: string;
  schoolLogo: string;
  phone: string;
  phoneWhatsapp?: string;
  phoneCall?: string;
  email: string;
  address?: string;
  website?: string;
  showWatermark?: boolean;
  showSignature?: boolean;
  signature?: string;
}

export interface InstallmentReceiptPDFProps {
  installment: InstallmentReceiptData;
  schoolSettings: SchoolSettings;
}

// ============================================================================
// STYLESHEET
// ============================================================================

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Tajawal',
    fontSize: 11,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    direction: 'rtl',
    position: 'relative',
  },

  // Content wrapper - lower zIndex so watermark shows in front
  content: {
    position: 'relative',
    zIndex: 1,
  },

  // Header - All centered
  header: {
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },

  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
    marginBottom: 8,
  },

  schoolName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },

  schoolNameEnglish: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },

  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 10,
  },

  // Contact info - centered row
  contactRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },

  contactItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },

  contactText: {
    fontSize: 9,
    color: '#6b7280',
  },

  // Receipt info row
  receiptInfoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },

  receiptInfoItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },

  receiptInfoLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 5,
  },

  receiptInfoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },

  // Status badge
  statusBadge: {
    backgroundColor: '#10b981',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  statusBadgePartial: {
    backgroundColor: '#f59e0b',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  statusBadgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },

  // Two cards container
  cardsContainer: {
    flexDirection: 'row-reverse',
    marginBottom: 15,
    gap: 12,
  },

  // Info card
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },

  cardHeader: {
    backgroundColor: '#dbeafe',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },

  cardHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'right',
  },

  cardBody: {
    backgroundColor: 'transparent',
    padding: 10,
  },

  cardRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  cardRowLast: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },

  cardLabel: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
  },

  cardValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'left',
    maxWidth: '60%',
  },

  // Table
  tableContainer: {
    marginBottom: 15,
  },

  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },

  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#dbeafe',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },

  tableHeaderCellRight: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderLeftWidth: 1,
    borderLeftColor: '#bfdbfe',
  },

  tableHeaderCellLeft: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },

  tableHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
  },

  tableRow: {
    flexDirection: 'row-reverse',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  tableRowLast: {
    flexDirection: 'row-reverse',
    backgroundColor: 'transparent',
  },

  tableCellRight: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderLeftWidth: 1,
    borderLeftColor: '#f3f4f6',
  },

  tableCellLeft: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },

  tableCellText: {
    fontSize: 10,
    color: '#1f2937',
    textAlign: 'center',
  },

  tableCellTextBold: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },

  // Watermark - LARGE, centered on A4 page, IN FRONT
  watermarkOverlay: {
    position: 'absolute',
    top: 250,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 999,
  },

  watermarkImage: {
    width: 350,
    height: 350,
    opacity: 0.15,
  },

  // Signature section
  signatureSection: {
    marginTop: 50,
    alignItems: 'center',
  },

  signatureLine: {
    width: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    marginBottom: 8,
  },

  signatureLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Note section
  noteSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },

  noteLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
    textAlign: 'right',
  },

  noteText: {
    fontSize: 9,
    color: '#78350f',
    textAlign: 'right',
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('ar-SA')} ريال`;
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const getPaymentMethodLabel = (method: string): string => {
  const methods: Record<string, string> = {
    cash: 'نقداً',
    visa: 'بطاقة ائتمان',
    check: 'شيك',
    'bank-transfer': 'تحويل بنكي',
    other: 'أخرى',
  };
  return methods[method] || method || 'نقداً';
};

const getInstallmentLabel = (num: string, month?: string): string => {
  if (month) {
    return `شهر ${month}`;
  }
  const numInt = parseInt(num, 10);
  const ordinals: Record<number, string> = {
    1: 'الدفعة الأولى',
    2: 'الدفعة الثانية',
    3: 'الدفعة الثالثة',
    4: 'الدفعة الرابعة',
    5: 'الدفعة الخامسة',
    6: 'الدفعة السادسة',
    7: 'الدفعة السابعة',
    8: 'الدفعة الثامنة',
    9: 'الدفعة التاسعة',
    10: 'الدفعة العاشرة',
    11: 'الدفعة الحادية عشر',
    12: 'الدفعة الثانية عشر',
  };
  return ordinals[numInt] || `القسط ${num} من 8`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const InstallmentReceiptPDF: React.FC<InstallmentReceiptPDFProps> = ({
  installment,
  schoolSettings,
}) => {
  const {
    receiptNumber,
    date,
    studentName,
    studentNumber,
    className,
    paymentType,
    paymentMethod,
    installmentNumber,
    installmentMonth,
    installmentAmount,
    paidAmount,
    remainingAmount,
    status,
    checkNumber,
    paymentNote,
  } = installment;

  const {
    schoolNameArabic,
    schoolNameEnglish,
    schoolLogo,
    phone,
    phoneWhatsapp,
    phoneCall,
    email,
    address,
    website,
    showWatermark = true,
    showSignature = true,
  } = schoolSettings;

  const isPaid = status === 'paid' || remainingAmount === 0;
  const isPartial = status === 'partial' || (paidAmount > 0 && remainingAmount > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* All content */}
        <View style={styles.content}>
          {/* Header - All Centered */}
          <View style={styles.header}>
            {/* Logo */}
            {schoolLogo && (
              <Image src={schoolLogo} style={styles.logo} />
            )}
            
            {/* School name */}
            <Text style={styles.schoolName}>{schoolNameArabic}</Text>
            {schoolNameEnglish && (
              <Text style={styles.schoolNameEnglish}>{schoolNameEnglish}</Text>
            )}
            
            {/* Title */}
            <Text style={styles.receiptTitle}>إيصال دفع</Text>

            {/* Contact info - using data from school settings */}
            <View style={styles.contactRow}>
              {phone && (
                <View style={styles.contactItem}>
                  <Text style={styles.contactText}>{phone} :الهاتف</Text>
                </View>
              )}
              {(phoneWhatsapp || phone) && (
                <View style={styles.contactItem}>
                  <Text style={styles.contactText}>{phoneWhatsapp || phone} :واتساب</Text>
                </View>
              )}
              {phoneCall && (
                <View style={styles.contactItem}>
                  <Text style={styles.contactText}>{phoneCall} :هاتف</Text>
                </View>
              )}
              {email && (
                <View style={styles.contactItem}>
                  <Text style={styles.contactText}>{email} :البريد</Text>
                </View>
              )}
              {website && (
                <View style={styles.contactItem}>
                  <Text style={styles.contactText}>{website} :الموقع</Text>
                </View>
              )}
            </View>
          </View>

          {/* Receipt Number and Date Row */}
          <View style={styles.receiptInfoRow}>
            <View style={styles.receiptInfoItem}>
              <Text style={styles.receiptInfoLabel}>رقم الإيصال</Text>
              <Text style={styles.receiptInfoValue}>{receiptNumber}</Text>
            </View>
            
            {isPaid && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>مدفوع</Text>
              </View>
            )}
            {isPartial && !isPaid && (
              <View style={styles.statusBadgePartial}>
                <Text style={styles.statusBadgeText}>مدفوع جزئياً</Text>
              </View>
            )}
            
            <View style={styles.receiptInfoItem}>
              <Text style={styles.receiptInfoLabel}>التاريخ</Text>
              <Text style={styles.receiptInfoValue}>{formatDate(date)}</Text>
            </View>
          </View>

          {/* Two Info Cards */}
          <View style={styles.cardsContainer}>
            {/* Right Card - معلومات الطالب */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderText}>معلومات الطالب</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>الاسم</Text>
                  <Text style={styles.cardValue}>{studentName}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>رقم الطالب</Text>
                  <Text style={styles.cardValue}>{studentNumber}</Text>
                </View>
                <View style={styles.cardRowLast}>
                  <Text style={styles.cardLabel}>الصف</Text>
                  <Text style={styles.cardValue}>{className}</Text>
                </View>
              </View>
            </View>

            {/* Left Card - معلومات الدفع */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderText}>معلومات الدفع</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>نوع الرسوم</Text>
                  <Text style={styles.cardValue}>{paymentType || 'رسوم دراسية'}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>طريقة الدفع</Text>
                  <Text style={styles.cardValue}>{getPaymentMethodLabel(paymentMethod)}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>رقم القسط</Text>
                  <Text style={styles.cardValue}>{installmentNumber || '1'}</Text>
                </View>
                {installmentMonth && (
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>شهر الاستحقاق</Text>
                    <Text style={styles.cardValue}>{installmentMonth}</Text>
                  </View>
                )}
                {paymentMethod === 'check' && checkNumber && (
                  <View style={styles.cardRowLast}>
                    <Text style={styles.cardLabel}>رقم الشيك</Text>
                    <Text style={styles.cardValue}>{checkNumber}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Payment Table */}
          <View style={styles.tableContainer}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={styles.tableHeaderCellRight}>
                  <Text style={styles.tableHeaderText}>البيان</Text>
                </View>
                <View style={styles.tableHeaderCellLeft}>
                  <Text style={styles.tableHeaderText}>المبلغ</Text>
                </View>
              </View>

              <View style={styles.tableRow}>
                <View style={styles.tableCellRight}>
                  <Text style={styles.tableCellText}>الدفعة المستحقة</Text>
                </View>
                <View style={styles.tableCellLeft}>
                  <Text style={styles.tableCellTextBold}>{formatCurrency(installmentAmount)}</Text>
                </View>
              </View>

              <View style={styles.tableRow}>
                <View style={styles.tableCellRight}>
                  <Text style={styles.tableCellText}>المبلغ المدفوع</Text>
                </View>
                <View style={styles.tableCellLeft}>
                  <Text style={styles.tableCellTextBold}>{formatCurrency(paidAmount)}</Text>
                </View>
              </View>

              <View style={styles.tableRowLast}>
                <View style={styles.tableCellRight}>
                  <Text style={styles.tableCellText}>المبلغ المتبقي</Text>
                </View>
                <View style={styles.tableCellLeft}>
                  <Text style={styles.tableCellTextBold}>{formatCurrency(remainingAmount)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Payment Note Section */}
          {paymentNote && (
            <View style={styles.noteSection}>
              <Text style={styles.noteLabel}>ملاحظات:</Text>
              <Text style={styles.noteText}>{paymentNote}</Text>
            </View>
          )}

          {/* Signature Section */}
          {showSignature && (
            <View style={styles.signatureSection}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>توقيع الإدارة المالية / المستلم</Text>
            </View>
          )}
        </View>

        {/* Watermark - LARGE, centered, IN FRONT of everything */}
        {showWatermark && schoolLogo && (
          <View style={styles.watermarkOverlay}>
            <Image src={schoolLogo} style={styles.watermarkImage} />
          </View>
        )}
      </Page>
    </Document>
  );
};

export default InstallmentReceiptPDF;

// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================

export const generateInstallmentReceiptPDF = async (
  installment: InstallmentReceiptData,
  schoolSettings: SchoolSettings
): Promise<Blob> => {
  const blob = await pdf(
    <InstallmentReceiptPDF
      installment={installment}
      schoolSettings={schoolSettings}
    />
  ).toBlob();
  return blob;
};

export const downloadInstallmentReceiptPDF = async (
  installment: InstallmentReceiptData,
  schoolSettings: SchoolSettings,
  filename?: string
): Promise<void> => {
  const blob = await generateInstallmentReceiptPDF(installment, schoolSettings);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `installment_receipt_${installment.receiptNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
