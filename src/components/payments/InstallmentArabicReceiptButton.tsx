import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, FileSignature, ToggleLeft, ToggleRight } from 'lucide-react';
import { CURRENCY } from '../../utils/constants';
import { downloadInstallmentReceiptAsPDF } from '../../services/pdf/receipts/receipt-export';

// Define props interface
interface InstallmentArabicReceiptButtonProps {
  receiptData: any;
  compact?: boolean;
}

/**
 * A button component that generates Arabic installment receipts
 * This is a separate component from the regular Arabic receipt button
 * to ensure proper handling of installment-specific details
 */
const InstallmentArabicReceiptButton: React.FC<InstallmentArabicReceiptButtonProps> = ({ receiptData, compact = false }) => {
  // Add state for signature toggle
  const [showSignature, setShowSignature] = useState(true);

  // Toggle signature setting
  const toggleSignature = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent button click
    setShowSignature(!showSignature);
    toast.success(`Signatures ${showSignature ? 'disabled' : 'enabled'}`);
  };

  // Handle Arabic receipt generation
  const handleArabicReceipt = () => {
    try {
      // Debug receipt data for troubleshooting
      console.log('InstallmentArabicReceiptButton - Full Receipt Data:', receiptData);
      console.log('InstallmentArabicReceiptButton - School Info:', {
        schoolName: receiptData?.schoolName,
        schoolLogo: receiptData?.schoolLogo,
        schoolPhone: receiptData?.schoolPhone,
        schoolEmail: receiptData?.schoolEmail,
        hasSchoolLogo: !!receiptData?.schoolLogo,
        schoolLogoLength: receiptData?.schoolLogo ? receiptData.schoolLogo.length : 0
      });
      console.log('InstallmentArabicReceiptButton - Receipt Settings:', {
        showSignature,
        isInstallment: true
      });

      // Prepare receipt data with settings from school configuration
      const receiptDataWithSettings = {
        ...receiptData,
        // Use receipt number as provided (respect settings; do not force prefix)
        receiptNumber: receiptData.receiptNumber,
        // Force language to Arabic
        language: 'arabic' as 'arabic',
        // Mark as installment receipt
        isInstallment: true,
        // Force stamp to always be false
        showStamp: false,
        // Use the signature toggle state
        showSignature,
        // Enable watermark for better visual effect
        showWatermark: true
      };

      // Generate and download the receipt
      downloadInstallmentReceiptAsPDF(receiptDataWithSettings);
      toast.success('جاري تحميل إيصال القسط...', { id: 'arabic-receipt' });
    } catch (error) {
      console.error('Error generating Arabic installment receipt:', error);
      toast.error(`خطأ في إنشاء إيصال القسط: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`, { id: 'arabic-receipt' });
    }
  };

  // Render compact version for tables
  if (compact) {
    return (
      <>
        <div className="flex items-center">
          <button
            onClick={handleArabicReceipt}
            className="p-1 text-green-600 hover:text-green-800 transition-colors"
            title="Arabic Installment Receipt"
          >
            <Download size={18} />
          </button>
          <button
            onClick={toggleSignature}
            className={`p-1 ${showSignature ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'} transition-colors ml-1`}
            title={`${showSignature ? 'Disable' : 'Enable'} Signatures`}
          >
            {showSignature ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
        </div>
      </>
    );
  }

  // Render full button with toggle
  return (
    <>
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <button
          onClick={handleArabicReceipt}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <span className="ml-2">تحميل إيصال القسط</span>
          <Download size={18} />
        </button>
        <button
          onClick={toggleSignature}
          className={`px-2 py-2 rounded-md flex items-center ${showSignature ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          title={`${showSignature ? 'إخفاء التوقيعات' : 'إظهار التوقيعات'}`}
        >
          {showSignature ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </button>
      </div>
    </>
  );
};

export default InstallmentArabicReceiptButton;