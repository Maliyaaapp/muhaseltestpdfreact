/**
 * Receipt HTML generation
 */

import { ReceiptData } from '../types';
import { getRandomBackground, getBigCenteredLogoWatermark } from '../utils/print-styles';
import { CURRENCY } from '../../../utils/constants';
import { translateFeeType, getArabicPaymentMethod, formatDate } from '../utils/formatting';
import hybridApi from '../../../services/hybridApi';

/**
 * Generate HTML for a receipt with professional styling and print compatibility
 * Supports only Arabic (RTL) language. English receipts are handled by EnglishReceiptButton.tsx
 * Features watermark, school logo, stamp, signature, and configurable settings
 */
export const generateReceiptHTML = async (data: ReceiptData): Promise<string> => {
  // If language is English, return empty string since English receipt is handled separately
  if (data.language === 'english') {
    return '';
  }
  
  // DEBUG: Log the school information being passed
  console.log('RECEIPT HTML GENERATION - School Data Debug:', {
    schoolName: data.schoolName,
    schoolLogo: data.schoolLogo,
    schoolPhone: data.schoolPhone,
    schoolEmail: data.schoolEmail,
    englishSchoolName: data.englishSchoolName,
    hasSchoolLogo: !!data.schoolLogo,
    schoolLogoLength: data.schoolLogo ? data.schoolLogo.length : 0,
    schoolNameType: typeof data.schoolName,
    schoolNameValue: JSON.stringify(data.schoolName),
    isInstallment: data.isInstallment,
    language: data.language,
    allDataKeys: Object.keys(data)
  });
  
  // CRITICAL DEBUG: Log cheque details being passed to HTML generation
  console.log('RECEIPT HTML GENERATION - Cheque Details Debug:', {
    checkNumber: data.checkNumber,
    checkDate: data.checkDate,
    bankNameArabic: data.bankNameArabic,
    bankNameEnglish: data.bankNameEnglish,
    paymentMethod: data.paymentMethod,
    paymentNote: data.paymentNote,
    hasCheckNumber: !!data.checkNumber,
    hasCheckDate: !!data.checkDate,
    hasBankNameArabic: !!data.bankNameArabic,
    hasBankNameEnglish: !!data.bankNameEnglish
  });
  
  // EMERGENCY DEBUG: Log ALL data properties to find school info
  console.log('EMERGENCY DEBUG - ALL RECEIPT DATA:', JSON.stringify(data, null, 2));
  console.log('EMERGENCY DEBUG - School fields specifically:', {
    'data.schoolName': data.schoolName,
    'data.englishSchoolName': data.englishSchoolName,
    'data.schoolLogo': data.schoolLogo,
    'data.schoolPhone': data.schoolPhone,
    'data.schoolPhoneWhatsapp': data.schoolPhoneWhatsapp,
    'data.schoolPhoneCall': data.schoolPhoneCall,
    'data.schoolEmail': data.schoolEmail
  });
  
  const backgroundPattern = getRandomBackground();
  
  // Determine receipt type for display purposes
  const isInstallmentReceipt = data.receiptNumber?.startsWith('INST-') || 
                             data.installmentNumber || 
                             data.installmentMonth || 
                             data.installmentDetails ||
                             Boolean((data as any).isInstallment);
  
  const isPartialPayment = data.isPartialPayment === true;
  
  // Force showStamp to always be false
  const showStamp = false;
  
  // Always show signatures
  const showSignature = true;
  
  // Log settings for debugging
  console.log('RECEIPT SETTINGS:', {
    showStamp,
    showSignature: true, // Always true
    isInstallmentReceipt,
    isPartialPayment,
    language: data.language
  });
  
  // Force watermark to always be true, regardless of other settings
  const showWatermark = true;
  
  // Use other settings
  const showFooter = data.showFooter !== undefined ? data.showFooter : true;
  const paymentMethod = getArabicPaymentMethod(data.paymentMethod) || 'نقداً';
  const paymentNote = data.paymentNote || '';
  const checkNumber = data.checkNumber || '';
  const checkDate = data.checkDate || '';
  const bankName = data.bankName || '';
  const discount = data.discount || 0;
  
  // Calculate transportation fees from multiple sources
  let transportationFees = 0;
  
  // IMPORTANT: Directly inspect all possible locations for transportation fees
  console.log('ARABIC RECEIPT TRANSPORTATION FEES DEBUG:');
  console.log('- data.transportationFees:', data.transportationFees);
  console.log('- data.transportationAmount:', (data as any).transportationAmount);
  console.log('- data.transportationFee:', (data as any).transportationFee);
  console.log('- data.student?.transportationFee:', (data as any).student?.transportationFee);
  console.log('- data.fee?.transportationFees:', (data as any).fee?.transportationFees);
  console.log('- data.bulkData:', (data as any).bulkData);
  console.log('- data.importData:', (data as any).importData);
  
  try {
    // Try direct transportationFees property
    if (data.transportationFees !== undefined && data.transportationFees !== null) {
      transportationFees = Number(data.transportationFees);
      if (!isNaN(transportationFees)) {
        console.log('Using direct transportationFees:', transportationFees);
      }
    } 
    // Try transportationAmount
    else if ((data as any).transportationAmount !== undefined && (data as any).transportationAmount !== null) {
      transportationFees = Number((data as any).transportationAmount);
      if (!isNaN(transportationFees)) {
        console.log('Using transportationAmount:', transportationFees);
      }
    }
    // Try transportationFee (singular)
    else if ((data as any).transportationFee !== undefined && (data as any).transportationFee !== null) {
      transportationFees = Number((data as any).transportationFee);
      if (!isNaN(transportationFees)) {
        console.log('Using transportationFee:', transportationFees);
      }
    }
    // Try student record
    else if ((data as any).student && (data as any).student.transportationFee !== undefined) {
      transportationFees = Number((data as any).student.transportationFee);
      if (!isNaN(transportationFees)) {
        console.log('Using student.transportationFee:', transportationFees);
      }
    }
    // Try fee record
    else if ((data as any).fee && (data as any).fee.transportationFees !== undefined) {
      transportationFees = Number((data as any).fee.transportationFees);
      if (!isNaN(transportationFees)) {
        console.log('Using fee.transportationFees:', transportationFees);
      }
    }
    // Try checking if this is a transportation fee type
    else if (data.feeType === 'transportation' || 
            data.feeType === 'نقل مدرسي' || 
            data.feeType === 'رسوم النقل' || 
            data.feeType === 'رسوم التقل' ||
            data.feeType === 'رسوم النقل المدرسي' ||
            (typeof data.feeType === 'string' && data.feeType.toLowerCase().includes('transport')) ||
            (typeof data.feeType === 'string' && data.feeType.toLowerCase().includes('نقل')) ||
            (typeof data.feeType === 'string' && data.feeType.toLowerCase().includes('باص'))) {
      // If this is a transportation fee type, use the main amount
      transportationFees = Number(data.amount || 0);
      console.log('Using amount as transportationFees (fee type match):', transportationFees);
    }
    // Try fees array
    else if ((data as any).fees && Array.isArray((data as any).fees)) {
      // Check in fees array if available
      const transportationFee = (data as any).fees.find((fee: any) => 
        fee.feeType === 'transportation' || 
        fee.feeType === 'نقل مدرسي' ||
        fee.feeType === 'رسوم النقل' ||
        fee.feeType === 'رسوم التقل' ||
        fee.feeType === 'رسوم النقل المدرسي' ||
        (typeof fee.feeType === 'string' && fee.feeType.toLowerCase().includes('transport')) ||
        (typeof fee.feeType === 'string' && fee.feeType.toLowerCase().includes('نقل')) ||
        (typeof fee.feeType === 'string' && fee.feeType.toLowerCase().includes('باص'))
      );
      if (transportationFee) {
        transportationFees = Number(transportationFee.amount || 0);
        console.log('Using fee from fees array:', transportationFees);
      }
    }
    // IMPORTANT: If we have a studentId but no transportation fees yet, try to fetch transportation fee from dataStore
    else if ((data as any).studentId && transportationFees === 0) {
      try {
        // Attempt to directly load the student's transportation fee
        const studentId = (data as any).studentId;
        // Try to get fees from hybridApi
        try {
          const feesResponse = await hybridApi.getFees((data as any).schoolId, studentId);
          if (feesResponse.success && feesResponse.data) {
            const fees = feesResponse.data;
            // Look for transportation fee
            const transportFee = fees.find((f: any) => 
              f.feeType === 'transportation' || 
              (typeof f.feeType === 'string' && f.feeType.toLowerCase().includes('transport'))
            );
            if (transportFee) {
              transportationFees = Number(transportFee.amount || 0);
              console.log('IMPORTANT: Found transportation fee from hybridApi:', transportationFees);
            }
            else {
              // If no direct fee found, try to get student data
              const studentResponse = await hybridApi.getStudent(studentId);
              if (studentResponse.success && studentResponse.data && studentResponse.data.transportationFee) {
                transportationFees = Number(studentResponse.data.transportationFee || 0);
                console.log('IMPORTANT: Using student.transportationFee from hybridApi:', transportationFees);
              }
            }
          }
        } catch (apiError) {
          console.error('Error fetching from hybridApi, falling back to dataStore:', apiError);
          // Fallback to dataStore if hybridApi fails
          if (typeof window !== 'undefined' && (window as any).dataStore) {
            const dataStore = (window as any).dataStore;
            const fees = dataStore.getFees((data as any).schoolId, studentId);
            const transportFee = fees.find((f: any) => 
              f.feeType === 'transportation' || 
              (typeof f.feeType === 'string' && f.feeType.toLowerCase().includes('transport'))
            );
            if (transportFee) {
              transportationFees = Number(transportFee.amount || 0);
              console.log('IMPORTANT: Found transportation fee from dataStore fallback:', transportationFees);
            }
            else {
              const student = dataStore.getStudent(studentId);
              if (student && student.transportationFee) {
                transportationFees = Number(student.transportationFee || 0);
                console.log('IMPORTANT: Using student.transportationFee from dataStore fallback:', transportationFees);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error trying to fetch transportation fee from dataStore:', error);
      }
    }
    // Try checking bulk import data - IMPORTANT: Enhanced to better extract transportation fees
    else if ((data as any).bulkData || (data as any).importData) {
      const bulkData = (data as any).bulkData || (data as any).importData;
      if (bulkData && typeof bulkData === 'object') {
        // Check if there's a transportation field in the bulk data
        for (const key in bulkData) {
          if (typeof key === 'string' && 
              (key.toLowerCase().includes('transport') || 
               key.toLowerCase().includes('نقل') || 
               key.toLowerCase().includes('باص') ||
               key.toLowerCase().includes('bus') ||
               key.toLowerCase().includes('transportation_fees') ||
               key.toLowerCase() === 'transport' ||
               key.toLowerCase() === 'transportation') && 
              !isNaN(Number(bulkData[key])) && 
              Number(bulkData[key]) > 0) {
            transportationFees = Number(bulkData[key]);
            console.log(`Found transportation fees in bulk data property ${key}:`, transportationFees);
            break;
          }
        }
      }
    }
    
    // IMPORTANT: Fix for transportation fees - if we still have 0, try to get it from the data
    if (transportationFees === 0) {
      // Scan all properties for any that might contain transportation fees
      for (const key in data) {
        if (typeof key === 'string' && 
            (key.toLowerCase().includes('transport') || 
             key.toLowerCase().includes('نقل') || 
             key.toLowerCase().includes('باص')) && 
            !isNaN(Number((data as any)[key])) && 
            Number((data as any)[key]) > 0) {
          transportationFees = Number((data as any)[key]);
          console.log(`Found transportation fees in property ${key}:`, transportationFees);
          break;
        }
      }
      
      // If still 0, check for custom fee types that might be transportation
      if (transportationFees === 0 && data.feeType && typeof data.feeType === 'string') {
        const feeTypeLower = data.feeType.toLowerCase();
        if (feeTypeLower.includes('bus') || 
            feeTypeLower.includes('باص') || 
            feeTypeLower.includes('نقل') || 
            feeTypeLower.includes('transport')) {
          transportationFees = Number(data.amount || 0);
          console.log('Using amount as transportationFees (custom fee type match):', transportationFees);
        }
      }
    }
  } catch (error) {
    console.error('Error extracting transportation fees:', error);
  }
  
  // Make sure we have a valid number
  if (isNaN(transportationFees)) {
    transportationFees = 0;
  }
  
  console.log('Final transportation fees for Arabic receipt:', transportationFees);
  
  // IMPORTANT: Force transportation fees to be properly calculated
  console.log('ARABIC RECEIPT - BEFORE ADJUSTMENT - Amount values:', {
    totalAmount: data.totalAmount,
    amount: data.amount,
    transportationFees
  });
  
  // Check if this is a transportation-only receipt
  const isTransportationReceipt = 
    data.feeType === 'transportation' || 
    data.feeType === 'نقل مدرسي' || 
    data.feeType === 'رسوم النقل' || 
    data.feeType === 'رسوم التقل' ||
    data.feeType === 'رسوم النقل المدرسي' ||
    (typeof data.feeType === 'string' && data.feeType.toLowerCase().includes('transport')) ||
    (typeof data.feeType === 'string' && data.feeType.includes('نقل'));
  
  // CRITICAL FIX: Also check if this fee was paid as part of a bulk payment that included transportation
  const includesTransportation = Boolean(data.includesTransportation);
  
  // If this is a transportation fee receipt, put the whole amount in transportation fees
  if (isTransportationReceipt) {
    transportationFees = (data.totalAmount || data.amount || 0);
    console.log('This is a transportation fee receipt, setting full amount to transportation:', transportationFees);
  }
  
  // Get the discount amount
  const discountAmount = data.discount || 0;
  
  // IMPORTANT FIX: Calculate tuition fees correctly
  // First check if we have a direct tuitionFees value
  let tuitionFees = 0;
  if ((data as any).tuitionFees !== undefined && !isNaN(Number((data as any).tuitionFees))) {
    // Use the direct tuition fees value if provided
    tuitionFees = Number((data as any).tuitionFees);
    console.log('Using direct tuitionFees value:', tuitionFees);
  }
  // If no direct value, try to get it from student data
  else if ((data as any).student && (data as any).student.tuitionFee !== undefined && !isNaN(Number((data as any).student.tuitionFee))) {
    tuitionFees = Number((data as any).student.tuitionFee);
    console.log('Using student.tuitionFee value:', tuitionFees);
  }
  // If no student tuition fee, check for fee records
  else if ((data as any).studentId) {
    try {
      // Try hybridApi first
      const feesResponse = await hybridApi.getFees((data as any).schoolId, (data as any).studentId);
      if (feesResponse.success && feesResponse.data) {
        const fees = feesResponse.data;
        const tuitionFee = fees.find((f: any) => 
          f.feeType === 'tuition' || 
          (typeof f.feeType === 'string' && f.feeType.toLowerCase().includes('tuition'))
        );
        
        if (tuitionFee) {
          tuitionFees = Number(tuitionFee.amount || 0);
          console.log('Using tuition fee from hybridApi:', tuitionFees);
        }
      }
    } catch (apiError) {
      console.error('Error fetching from hybridApi, falling back to dataStore:', apiError);
      // Fallback to dataStore
      if (typeof window !== 'undefined' && (window as any).dataStore) {
        try {
          const dataStore = (window as any).dataStore;
          const fees = dataStore.getFees((data as any).schoolId, (data as any).studentId);
          const tuitionFee = fees.find((f: any) => 
            f.feeType === 'tuition' || 
            (typeof f.feeType === 'string' && f.feeType.toLowerCase().includes('tuition'))
          );
          
          if (tuitionFee) {
            tuitionFees = Number(tuitionFee.amount || 0);
            console.log('Using tuition fee from dataStore fallback:', tuitionFees);
          }
        } catch (error) {
          console.error('Error trying to fetch tuition fee from dataStore:', error);
        }
      }
    }
  }
  // Only as a last resort, calculate as total minus transportation
  else if (!isTransportationReceipt) {
    tuitionFees = (data.totalAmount || data.amount || 0) - transportationFees;
    console.log('Calculating tuition as total minus transportation:', tuitionFees);
  }
  
  // Calculate tuition fees after discount - IMPORTANT CHANGE #1
  const tuitionFeesAfterDiscount = Math.max(0, tuitionFees - discountAmount);
  
  // Calculate total fees (tuition after discount + transportation) - IMPORTANT CHANGE #3
  const totalFeesAmount = tuitionFeesAfterDiscount + transportationFees;
  
  // CRITICAL FIX: Simplify paid amount calculation logic
  const totalPaidAmount = data.paidAmount || data.amount || 0;
  
  // For Arabic receipts, show the actual paid amount as provided
  // The paid amount should reflect what was actually paid for this specific receipt
  let actualPaidAmount = totalPaidAmount;
  
  // Calculate remaining amounts correctly
  let tuitionRemainingAmount = 0;
  let transportationRemainingAmount = 0;
  
  // IMPORTANT: Use the remaining amounts from receiptData if they exist (calculated in generateReceiptDataForFee)
  if (data.remainingTuitionAmount !== undefined && data.remainingTransportationAmount !== undefined) {
    tuitionRemainingAmount = Number(data.remainingTuitionAmount) || 0;
    transportationRemainingAmount = Number(data.remainingTransportationAmount) || 0;
    console.log('Using remaining amounts from receiptData:', {
      tuitionRemainingAmount,
      transportationRemainingAmount
    });
  } else {
    // Fallback to old calculation logic if receiptData doesn't have the values
    console.log('Falling back to old remaining amount calculation logic');
    
    // If this is a transportation-only receipt
    if (isTransportationReceipt) {
      // For transportation receipts, the paid amount covers transportation fees
      if (actualPaidAmount >= transportationFees) {
        transportationRemainingAmount = 0;
      } else {
        transportationRemainingAmount = Math.max(0, transportationFees - actualPaidAmount);
      }
      // Tuition remaining is the full tuition amount (not paid in this receipt)
      tuitionRemainingAmount = tuitionFeesAfterDiscount;
    } else {
      // For regular receipts, calculate based on total fees
      const totalRemainingBeforePayment = tuitionFeesAfterDiscount + transportationFees;
      const totalRemainingAfterPayment = Math.max(0, totalRemainingBeforePayment - actualPaidAmount);
      
      // Distribute remaining amount proportionally
      if (totalRemainingBeforePayment > 0) {
        const tuitionRatio = tuitionFeesAfterDiscount / totalRemainingBeforePayment;
        tuitionRemainingAmount = Math.round(totalRemainingAfterPayment * tuitionRatio);
        transportationRemainingAmount = totalRemainingAfterPayment - tuitionRemainingAmount;
      }
    }
  }
  
  const totalRemainingAmount = tuitionRemainingAmount + transportationRemainingAmount;
  
  // Calculate actual paid amounts for each fee type from receiptData if available
  let tuitionPaidAmount = 0;
  let transportationPaidAmount = 0;
  
  // Check if we have pre-calculated paid amounts from receiptData
  if (data.tuitionPaidAmount !== undefined && data.transportationPaidAmount !== undefined) {
    tuitionPaidAmount = data.tuitionPaidAmount;
    transportationPaidAmount = data.transportationPaidAmount;
  } else {
    // Fallback: Calculate based on the current fee record
    if (isTransportationReceipt) {
      // For transportation receipts, all paid amount goes to transportation
      transportationPaidAmount = actualPaidAmount;
      tuitionPaidAmount = 0;
    } else if (data.feeType === 'tuition' || data.feeType === 'رسوم دراسية') {
      // For tuition receipts, all paid amount goes to tuition
      tuitionPaidAmount = actualPaidAmount;
      transportationPaidAmount = 0;
    } else {
      // For other fee types, assign to tuition by default
      tuitionPaidAmount = actualPaidAmount;
      transportationPaidAmount = 0;
    }
  }
  
  // Add debug output for the fee amounts in the table
  console.log('ARABIC RECEIPT FEE AMOUNTS:', {
    isTransportationReceipt,
    transportationFees,
    tuitionFees,
    discount: discountAmount,
    tuitionFeesAfterDiscount,
    totalFeesAmount,
    totalPaidAmount,
    actualPaidAmount,
    tuitionPaidAmount,
    transportationPaidAmount,
    totalCalculatedPaid: tuitionPaidAmount + transportationPaidAmount,
    tuitionRemainingAmount,
    transportationRemainingAmount,
    totalRemainingAmount,
    hasPreCalculatedAmounts: data.tuitionPaidAmount !== undefined && data.transportationPaidAmount !== undefined
  });
  
  // Always use Arabic/RTL since this function now only handles Arabic receipts
  const isArabic = true;
  const documentDirection = 'rtl';
  const documentLang = 'ar';
  
  // Use document-specific setting or fall back to general setting
  const showLogoBackground = data.showLogoBackgroundOnReceipt !== undefined ? 
    data.showLogoBackgroundOnReceipt : 
    (data.showLogoBackground !== undefined ? data.showLogoBackground : false);

  // Get stamp position and size settings if available - even though we don't use them
  const stampPosition = 'bottom-right';
  const stampSize = 'medium';
  const stampOpacity = 0.8;
  const stampImage = null;

  // Correctly display the school name based on language
  const displaySchoolName = isArabic 
    ? data.schoolName 
    : (data.englishSchoolName && data.englishSchoolName.trim() !== '' ? data.englishSchoolName : "School");
  
  // DEBUG: Log the final displaySchoolName value
  console.log('RECEIPT HTML - displaySchoolName Debug:', {
    isArabic,
    dataSchoolName: data.schoolName,
    dataEnglishSchoolName: data.englishSchoolName,
    finalDisplaySchoolName: displaySchoolName,
    willUseFallback: !displaySchoolName
  });
  
  // FORCE currency to be correct
  const currencySymbol = isArabic ? CURRENCY : 'OMR';
  
  // Generate installment fields for the receipt
  
  // Generate installment-specific fields if available
  const installmentFields = [];
  if (data.installmentNumber) {
    installmentFields.push(`
      <div class="info-row">
        <div class="info-label">${isArabic ? 'الدفعة:' : 'Installment:'}</div>
        <div>${arabicInstallmentLabel(data.installmentNumber)}</div>
      </div>
    `);
  }
  
  // Add installment details (القسط رقم X من Y) as a separate field
  if (data.installmentDetails) {
    installmentFields.push(`
      <div class="info-row">
        <div class="info-label">${isArabic ? 'رقم القسط:' : 'Installment Number:'}</div>
        <div>${data.installmentDetails}</div>
      </div>
    `);
  }
  
  if (data.installmentMonth) {
    installmentFields.push(`
      <div class="info-row">
        <div class="info-label">${isArabic ? 'شهر القسط:' : 'Installment Month:'}</div>
        <div>${data.installmentMonth}</div>
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

  // Combined fees flags and totals (Arabic receipt logic)
  const isCombinedReceipt = data.feeType === 'transportation_and_tuition';
  // For combined receipts, base totals on the current fee record to avoid double-counting
  const combinedTotalAmount = Math.max(0, Number((data as any).totalAmount ?? (data as any).amount ?? 0));
  const explicitPaid = Number((data as any).paidAmount ?? (data as any).amount ?? 0);
  const explicitRemaining = Number((data as any).remainingAmount ?? (data as any).balance ?? 0);
  // Determine if fully paid using explicit fields first
  const combinedFullyPaid = (data.status === 'paid') || (explicitRemaining === 0) || (!data.isPartialPayment && explicitPaid >= combinedTotalAmount);
  // Paid/remaining amounts for combined receipts
  const combinedPaidAmount = combinedFullyPaid ? combinedTotalAmount : Math.max(0, explicitPaid);
  const combinedRemainingAmount = combinedFullyPaid ? 0 : Math.max(0, explicitRemaining || (combinedTotalAmount - combinedPaidAmount));
  // Displayed amount should reflect the combined fee total for this record
  const combinedDisplayedAmount = combinedTotalAmount;
  
  return `
    <!DOCTYPE html>
    <html lang="${documentLang}" dir="${documentDirection}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="format-detection" content="telephone=no">
      <meta name="print-color-adjust" content="exact">
      <title>${isArabic ? 'إيصال دفع' : 'Payment Receipt'} - ${data.studentName}</title>
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
          direction: ${documentDirection};
          margin: 0;
          padding: 0;
          overflow: hidden;
          position: relative;
        }
        
        /* Language specific adjustments */
        .rtl-text {
          direction: rtl;
          text-align: right;
        }
        
        .ltr-text {
          direction: ltr;
          text-align: left;
        }
        
        /* Enhanced number formatting for Arabic display */
        .currency-label {
          unicode-bidi: isolate;
        }
        
        /* Fix for Arabic text with number combinations */
        [dir="rtl"] .ltr-text {
          display: inline-block;
          unicode-bidi: isolate;
          direction: ltr;
          text-align: left;
        }
        
        /* Fix for Arabic number display */
        .fee-table td {
          position: relative;
        }
        
        .fee-table .fee-amount,
        .fee-table .total-amount {
          direction: ltr;
          text-align: ${isArabic ? 'right' : 'left'};
          unicode-bidi: isolate;
        }
        
        /* Fix for numbers in Arabic context */
        [dir="rtl"] span[dir="ltr"] {
          unicode-bidi: isolate;
          display: inline-block;
          margin: 0 2px;
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
          
          /* Remove watermark text for print */
          .watermark {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Ensure logo background prints correctly */
          .logo-background {
            display: block !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 80% !important;
            height: 80% !important;
            opacity: 0.15 !important;
            z-index: 9999 !important;
            background-size: contain !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Stamp functionality removed */
          
          /* Ensure signature prints correctly only if enabled */
          .signature-container {
            display: block !important;
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
          
          /* Ensure footer is visible in PDF and fixed at bottom */
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
            direction: ${documentDirection} !important;
          }
          
          .header-contact-info span {
            background: rgba(255, 255, 255, 0.15) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .header-contact-info span strong {
            color: white !important;
            font-weight: 600 !important;
            margin-right: ${isArabic ? '0' : '5px'} !important;
            margin-left: ${isArabic ? '5px' : '0'} !important;
          }
          
          /* Ensure header prints with correct colors */
          .receipt-header {
            background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: white !important;
          }
          
          .receipt-header h1, 
          .receipt-header p {
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Page number */
          .page-number {
            position: absolute;
            bottom: 6rem;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: #4A5568;
          }

          /* Print button styles */
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #3182CE;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 1000;
          }
          
          .print-button:hover {
            background-color: #2C5282;
          }
          
          .print-button svg {
            width: 16px;
            height: 16px;
          }
        }
        
        /* Modern receipt container with watermark */
        .receipt-container {
          position: relative;
          width: 210mm;
          height: 297mm;
          overflow: hidden;
          background: white;
          z-index: 10;
        }
        
        /* Enhanced watermark styling */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 160px;
          opacity: 0.1;
          color: #1A365D;
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
        }
        
        .watermark-logo {
          max-width: 350px;
          max-height: 350px;
          opacity: 0.25;
          margin-bottom: 20px;
          filter: grayscale(100%);
          transform: rotate(45deg);
        }
        
        .watermark-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          gap: 10px;
        }
        
        /* Logo background watermark - large centered watermark */
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
          background-image: ${data.schoolLogo ? `url('${data.schoolLogo}')` : 'none'};
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
          direction: ${documentDirection};
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
          text-align: ${isArabic ? 'right' : 'left'};
        }
        
        .header-contact-info span strong {
          display: inline-block;
          color: white;
          margin-right: ${isArabic ? '0' : '5px'};
          margin-left: ${isArabic ? '5px' : '0'};
          font-weight: 600;
        }
        
        .header-contact-info span [dir="ltr"] {
          unicode-bidi: embed;
          direction: ltr;
          text-align: left;
          display: inline-block;
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
          text-align: ${isArabic ? 'right' : 'left'};
        }
        
        .receipt-info-item strong {
          font-weight: 700;
          color: #2D3748;
          font-size: 13px;
          margin-right: ${isArabic ? '0' : '5px'};
          margin-left: ${isArabic ? '5px' : '0'};
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
          align-items: flex-start;
        }
        
        .info-label {
          font-weight: 700;
          width: 120px;
          color: #4A5568;
          flex-shrink: 0;
          font-size: 12px;
          text-align: ${isArabic ? 'right' : 'left'};
        }
        
        .info-row > div:last-child {
          flex-grow: 1;
          text-align: ${isArabic ? 'right' : 'left'};
        }
        
        /* Modern table styling */
        .fee-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          border: 2px solid ${isArabic ? '#800020' : '#800020'};
          table-layout: fixed;
        }
        
        /* Table headers */
        .fee-table th {
          background: linear-gradient(135deg, #800020 0%, #A52A2A 100%);
          color: white !important;
          font-weight: bold;
          padding: 10px 15px;
          border: none;
          text-align: ${isArabic ? 'right' : 'left'};
        }
        
        .fee-table th:nth-child(2) {
          text-align: ${isArabic ? 'right' : 'left'};
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
          text-align: right;
          direction: ltr;
        }
        
        /* Debug styles to help visualize settings */
        .debug-info {
          position: fixed;
          bottom: 10px;
          right: 10px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 5px;
          font-size: 10px;
          z-index: 9999;
          display: none; /* Only show for debugging */
        }

        ${signatureStyles}
      </style>
    </head>
    <body style="margin: 0; padding: 0; width: 100vw; max-width: 100vw; overflow-x: hidden;">
      ${getBigCenteredLogoWatermark(data.schoolLogo)}
      <button class="print-button no-print" onclick="window.print()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        ${isArabic ? 'عرض' : 'View'}
      </button>
      <div class="receipt-container">
        <!-- Remove any text watermark -->
        <div class="receipt-header">
          ${data.schoolLogo ? `
            <div class="logo">
              <img src="${data.schoolLogo}" alt="${displaySchoolName}" onerror="this.style.display='none'" />
            </div>
          ` : ''}
          <h1>${isArabic ? 'إيصال دفع' : 'Payment Receipt'}</h1>
          <p>${displaySchoolName}</p>
          <div class="header-contact-info">
            ${data.schoolPhone ? `<span><strong>${isArabic ? 'هاتف:' : 'Phone:'}</strong> <span dir="ltr">${data.schoolPhone}</span></span>` : ''}
            ${data.schoolPhoneWhatsapp ? `<span><strong>${isArabic ? 'واتساب:' : 'WhatsApp:'}</strong> <span dir="ltr">${data.schoolPhoneWhatsapp}</span></span>` : ''}
            ${data.schoolPhoneCall ? `<span><strong>${isArabic ? 'اتصال:' : 'Call:'}</strong> <span dir="ltr">${data.schoolPhoneCall}</span></span>` : ''}
            ${data.schoolEmail ? `<span><strong>${isArabic ? 'البريد الإلكتروني:' : 'Email:'}</strong> <span dir="ltr" class="email-text">${data.schoolEmail}</span></span>` : ''}
          </div>
        </div>
        
        <div class="receipt-info">
          <div class="receipt-info-item">
            <strong>${isArabic ? 'رقم الإيصال:' : 'Receipt No:'}</strong> <span dir="ltr">${data.receiptNumber}</span>
          </div>
          <div class="receipt-info-item">
            <strong>${isArabic ? 'التاريخ:' : 'Date:'}</strong> <span dir="ltr">${formatDate(data.date)}</span>
          </div>
        </div>
        <div class="receipt-body">
          <div style="text-align: center;" class="payment-status">
            <span class="status-badge ${data.isPartialPayment ? 'status-partial' : 'status-paid'}">
              ${isArabic ? (data.isPartialPayment ? 'دفعة جزئية' : 'مدفوع') : (data.isPartialPayment ? 'Partial Payment' : 'Paid')}
            </span>
          </div>
          
          <div class="info-section">
            <div class="info-group">
              <h3>${isArabic ? 'معلومات الطالب' : 'Student Information'}</h3>
              <div class="info-row">
                <div class="info-label">${isArabic ? 'الاسم:' : 'Name:'}</div>
                <div>${data.studentName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">${isArabic ? 'رقم الطالب:' : 'ID:'}</div>
                <div dir="ltr">${data.studentId}</div>
              </div>
              <div class="info-row">
                <div class="info-label">${isArabic ? 'الصف:' : 'Grade:'}</div>
                <div>${data.grade}</div>
              </div>
              ${data.academicYear ? `
              <div class="info-row">
                <div class="info-label">${isArabic ? 'العام الدراسي:' : 'Academic Year:'}</div>
                <div dir="ltr">${data.academicYear}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="info-group">
              <h3>${isArabic ? 'معلومات الدفع' : 'Payment Information'}</h3>
              <div class="info-row">
                <div class="info-label">${isArabic ? 'نوع الرسوم:' : 'Fee Type:'}</div>
                <div>${isInstallmentReceipt ? (isArabic ? 'رسوم القسط' : 'Installment Fees') : translateFeeType(data.feeType)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">${isArabic ? 'طريقة الدفع:' : 'Payment Method:'}</div>
                <div>${paymentMethod}</div>
              </div>
              ${data.paymentDate ? `
              <div class="info-row">
                <div class="info-label">${isArabic ? 'تاريخ الدفع:' : 'Payment Date:'}</div>
                <div>${isArabic ? new Date(data.paymentDate).toLocaleDateString('ar-SA') : new Date(data.paymentDate).toLocaleDateString('en-US')}</div>
              </div>
              ` : ''}
              ${checkNumber ? `
              <div class="info-row">
                <div class="info-label">${isArabic ? 'رقم الشيك:' : 'Cheque Number:'}</div>
                <div dir="ltr">${checkNumber}</div>
              </div>
              ` : ''}
              ${checkDate && checkDate !== data.paymentDate ? `
              <div class="info-row">
                <div class="info-label">${isArabic ? 'تاريخ الشيك:' : 'Cheque Date:'}</div>
                <div dir="ltr">${new Date(checkDate).toLocaleDateString('en-GB')}</div>
              </div>
              ` : ''}
              ${data.bankNameArabic ? `
              <div class="info-row">
                <div class="info-label">اسم البنك:</div>
                <div>${data.bankNameArabic || data.bankName}</div>
              </div>
              ` : ''}
              ${installmentFields.join('')}
              ${paymentNote ? `
              <div class="info-row">
                <div class="info-label">${isArabic ? 'ملاحظات:' : 'Note:'}</div>
                <div>${paymentNote}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <table class="fee-table" dir="rtl">
            <thead>
              <tr>
                <th style="text-align: ${isArabic ? 'right' : 'left'};">${isArabic ? 'البيان' : 'Description'}</th>
                <th style="text-align: right;">${isArabic ? 'المبلغ' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              <!-- For installment receipts, show only tuition/installment fees -->
              ${isInstallmentReceipt ? `
                <!-- Installment fees row -->
                ${actualPaidAmount > 0 ? `
                <tr>
                  <td>${isArabic ? 'رسوم القسط' : 'Installment Fees'}</td>
                  <td class="fee-amount">${Math.round(actualPaidAmount).toLocaleString('en-US')} ${currencySymbol}</td>
                </tr>
                ` : ''}
                
                <!-- Amount paid row -->
                <tr style="background-color: #f0f8ff; color: #2E8B57; font-weight: bold;">
                  <td><strong>${isArabic ? 'المبلغ المدفوع' : 'Amount Paid'}</strong></td>
                  <td class="fee-amount"><strong>${Math.round(tuitionPaidAmount).toLocaleString('en-US')} ${currencySymbol}</strong></td>
                </tr>
                
                <!-- Removed remaining installment fees row per request -->
              ` : `
                ${isCombinedReceipt ? `
                <!-- Combined fees breakdown -->
                <tr>
                  <td>${isArabic ? 'رسوم مدمجة' : 'Combined Fees'}</td>
                  <td class="fee-amount">${Math.round(combinedDisplayedAmount).toLocaleString('en-US')} ${currencySymbol}</td>
                </tr>
                
                <tr style="background-color: #f0f8ff; color: #2E8B57; font-weight: bold;">
                  <td><strong>${isArabic ? 'المبلغ المدفوع' : 'Amount Paid'}</strong></td>
                  <td class="fee-amount"><strong>${Math.round(combinedPaidAmount).toLocaleString('en-US')} ${currencySymbol}</strong></td>
                </tr>
                
                <tr style="background-color: #fff5f5; color: #C53030; font-weight: bold;">
                  <td><strong>${isArabic ? 'إجمالي المبلغ المتبقي' : 'Total Remaining Amount'}</strong></td>
                  <td class="fee-amount"><strong>${Math.round(combinedRemainingAmount).toLocaleString('en-US')} ${currencySymbol}</strong></td>
                </tr>
                ` : `
                <!-- Regular breakdown: tuition + transportation -->
                ${tuitionFeesAfterDiscount > 0 ? `
                <tr>
                  <td>${isArabic ? 'الرسوم الدراسية' : 'Tuition Fees'}</td>
                  <td class="fee-amount">${Math.round(tuitionFeesAfterDiscount).toLocaleString('en-US')} ${currencySymbol}</td>
                </tr>
                ` : ''}
                
                ${transportationFees > 0 ? `
                <tr>
                  <td>${isArabic ? 'رسوم النقل المدرسي' : 'Transportation Fees'}</td>
                  <td class="fee-amount">${Math.round(transportationFees).toLocaleString('en-US')} ${currencySymbol}</td>
                </tr>
                ` : ''}
                
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                  <td><strong>${isArabic ? 'إجمالي المبلغ' : 'Total Amount'}</strong></td>
                  <td class="fee-amount"><strong>${Math.round(totalFeesAmount).toLocaleString('en-US')} ${currencySymbol}</strong></td>
                </tr>
                
                <tr style="background-color: #f0f8ff; color: #2E8B57; font-weight: bold;">
                  <td><strong>${isArabic ? 'المبلغ المدفوع' : 'Amount Paid'}</strong></td>
                  <td class="fee-amount"><strong>${Math.round(tuitionPaidAmount + transportationPaidAmount).toLocaleString('en-US')} ${currencySymbol}</strong></td>
                </tr>
                
                ${tuitionFeesAfterDiscount > 0 ? `
                <tr style="background-color: #fff5f5; color: #C53030;">
                  <td>${isArabic ? 'المتبقي من الرسوم الدراسية' : 'Remaining Tuition Fees'}</td>
                  <td class="fee-amount">${Math.round(tuitionRemainingAmount).toLocaleString('en-US')} ${currencySymbol}</td>
                </tr>
                ` : ''}
                
                ${transportationFees > 0 ? `
                <tr style="background-color: #fff5f5; color: #C53030;">
                  <td>${isArabic ? 'المتبقي من رسوم النقل' : 'Remaining Transportation Fees'}</td>
                  <td class="fee-amount">${Math.round(transportationRemainingAmount).toLocaleString('en-US')} ${currencySymbol}</td>
                </tr>
                ` : ''}
                
                <tr style="background-color: #fff5f5; color: #C53030; font-weight: bold;">
                  <td><strong>${isArabic ? 'إجمالي المبلغ المتبقي' : 'Total Remaining Amount'}</strong></td>
                  <td class="fee-amount"><strong>${Math.round(tuitionRemainingAmount + transportationRemainingAmount).toLocaleString('en-US')} ${currencySymbol}</strong></td>
                </tr>
                `}
              `}
            </tbody>
          </table>
          
          ${checkNumber ? `
          <div style="margin-top: 15px; font-size: 14px; text-align: right; color: #444;" dir="rtl">
            <p style="margin-bottom: 5px;"><strong>ملاحظة:</strong> يعتبر الشيك لاغيا في حالة ارتجاع الشيك من البنك، يرجى الاحتفاظ بالإيصال حتى يتم سداد جميع الرسوم الدراسية.</p>
          </div>
          ` : ''}
          
          <div class="signatures">
            <div class="signature-block" style="display: ${showSignature ? 'block' : 'none'};">
              <div class="signature-line"></div>
              <div>توقيع الادارة المالية / المستلم</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="debug-info no-print">
        Stamps: ${showStamp ? 'ON' : 'OFF'} | 
        Signatures: Always ON | 
        Receipt Type: ${isInstallmentReceipt ? 'Installment' : 'Regular'} | 
        Payment Type: ${isPartialPayment ? 'Partial' : 'Full'}
      </div>
    </body>
    </html>
  `;
};

function arabicInstallmentLabel(n: number | string, installmentDetails?: string) {
  // Use the proper Arabic ordinal format for installment numbers
  if (n === 1 || n === '1') return 'الدفعة الأولى';
  if (n === 2 || n === '2') return 'الدفعة الثانية';
  if (n === 3 || n === '3') return 'الدفعة الثالثة';
  if (n === 4 || n === '4') return 'الدفعة الرابعة';
  if (n === 5 || n === '5') return 'الدفعة الخامسة';
  if (n === 6 || n === '6') return 'الدفعة السادسة';
  if (n === 7 || n === '7') return 'الدفعة السابعة';
  if (n === 8 || n === '8') return 'الدفعة الثامنة';
  if (n === 9 || n === '9') return 'الدفعة التاسعة';
  if (n === 10 || n === '10') return 'الدفعة العاشرة';
  return `الدفعة رقم ${n}`;
}