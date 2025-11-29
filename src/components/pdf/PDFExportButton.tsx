import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { StudentInstallmentsReportData } from '../../services/pdfExporter';
import { exportStudentInstallmentsReportToPDF } from '../../utils/pdfExport';
import { toast } from 'react-hot-toast';

interface PDFExportButtonProps {
  data: StudentInstallmentsReportData;
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

// Define the result type for PDF generation
interface PDFGenerationResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

/**
 * Button component for exporting reports to PDF
 * Uses the Electron IPC to communicate with the main process for PDF generation
 */
const PDFExportButton: React.FC<PDFExportButtonProps> = ({
  data,
  buttonText = 'تصدير PDF',
  className = '',
  variant = 'primary'
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if we're in an Electron environment
    const checkElectron = () => {
      const isElectronEnv = window.electron !== undefined;
      console.log('PDFExportButton: Is Electron environment?', isElectronEnv);
      setIsElectron(isElectronEnv);
      
      if (isElectronEnv) {
        console.log('PDFExportButton: Electron IPC available:', !!window.electron?.ipcRenderer);
      }
    };
    
    checkElectron();
  }, []);

  // Handle PDF export
  const handleExport = async () => {
    if (!data) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    try {
      setIsExporting(true);
      toast.loading('جاري تصدير التقرير...', { id: 'pdf-export' });

      console.log('PDFExportButton: Starting export process');
      console.log('PDFExportButton: Is Electron available?', !!window.electron);
      
      // Register listener for PDF generation completion
      if (window.electron?.ipcRenderer) {
        console.log('PDFExportButton: Setting up IPC listener');
        
        const cleanup = window.electron.ipcRenderer.on?.('pdf-generated', (result: PDFGenerationResult) => {
          console.log('PDFExportButton: Received pdf-generated event:', result);
          
          if (result.success) {
            toast.success(
              <div>
                تم تصدير التقرير بنجاح
                <br />
                <small style={{ fontSize: '12px' }}>تم حفظ الملف في مجلد التنزيلات وسيتم فتحه تلقائياً</small>
              </div>,
              { id: 'pdf-export', duration: 5000 }
            );
            console.log('PDFExportButton: PDF saved to:', result.filePath);
            // Optionally open the file or show its location
            // window.electron.shell.openPath(result.filePath);
          } else {
            toast.error(`فشل تصدير التقرير: ${result.error}`, { id: 'pdf-export' });
            console.error('PDFExportButton: PDF generation failed:', result.error);
          }
        });

        // Generate PDF
        console.log('PDFExportButton: Calling exportStudentInstallmentsReportToPDF');
        await exportStudentInstallmentsReportToPDF(data);

        // Clean up listener if not triggered
        if (cleanup) {
          console.log('PDFExportButton: Setting up cleanup timeout');
          setTimeout(() => {
            console.log('PDFExportButton: Cleaning up IPC listener');
            cleanup();
          }, 5000);
        }
      } else {
        // Fallback if electron is not available
        console.error('PDFExportButton: Electron IPC not available');
        toast.error('لا يمكن تصدير PDF: واجهة Electron غير متوفرة', { id: 'pdf-export' });
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(`فشل تصدير التقرير: ${error instanceof Error ? error.message : String(error)}`, { id: 'pdf-export' });
    } finally {
      setIsExporting(false);
      toast.dismiss('pdf-export');
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      className={className}
      variant={variant}
    >
      {isExporting ? 'جاري التصدير...' : buttonText}
      {!isElectron && <span style={{ fontSize: '10px', marginRight: '5px' }}>(Electron غير متوفر)</span>}
    </Button>
  );
};

export default PDFExportButton; 