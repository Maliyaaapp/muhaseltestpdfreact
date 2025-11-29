import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import pdfPrinter from '../../services/pdfPrinter';
import hybridApi from '../../services/hybridApi';
import { ReceiptData } from '../../types/reports';
import { Eye, Download, FileSignature, ToggleLeft, ToggleRight } from 'lucide-react';
import EnglishReceiptButton from './EnglishReceiptButton';

// Extend the ReceiptData interface to include schoolId
interface ExtendedReceiptData extends ReceiptData {
  schoolId?: string;
}

interface ReceiptActionsProps {
  receiptData?: ExtendedReceiptData;
  fee?: any; // Fee object when using async generation
  generateReceiptData?: (fee: any) => Promise<ExtendedReceiptData | null>; // Async function to generate receipt data
  compact?: boolean; // Add a compact mode for table cells
}

const ReceiptActions: React.FC<ReceiptActionsProps> = ({ receiptData, fee, generateReceiptData, compact = false }) => {
  // Add state for signature toggle
  const [showSignature, setShowSignature] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Toggle signature setting
  const toggleSignature = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent button click
    setShowSignature(!showSignature);
    toast.success(`Signatures ${showSignature ? 'disabled' : 'enabled'}`);
  };

  const handlePrint = async () => {
    try {
      setIsLoading(true);
      let currentReceiptData = receiptData;
      
      // If we don't have receiptData but have fee and generateReceiptData, generate it
      if (!currentReceiptData && fee && generateReceiptData) {
        currentReceiptData = await generateReceiptData(fee);
        if (!currentReceiptData) {
          toast.error('لا يمكن إنشاء بيانات الإيصال');
          return;
        }
      }
      
      if (!currentReceiptData) {
        toast.error('بيانات الإيصال غير متوفرة');
        return;
      }
      
      // DEBUG: Log the school information in ReceiptActions
      console.log('RECEIPT ACTIONS PRINT - School Data Debug:', {
        schoolName: currentReceiptData.schoolName,
        schoolLogo: currentReceiptData.schoolLogo,
        schoolPhone: currentReceiptData.schoolPhone,
        schoolEmail: currentReceiptData.schoolEmail,
        hasSchoolLogo: !!currentReceiptData.schoolLogo,
        schoolLogoLength: currentReceiptData.schoolLogo ? currentReceiptData.schoolLogo.length : 0
      });
      
      // Add the signature toggle state to the receipt data
      const receiptDataWithSignature = {
        ...currentReceiptData,
        showSignature,
        showStamp: false, // Always force stamp to be false
        showWatermark: true // Enable watermark for better visual effect
      };
      
      await pdfPrinter.printReceipt(receiptDataWithSignature);
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('حدث خطأ أثناء طباعة الإيصال');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsLoading(true);
      toast.loading('جاري تصدير الإيصال...', { id: 'receipt-export' });
      
      let currentReceiptData = receiptData;
      
      // If we don't have receiptData but have fee and generateReceiptData, generate it
      if (!currentReceiptData && fee && generateReceiptData) {
        currentReceiptData = await generateReceiptData(fee);
        if (!currentReceiptData) {
          toast.error('لا يمكن إنشاء بيانات الإيصال', { id: 'receipt-export' });
          return;
        }
      }
      
      if (!currentReceiptData) {
        toast.error('بيانات الإيصال غير متوفرة', { id: 'receipt-export' });
        return;
      }
      
      // DEBUG: Log the school information in ReceiptActions PDF export
      console.log('RECEIPT ACTIONS EXPORT - School Data Debug:', {
        schoolName: currentReceiptData.schoolName,
        schoolLogo: currentReceiptData.schoolLogo,
        schoolPhone: currentReceiptData.schoolPhone,
        schoolEmail: currentReceiptData.schoolEmail,
        hasSchoolLogo: !!currentReceiptData.schoolLogo,
        schoolLogoLength: currentReceiptData.schoolLogo ? currentReceiptData.schoolLogo.length : 0
      });
      
      // Get school settings to check footer visibility
      let schoolSettings = { showFooterInReceipts: true };
      if (currentReceiptData.schoolId) {
        const settingsResponse = await hybridApi.getSettings(currentReceiptData.schoolId);
        if (settingsResponse.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) {
          schoolSettings = settingsResponse.data[0];
        }
      }
      
      // Update receipt data with footer visibility settings and signature toggle
      const receiptWithSettings = {
        ...currentReceiptData,
        showFooter: schoolSettings.showFooterInReceipts,
        showSignature, // Add the signature toggle state
        showStamp: false, // Always force stamp to be false
        showWatermark: true // Enable watermark for better visual effect
      };
      
      // Export the receipt as PDF using Electron's native printToPDF
      const filePath = await pdfPrinter.exportReceiptAsPDF(receiptWithSettings);
      
      toast.success('تم تصدير الإيصال بنجاح', { id: 'receipt-export' });
      
      // Try to open the file if we're in Electron environment
      try {
        // @ts-ignore - Ignore TypeScript errors for Electron API
        if (window.electron && typeof window.electron.shell?.openPath === 'function') {
          // @ts-ignore - Ignore TypeScript errors for Electron API
          window.electron.shell.openPath(filePath);
        }
      } catch (err) {
        console.log('Could not open file, might not be in Electron environment');
      }
    } catch (error) {
      console.error('Error exporting receipt as PDF:', error);
      
      // Check if this was a user cancellation
      if (error && typeof error === 'object' && 'canceled' in error) {
        console.log('User canceled the PDF export');
        toast.dismiss('receipt-export'); // Just dismiss the loading toast without error
      } else {
        toast.error('حدث خطأ أثناء تصدير الإيصال', { id: 'receipt-export' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render a compact version for table cells
  if (compact) {
    return (
      <div className="flex gap-1">
        <button
          onClick={handlePrint}
          disabled={isLoading}
          className="p-1 text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
          title="عرض الإيصال"
        >
          <Eye size={18} />
        </button>
        <button
          onClick={handleExportPDF}
          disabled={isLoading}
          className="p-1 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
          title="تصدير PDF"
        >
          <Download size={18} />
        </button>
        {(receiptData || (fee && generateReceiptData)) && (
          <EnglishReceiptButton 
            receiptData={receiptData} 
            fee={fee}
            generateReceiptData={generateReceiptData}
            compact={true} 
          />
        )}
      </div>
    );
  }

  // Render the full-sized version
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      <button
        onClick={handlePrint}
        disabled={isLoading}
        className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white px-5 py-2.5 rounded-md flex items-center shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        <span className="mr-2 font-medium">عرض الإيصال</span>
        <Eye size={18} />
      </button>
      <button
        onClick={handleExportPDF}
        disabled={isLoading}
        className="bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white px-5 py-2.5 rounded-md flex items-center shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        <span className="mr-2 font-medium">تصدير PDF</span>
        <Download size={18} />
      </button>
      {(receiptData || (fee && generateReceiptData)) && (
        <EnglishReceiptButton 
          receiptData={receiptData} 
          fee={fee}
          generateReceiptData={generateReceiptData}
        />
      )}
    </div>
  );
};

export default ReceiptActions;