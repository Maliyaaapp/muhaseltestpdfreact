import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, Check } from 'lucide-react';
import { parseCSV, processImportedStudents, saveImportedDataWithSync } from '../services/importExport';
import dataStore from '../services/dataStore';
import hybridApi from '../services/hybridApi';
import { TRANSPORTATION_TYPES } from '../utils/constants';

interface SimpleImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onSuccess?: (data: { studentsCount: number, feesCount: number }) => void;
}

const SimpleImportDialog = ({ isOpen, onClose, schoolId, onSuccess }: SimpleImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ studentsCount: number, feesCount: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const downloadTemplate = () => {
    // Create BOM for UTF-8
    const BOM = "\uFEFF";
    
    // Get Arabic transportation type
    const noneTransportArabic = TRANSPORTATION_TYPES.find(t => t.id === 'none')?.name || 'لا يوجد';
    
    // Define headers and example data
    const headers = [
      'اسم الطالب',
      'رقم الطالب',
      'الصف',
      'الشعبة',
      'اسم ولي الأمر',
      'رقم الهاتف',
      'النقل',
      'الرسوم الدراسية',
      'خصم الرسوم الدراسية'
    ];
    
    const exampleRows = [
      [
        'أحمد محمد',
        'S1001',
        'الصف الأول',
        'أ',
        'محمد أحمد',
        '98765432',
        noneTransportArabic,
        '1200',
        '0'
      ]
    ];
    
    // Create CSV content (without notes)
    const csvContent = BOM + [
      headers.join(','),
      ...exampleRows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'نموذج_استيراد_الطلاب.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!file) {
      setError('يرجى اختيار ملف أولاً');
      return;
    }
    
    // Validate schoolId
    if (!schoolId || schoolId.trim() === '') {
      setError('معرف المدرسة غير صالح. يرجى التأكد من ربط المستخدم بالمدرسة الصحيحة.');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      let csvText = '';
      
      // Read the file as text with UTF-8 encoding
      const reader = new FileReader();
      csvText = await new Promise((resolve, reject) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file, 'UTF-8');
      });
      
      // Add BOM for UTF-8 if not present
      const BOM = "\uFEFF";
      if (!csvText.startsWith(BOM)) {
        csvText = BOM + csvText;
      }
      
      // Parse CSV data
      const parsedData = parseCSV(csvText);
      
      if (parsedData.length === 0) {
        setError('لم يتم العثور على بيانات صالحة في الملف');
        setIsUploading(false);
        return;
      }
      
      // Get school settings for transportation fees
      let settings;
      try {
        const settingsResponse = await hybridApi.getSettings(schoolId);
        settings = (settingsResponse.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : dataStore.getSettings(schoolId);
      } catch (error) {
        console.error('Error fetching settings from hybridApi, falling back to dataStore:', error);
        settings = dataStore.getSettings(schoolId);
      }
      
      // Process the data
      const { students, fees, installments } = processImportedStudents(parsedData, schoolId, settings);
      
      if (students.length === 0 && fees.length === 0 && installments.length === 0) {
        setError('لم يتم العثور على بيانات صالحة للاستيراد');
        setIsUploading(false);
        return;
      }
      
      // Save data with Supabase sync
      const result = await saveImportedDataWithSync(students, fees, schoolId, installments);
      
      // Show success message
      setImportResult(result);
      
      // Reset file input
      setFile(null);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      setError('حدث خطأ أثناء استيراد البيانات');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">استيراد الطلاب</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        {!importResult ? (
          <>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 text-center cursor-pointer hover:bg-gray-50"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <Upload size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 mb-2">اسحب وأفلت ملف CSV هنا أو انقر لاختيار ملف</p>
              {file && (
                <div className="flex items-center justify-center text-primary">
                  <FileText size={18} className="mr-1" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md text-blue-800 mb-4">
              <div className="flex">
                <AlertCircle className="flex-shrink-0 mr-2" size={18} />
                <div>
                  <p className="text-sm">تأكد من أن ملف CSV يحتوي على العناوين الصحيحة. يمكنك تنزيل نموذج للاستيراد.</p>
                  <button 
                    onClick={downloadTemplate}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-1"
                  >
                    تنزيل نموذج CSV
                  </button>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 p-4 rounded-md text-red-800 mb-4">
                <div className="flex">
                  <AlertCircle className="flex-shrink-0 mr-2" size={18} />
                  <p>{error}</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 rtl:space-x-reverse">
              <button
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isUploading}
              >
                إلغاء
              </button>
              <button
                onClick={handleImport}
                className="btn btn-primary"
                disabled={!file || isUploading}
              >
                {isUploading ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    جاري الاستيراد...
                  </span>
                ) : 'استيراد'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">تم الاستيراد بنجاح!</h3>
            <p className="text-gray-600 mb-6">
              تم استيراد {importResult.studentsCount} طالب و {importResult.feesCount} رسوم
            </p>
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleImportDialog;