import React, { useRef, useState, useEffect } from 'react';
import { Upload, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { parseCSV, excelToCSV, processImportedStudents, saveImportedDataWithSync } from '../services/importExport';
import * as hybridApi from '../services/hybridApi';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { studentsCount: number; feesCount: number; installmentsCount?: number }) => void;
  templateGenerator: () => string;
  templateFileName: string;
  schoolId: string;
  importType: 'students' | 'fees' | 'installments';
}

const ImportDialog = ({
  isOpen,
  onClose,
  onSuccess,
  templateGenerator,
  templateFileName,
  schoolId,
  importType
}: ImportDialogProps) => {
  const { user, isAuthenticated } = useSupabaseAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importStats, setImportStats] = useState<{studentsCount: number; feesCount: number; installmentsCount?: number} | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Reset dialog state when closed
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setPreviewData(null);
      setImportCompleted(false);
      setImportStats(null);
      setProcessingStatus('');
    }
  }, [isOpen]);

  const handleClose = () => {
    if (importCompleted && importStats) {
      onSuccess(importStats);
    }
    setError(null);
    setPreviewData(null);
    setImportCompleted(false);
    setImportStats(null);
    setProcessingStatus('');
    onClose();
  };

  const handleDownloadTemplate = () => {
    try {
      const csvContent = templateGenerator();
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = templateFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating template:', error);
      setError('حدث خطأ أثناء إنشاء قالب الاستيراد');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    setPreviewData(null);
    setImportCompleted(false);
    setProcessingStatus('جاري معالجة الملف...');
    
    try {
      let csvText = '';
      
      // Process based on file type
      if (file.name.endsWith('.csv')) {
        // Read the file as text with UTF-8 encoding
        const reader = new FileReader();
        csvText = await new Promise((resolve, reject) => {
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsText(file, 'UTF-8');
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // In a real app we would use SheetJS to convert Excel to CSV
        // For this demo, we'll try to read it as a CSV anyway
        try {
          csvText = await excelToCSV(file);
        } catch (err) {
          setError('يرجى استخدام ملف CSV. تنسيق Excel غير مدعوم حالياً.');
          setIsLoading(false);
          setProcessingStatus('');
          return;
        }
      } else {
        setError('نوع الملف غير مدعوم. يرجى استخدام ملف CSV.');
        setIsLoading(false);
        setProcessingStatus('');
        return;
      }
      
      // Add BOM for UTF-8 if not present
      const BOM = "\uFEFF";
      if (!csvText.startsWith(BOM)) {
        csvText = BOM + csvText;
      }
      
      // Parse CSV data
      const parsedData = parseCSV(csvText);
      
      if (parsedData.length === 0) {
        setError('لم يتم العثور على بيانات صالحة في الملف');
        setIsLoading(false);
        setProcessingStatus('');
        return;
      }
      
      console.log('Parsed Data:', parsedData);
      
      // Show preview before importing
      setPreviewData(parsedData);
      setProcessingStatus('تم معالجة الملف بنجاح. يمكنك الآن استيراد البيانات.');
    } catch (error) {
      console.error('Error processing file:', error);
      setError('حدث خطأ أثناء معالجة الملف. تأكد من تنسيق الملف وترميزه UTF-8');
      setProcessingStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;
    
    // Check authentication before proceeding
    if (!isAuthenticated || !user) {
      setError('يجب تسجيل الدخول أولاً لاستيراد البيانات');
      return;
    }
    
    // Validate school ID
    if (!schoolId || schoolId.trim() === '') {
      setError('معرف المدرسة غير صحيح. يرجى التواصل مع المدير');
      return;
    }
    
    // Check if user has proper school access (only for non-admin users)
    if (user.role !== 'admin') {
      if (!user.schoolId) {
        setError('المستخدم غير مرتبط بمدرسة. يرجى التواصل مع المدير');
        return;
      }
      
      // Verify school ID matches for non-admin users
      if (user.schoolId !== schoolId) {
        setError(`ليس لديك صلاحية للوصول إلى بيانات هذه المدرسة. معرف المدرسة المطلوب: ${schoolId}، معرف مدرستك: ${user.schoolId}`);
        return;
      }
    }
    
    console.log('User authentication check passed:', {
      userId: user.id,
      userRole: user.role,
      userSchoolId: user.schoolId,
      targetSchoolId: schoolId
    });
    
    setIsLoading(true);
    setError(null);
    setProcessingStatus('جاري استيراد البيانات...');
    
    try {
      // Get school settings for transportation fees
      const settingsResponse = await hybridApi.getSettings(schoolId);
      const settings = (settingsResponse.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : {};
      
      // Process the data with error handling
      let processedData;
      try {
        console.log('Raw preview data before processing:', previewData);
        console.log('School ID:', schoolId);
        console.log('Settings:', settings);
        
        processedData = processImportedStudents(previewData, schoolId, settings);
        console.log('Processed Students:', processedData.students);
        console.log('Processed Fees:', processedData.fees);
        console.log('Processed Installments:', processedData.installments);
        
        // Additional validation
        if (!processedData.students || !Array.isArray(processedData.students)) {
          throw new Error('معالجة الطلاب فشلت - البيانات غير صحيحة');
        }
        if (!processedData.fees || !Array.isArray(processedData.fees)) {
          throw new Error('معالجة الرسوم فشلت - البيانات غير صحيحة');
        }
        if (!processedData.installments || !Array.isArray(processedData.installments)) {
          throw new Error('معالجة الأقساط فشلت - البيانات غير صحيحة');
        }
      } catch (procError: any) {
        console.error('Error processing import data:', procError);
        setError(`حدث خطأ أثناء معالجة البيانات: ${procError?.message || 'خطأ غير معروف'}`);
        setIsLoading(false);
        setProcessingStatus('');
        return;
      }
      
      const { students, fees, installments } = processedData;
      
      if (students.length === 0 && fees.length === 0 && installments.length === 0) {
        setError('لم يتم العثور على بيانات صالحة للاستيراد');
        setIsLoading(false);
        setProcessingStatus('');
        return;
      }
      
      // Save data to dataStore with error handling
      let result;
      try {
        setProcessingStatus('حفظ البيانات...');
        console.log('About to call saveImportedDataWithSync with:');
        console.log('- Students count:', processedData.students.length);
        console.log('- Fees count:', processedData.fees.length);
        console.log('- Installments count:', processedData.installments.length);
        console.log('- School ID:', schoolId);
        
        result = await saveImportedDataWithSync(
          processedData.students,
          processedData.fees,
          schoolId,
          processedData.installments
        );
        
        console.log('saveImportedDataWithSync result:', result);
        console.log('Import completed:', result);
      } catch (saveError: any) {
        console.error('Error saving import data:', saveError);
        setError(`حدث خطأ أثناء حفظ البيانات: ${saveError?.message || 'خطأ غير معروف'}`);
        setIsLoading(false);
        setProcessingStatus('');
        return;
      }
      
      // Proactively refresh caches and notify parent for immediate UI update
      try {
        // Invalidate relevant caches so next fetch reflects fresh data
        hybridApi.invalidateCache('fees');
        hybridApi.invalidateCache('students');
        hybridApi.invalidateCache('installments');
      } catch (cacheErr) {
        console.warn('Cache invalidation warning:', cacheErr);
      }

      // Notify parent to refresh and close dialog
      if (onSuccess) {
        onSuccess({
          studentsCount: result.studentsCount,
          feesCount: result.feesCount,
          installmentsCount: result.installmentsCount || 0
        });
      }
      setIsLoading(false);
      setProcessingStatus('');
      onClose();
      // No explicit refresh needed as hybridApi handles data synchronization
      
      // Show success message in the dialog
      setImportCompleted(true);
      setImportStats(result);
      setProcessingStatus('تم استيراد البيانات بنجاح!');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error importing data:', error);
      setError(`حدث خطأ أثناء استيراد البيانات: ${error?.message || 'خطأ غير معروف'}`);
      setProcessingStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  // If dialog is not open, don't render anything
  if (!isOpen) return null;

  // Success view
  if (importCompleted && importStats) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              تم الاستيراد بنجاح
            </h3>
            <button 
              type="button" 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              <CheckCircle size={64} className="text-green-500" />
            </div>
            
            <h4 className="text-lg font-bold text-gray-800 mb-4">تم استيراد البيانات بنجاح!</h4>
            
            <div className="bg-green-50 p-4 rounded-md text-green-800 mb-6">
              <div className="flex flex-col gap-2">
                {importStats.studentsCount > 0 && (
                  <p>تم استيراد <span className="font-bold">{importStats.studentsCount}</span> طالب</p>
                )}
                {importStats.feesCount > 0 && (
                  <p>تم استيراد <span className="font-bold">{importStats.feesCount}</span> رسوم مالية</p>
                )}
                {importStats.studentsCount === 0 && importStats.feesCount === 0 && (
                  <p>لم يتم استيراد أي بيانات جديدة</p>
                )}
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-primary w-full"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            {importType === 'students' ? 'استيراد الطلبة' : importType === 'fees' ? 'استيراد الرسوم' : 'استيراد الدفعات'}
          </h3>
          <button 
            type="button" 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-700">
            <h4 className="font-bold mb-2">تعليمات الاستيراد:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>تأكد من استخدام ملف CSV بترميز UTF-8 لدعم اللغة العربية</li>
              <li>تأكد من الالتزام بتنسيق القالب المتوفر</li>
              <li>يمكنك استيراد الطلبة والرسوم معاً في ملف واحد</li>
              <li>رقم الطالب يجب أن يكون فريداً لكل طالب</li>
              <li>إذا كان الطالب موجوداً مسبقاً، سيتم تحديث بياناته</li>
            </ul>
          </div>
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="btn btn-secondary flex items-center gap-2 flex-1"
            >
              <Download size={18} />
              <span>تنزيل قالب</span>
            </button>
            
            <div className="relative flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelected}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button
                type="button"
                className="btn btn-primary w-full flex items-center gap-2 justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} />
                <span>اختيار ملف</span>
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">حدث خطأ</p>
                <p>{error}</p>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="p-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              <span className="mr-3">{processingStatus}</span>
            </div>
          )}
          
          {!isLoading && processingStatus && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-700">
              {processingStatus}
            </div>
          )}
          
          {previewData && previewData.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">معاينة البيانات ({previewData.length} سجل):</h3>
              <div className="border rounded-md overflow-x-auto max-h-60">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0]).map((header, index) => (
                        <th 
                          key={index}
                          className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {Object.values(row).map((cell: any, cellIndex) => (
                          <td 
                            key={cellIndex}
                            className="px-3 py-2 whitespace-nowrap text-sm text-gray-500"
                          >
                            {cell?.toString() || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {previewData.length > 5 && (
                      <tr>
                        <td colSpan={Object.keys(previewData[0]).length} className="px-3 py-2 text-sm text-gray-500 text-center">
                          ... {previewData.length - 5} سجلات إضافية
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="btn btn-secondary ml-3"
                  onClick={handleClose}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={isLoading}
                >
                  استيراد البيانات
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
 