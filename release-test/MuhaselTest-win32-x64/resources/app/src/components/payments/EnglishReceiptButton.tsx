import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, FileSignature } from 'lucide-react';
import pdfPrinter from '../../services/pdfPrinter';
import { CURRENCY_EN } from '../../utils/constants';
import { format } from 'date-fns';
import { arToEnNumber } from '../../utils/helpers';
import { getBigCenteredLogoWatermark } from '../../services/pdf/utils/print-styles';

// Define props interface
interface EnglishReceiptButtonProps {
  receiptData?: any;
  fee?: any; // Fee object when using async generation
  generateReceiptData?: (fee: any) => Promise<any | null>; // Async function to generate receipt data
  compact?: boolean;
}

/**
 * A simple button component that opens an English receipt in a new window
 * This component doesn't rely on any existing functions
 */
const EnglishReceiptButton: React.FC<EnglishReceiptButtonProps> = ({ receiptData, fee, generateReceiptData, compact = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Early return if no data available
  if (!receiptData && (!fee || !generateReceiptData)) {
    return null;
  }
  
  // Function to get current receipt data (either provided or generated)
  const getCurrentReceiptData = async () => {
    if (receiptData) {
      // CRITICAL DEBUG: Log cheque details in provided receiptData
      console.log('ENGLISH RECEIPT - Using provided receiptData with cheque details:', {
        checkNumber: receiptData.checkNumber,
        checkDate: receiptData.checkDate,
        bankNameArabic: receiptData.bankNameArabic,
        bankNameEnglish: receiptData.bankNameEnglish,
        paymentMethod: receiptData.paymentMethod,
        paymentNote: receiptData.paymentNote,
        hasCheckNumber: !!receiptData.checkNumber,
        hasCheckDate: !!receiptData.checkDate,
        hasBankNameArabic: !!receiptData.bankNameArabic,
        hasBankNameEnglish: !!receiptData.bankNameEnglish
      });
      return receiptData;
    }
    
    if (fee && generateReceiptData) {
      const generatedData = await generateReceiptData(fee);
      // CRITICAL DEBUG: Log cheque details in generated receiptData
      console.log('ENGLISH RECEIPT - Using generated receiptData with cheque details:', {
        checkNumber: generatedData?.checkNumber,
        checkDate: generatedData?.checkDate,
        bankNameArabic: generatedData?.bankNameArabic,
        bankNameEnglish: generatedData?.bankNameEnglish,
        paymentMethod: generatedData?.paymentMethod,
        paymentNote: generatedData?.paymentNote,
        hasCheckNumber: !!generatedData?.checkNumber,
        hasCheckDate: !!generatedData?.checkDate,
        hasBankNameArabic: !!generatedData?.bankNameArabic,
        hasBankNameEnglish: !!generatedData?.bankNameEnglish
      });
      return generatedData;
    }
    
    return null;
  };
  
  // Only process receiptData if it exists
  const processReceiptData = (data: any) => {
    if (!data) return data;
    
    // CRITICAL FIX: Ensure all school settings are properly extracted and set
    console.log('Processing receipt data for English receipt');
    console.log('Original data:', data);
    
    // Fix school name
    if (!data.englishSchoolName) {
      console.log('Retrieving englishSchoolName from settings');
      
      // Check multiple possible locations for English school name
      data.englishSchoolName = 
        data.englishSchoolName ||
        data.schoolSettings?.englishName ||
        data.schoolSettings?.schoolNameEnglish ||
        data.settings?.englishName ||
        data.settings?.schoolNameEnglish ||
        data.school?.englishName ||
        data.school?.englishSchoolName ||
        data.school?.nameEnglish ||
        data.schoolName ||
        'School';
      
      console.log('Final englishSchoolName:', data.englishSchoolName);
    }
    
    // Fix school logo
    if (!data.schoolLogo) {
      data.schoolLogo = 
        data.schoolLogo ||
        data.schoolSettings?.logo ||
        data.settings?.logo ||
        data.school?.logo ||
        '';
      console.log('School logo set to:', data.schoolLogo);
    }
    
    // Fix school contact information
    if (!data.schoolPhone) {
      data.schoolPhone = 
        data.schoolPhone ||
        data.schoolSettings?.phone ||
        data.settings?.phone ||
        data.school?.phone ||
        '';
    }
    
    if (!data.schoolEmail) {
      data.schoolEmail = 
        data.schoolEmail ||
        data.schoolSettings?.email ||
        data.settings?.email ||
        data.school?.email ||
        '';
    }
    
    return data;
  }
  
  // Use the settings from receiptData if available, otherwise use defaults
  const [receiptSettings, setReceiptSettings] = useState({
    showWatermark: Boolean(receiptData?.showWatermarkOnReceipt !== undefined ? receiptData.showWatermarkOnReceipt : true),
    // Always initialize signature to true, we'll provide a toggle button for it
    showSignature: true,
    // Force stamps to be always off
    showStamp: false,
    showFooter: Boolean(receiptData?.showFooterOnReceipt !== undefined ? receiptData.showFooterOnReceipt : true),
  });

  // Handle settings change
  const handleSettingChange = (setting: string) => {
    setReceiptSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev],
    }));
  };

  // Toggle signature setting
  const toggleSignature = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent button click
    handleSettingChange('showSignature');
    toast.success(`Signatures ${receiptSettings.showSignature ? 'disabled' : 'enabled'}`);
  };

  // Arabic to English transliteration map
  const arabicToEnglishMap: Record<string, string> = {
    'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a',
    'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'th', 'ر': 'r',
    'ز': 'z', 'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd', 'ط': 't',
    'ظ': 'z', 'ع': 'a', 'غ': 'gh',
    'ف': 'f', 'ق': 'q', 'ك': 'k',
    'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'ة': 'h', 'و': 'w',
    'ي': 'y', 'ى': 'a', 'ئ': 'e',
    'ء': '', 'ؤ': 'o',
    ' ': ' ', '-': '-', '_': '_'
  };

  // Simple transliteration function for Arabic names
  const transliterateArabic = (arabicText: string): string => {
    if (!arabicText) return '';

    // Common Arabic names and their English equivalents
    const commonNames: Record<string, string> = {
      'محمد': 'Mohammed', 'أحمد': 'Ahmed', 'علي': 'Ali',
      'عمر': 'Omar', 'خالد': 'Khaled', 'سعيد': 'Saeed',
      'عبدالله': 'Abdullah', 'عبد الله': 'Abdullah',
      'عبدالرحمن': 'Abdulrahman', 'عبد الرحمن': 'Abdulrahman',
      'فاطمة': 'Fatima', 'عائشة': 'Aisha', 'مريم': 'Maryam',
      'سارة': 'Sarah', 'نورة': 'Norah', 'نور': 'Noor',
      'يوسف': 'Yousef', 'حسن': 'Hassan', 'حسين': 'Hussein',
      'ناصر': 'Nasser', 'سلمان': 'Salman', 'سلطان': 'Sultan',
      'صالح': 'Saleh', 'أسامة': 'Osama', 'هند': 'Hind',
      'جمال': 'Jamal', 'إبراهيم': 'Ibrahim', 'الصليبي': 'Al-Sulaibi'
    };

    // Check if the full name or each part has a direct translation
    const nameParts = arabicText.split(' ');
    
    // First try the entire name
    if (commonNames[arabicText]) {
      return commonNames[arabicText];
    }
    
    // Then try each part of the name
    const translatedParts = nameParts.map(part => {
      // Check if this part has a direct translation
      if (commonNames[part]) {
        return commonNames[part];
      }
      
      // If no direct translation, transliterate character by character
      return Array.from(part).map(char => {
        return arabicToEnglishMap[char] || char;
      }).join('');
    });
    
    // Capitalize each part
    return translatedParts.map(part => {
      if (part.length > 0) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
      return part;
    }).join(' ');
  };

  // Debug student data - more extensive debugging
  const debugData = (data: any) => {
    if (!data) {
      console.log('No receipt data available for debugging');
      return;
    }
    
    console.log('RECEIPT DATA:', data);
    console.log('Student Data:', {
      name: data.studentName,
      englishName: data.englishName,
      paymentMethod: data.paymentMethod,
      isPartialPayment: data.isPartialPayment
    });
    
    // Log school data and settings
    console.log('School Data:', {
      schoolName: data.schoolName,
      englishSchoolName: data.englishSchoolName,
      schoolSettingsObj: data.schoolSettings,
      schoolNameEnglish: data.schoolSettings?.schoolNameEnglish,
      englishName: data.schoolSettings?.englishName,
      settingsObj: data.settings
    });
    
    // Log student record if exists
    if (data.student) {
      console.log('Student Record:', data.student);
    }
    
    // Check data type for English name
    if (data.englishName) {
      console.log('English name type:', typeof data.englishName);
    }
  };

  // Translation functions
  const translateFeeType = (feeType: string): string => {
    if (!feeType) return 'Other Fees';
    
    // First convert any Arabic fee type to English
    const feeTypes: Record<string, string> = {
      'tuition': 'Tuition Fees',
      'رسوم دراسية': 'Tuition Fees',
      'transportation': 'Transportation Fees',
      'نقل مدرسي': 'Transportation Fees',
      'رسوم النقل': 'Transportation Fees',
      'رسوم النقل المدرسي': 'Transportation Fees',
      'رسوم التقل': 'Transportation Fees',
      'activities': 'Activities',
      'أنشطة': 'Activities',
      'uniform': 'School Uniform',
      'زي مدرسي': 'School Uniform',
      'books': 'Books',
      'كتب': 'Books',
      'other': 'Other Fees',
      'رسوم أخرى': 'Other Fees'
    };
    
    // Check for exact matches first
    if (feeTypes[feeType]) {
      return feeTypes[feeType];
    }
    
    // If no exact match, check for partial matches
    const feeTypeLower = feeType.toLowerCase();
    if (feeTypeLower.includes('transport') || feeTypeLower.includes('نقل')) {
      return 'Transportation Fees';
    } else if (feeTypeLower.includes('tuition') || feeTypeLower.includes('دراس')) {
      return 'Tuition Fees';
    } else if (feeTypeLower.includes('activ') || feeTypeLower.includes('أنشط')) {
      return 'Activities';
    } else if (feeTypeLower.includes('uniform') || feeTypeLower.includes('زي')) {
      return 'School Uniform';
    } else if (feeTypeLower.includes('book') || feeTypeLower.includes('كتب')) {
      return 'Books';
    }
    
    // Default to Other Fees if no match found
    return 'Other Fees';
  };

  const translatePaymentMethod = (method: string): string => {
    if (!method) return 'Cash';
    
    // Convert to lowercase for case-insensitive matching
    const methodLower = method.toString().toLowerCase().trim();
    
    // Extended mapping for various payment methods
    if (methodLower.includes('نقد') || methodLower.includes('cash') || methodLower === 'نقداً' || methodLower === 'نقدا') {
      return 'Cash';
    }
    
    if (methodLower.includes('بطاق') || methodLower.includes('visa') || methodLower.includes('card') || methodLower.includes('credit') || methodLower.includes('ائتمان')) {
      return 'Card/Visa';
    }
    
    if (methodLower.includes('شيك') || methodLower.includes('check') || methodLower.includes('cheque')) {
      return 'Cheque';
    }
    
    if (methodLower.includes('تحويل') || methodLower.includes('بنك') || methodLower.includes('bank') || methodLower.includes('transfer')) {
      return 'Bank Transfer';
    }
    
    if (methodLower.includes('أخر') || methodLower.includes('other')) {
      return 'Other';
    }
    
    // If no match found, return the original value
    return method;
  };

  const translateGrade = (grade: string): string => {
    const grades: Record<string, string> = {
      'روضة أولى': 'KG 1',
      'روضة ثانية': 'KG 2',
      'الروضة KG1': 'KG 1',
      'الروضة KG2': 'KG 2',
      'الصف الأول': 'Grade 1',
      'الصف الثاني': 'Grade 2',
      'الصف الثالث': 'Grade 3',
      'الصف الرابع': 'Grade 4',
      'الصف الخامس': 'Grade 5',
      'الصف السادس': 'Grade 6',
      'الصف السابع': 'Grade 7',
      'الصف الثامن': 'Grade 8',
      'الصف التاسع': 'Grade 9',
      'الصف العاشر': 'Grade 10',
      'الصف الحادي عشر': 'Grade 11',
      'الصف الثاني عشر': 'Grade 12'
    };
    return grades[grade] || grade;
  };

  const formatDateEnglish = (dateString: string): string => {
    if (!dateString) return '';
    
    try {
      const isHyphenFormat = dateString.includes('-') && !dateString.includes('/');
      
      let date: Date;
      
      if (isHyphenFormat) {
        // Format for date in format YYYY-MM-DD
        date = new Date(dateString);
      } else {
        // Format for date in format DD/MM/YYYY
        const parts = dateString.split('/');
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      // Use Georgian date format (DD/MM/YYYY)
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    return phone.trim();
  };

  // Generate HTML for the receipt
  const generateReceiptHTML = (receiptData: any): string => {
    // CRITICAL DEBUG: Log all cheque details being passed to English HTML generation
    console.log('ENGLISH RECEIPT HTML GENERATION - Cheque Details Debug:', {
      checkNumber: receiptData.checkNumber,
      checkDate: receiptData.checkDate,
      bankName: receiptData.bankName,
      bankNameArabic: receiptData.bankNameArabic,
      bankNameEnglish: receiptData.bankNameEnglish,
      paymentMethod: receiptData.paymentMethod,
      paymentNote: receiptData.paymentNote,
      hasCheckNumber: !!receiptData.checkNumber,
      hasCheckDate: !!receiptData.checkDate,
      hasBankName: !!receiptData.bankName,
      hasBankNameArabic: !!receiptData.bankNameArabic,
      hasBankNameEnglish: !!receiptData.bankNameEnglish,
      allDataKeys: Object.keys(receiptData)
    });
    
    // Extract data from receipt - ensure we use English versions of all fields
    const {
      receiptNumber,
      date, // This should already be formatted in English
      studentName, // This should already be the English name
      studentId,
      grade, // This should already be the English grade
      academicYear,
      feeType, // This should already be translated
      paymentMethod, // This should already be translated
      checkNumber,
      checkDate,
      bankName,
      paymentNote,
      totalAmount,
      amount,
      paidAmount,
      transportationFees = 0,
      tuitionFees = 0,
      discount = 0,
      isPartialPayment = false,
      isTransportationReceipt = false,
      englishSchoolName, // Use the English school name
      schoolLogo,
      schoolPhone,
      schoolPhoneWhatsapp,
      schoolEmail,
      showWatermark = true,
      showSignature = true,
      showFooter = true,
      installmentNumber,
      installmentMonth,
      installmentDetails,
      currency, // Use the actual currency from data
      paymentDate,
      bankNameEnglish
    } = receiptData;
    
    // Log the receipt type for debugging
    console.log('Generating HTML - Is transportation receipt:', isTransportationReceipt);
    console.log('Fee type:', feeType);
    console.log('Transportation fees:', transportationFees);
    console.log('Tuition fees:', tuitionFees);
    console.log('Discount amount:', discount);
    
    // Ensure we have valid discount, tuition, and transportation values
    const discountAmount = Number(discount) || 0;
    const tuitionAmount = Number(tuitionFees) || 0;
    const transportationAmount = Number(transportationFees) || 0;
    const paidAmountValue = Number(paidAmount || amount) || 0;
    
    // Calculate tuition after discount
    const tuitionAfterDiscount = Math.max(0, tuitionAmount - discountAmount);
    
    // Calculate total fees
    const totalFeesAmount = tuitionAfterDiscount + transportationAmount;
    
    // CRITICAL FIX: Use actual paid amounts from receipt data if available
    let tuitionPaidAmount = 0;
    let transportationPaidAmount = 0;
    
    // Check if we have pre-calculated paid amounts from receipt data
    const hasPreCalculatedAmounts = receiptData.tuitionPaidAmount !== undefined || receiptData.transportationPaidAmount !== undefined;
    
    if (hasPreCalculatedAmounts) {
      // Use the actual paid amounts calculated from fee records
      tuitionPaidAmount = Number(receiptData.tuitionPaidAmount) || 0;
      transportationPaidAmount = Number(receiptData.transportationPaidAmount) || 0;
    } else {
      // Fallback: assign paid amount based on fee type
      if (isTransportationReceipt || 
          feeType === 'Transportation Fees' || 
          (typeof feeType === 'string' && (
            feeType.toLowerCase().includes('transport') || 
            feeType.includes('نقل')
          ))) {
        // Transportation-only receipt
        transportationPaidAmount = paidAmountValue;
        tuitionPaidAmount = 0;
      } else {
        // Regular receipt - assign to tuition
        tuitionPaidAmount = paidAmountValue;
        transportationPaidAmount = 0;
      }
    }
    
    // Calculate total paid amount
    const totalCalculatedPaid = tuitionPaidAmount + transportationPaidAmount;
    
    // Calculate remaining amounts
    const tuitionRemainingAmount = Math.max(0, tuitionAfterDiscount - tuitionPaidAmount);
    const transportationRemainingAmount = Math.max(0, transportationAmount - transportationPaidAmount);
    
    const totalRemainingAmount = tuitionRemainingAmount + transportationRemainingAmount;
    
    console.log('Receipt calculation summary:', {
          discountAmount,
          tuitionAmount,
          tuitionAfterDiscount,
          transportationAmount,
          totalFeesAmount,
          tuitionPaidAmount,
          transportationPaidAmount,
          totalCalculatedPaid,
          hasPreCalculatedAmounts,
          tuitionRemainingAmount,
          transportationRemainingAmount,
          totalRemainingAmount
        });
    
    // Use English school name
    const displaySchoolName = englishSchoolName || 'School';
    
    // Ensure fee type is in English
    const englishFeeType = translateFeeType(feeType || 'Other');

    // Determine if this is an installment receipt
    const isInstallmentReceipt = receiptNumber?.startsWith('INST-') || 
                                installmentNumber || 
                                installmentMonth || 
                                installmentDetails ||
                                Boolean(receiptData.isInstallment);

    // Combined receipt detection and totals (use fee record fields to avoid double-counting)
    const isCombinedReceipt = (receiptData.feeType === 'transportation_and_tuition') || (feeType === 'Transportation & Tuition Fees');
    const combinedTotalAmount = Math.max(0, Number((receiptData as any).totalAmount ?? (receiptData as any).amount ?? 0));
    const explicitPaid = Math.max(0, Number((receiptData as any).paidAmount ?? (receiptData as any).amount ?? 0));
    const explicitRemaining = Math.max(0, Number((receiptData as any).remainingAmount ?? (receiptData as any).balance ?? 0));
    const combinedFullyPaid = (receiptData.status === 'paid') || (explicitRemaining === 0) || (!isPartialPayment && explicitPaid >= combinedTotalAmount);
    const combinedPaidAmount = combinedFullyPaid ? combinedTotalAmount : explicitPaid;
    const combinedRemainingAmount = combinedFullyPaid ? 0 : Math.max(0, explicitRemaining || (combinedTotalAmount - combinedPaidAmount));
    
    // Use the correct currency symbol from data
    const currencySymbol = currency || CURRENCY_EN || '$';
    
    // Build installment fields if applicable - ensure English text
    const installmentFields: string[] = [];
    
    if (installmentNumber) {
      installmentFields.push(`
        <div class="info-row">
          <div class="info-label">Installment Number:</div>
          <div>${installmentNumber}</div>
        </div>
      `);
    }
    
    if (installmentMonth) {
      installmentFields.push(`
        <div class="info-row">
          <div class="info-label">Installment Month:</div>
          <div>${installmentMonth}</div>
        </div>
      `);
    }
    
    if (installmentDetails) {
      installmentFields.push(`
        <div class="info-row">
          <div class="info-label">Installment Details:</div>
          <div>${installmentDetails}</div>
        </div>
      `);
    }
    
    // Add styles for better signature spacing in the HTML template
    const signatureStyles = `
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 100px; /* Increased margin to move signatures down */
      width: 100%;
      padding: 0 15%;
      position: relative;
      z-index: 1000;
    }
    
    .signature-block {
      width: 45%;
      text-align: center;
      margin: 0 10px;
      position: relative;
      background: rgba(255, 255, 255, 0.9);
      padding: 15px;
      border-radius: 8px;
    }
    
    .signature-line {
      border-top: 2px solid #000;
      margin-top: 15px;
      margin-bottom: 15px;
      width: 100%;
    }
  
    .signature-block div:last-child {
      font-weight: bold;
      font-size: 14px;
      color: #1A365D;
      margin-top: 5px;
    }
    `;
    
    // Generate watermark function
    const getBigCenteredLogoWatermark = (logoUrl?: string) => {
      if (!logoUrl || !showWatermark) return '';
      
      return `
        <div class="logo-background" style="background-image: url('${logoUrl}');"></div>
      `;
    };
    
    return `
      <!-- Receipt content for English receipt -->
      ${getBigCenteredLogoWatermark(schoolLogo)}
      <div class="receipt-container">
        <div class="receipt-header">
          ${schoolLogo ? `
            <div class="logo">
              <img src="${schoolLogo}" alt="${displaySchoolName}" onerror="this.style.display='none'" />
            </div>
          ` : ''}
          <h1>Payment Receipt</h1>
          <p>${displaySchoolName || 'School Name'}</p>
          <div class="header-contact-info">
            ${schoolPhone ? `<span dir="ltr"><strong>Phone:</strong> ${schoolPhone}</span>` : ''}
            ${schoolPhoneWhatsapp ? `<span dir="ltr"><strong>WhatsApp:</strong> ${schoolPhoneWhatsapp}</span>` : ''}
            ${schoolEmail ? `<span dir="ltr"><strong>Email:</strong> ${schoolEmail}</span>` : ''}
          </div>
        </div>
        
        <div class="receipt-info">
          <div class="receipt-info-item">
            <strong>Receipt No:</strong> ${receiptNumber}
          </div>
          <div class="receipt-info-item">
            <strong>Date:</strong> ${formatDateEnglish(date)}
          </div>
        </div>
        
        <div class="receipt-body">
          <div style="text-align: center;" class="payment-status">
            <span class="status-badge ${isPartialPayment ? 'status-partial' : 'status-paid'}">
              ${isPartialPayment ? 'Partial Payment' : 'Paid'}
            </span>
          </div>
          
          <div class="info-section">
            <div class="info-group">
              <h3>Student Information</h3>
              <div class="info-row">
                <div class="info-label">Name:</div>
                <div>${studentName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">ID:</div>
                <div>${studentId}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Grade:</div>
                <div>${grade}</div>
              </div>
              ${academicYear ? `
              <div class="info-row">
                <div class="info-label">Academic Year:</div>
                <div>${academicYear}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="info-group">
              <h3>Payment Information</h3>
              <div class="info-row">
                <div class="info-label">Fee Type:</div>
                <div>${isInstallmentReceipt 
                  ? 'Installment Fees' 
                  : (isCombinedReceipt ? 'Transportation & Tuition Fees' : translateFeeType(feeType || 'Other'))}
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">Payment Method:</div>
                <div>${paymentMethod || 'Cash'}</div>
              </div>
              ${paymentDate ? `
              <div class="info-row">
                <div class="info-label">Payment Date:</div>
                <div>${formatDateEnglish(paymentDate)}</div>
              </div>
              ` : ''}
              ${checkNumber ? `
              <div class="info-row">
                <div class="info-label">Cheque Number:</div>
                <div>${checkNumber}</div>
              </div>
              ` : ''}
              ${checkDate && checkDate !== paymentDate ? `
              <div class="info-row">
                <div class="info-label">Cheque Date:</div>
                <div>${formatDateEnglish(checkDate)}</div>
              </div>
              ` : ''}
              ${bankNameEnglish ? `
              <div class="info-row">
                <div class="info-label">Bank Name:</div>
                <div>${bankNameEnglish}</div>
              </div>
              ` : ''}
              ${installmentFields.join('')}
              ${paymentNote ? `
              <div class="info-row">
                <div class="info-label">Note:</div>
                <div>${paymentNote}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <table class="fee-table" dir="ltr">
            <thead>
              <tr>
                <th style="text-align: left;">Description</th>
                <th style="text-align: left;">Amount</th>
              </tr>
            </thead>
          <tbody>
              ${isCombinedReceipt ? `
              <!-- Combined fees receipt (English) -->
              <tr>
                <td>Transportation & Tuition Fees</td>
                <td class="fee-amount">${combinedTotalAmount.toFixed(2)} ${currencySymbol}</td>
              </tr>
              
              <tr style="background-color: #e8f5e8; color: #2F855A;">
                <td>Amount Paid</td>
                <td class="fee-amount"><strong>${combinedPaidAmount.toFixed(2)} ${currencySymbol}</strong></td>
              </tr>
              
              <tr style="background-color: #fff5f5; color: #C53030; font-weight: bold;">
                <td><strong>Total Remaining Amount</strong></td>
                <td class="fee-amount"><strong>${combinedRemainingAmount.toFixed(2)} ${currencySymbol}</strong></td>
              </tr>
              ` : (isTransportationReceipt || (englishFeeType && (englishFeeType.includes('Transportation Fees') || englishFeeType.includes('نقل'))))
                ? `
              <!-- Transportation-only receipt -->
              <!-- Transportation fees -->
              <tr>
                <td>Transportation Fees</td>
                <td class="fee-amount">${transportationAmount.toFixed(2)} ${currencySymbol}</td>
              </tr>
              
              <!-- Transportation Fees Paid -->
              <tr style="background-color: #e8f5e8; color: #2F855A;">
                <td>Transportation Fees Paid</td>
                <td class="fee-amount">
                  ${transportationPaidAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              
              ${transportationRemainingAmount > 0 ? `
              <!-- Remaining Transportation Fees -->
              <tr style="background-color: #fff5f5; color: #C53030;">
                <td>Remaining Transportation Fees</td>
                <td class="fee-amount">
                  ${transportationRemainingAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              ` : ''}
              
              <!-- Total for Transportation -->
              <tr style="background-color: #f0f0f0; font-weight: bold;">
                <td><strong>Total</strong></td>
                <td class="fee-amount"><strong>${transportationAmount.toFixed(2)} ${currencySymbol}</strong></td>
              </tr>
              `
              : `
              <!-- Full receipt with all fees -->
              <!-- Show tuition fees with discount already applied -->
              <tr>
                <td>${isInstallmentReceipt ? 'Installment Fees' : 'Tuition Fees'}</td>
                <td class="fee-amount">${tuitionAfterDiscount.toFixed(2)} ${currencySymbol}</td>
              </tr>
              
              <!-- Transportation fees -->
              <tr>
                <td>Transportation Fees</td>
                <td class="fee-amount">${transportationAmount.toFixed(2)} ${currencySymbol}</td>
              </tr>
              
              <!-- Total fees -->
              <tr style="background-color: #f0f0f0;">
                <td><strong>Total Fees</strong></td>
                <td class="total-amount"><strong>${totalFeesAmount.toFixed(2)} ${currencySymbol}</strong></td>
              </tr>
              
              <!-- Tuition Fees Paid -->
              <tr style="background-color: #e8f5e8; color: #2F855A;">
                <td>${isInstallmentReceipt ? 'Installment Fees Paid' : 'Tuition Fees Paid'}</td>
                <td class="fee-amount">
                  ${tuitionPaidAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              
              <!-- Transportation Fees Paid -->
              <tr style="background-color: #e8f5e8; color: #2F855A;">
                <td>Transportation Fees Paid</td>
                <td class="fee-amount">
                  ${transportationPaidAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              
              <!-- Total Paid Amount -->
              <tr style="background-color: #d4edda; color: #155724; font-weight: bold;">
                <td><strong>Total Paid Amount</strong></td>
                <td class="fee-amount">
                  <strong>${totalCalculatedPaid.toFixed(2)} ${currencySymbol}</strong>
                </td>
              </tr>
              
              ${tuitionRemainingAmount > 0 ? `
              <!-- Remaining Tuition Fees -->
              <tr style="background-color: #fff5f5; color: #C53030;">
                <td>Remaining Tuition Fees</td>
                <td class="fee-amount">
                  ${tuitionRemainingAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              ` : ''}
              
              ${transportationRemainingAmount > 0 ? `
              <!-- Remaining Transportation Fees -->
              <tr style="background-color: #fff5f5; color: #C53030;">
                <td>Remaining Transportation Fees</td>
                <td class="fee-amount">
                  ${transportationRemainingAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              ` : ''}
              
              <!-- Total Remaining Amount -->
              <tr style="background-color: #fff5f5; color: #C53030; font-weight: bold;">
                <td><strong>Total Remaining Amount</strong></td>
                <td class="fee-amount">
                  <strong>${totalRemainingAmount.toFixed(2)} ${currencySymbol}</strong>
                </td>
              </tr>
              `}
            </tbody>
          </table>
          
          ${checkNumber ? `
          <div style="margin-top: 15px; font-size: 14px; text-align: left; color: #444; direction: ltr;">
            <p style="margin-bottom: 5px;"><strong>Note:</strong> In case your cheque is returned from the bank, the cheque will be considered void. Please retain the original until all school fees have been paid in full.</p>
          </div>
          ` : ''}
          
          <div class="signatures">
            <div class="signature-block" style="display: ${showSignature ? 'block' : 'none'};">
              <div class="signature-line"></div>
              <div>Financial Administration / Receiver</div>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
        
        /* Modern CSS Variables */
        :root {
          --primary-gradient: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
          --glass-bg: rgba(255, 255, 255, 0.1);
          --shadow-soft: 0 8px 32px rgba(0, 0, 0, 0.1);
          --border-radius: 12px;
          --font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        /* CSS Reset */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        /* Base document styles - exact A4 sizing with safe print margins */
        @page {
          size: 210mm 297mm;
          margin: 0;
        }
        
        html, body {
          width: 210mm;
          height: 297mm;
          font-family: var(--font-family);
          background-color: white;
          color: #333;
          direction: ltr;
          margin: 0;
          padding: 0;
          overflow: hidden;
          position: relative;
        }
        
        /* Screen display styles */
        @media screen {
          body {
            background-color: #f8f9fa;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          
          .receipt-container {
            box-shadow: var(--shadow-soft);
            width: 210mm;
            max-width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background-color: white;
            position: relative;
            overflow: hidden;
          }
        }
        
        /* Print-specific styles with enhanced compatibility */
        @media print {
          @page {
            size: 210mm 297mm;
            margin: 0;
          }
          
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          
          .receipt-container {
            box-shadow: none;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            position: relative;
            overflow: hidden;
          }
          
          .receipt-body {
            padding-bottom: 20px !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Ensure header and footer print with correct colors */
          .receipt-header, .receipt-footer, .fee-table th {
            background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: white !important;
          }
          
          .receipt-header h1, 
          .receipt-header p, 
          .footer-copyright, 
          .contact-info span,
          .contact-info span strong {
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Fix colors for print */
          .status-badge.status-paid {
            background-color: rgba(56, 161, 105, 0.15) !important;
            color: #276749 !important;
            border: 1px solid rgba(56, 161, 105, 0.3) !important;
          }
          
          .status-badge.status-partial {
            background-color: rgba(236, 201, 75, 0.15) !important;
            color: #975A16 !important;
            border: 1px solid rgba(236, 201, 75, 0.3) !important;
          }
          
          .info-group::before {
            background: linear-gradient(to bottom, #1A365D, #2C5282) !important;
          }
        }
        
        /* Logo watermark styles */
        .logo-background {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: 80%;
          max-width: 600px;
          max-height: 600px;
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.15;
          z-index: 999;
          pointer-events: none;
          display: block; /* Always show logo background */
        }
        
        /* Modern header with premium gradient */
        .receipt-header {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
          color: white;
          padding: 10px 25px;
          position: relative;
          z-index: 220;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        
        .receipt-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 2px;
          letter-spacing: 0.5px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .receipt-header p {
          font-size: 14px;
          font-weight: 600;
          opacity: 0.95;
          margin-bottom: 0;
        }
        
        .logo {
          margin-bottom: 8px;
          text-align: center;
        }
        
        .logo img {
          max-height: 60px;
          max-width: 160px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
          padding: 3px;
          background-color: white;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.7);
        }
        
        /* Header contact info */
        .header-contact-info {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          padding: 5px 0;
          align-items: center;
          direction: ltr;
          margin-top: 5px;
        }
        
        .header-contact-info span {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          background-color: rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          margin: 0 5px;
          color: white;
          font-size: 12px;
          font-weight: 500;
        }
        
        .header-contact-info span strong {
          display: inline-block;
          margin-right: 5px;
        }
        
        /* Modern receipt info bar */
        .receipt-info {
          display: flex;
          justify-content: space-between;
          padding: 10px 25px;
          background-color: #F7FAFC;
          border-bottom: 1px solid #E2E8F0;
          font-weight: 500;
          position: relative;
          z-index: 215;
        }
        
        .receipt-info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background-color: white;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #EDF2F7;
        }
        
        .receipt-info-item strong {
          font-weight: 700;
          color: #2D3748;
          font-size: 13px;
        }
        
        /* Modern receipt body */
        .receipt-body {
          padding: 20px 30px;
          position: relative;
          z-index: 210;
          margin-bottom: 20px; /* Add bottom margin now that we don't have footer */
          padding-bottom: 20px; /* Reduce padding since we don't need space for footer */
          background-color: rgba(255, 255, 255, 0.92);
        }
        
        /* Modern status badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          min-width: 80px;
          margin-bottom: 20px;
        }
        
        .status-paid {
          background-color: rgba(56, 161, 105, 0.15);
          color: #276749;
          border: 1px solid rgba(56, 161, 105, 0.3);
        }
        
        .status-partial {
          background-color: rgba(236, 201, 75, 0.15);
          color: #975A16;
          border: 1px solid rgba(236, 201, 75, 0.3);
        }
        
        .status-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
        }
        
        /* Modern card styling for info groups */
        .info-section {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .info-group {
          flex: 1;
          min-width: 250px;
          background-color: #ffffff;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
          border: 1px solid #E2E8F0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        
        .info-group::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(to bottom, #1A365D, #2C5282);
        }
        
        .info-group:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        
        .info-group h3 {
          color: #1A365D;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #EDF2F7;
          font-weight: 700;
          font-size: 15px;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        
        .info-label {
          font-weight: 700;
          width: 120px;
          color: #4A5568;
          flex-shrink: 0;
          font-size: 12px;
        }
        
        /* Modern table styling */
        .fee-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          border: 2px solid #1A365D;
          table-layout: fixed;
        }
        
        /* Table headers */
        .fee-table th {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
          color: white !important;
          font-weight: bold;
          padding: 10px 15px;
          border: none;
        }
        
        /* Table body */
        .fee-table td {
          padding: 10px 15px;
          border-top: 1px solid #DDD;
          font-size: 14px;
        }
        
        .fee-table tr:last-child {
          background-color: #F0F4F8;
          font-weight: bold;
        }
        
        .fee-table .fee-amount {
          text-align: left;
          direction: ltr;
        }
        
        ${signatureStyles}
      </style>
    `;
  };

  // Handle English receipt generation using PDF download
  const handleEnglishReceipt = async () => {
    try {
      setIsLoading(true);
      toast.loading('Generating English receipt...', { id: 'english-receipt' });
      
      // Get current receipt data (either provided or generated)
      const currentReceiptData = await getCurrentReceiptData();
      
      if (!currentReceiptData) {
        toast.error('Unable to generate receipt data', { id: 'english-receipt' });
        return;
      }
      
      // Process the receipt data to ensure all required fields are set
      const processedData = processReceiptData(currentReceiptData);
      
      // Debug the processed data
      debugData(processedData);
      
      // CRITICAL FIX: Check if it's a transportation fee receipt directly
      const isTransportationReceipt = 
          processedData.feeType === 'transportation' ||
          processedData.feeType === 'نقل مدرسي' ||
          processedData.feeType === 'رسوم النقل' ||
          processedData.feeType === 'رسوم التقل' ||
          processedData.feeType === 'رسوم النقل المدرسي' ||
          (processedData.feeType && processedData.feeType.toLowerCase().includes('transport')) ||
          (processedData.feeType && processedData.feeType.includes('نقل'));
      
      console.log('IS TRANSPORTATION RECEIPT:', isTransportationReceipt);
      
      // Debug the data for troubleshooting
      console.log('PROCESSED DATA:', processedData);
      
      // Set up all the values for generating the receipt
      let englishName = '';
      try {
        if (processedData.englishName && typeof processedData.englishName === 'string' && processedData.englishName.trim() !== '') {
          englishName = processedData.englishName.trim();
          console.log('Using English name from processedData.englishName:', englishName);
        } 
        else if (processedData.student && processedData.student.englishName) {
          englishName = processedData.student.englishName.trim();
          console.log('Using English name from student record:', englishName);
        }
        else if (processedData.studentData && processedData.studentData.englishName) {
          englishName = processedData.studentData.englishName.trim();
          console.log('Using English name from studentData record:', englishName);
        }
        else {
          englishName = transliterateArabic(processedData.studentName);
          console.log('Transliterated name from Arabic:', englishName);
        }
      } catch (e) {
        console.error('Error getting English name:', e);
        // Fall back to transliteration as a last resort
        englishName = transliterateArabic(processedData.studentName) || "Student";
      }
      
      // Get English grade
      const englishGrade = processedData.englishGrade || translateGrade(processedData.grade || '');
      
      // Get English school name from all possible sources
      const englishSchoolName = processedData.englishSchoolName || 
                              processedData.school?.englishSchoolName || 
                              processedData.schoolData?.englishSchoolName || 
                              processedData.schoolSettings?.schoolNameEnglish || 
                              processedData.schoolSettings?.englishName ||
                              processedData.settings?.schoolNameEnglish ||
                              processedData.settings?.englishName ||
                              processedData.schoolName || 
                              'School';
      
      // Get English payment method
      const englishPaymentMethod = translatePaymentMethod(processedData.paymentMethod || 'Cash');
      
      // Format the date in English
      const formattedDate = formatDateEnglish(processedData.date || new Date().toISOString().split('T')[0]);
      
      // Get English fee type - make sure it's translated properly
      const englishFeeType = translateFeeType(processedData.feeType || 'Other');
      console.log('Original fee type:', processedData.feeType);
      console.log('Translated fee type:', englishFeeType);

      // Define installment flag EARLY to avoid TDZ errors in template usage
      const receiptNumber = processedData.receiptNumber || '';
      const installmentNumber = processedData.installmentNumber || null;
      const installmentMonth = processedData.installmentMonth || '';
      const installmentDetails = processedData.installmentDetails || '';
      const _isInstallmentReceipt = Boolean(
        (typeof receiptNumber === 'string' && receiptNumber.startsWith('INST-')) ||
        installmentNumber || installmentMonth || installmentDetails || processedData.isInstallment
      );
      
      // Get the correct currency symbol from data (don't default to SAR)
      const currencySymbol = processedData.currency || CURRENCY_EN || '$';
      
      // CRITICAL FIX: Handle transportation fees for transportation receipts
      let transportationFees = 0;
      let tuitionFees = 0;
      let discount = 0;
      
      // Extract discount value from data
      if (typeof processedData.discount === 'number' && !isNaN(processedData.discount)) {
        discount = processedData.discount;
      } else if (processedData.fee && typeof processedData.fee.discount === 'number' && !isNaN(processedData.fee.discount)) {
        discount = processedData.fee.discount;
      } else if (processedData.student && processedData.student.tuitionDiscount && !isNaN(processedData.student.tuitionDiscount)) {
        discount = processedData.student.tuitionDiscount;
      }
      
      console.log('Extracted discount value:', discount);
      
      if (isTransportationReceipt) {
        // For transportation receipts, put the full amount in transportation fees
        transportationFees = Number(processedData.totalAmount || processedData.amount || 0);
        tuitionFees = 0;
        console.log('TRANSPORTATION RECEIPT: Setting full amount to transportation fees:', transportationFees);
      } else {
        // For other receipt types, extract transportation fees
        transportationFees = await getTransportationFees();
        
        // IMPORTANT FIX: Calculate tuition fees correctly
        // First check if we have a direct tuitionFees value
        if (typeof processedData.tuitionFees === 'number' && !isNaN(processedData.tuitionFees)) {
          // Use the direct tuition fees value if provided
          tuitionFees = processedData.tuitionFees;
          console.log('ENGLISH RECEIPT: Using direct tuitionFees value:', tuitionFees);
        }
        // If discountedAmount is available, use that directly as it already includes the discount
        else if (typeof processedData.discountedAmount === 'number' && !isNaN(processedData.discountedAmount)) {
          tuitionFees = processedData.discountedAmount;
          console.log('ENGLISH RECEIPT: Using discountedAmount value:', tuitionFees);
        }
        // Try to get from student data
        else if (processedData.student && typeof processedData.student.tuitionFee === 'number' && !isNaN(processedData.student.tuitionFee)) {
          tuitionFees = processedData.student.tuitionFee;
          console.log('ENGLISH RECEIPT: Using student.tuitionFee value:', tuitionFees);
        }
        // Try to get from hybridApi with fallback to dataStore
        else if (processedData.studentId) {
          try {
            const feesResponse = await hybridApi.getFees(processedData.schoolId, processedData.studentId);
            let fees = feesResponse?.success ? feesResponse.data : [];
            
            if (!fees || fees.length === 0) {
              // Fallback to dataStore if hybridApi fails
              if (typeof window !== 'undefined' && (window as any).dataStore) {
                const dataStore = (window as any).dataStore;
                fees = dataStore.getFees(processedData.schoolId, processedData.studentId);
              }
            }
            
            const tuitionFee = fees.find((f: any) => 
              f.feeType === 'tuition' || 
              (typeof f.feeType === 'string' && f.feeType.toLowerCase().includes('tuition'))
            );
            
            if (tuitionFee) {
              tuitionFees = Number(tuitionFee.amount || 0);
              console.log('ENGLISH RECEIPT: Using tuition fee from hybridApi/dataStore:', tuitionFees);
            }
          } catch (error) {
            console.error('Error trying to fetch tuition fee from hybridApi/dataStore in English receipt:', error);
          }
        }
        // Only as a last resort, calculate as total minus transportation
        else {
          tuitionFees = (Number(processedData.totalAmount || processedData.amount || 0) - transportationFees);
          console.log('ENGLISH RECEIPT: Calculating tuition as total minus transportation:', tuitionFees);
        }
        
        console.log('REGULAR RECEIPT: Transportation Fees:', transportationFees, 'Tuition Fees:', tuitionFees, 'Discount:', discount);
      }
      
      // Function to extract transportation fees from receipt data
      async function getTransportationFees() {
        // Try direct value if available
        if (typeof processedData.transportationFees === 'number' && !isNaN(processedData.transportationFees)) {
          return processedData.transportationFees;
        }
        // Look for other possible sources
        else if (typeof processedData.transportationAmount === 'number' && !isNaN(processedData.transportationAmount)) {
          return processedData.transportationAmount;
        }
        else if (typeof processedData.transportationFee === 'number' && !isNaN(processedData.transportationFee)) {
          return processedData.transportationFee;
        }
        // Check student record
        else if (processedData.student && typeof processedData.student.transportationFee === 'number' && !isNaN(processedData.student.transportationFee)) {
          return processedData.student.transportationFee;
        }
        // Check fee record
        else if (processedData.fee && typeof processedData.fee.transportationFees === 'number' && !isNaN(processedData.fee.transportationFees)) {
          return processedData.fee.transportationFees;
        }
        // IMPORTANT: Try to get transportation fee from hybridApi with fallback to dataStore if we have studentId
        else if (processedData.studentId) {
          try {
            // First try hybridApi
            const feesResponse = await hybridApi.getFees(processedData.schoolId, processedData.studentId);
            let fees = feesResponse?.success ? feesResponse.data : [];
            let student = null;
            
            if (fees && fees.length > 0) {
              const transportFee = fees.find((f: any) => 
                f.feeType === 'transportation' || 
                (typeof f.feeType === 'string' && f.feeType.toLowerCase().includes('transport'))
              );
              
              if (transportFee) {
                console.log('IMPORTANT: Found transportation fee from hybridApi in English receipt:', transportFee.amount);
                return Number(transportFee.amount || 0);
              }
            }
            
            // Try to get student data from hybridApi
            const studentResponse = await hybridApi.getStudent(processedData.studentId);
            student = studentResponse?.success ? studentResponse.data : null;
            
            if (student && student.transportationFee) {
              console.log('IMPORTANT: Using student.transportationFee from hybridApi in English receipt:', student.transportationFee);
              return Number(student.transportationFee || 0);
            }
            
            // Fallback to dataStore if hybridApi fails
            if (typeof window !== 'undefined' && (window as any).dataStore) {
              const dataStore = (window as any).dataStore;
              
              if (!fees || fees.length === 0) {
                fees = dataStore.getFees(processedData.schoolId, processedData.studentId);
                const transportFee = fees.find((f: any) => 
                  f.feeType === 'transportation' || 
                  (typeof f.feeType === 'string' && f.feeType.toLowerCase().includes('transport'))
                );
                
                if (transportFee) {
                  console.log('IMPORTANT: Found transportation fee from dataStore fallback in English receipt:', transportFee.amount);
                  return Number(transportFee.amount || 0);
                }
              }
              
              if (!student) {
                student = dataStore.getStudent(processedData.studentId);
                if (student && student.transportationFee) {
                  console.log('IMPORTANT: Using student.transportationFee from dataStore fallback in English receipt:', student.transportationFee);
                  return Number(student.transportationFee || 0);
                }
              }
            }
          } catch (error) {
            console.error('Error trying to fetch transportation fee from hybridApi/dataStore in English receipt:', error);
          }
        }
        // Check customAmount from bulk imports
        else if (typeof processedData.customAmount === 'number' && !isNaN(processedData.customAmount)) {
          return processedData.customAmount;
        }
        // Check if this is a transportation fee type
        else if (processedData.feeType && (
          processedData.feeType === 'transportation' || 
          processedData.feeType === 'نقل مدرسي' || 
          processedData.feeType === 'رسوم النقل' || 
          processedData.feeType === 'رسوم التقل' ||
          processedData.feeType === 'رسوم النقل المدرسي' ||
          (typeof processedData.feeType === 'string' && processedData.feeType.toLowerCase().includes('transport')) ||
          (typeof processedData.feeType === 'string' && processedData.feeType.toLowerCase().includes('نقل')) ||
          (typeof processedData.feeType === 'string' && processedData.feeType.toLowerCase().includes('باص')) ||
          (typeof processedData.feeType === 'string' && processedData.feeType.toLowerCase().includes('bus'))
        )) {
          return Number(processedData.amount || 0);
        }
        // Check fees array
        else if (processedData.fees && Array.isArray(processedData.fees)) {
          const transportationFee = processedData.fees.find((fee: any) => 
            fee.feeType === 'transportation' || 
            fee.feeType === 'نقل مدرسي' ||
            fee.feeType === 'رسوم النقل' ||
            fee.feeType === 'رسوم التقل' ||
            fee.feeType === 'رسوم النقل المدرسي' ||
            (typeof fee.feeType === 'string' && fee.feeType.toLowerCase().includes('transport')) ||
            (typeof fee.feeType === 'string' && fee.feeType.toLowerCase().includes('نقل')) ||
            (typeof fee.feeType === 'string' && fee.feeType.toLowerCase().includes('باص')) ||
            (typeof fee.feeType === 'string' && fee.feeType.toLowerCase().includes('bus'))
          );
          if (transportationFee) {
            return Number(transportationFee.amount || 0);
          }
        }
        // Check bulk import data
        else if (processedData.bulkData || processedData.importData) {
          const bulkData = processedData.bulkData || processedData.importData;
          if (bulkData && typeof bulkData === 'object') {
            // Check if there's a transportation field in the bulk data
            for (const key in bulkData) {
              if (typeof key === 'string' && 
                  (key.toLowerCase().includes('transport') || 
                   key.toLowerCase().includes('نقل') || 
                   key.toLowerCase().includes('باص') ||
                   key.toLowerCase().includes('bus') ||
                   key.toLowerCase().includes('custom')) && 
                  !isNaN(Number(bulkData[key]))) {
                return Number(bulkData[key]);
              }
            }
          }
        }
        
        // Last resort: scan all properties
        for (const key in processedData) {
          if (typeof key === 'string' && 
              (key.toLowerCase().includes('transport') || 
               key.toLowerCase().includes('نقل') || 
               key.toLowerCase().includes('باص') ||
               key.toLowerCase().includes('bus') ||
               key.toLowerCase().includes('custom')) && 
              !isNaN(Number(processedData[key]))) {
            return Number(processedData[key]);
          }
        }
        
        // Return 0 if no transportation fees found
        return 0;
      }
      
      console.log('FINAL FEE CALCULATION:', {
        isTransportationReceipt,
        totalAmount: processedData.totalAmount || processedData.amount || 0,
        transportationFees,
        tuitionFees
      });

      // Restore core calculations used by the table rendering
      const tuitionAfterDiscount = Math.max(0, Number(tuitionFees || 0) - Number(discount || 0));
      const transportationAmount = Number(transportationFees || 0);
      const totalFeesAmount = tuitionAfterDiscount + transportationAmount;

      // Paid amounts
      let tuitionPaidAmount = 0;
      let transportationPaidAmount = 0;
      const actualPaidAmount = Number(processedData.amount || processedData.totalAmount || 0);
      if (typeof processedData.tuitionPaidAmount === 'number' && typeof processedData.transportationPaidAmount === 'number') {
        tuitionPaidAmount = Number(processedData.tuitionPaidAmount || 0);
        transportationPaidAmount = Number(processedData.transportationPaidAmount || 0);
      } else if (isTransportationReceipt) {
        transportationPaidAmount = actualPaidAmount;
        tuitionPaidAmount = 0;
      } else {
        tuitionPaidAmount = actualPaidAmount;
        transportationPaidAmount = 0;
      }

      // Remaining amounts
      const tuitionRemainingAmount = Math.max(0, tuitionAfterDiscount - tuitionPaidAmount);
      const transportationRemainingAmount = Math.max(0, transportationAmount - transportationPaidAmount);
      const totalCalculatedPaid = tuitionPaidAmount + transportationPaidAmount;
      const totalRemainingAmount = tuitionRemainingAmount + transportationRemainingAmount;

      // Determine combined receipt behavior and display labels
      const isCombinedReceipt = (processedData.feeType === 'transportation_and_tuition') ||
        (typeof englishFeeType === 'string' && englishFeeType.toLowerCase().includes('combined')) ||
        (typeof processedData.feeType === 'string' && processedData.feeType.toLowerCase().includes('transportation_and_tuition'));

      const combinedTotalAmount = (tuitionAfterDiscount || 0) + (transportationAmount || 0);
      const combinedPaidAmount = (tuitionPaidAmount || 0) + (transportationPaidAmount || 0);
      const combinedRemainingAmount = Math.max(0, combinedTotalAmount - combinedPaidAmount);

      const displayFeeType = isCombinedReceipt ? 'Combined Fees' : (isTransportationReceipt ? 'Transportation Fees' : englishFeeType);

      // Pre-build table body HTML to avoid nested template parsing issues
      const bodyRowsHTML = isCombinedReceipt
        ? `
              <!-- Combined fees receipt -->
              <tr>
                <td>Combined Fees</td>
                <td class="fee-amount">${combinedTotalAmount.toFixed(2)} ${currencySymbol}</td>
              </tr>

              <tr style="background-color: #e8f5e8; color: #2F855A;">
                <td>Combined Fees Paid</td>
                <td class="fee-amount">
                  ${combinedPaidAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>

              ${combinedRemainingAmount > 0 ? `
              <tr style="background-color: #fff5f5; color: #C53030;">
                <td>Remaining Combined Fees</td>
                <td class="fee-amount">
                  ${combinedRemainingAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              ` : ''}

              <tr style="background-color: #f0f0f0; font-weight: bold;">
                <td><strong>Total</strong></td>
                <td class="fee-amount"><strong>${combinedTotalAmount.toFixed(2)} ${currencySymbol}</strong></td>
              </tr>
        `
        : ((isTransportationReceipt || (englishFeeType && (englishFeeType.includes('Transportation Fees') || englishFeeType.includes('نقل'))))
            ? `
              <!-- Transportation-only receipt -->
              <!-- Transportation fees -->
              <tr>
                <td>Transportation Fees</td>
                <td class="fee-amount">${transportationAmount.toFixed(2)} ${currencySymbol}</td>
              </tr>
              
              <!-- Transportation Fees Paid -->
              <tr style="background-color: #e8f5e8; color: #2F855A;">
                <td>Transportation Fees Paid</td>
                <td class="fee-amount">
                  ${transportationPaidAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              
              ${transportationRemainingAmount > 0 ? `
              <!-- Remaining Transportation Fees -->
              <tr style="background-color: #fff5f5; color: #C53030;">
                <td>Remaining Transportation Fees</td>
                <td class="fee-amount">
                  ${transportationRemainingAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              ` : ''}
              
              <!-- Total for Transportation -->
              <tr style="background-color: #f0f0f0; font-weight: bold;">
                <td><strong>Total</strong></td>
                <td class="fee-amount"><strong>${transportationAmount.toFixed(2)} ${currencySymbol}</strong></td>
              </tr>
            `
            : `
              <!-- Full receipt with all fees -->
              <!-- Show tuition fees with discount already applied -->
              <tr>
                <td>${_isInstallmentReceipt ? 'Installment Fees' : 'Tuition Fees'}</td>
                <td class="fee-amount">${tuitionAfterDiscount.toFixed(2)} ${currencySymbol}</td>
              </tr>
              
              <!-- Transportation fees -->
              <tr>
                <td>Transportation Fees</td>
                <td class="fee-amount">${transportationAmount.toFixed(2)} ${currencySymbol}</td>
              </tr>
              
              <!-- Total fees -->
              <tr style="background-color: #f0f0f0;">
                <td><strong>Total Fees</strong></td>
                <td class="total-amount"><strong>${totalFeesAmount.toFixed(2)} ${currencySymbol}</strong></td>
              </tr>
              
              <!-- Tuition Fees Paid -->
              <tr style="background-color: #e8f5e8; color: #2F855A;">
                <td>${_isInstallmentReceipt ? 'Installment Fees Paid' : 'Tuition Fees Paid'}</td>
                <td class="fee-amount">
                  ${tuitionPaidAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              
              <!-- Transportation Fees Paid -->
              <tr style="background-color: #e8f5e8; color: #2F855A;">
                <td>Transportation Fees Paid</td>
                <td class="fee-amount">
                  ${transportationPaidAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              
              <!-- Total Paid Amount -->
              <tr style="background-color: #d4edda; color: #155724; font-weight: bold;">
                <td><strong>Total Paid Amount</strong></td>
                <td class="fee-amount">
                  <strong>${totalCalculatedPaid.toFixed(2)} ${currencySymbol}</strong>
                </td>
              </tr>
              
              ${tuitionRemainingAmount > 0 ? `
              <!-- Remaining Tuition Fees -->
              <tr style="background-color: #fff5f5; color: #C53030;">
                <td>Remaining Tuition Fees</td>
                <td class="fee-amount">
                  ${tuitionRemainingAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              ` : ''}
              
              ${transportationRemainingAmount > 0 ? `
              <!-- Remaining Transportation Fees -->
              <tr style="background-color: #fff5f5; color: #C53030;">
                <td>Remaining Transportation Fees</td>
                <td class="fee-amount">
                  ${transportationRemainingAmount.toFixed(2)} ${currencySymbol}
                </td>
              </tr>
              ` : ''}
              
              <!-- Total Remaining Amount -->
              <tr style="background-color: #fff5f5; color: #C53030; font-weight: bold;">
                <td><strong>Total Remaining Amount</strong></td>
                <td class="fee-amount">
                  <strong>${totalRemainingAmount.toFixed(2)} ${currencySymbol}</strong>
                </td>
              </tr>
            `);

      // Generate the HTML content with all required data
      const receiptDataWithSettings = {
        ...processedData,
        studentName: englishName, // Use English name for student
        grade: englishGrade, // Use English grade
        englishSchoolName: englishSchoolName,
        schoolNameEnglish: englishSchoolName,
        englishName: englishName,
        paymentMethod: englishPaymentMethod,
        date: formattedDate,
        paymentDate: processedData.paymentDate || processedData.date || new Date().toISOString().split('T')[0],
        feeType: (processedData.feeType === 'transportation_and_tuition')
          ? 'Transportation & Tuition Fees'
          : (isTransportationReceipt ? 'Transportation Fees' : englishFeeType),
        transportationFees: transportationFees, // Ensure transportation fees are passed
        tuitionFees: tuitionFees, // Use the calculated tuition fees
        discount: discount, // Make sure discount is included
        isTransportationReceipt: isTransportationReceipt, // Restore original behavior
        currency: currencySymbol, // Use correct currency
        showWatermark: true,
        showSignature: Boolean(receiptSettings.showSignature),
        showStamp: false,
        showFooter: Boolean(receiptSettings.showFooter),
        isEnglishReceipt: true,
        // Ensure bank name and check date are included
        bankName: processedData.bankName || '',
        checkNumber: processedData.checkNumber || '',
        checkDate: processedData.checkDate || '',
        bankNameEnglish: processedData.bankNameEnglish || '',
        // Preserve all school settings from original data
        schoolLogo: processedData.schoolLogo || '',
        schoolPhone: processedData.schoolPhone || '',
        schoolPhoneWhatsapp: processedData.schoolPhoneWhatsapp || '',
        schoolPhoneCall: processedData.schoolPhoneCall || '',
        schoolEmail: processedData.schoolEmail || '',
        schoolName: processedData.schoolName || '',
        showLogoBackground: processedData.showLogoBackground !== false
      };
      
      console.log('EnglishReceiptButton - Receipt data with applied settings:', receiptDataWithSettings);
      
      // Generate the HTML content
      const htmlContent = generateReceiptHTML(receiptDataWithSettings);
      console.log('HTML content generated successfully');
      
      // Add debug info to check if transportation fees are correctly passed
      console.log('FINAL VERIFICATION - Receipt data with transportation fees:', {
        transportationFees: receiptDataWithSettings.transportationFees,
        tuitionFees: receiptDataWithSettings.tuitionFees,
        totalAmount: receiptDataWithSettings.totalAmount,
        amount: receiptDataWithSettings.amount
      });
      
      // Generate a filename based on student name and receipt number
      const sanitizedName = englishName.replace(/\s+/g, '_');
      // Add timestamp as cache buster to force regeneration
      const timestamp = new Date().getTime();
      const fileName = `English_Receipt_${processedData.receiptNumber || ''}_${sanitizedName}_${timestamp}.pdf`;
      console.log('Generated filename:', fileName);
      
      // Create a complete HTML document with proper LTR direction and styling
      const completeHtml = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>English Receipt</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: 210mm 297mm;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      font-family: 'Tajawal', Arial, sans-serif;
      direction: ltr;
      text-align: left;
      margin: 0;
      padding: 0;
      background-color: white;
      width: 210mm;
      height: 297mm;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
      
      // Use the native Electron PDF generation for consistent results
      if (window.electronAPI && window.electronAPI.generatePDF) {
        window.electronAPI.generatePDF(completeHtml, fileName, {
          printBackground: true,
          landscape: false,
          format: 'A4',
          margin: {
            top: '0',
            bottom: '0',
            left: '0',
            right: '0'
          },
          preferCSSPageSize: true
        }).then((result: any) => {
          if (result.success) {
            toast.success('English receipt PDF saved', { id: 'english-receipt' });
          } else if (result.canceled) {
            toast.dismiss('english-receipt');
          } else {
            console.error('PDF generation failed:', result.error);
            fallbackPdfDownload(completeHtml, fileName);
          }
        }).catch((error: any) => {
          console.error('Error generating PDF:', error);
          fallbackPdfDownload(completeHtml, fileName);
        });
      } else {
        // Fall back to pdfPrinter if electronAPI is not available
        fallbackPdfDownload(completeHtml, fileName);
      }
    } catch (error) {
      console.error('Error generating English receipt:', error);
      toast.error(`Error generating receipt: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'english-receipt', duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback function for PDF download if Electron save dialog is not available
  const fallbackPdfDownload = (htmlContent: string, fileName: string) => {
    console.log('Using fallback PDF download method');
    
    try {
      toast.loading('Saving English receipt...', { id: 'english-receipt' });
      
      // Call the downloadAsPDF function from pdfPrinter
      pdfPrinter.downloadAsPDF(htmlContent, fileName, {
        margin: {
          top: '0',
          bottom: '0',
          left: '0',
          right: '0'
        },
        printBackground: true,
        preferCSSPageSize: true,
        landscape: false
      });
      
      toast.success('English receipt PDF download initiated', { id: 'english-receipt' });
    } catch (error) {
      console.error('Error in fallback PDF download:', error);
      toast.error(`PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'english-receipt' });
    }
  };

  // Render in compact mode for table cells
  if (compact) {
    return (
      <button
        onClick={handleEnglishReceipt}
        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
        title="عرض باللغة الإنجليزية"
      >
        <Download size={18} />
      </button>
    );
  }

  // Render full button
  return (
    <button
      onClick={handleEnglishReceipt}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
    >
      <span className="mr-2 font-medium">عرض باللغة الإنجليزية</span>
      <Download size={18} />
    </button>
  );
};

export default EnglishReceiptButton;