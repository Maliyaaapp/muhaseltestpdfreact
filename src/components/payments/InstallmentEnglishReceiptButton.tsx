import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, Settings, FileSignature } from 'lucide-react';
import pdfPrinter, { openPrintWindow } from '../../services/pdfPrinter';
import { CURRENCY_EN } from '../../utils/constants';
import { format } from 'date-fns';
import { arToEnNumber } from '../../utils/helpers';
import { getBigCenteredLogoWatermark } from '../../services/pdf/utils/print-styles';
import { reserveReceiptNumbers, getNextReceiptNumber } from '../../utils/receiptCounter';
import { generateReceiptNumber } from '../../utils/helpers';
import hybridApi from '../../services/hybridApi';

// Define props interface
interface InstallmentEnglishReceiptButtonProps {
  receiptData: any;
  compact?: boolean;
}

/**
 * InstallmentEnglishReceiptButton Component
 * A specialized version of EnglishReceiptButton for installment receipts
 * Prefixes receipt numbers with "INST-" to distinguish from fee receipts
 */
const InstallmentEnglishReceiptButton: React.FC<InstallmentEnglishReceiptButtonProps> = ({ receiptData, compact = false }) => {
  // Use settings from the receiptData
  const schoolSettings = receiptData.schoolSettings || {
    schoolName: 'School Name',
    schoolNameEnglish: '',
    schoolLogo: '',
    currency: 'USD'
  };
  
  // Use the settings from receiptData if available, otherwise use defaults
  const [receiptSettings, setReceiptSettings] = useState({
    showWatermark: Boolean(receiptData.showWatermarkOnReceipt !== undefined ? receiptData.showWatermarkOnReceipt : true),
    // Always initialize signature to true, we'll provide a toggle button for it
    showSignature: true,
    // Force stamps to be always off
    showStamp: false,
    showFooter: Boolean(receiptData.showFooterOnReceipt !== undefined ? receiptData.showFooterOnReceipt : true),
  });
  
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
  const debugData = () => {
    console.log('RECEIPT DATA:', receiptData);
    console.log('Student Data:', {
      name: receiptData.studentName,
      englishName: receiptData.englishName,
      paymentMethod: receiptData.paymentMethod,
      isPartialPayment: receiptData.isPartialPayment
    });
    
    // Log contact information
    console.log('Contact Information:', {
      schoolPhone: receiptData.schoolPhone,
      schoolPhoneWhatsapp: receiptData.schoolPhoneWhatsapp,
      schoolPhoneCall: receiptData.schoolPhoneCall,
      schoolEmail: receiptData.schoolEmail
    });
    
    // Log student record if exists
    if (receiptData.student) {
      console.log('Student Record:', receiptData.student);
    }
    
    // Check data type for English name
    if (receiptData.englishName) {
      console.log('English name type:', typeof receiptData.englishName);
    }
  };

  // Translation functions
  const translateFeeType = (feeType: string): string => {
    const feeTypes: Record<string, string> = {
      'tuition': 'Installment Fees',
      'رسوم دراسية': 'Installment Fees',
      'installment': 'Installment Fees',
      'قسط': 'Installment Fees',
      'transportation': 'Transportation',
      'نقل مدرسي': 'Transportation',
      'activities': 'Activities',
      'أنشطة': 'Activities',
      'uniform': 'School Uniform',
      'زي مدرسي': 'School Uniform',
      'books': 'Books',
      'كتب': 'Books',
      'other': 'Other Fees',
      'رسوم أخرى': 'Other Fees'
    };
    // For installment receipts, default to "Installment Fees" if not found
    return feeTypes[feeType] || 'Installment Fees';
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

  // Helper to translate Arabic month names to English
  const arabicToEnglishMonth: Record<string, string> = {
    'يناير': 'January',
    'فبراير': 'February',
    'مارس': 'March',
    'أبريل': 'April',
    'مايو': 'May',
    'يونيو': 'June',
    'يوليو': 'July',
    'أغسطس': 'August',
    'سبتمبر': 'September',
    'أكتوبر': 'October',
    'نوفمبر': 'November',
    'ديسمبر': 'December'
  };

  function translateMonthToEnglish(month: string): string {
    if (!month) return '';
    // Remove 'شهر' if present and trim
    const clean = month.replace(/شهر/g, '').trim();
    return arabicToEnglishMonth[clean] || clean;
  }

  // Handle English receipt generation
  const handleInstallmentEnglishReceipt = async () => {
    try {
      console.log('InstallmentEnglishReceiptButton - Receipt Data:', receiptData);
      try {
        if ((!receiptData.englishName || receiptData.englishName.trim() === '') && (receiptData.studentInternalId || receiptData.studentId)) {
          const { hybridApi } = await import('../../services/hybridApi');
          const studentResp = await hybridApi.getStudent(receiptData.studentInternalId || receiptData.studentId);
          if (studentResp?.success && studentResp?.data && studentResp.data.englishName) {
            receiptData.englishName = studentResp.data.englishName;
            receiptData.student = studentResp.data;
          }
        }
      } catch {}
      
      // Calculate remaining amounts if not provided
      let remainingTuitionAmount = receiptData.remainingTuitionAmount || 0;
      let remainingTransportationAmount = receiptData.remainingTransportationAmount || 0;
      
      // If remaining amounts are not provided or are 0, try to calculate them
      if ((!remainingTuitionAmount && !remainingTransportationAmount) || 
          (remainingTuitionAmount === 0 && remainingTransportationAmount === 0)) {
        try {
          // Import hybridApi to calculate remaining amounts
          const { hybridApi } = await import('../../services/hybridApi');
          
          // Get user from localStorage or context
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          
          if (user?.schoolId && (receiptData.studentInternalId || receiptData.studentId)) {
            const studentFeesResponse = await hybridApi.getFees(user.schoolId, receiptData.studentInternalId || receiptData.studentId);
            if (studentFeesResponse?.success && studentFeesResponse?.data) {
              const studentFees = studentFeesResponse.data;
              
              // Calculate total tuition and transportation fees
              let totalTuitionFees = 0;
              let totalTransportationFees = 0;
              let totalTuitionPaid = 0;
              let totalTransportationPaid = 0;
              
              for (const studentFee of studentFees) {
                if (studentFee.feeType === 'tuition' || studentFee.feeType === 'رسوم دراسية') {
                  totalTuitionFees += (studentFee.amount - studentFee.discount);
                  totalTuitionPaid += studentFee.paid || 0;
                } else if (studentFee.feeType === 'transportation' || studentFee.feeType === 'رسوم نقل') {
                  totalTransportationFees += (studentFee.amount - studentFee.discount);
                  totalTransportationPaid += studentFee.paid || 0;
                }
              }
              
              remainingTuitionAmount = Math.max(0, totalTuitionFees - totalTuitionPaid);
              remainingTransportationAmount = Math.max(0, totalTransportationFees - totalTransportationPaid);
            }
          }
        } catch (error) {
          console.error('Error calculating remaining amounts:', error);
          // Fallback to provided values or 0
          remainingTuitionAmount = receiptData.remainingTuitionAmount || 0;
          remainingTransportationAmount = receiptData.remainingTransportationAmount || 0;
        }
      }
      
      // Calculate tuition and transportation fees
      let transportationFees = 0;
      let tuitionFees = 0;
      
      console.log('Fee calculation debug:', {
        receiptData: {
          transportationFees: receiptData.transportationFees,
          transportationAmount: receiptData.transportationAmount,
          transportationFee: receiptData.transportationFee,
          customAmount: receiptData.customAmount,
          feeType: receiptData.feeType,
          amount: receiptData.amount,
          totalAmount: receiptData.totalAmount,
          discountedAmount: receiptData.discountedAmount
        }
      });
      
      // Check if transportation fees are directly provided (FIXED: Remove customAmount from transportation calculation)
      if (typeof receiptData.transportationFees === 'number' && !isNaN(receiptData.transportationFees)) {
        transportationFees = receiptData.transportationFees;
      } else if (typeof receiptData.transportationAmount === 'number' && !isNaN(receiptData.transportationAmount)) {
        transportationFees = receiptData.transportationAmount;
      } else if (typeof receiptData.transportationFee === 'number' && !isNaN(receiptData.transportationFee)) {
        transportationFees = receiptData.transportationFee;
      } else if (receiptData.student && typeof receiptData.student.transportationFee === 'number' && !isNaN(receiptData.student.transportationFee)) {
        transportationFees = receiptData.student.transportationFee;
      }
      
      // FIXED: Determine if this is a transportation fee payment based on fee type
      const isTransportationPayment = receiptData.feeType && 
        (receiptData.feeType.toLowerCase().includes('transportation') || 
         receiptData.feeType.toLowerCase().includes('transport') ||
         receiptData.feeType.toLowerCase().includes('مواصلات'));
      
      // Calculate tuition and transportation fees based on payment type
      if (isTransportationPayment) {
        // This is a transportation fee payment
        transportationFees = Number(receiptData.amount || receiptData.totalAmount || 0);
        tuitionFees = 0;
      } else {
        // This is a tuition fee payment
        if (typeof receiptData.discountedAmount === 'number' && !isNaN(receiptData.discountedAmount)) {
          tuitionFees = receiptData.discountedAmount;
        } else {
          tuitionFees = Number(receiptData.totalAmount || receiptData.amount || 0);
        }
        // Keep any existing transportation fees from student profile but don't add to current payment
        if (transportationFees === 0 && receiptData.student && typeof receiptData.student.transportationFee === 'number') {
          // Only show transportation fee in breakdown if it's part of a combined payment
          transportationFees = 0; // Don't show transportation fees for tuition-only payments
        }
      }
      
      console.log('Final fee calculation:', {
        isTransportationPayment,
        transportationFees,
        tuitionFees,
        totalAmount: tuitionFees + transportationFees
      });
      
      // Enhanced receipt data with all necessary information
      const enhancedReceiptData = {
        ...receiptData,
        transportationFees: transportationFees,
        tuitionFees: tuitionFees,
        remainingTuitionAmount: remainingTuitionAmount,
        remainingTransportationAmount: remainingTransportationAmount,
        showSignature: receiptSettings.showSignature,
        isInstallment: true
      };
      
      const htmlContent = generateReceiptHTML(enhancedReceiptData);
      
      // FIXED: Use fallbackPdfDownload to ensure PDF download instead of just print window
      fallbackPdfDownload(htmlContent, `Installment_Receipt_${receiptData.receiptNumber || 'receipt'}_${receiptData.studentName || 'student'}.pdf`);
      
      toast.success('Downloading English Installment Receipt...', { id: 'english-receipt' });
    } catch (error) {
      console.error('Error generating English installment receipt:', error);
      toast.error(`Error generating receipt: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'english-receipt' });
    }
  };

  // Generate HTML for the receipt
  const generateReceiptHTML = (receiptData: any): string => {
    const currencySymbol = CURRENCY_EN;
    
    // IMPORTANT: Convert settings to boolean explicitly and log for debugging
    const showWatermark = Boolean(receiptSettings.showWatermark);
    const showStamp = Boolean(receiptSettings.showStamp);
    const showSignature = Boolean(receiptSettings.showSignature);
    const showFooter = Boolean(receiptSettings.showFooter);
    
    // Debug settings state for troubleshooting
    console.log('Generating InstallmentEnglishReceipt HTML with settings:', {
      receiptDataSettings: {
        showStampOnInstallmentReceipt: receiptData.showStampOnInstallmentReceipt,
        showStampOnReceipt: receiptData.showStampOnReceipt,
        showSignatureOnInstallmentReceipt: receiptData.showSignatureOnInstallmentReceipt,
        showSignatureOnReceipt: receiptData.showSignatureOnReceipt
      },
      finalSettings: {
        showWatermark,
        showStamp,
        showSignature,
        showFooter
      }
    });
    
    const discount = receiptData.discount || 0;
    
    // Get school contact information from all possible sources
    const schoolPhone = receiptData.schoolPhone || 
                        receiptData.school?.phone || 
                        receiptData.schoolData?.phone || 
                        receiptData.schoolSettings?.phone || 
                        receiptData.settings?.phone || '';
                        
    const schoolPhoneWhatsapp = receiptData.schoolPhoneWhatsapp || 
                               receiptData.school?.whatsappPhone || 
                               receiptData.schoolData?.whatsappPhone || 
                               receiptData.schoolSettings?.whatsappPhone || 
                               receiptData.settings?.whatsappPhone || '';
                               
    const schoolPhoneCall = receiptData.schoolPhoneCall || 
                           receiptData.school?.callPhone || 
                           receiptData.schoolData?.callPhone || 
                           receiptData.schoolSettings?.callPhone || 
                           receiptData.settings?.callPhone || '';
                           
    const schoolEmail = receiptData.schoolEmail || 
                       receiptData.school?.email || 
                       receiptData.schoolData?.email || 
                       receiptData.schoolSettings?.email || 
                       receiptData.settings?.email || '';
    
    // More comprehensive approach to get student English name
    const englishName = receiptData.englishName || (receiptData.student?.englishName || '') || transliterateArabic(receiptData.studentName || '');
    
    // Set default English language values if not provided
    const englishGrade = receiptData.englishGrade || translateGrade(receiptData.grade || '');
    const englishSchoolName = receiptData.englishSchoolName || 'School';
    
    // Get payment method
    const paymentMethod = translatePaymentMethod(receiptData.paymentMethod || 'cash');
    
    // Handle English fee type
    const englishFeeType = translateFeeType(receiptData.feeType || 'Other Fee');
    
    // Format amount in words
    const amountInWords = convertToWords(receiptData.amount || 0);
    
    // Get payment status label
    const getPaymentStatusLabel = () => {
      // Debug payment status
      console.log('Payment Status Check:', {
        isPartialPayment: receiptData.isPartialPayment,
        isPaid: receiptData.isPaid,
        paidAmount: receiptData.paidAmount,
        amount: receiptData.amount,
        status: receiptData.status
      });
      
      // Use the actual status from the receipt data
      if (receiptData.status === 'partial' || receiptData.isPartialPayment) {
        return '<div class="status-badge" style="background-color: rgba(255, 204, 0, 0.15); color: #975A16; border: 1px solid rgba(255, 204, 0, 0.3); display: inline-flex; align-items: center; justify-content: center; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; min-width: 80px; margin-bottom: 20px;">Partial Payment</div>';
      } else if (receiptData.status === 'paid' || receiptData.isPaid) {
        return '<div class="status-badge" style="background-color: rgba(72, 187, 120, 0.15); color: #2F855A; border: 1px solid rgba(72, 187, 120, 0.3); display: inline-flex; align-items: center; justify-content: center; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; min-width: 80px; margin-bottom: 20px;">Paid</div>';
      } else {
        return '<div class="status-badge" style="background-color: rgba(229, 62, 62, 0.15); color: #C53030; border: 1px solid rgba(229, 62, 62, 0.3); display: inline-flex; align-items: center; justify-content: center; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; min-width: 80px; margin-bottom: 20px;">Unpaid</div>';
      }
    };

    // Check if we have a school logo and create logo HTML
    const logoHTML = receiptData.schoolLogo ? 
      `<div class="logo"><img src="${receiptData.schoolLogo}" alt="${englishSchoolName}" onerror="this.style.display='none'" /></div>` : '';

    // Format date to English format
    const formattedDateEnglish = formatDateEnglish(receiptData.date || new Date().toISOString().split('T')[0]);

    // School name defaulting
    const schoolName = englishSchoolName;

    // Create the HTML receipt
    return `
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="format-detection" content="telephone=no">
        <meta name="print-color-adjust" content="exact">
        <title>Installment Receipt - ${englishName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet">
        <style>
          /* Modern CSS Variables */
          :root {
            --primary-gradient: linear-gradient(135deg, #800020 0%, #A52A2A 100%);
            --glass-bg: rgba(255, 255, 255, 0.1);
            --shadow-soft: 0 8px 32px rgba(0, 0, 0, 0.1);
            --border-radius: 8px;
            --font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          
          /* Reset and base styles */
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            direction: ltr; /* Force LTR direction everywhere */
          }
          
          @page {
            size: 210mm 297mm;
            margin: 0;
          }
          
          body {
            font-family: var(--font-family);
            line-height: 1.6;
            color: #333;
            background-color: #f9f9f9;
            padding: 0;
            margin: 0;
            width: 210mm;
            height: 297mm;
            direction: ltr; /* Force LTR direction */
            text-align: left; /* Force left alignment for text */
          }
          
          .receipt {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background-color: white;
            box-shadow: var(--shadow-soft);
            overflow: hidden;
            position: relative;
            direction: ltr; /* Force LTR direction */
          }
          
          ${showWatermark ? `
          /* Modern watermark styling */
          .watermark-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 160px;
            opacity: 0.1;
            color: #800020;
            z-index: 500;
            pointer-events: none;
            width: 100%;
            text-align: center;
            font-weight: bold;
            overflow: visible;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            line-height: 1.2;
            white-space: nowrap;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }
          
          .receipt::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url('${receiptData.schoolLogo || ''}');
            background-repeat: no-repeat;
            background-position: center;
            background-size: 40%;
            opacity: 0.03;
            pointer-events: none;
            z-index: 0;
          }
          ` : ''}
          
          /* Modern header with premium gradient */
          .receipt-header {
            background: linear-gradient(135deg, #800020 0%, #A52A2A 100%);
            color: white;
            padding: 10px 25px;
            position: relative;
            margin: 0;
            top: 0;
            left: 0;
            right: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            z-index: 10;
          }
          
          .receipt-header h1 {
            margin-bottom: 2px;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 0.5px;
            direction: ltr; /* Force LTR direction */
            text-align: center;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            color: white !important;
          }
          
          .receipt-header p {
            font-size: 14px;
            font-weight: 600;
            opacity: 0.95;
            margin-bottom: 0;
            direction: ltr; /* Force LTR direction */
            text-align: center;
            color: white !important;
          }
          
          .logo {
            text-align: center;
            margin-bottom: 8px;
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
          
          /* Contact info in header */
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
            gap: 6px;
            padding: 3px 10px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white !important;
            font-size: 11px;
            font-weight: 500;
            margin: 0 2px;
          }
          
          .header-contact-info span strong {
            display: inline-block;
            margin-right: 5px;
          }
          
          .header-contact-info span .email-text {
            unicode-bidi: embed;
            direction: ltr;
            text-align: left;
            display: inline;
          }
          
          /* Modern receipt info bar */
          .receipt-info {
            padding: 10px 25px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            background-color: #FFF5F5;
            border-bottom: 1px solid #EEDDDD;
            font-weight: 500;
            position: relative;
            z-index: 5;
            direction: ltr; /* Force LTR direction */
          }
          
          .receipt-info > div {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid #EEDDDD;
          }
          
          .receipt-info strong {
            font-weight: 700;
            color: #800020;
            font-size: 13px;
          }
          
          /* Modern receipt body */
          .receipt-body {
            padding: 20px 30px;
            position: relative;
            z-index: 1;
            margin-bottom: 0;
            padding-bottom: 10px;
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
            background-color: rgba(165, 42, 42, 0.15);
            color: #800020;
            border: 1px solid rgba(165, 42, 42, 0.3);
          }
          
          .status-partial {
            background-color: rgba(236, 201, 75, 0.15);
            color: #975A16;
            border: 1px solid rgba(236, 201, 75, 0.3);
          }
          
          .payment-status {
            text-align: center;
            margin-bottom: 30px;
            direction: ltr; /* Force LTR direction */
          }
          
          /* Modern card styling for info groups */
          .info-group {
            margin-bottom: 20px;
            direction: ltr; /* Force LTR direction */
            text-align: left;
            background-color: #ffffff;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
            border: 1px solid #EEDDDD;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            position: relative;
            overflow: hidden;
          }
          
          .info-group::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(to bottom, #800020, #A52A2A);
          }
          
          .info-group:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          }
          
          .info-group h3 {
            color: #800020;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #EEDDDD;
            font-weight: 700;
            font-size: 15px;
          }
          
          .info-row {
            display: flex;
            margin-bottom: 8px;
            direction: ltr; /* Force LTR direction */
            text-align: left;
          }
          
          .info-label {
            font-weight: 700;
            width: 120px;
            color: #4A5568;
            flex-shrink: 0;
            font-size: 12px;
          }
          
          /* Installments table styling */
          .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            table-layout: fixed;
          }
          
          .payment-table th {
            background: linear-gradient(135deg, #800020 0%, #A52A2A 100%);
            color: white !important;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          
          .payment-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #E2E8F0;
            font-size: 14px;
          }
          
          .payment-table tr:last-child {
            background-color: #f8f9fa;
            font-weight: 700;
          }
          
          .payment-table .amount {
            text-align: left !important;
          }
          
          /* Signature section styling */
          .signature-section {
            display: ${showSignature ? 'flex' : 'none'} !important;
            justify-content: space-around;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px dashed rgba(0, 0, 0, 0.1);
            margin-bottom: 10px;
          }
          
          .signature-block {
            text-align: center;
            width: 45%;
            display: ${showSignature ? 'block' : 'none'} !important;
            flex-direction: column;
            align-items: center;
            transition: transform 0.3s ease;
            margin: 0 5px;
          }
          
          .signature-line {
            width: 100%;
            border-bottom: 1px solid rgba(165, 42, 42, 0.3);
            margin-bottom: 8px;
            min-height: 30px;
            position: relative;
          }
          
          .signature-line::after {
            content: "";
            position: absolute;
            bottom: -1px;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(165, 42, 42, 0.5), transparent);
            transform: scaleX(0.7);
            opacity: 0;
            transition: all 0.5s ease;
          }
          
          .signature-block:hover .signature-line::after {
            opacity: 1;
            transform: scaleX(1);
          }
          
          /* Modern footer with gradient */
          .receipt-footer {
            display: none !important;
          }
          
          /* Print buttons */
          .buttons {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
          }
          
          .print-button, .close-button {
            padding: 10px 20px;
            border: none;
            border-radius: 30px;
            font-family: var(--font-family);
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
          
          .print-button {
            background-color: #A52A2A;
            color: white;
          }
          
          .print-button:hover {
            background-color: #800020;
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
          }
          
          .close-button {
            background-color: #E2E8F0;
            color: #4A5568;
          }
          
          .close-button:hover {
            background-color: #CBD5E0;
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
              background-color: white;
              height: 100%;
            }
            
            .receipt {
              box-shadow: none;
              height: 100%;
            }
            
            .buttons {
              display: none !important;
            }
            
            .info-group:hover {
              transform: none !important;
              box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05) !important;
            }
            
            .signature-block:hover {
              transform: none !important;
            }
            
            /* Remove footer print styles */
            .receipt-footer {
              display: none !important;
            }
            
            /* Ensure header contact info prints correctly */
            .header-contact-info {
              display: flex !important;
              flex-wrap: wrap !important;
              justify-content: center !important;
              gap: 8px !important;
              padding: 5px 0 !important;
              margin-top: 5px !important;
            }
            
            .header-contact-info span {
              background: rgba(255, 255, 255, 0.15) !important;
              border: 1px solid rgba(255, 255, 255, 0.3) !important;
              color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          
          /* Logo watermark styles */
          .logo-watermark {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 85% !important;
            height: 85% !important;
            background-size: contain !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            opacity: 0.15 !important;
            z-index: 9999999 !important;
            pointer-events: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: block !important;
            visibility: visible !important;
          }
          
          @media print {
            .logo-watermark {
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 85% !important;
              height: 85% !important;
              background-size: contain !important;
              background-position: center !important;
              background-repeat: no-repeat !important;
              opacity: 0.15 !important;
              z-index: 9999999 !important;
              pointer-events: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              display: block !important;
              visibility: visible !important;
            }
          }
        </style>
        <script>
          console.log("Receipt data loaded for: ${englishName}");
          console.log("Payment method: ${paymentMethod}");
          console.log("Signature display settings:", {
            showSignature: ${showSignature},
            showStamp: ${showStamp},
            signatureDisplayStyle: "${showSignature ? 'block' : 'none'}",
            stampDisplayStyle: "${showStamp ? 'block' : 'none'}"
          });
          
          // Force direction to LTR when the document loads
          document.addEventListener('DOMContentLoaded', function() {
            document.documentElement.dir = 'ltr';
            document.body.dir = 'ltr';
            document.querySelector('.receipt').dir = 'ltr';
            
            // Additional check on signature section display
            const signatureSection = document.querySelector('.signature-section');
            const signatureBlock = document.querySelector('.signature-block');
            
            console.log('DOM loaded, checking signature elements:', {
              signatureSectionDisplay: signatureSection ? getComputedStyle(signatureSection).display : 'element not found',
              signatureBlockDisplay: signatureBlock ? getComputedStyle(signatureBlock).display : 'element not found'
            });
          });
        </script>
      </head>
      <body>
        ${getBigCenteredLogoWatermark(receiptData.schoolLogo)}
        <div class="receipt">
          <div class="receipt-header">
            ${logoHTML}
            <h1>Installment Payment Receipt</h1>
            <p>${englishSchoolName}</p>
            <div class="header-contact-info">
              ${schoolPhone ? `<span><strong>Phone:</strong> ${formatPhoneNumber(schoolPhone)}</span>` : ''}
              ${schoolPhoneWhatsapp ? `<span><strong>WhatsApp:</strong> ${formatPhoneNumber(schoolPhoneWhatsapp)}</span>` : ''}
              ${schoolPhoneCall ? `<span><strong>Call:</strong> ${formatPhoneNumber(schoolPhoneCall)}</span>` : ''}
              ${schoolEmail ? `<span><strong>Email:</strong> <span class="email-text">${schoolEmail}</span></span>` : ''}
            </div>
          </div>
          
          <div class="receipt-info">
            <div>
              <strong>Receipt No:</strong> ${receiptData.receiptNumber}
            </div>
            <div>
              <strong>Date:</strong> ${formattedDateEnglish}
            </div>
          </div>
          
          <div class="receipt-body">
            <div class="payment-status">
              ${getPaymentStatusLabel()}
            </div>
            
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
              <div class="info-group" style="flex: 1; min-width: 250px;">
                <h3>Student Information</h3>
                <div class="info-row">
                  <div class="info-label">Name:</div>
                  <div>${englishName}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">ID:</div>
                  <div>${receiptData.studentIdDisplay || receiptData.studentId || ''}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Grade:</div>
                  <div>${englishGrade}</div>
                </div>
                ${receiptData.academicYear ? `
                <div class="info-row">
                  <div class="info-label">Academic Year:</div>
                  <div>${receiptData.academicYear}</div>
                </div>
                ` : ''}
              </div>
              
              <div class="info-group" style="flex: 1; min-width: 250px;">
                <h3>Payment Information</h3>
                <div class="info-row">
                  <div class="info-label">Fee Type:</div>
                  <div>${englishFeeType || 'Installment Fees'}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Payment Method:</div>
                  <div>${paymentMethod}</div>
                </div>
                ${receiptData.paymentDate ? `
                <div class="info-row">
                  <div class="info-label">Payment Date:</div>
                  <div>${formatDateEnglish(receiptData.paymentDate)}</div>
                </div>
                ` : ''}
                ${receiptData.installmentMonth ? `
                <div class="info-row">
                  <div class="info-label">Installment Month:</div>
                  <div>${translateMonthToEnglish(receiptData.installmentMonth)}</div>
                </div>
                ` : ''}
                ${receiptData.checkNumber ? `
                <div class="info-row">
                  <div class="info-label">Cheque Number:</div>
                  <div>${receiptData.checkNumber}</div>
                </div>
                ` : ''}
                ${receiptData.checkDate && receiptData.checkDate !== receiptData.paymentDate ? `
                <div class="info-row">
                  <div class="info-label">Cheque Date:</div>
                  <div>${formatDateEnglish(receiptData.checkDate)}</div>
                </div>
                ` : ''}
                ${receiptData.bankName ? `
                <div class="info-row">
                  <div class="info-label">Bank Name:</div>
                  <div>${receiptData.bankName}</div>
                </div>
                ` : ''}
                <div class="info-row">
                  <div class="info-label">Installment:</div>
                  <div>${ordinalInstallmentLabel(receiptData.installmentNumber || 1)}</div>
                </div>
                ${receiptData.paymentNote ? `
                <div class="info-row">
                  <div class="info-label">Notes:</div>
                  <div>${receiptData.paymentNote}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
            <table class="payment-table">
              <thead>
                <tr>
                  <th style="text-align: left; color: white !important;">Description</th>
                  <th style="text-align: left !important; color: white !important;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${receiptData.tuitionFees > 0 ? `
                <tr>
                  <td style="text-align: left;">Tuition Fees</td>
                  <td class="amount" style="text-align: left !important;">${Math.round(receiptData.tuitionFees).toLocaleString('en-US')} ${currencySymbol}</td>
                </tr>
                ` : ''}
                
                ${receiptData.transportationFees > 0 ? `
                <tr>
                  <td style="text-align: left;">Transportation Fees</td>
                  <td class="amount" style="text-align: left !important;">${Math.round(receiptData.transportationFees).toLocaleString('en-US')} ${currencySymbol}</td>
                </tr>
                ` : ''}
                
                <tr style="background-color: #f0f0f0;">
                  <td style="text-align: left;"><strong>Total Amount</strong></td>
                  <td class="amount" style="text-align: left !important;"><strong>${Math.round((receiptData.tuitionFees || 0) + (receiptData.transportationFees || 0)).toLocaleString('en-US')} ${currencySymbol}</strong></td>
                </tr>
                
                <tr style="background-color: #f8f8f8; font-weight: bold;">
                  <td style="text-align: left;">Amount Paid</td>
                  <td class="amount" style="text-align: left !important;">
                    ${Math.round((receiptData.tuitionFees || 0) + (receiptData.transportationFees || 0)).toLocaleString('en-US')} ${currencySymbol}
                  </td>
                </tr>
                
                ${receiptData.tuitionFees > 0 ? `
                <tr style="background-color: #fff5f5; color: #C53030;">
                  <td style="text-align: left;">Remaining Tuition Fees</td>
                  <td class="amount" style="text-align: left !important;">
                    ${receiptData.status === 'paid' ? '0' : Math.round((receiptData.remainingTuitionAmount || receiptData.student?.remainingTuitionAmount || 0)).toLocaleString('en-US')} ${currencySymbol}
                  </td>
                </tr>
                ` : ''}
                
                ${receiptData.transportationFees > 0 ? `
                <tr style="background-color: #fff5f5; color: #C53030;">
                  <td style="text-align: left;">Remaining Transportation Fees</td>
                  <td class="amount" style="text-align: left !important;">
                    ${receiptData.status === 'paid' ? '0' : Math.round((receiptData.remainingTransportationAmount || receiptData.student?.remainingTransportationAmount || 0)).toLocaleString('en-US')} ${currencySymbol}
                  </td>
                </tr>
                ` : ''}
                
                <tr style="background-color: #fff5f5; color: #C53030; font-weight: bold;">
                  <td style="text-align: left;">Total Remaining Amount</td>
                  <td class="amount" style="text-align: left !important;">
                    ${receiptData.status === 'paid' ? '0' : Math.round(((receiptData.remainingTuitionAmount || receiptData.student?.remainingTuitionAmount || 0) + (receiptData.remainingTransportationAmount || receiptData.student?.remainingTransportationAmount || 0))).toLocaleString('en-US')} ${currencySymbol}
                  </td>
                </tr>
              </tbody>
            </table>
            
            ${receiptData.checkNumber ? `
            <div style="margin-top: 15px; font-size: 14px; text-align: left; color: #444; direction: ltr;">
              <p style="margin-bottom: 5px;"><strong>Note:</strong> In case your cheque is returned by the bank, it will be considered void.</p>
              <p>Please retain the receipt until all school fees are fully paid.</p>
            </div>
            ` : ''}
            
            <div class="signature-section">
              <div class="signature-block" style="display: ${showSignature ? 'block' : 'none'};">
                <div class="signature-line"></div>
                <div>Financial Administration / Receiver Signature</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="buttons">
          <button class="print-button" onclick="window.print()">View Receipt</button>
          <button class="close-button" onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `;
  };

  // Helper function to convert numbers to words
  const convertToWords = (amount: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const numToWords = (num: number): string => {
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numToWords(num % 100) : '');
      if (num < 1000000) return numToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numToWords(num % 1000) : '');
      return numToWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numToWords(num % 1000000) : '');
    };
    
    // Split by decimal point
    const [integerPart, decimalPart] = amount.toFixed(2).split('.');
    
    // Convert integer part
    const integerWords = numToWords(parseInt(integerPart)) || 'Zero';
    
    // Convert decimal part
    const decimalWords = parseInt(decimalPart) > 0 ? ` and ${decimalPart}/100` : '';
    
    return integerWords + decimalWords;
  };

  // Implement ordinalInstallmentLabel function
  function ordinalInstallmentLabel(n: number | string): string {
    // First ensure n is a number
    const num = typeof n === 'string' ? parseInt(n, 10) : n;
    
    // First installment should be "First Installment"
    if (num === 1) return 'First Installment';
    if (num === 2) return 'Second Installment';
    if (num === 3) return 'Third Installment';
    if (num === 4) return 'Fourth Installment';
    if (num === 5) return 'Fifth Installment';
    if (num === 6) return 'Sixth Installment';
    
    // For other numbers
    const suffix = ['th', 'st', 'nd', 'rd'][num % 10] || 'th';
    return num + suffix + ' Installment';
  }

  // Fallback function for PDF download if Electron save dialog is not available
  const fallbackPdfDownload = (htmlContent: string, fileName: string) => {
    console.log('Using fallback PDF download method for installment receipt');
    
    try {
      toast.loading('Saving English installment receipt...', { id: 'english-receipt' });
      
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
      
      toast.success('English installment receipt PDF download initiated', { id: 'english-receipt' });
    } catch (error) {
      console.error('Error in fallback PDF download:', error);
      toast.error(`PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'english-receipt' });
    }
  };

  // Render compact version for tables
  if (compact) {
    return (
      <button
        onClick={handleInstallmentEnglishReceipt}
        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
        title="English Receipt"
      >
        <Download size={18} />
      </button>
    );
  }

  // Render full button with signature toggle
  return (
    <div className="flex space-x-2">
      <button
        onClick={handleInstallmentEnglishReceipt}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
      >
        <span className="mr-2 font-medium">English Receipt</span>
        <Download size={18} />
      </button>
      
      <button
        onClick={toggleSignature}
        className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-md"
        title={receiptSettings.showSignature ? "Disable Signature" : "Enable Signature"}
      >
        <FileSignature size={18} />
      </button>
    </div>
  );
};

export default InstallmentEnglishReceiptButton;
      // Ensure receipt number exists and is saved
      try {
        if (!receiptData.receiptNumber || String(receiptData.receiptNumber).trim() === '') {
          if (receiptData.installmentId) {
            const instResp = await hybridApi.getInstallmentById(receiptData.installmentId);
            const inst = (instResp?.success && instResp?.data) ? instResp.data : null;
            if (inst?.receiptNumber) {
              receiptData.receiptNumber = inst.receiptNumber;
            } else if (receiptData.schoolId) {
              try {
                const reserved = await reserveReceiptNumbers(receiptData.schoolId, 'installment', 1);
                const newNumber = reserved[0];
                receiptData.receiptNumber = newNumber;
                if (inst) {
                  await hybridApi.saveInstallment({ ...inst, receiptNumber: newNumber });
                }
              } catch {}
              if (!receiptData.receiptNumber) {
                try {
                  const settingsResp = await hybridApi.getSettings(receiptData.schoolId);
                  const settings = (settingsResp?.success && settingsResp?.data && settingsResp.data[0]) ? settingsResp.data[0] : null;
                  if (settings) {
                    const fallbackNum = generateReceiptNumber(settings, receiptData.studentInternalId || receiptData.studentId, undefined, 'installment');
                    receiptData.receiptNumber = fallbackNum;
                    if (inst) {
                      await hybridApi.saveInstallment({ ...inst, receiptNumber: fallbackNum });
                    }
                  }
                } catch {}
                // Final fallback: preview number (does not increment counter)
                if (!receiptData.receiptNumber && receiptData.schoolId) {
                  try {
                    const preview = await getNextReceiptNumber(receiptData.schoolId, 'installment');
                    receiptData.receiptNumber = preview;
                  } catch {}
                }
              }
            }
          }
        }
      } catch {}