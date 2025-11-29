import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { GRADE_LEVELS } from '../../../utils/constants';

interface GradeRestrictionsModalProps {
  userId: string;
  userName: string;
  currentGradeLevels: string[];
  onClose: () => void;
  onSave: (gradeLevels: string[]) => void;
}

const GradeRestrictionsModal: React.FC<GradeRestrictionsModalProps> = ({
  userId,
  userName,
  currentGradeLevels,
  onClose,
  onSave
}) => {
  const [selectedGrades, setSelectedGrades] = useState<string[]>(currentGradeLevels || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGradeToggle = (grade: string) => {
    if (selectedGrades.includes(grade)) {
      setSelectedGrades(selectedGrades.filter(g => g !== grade));
    } else {
      setSelectedGrades([...selectedGrades, grade]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Update the user's grade levels in localStorage
      const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
      const accountIndex = accounts.findIndex((account: any) => account.id === userId);
      
      if (accountIndex !== -1) {
        accounts[accountIndex].gradeLevels = selectedGrades;
        localStorage.setItem('accounts', JSON.stringify(accounts));
        console.log(`Updated grade restrictions for user ${userId} to:`, selectedGrades);
      } else {
        console.warn(`User ${userId} not found in localStorage`);
      }
      
      // Notify parent component
      onSave(selectedGrades);
    } catch (error) {
      console.error('Error updating grade restrictions:', error);
      setError('حدث خطأ أثناء حفظ الصفوف. الرجاء المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">إدارة صلاحيات الصفوف</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600">تحديد الصفوف المسموح بها للمستخدم: <strong>{userName}</strong></p>
        </div>
        
        <div className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {GRADE_LEVELS.map((grade) => (
              <div 
                key={grade}
                className={`px-3 py-2 border rounded-md text-sm cursor-pointer transition-colors ${
                  selectedGrades.includes(grade) 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white hover:bg-gray-50 border-gray-300'
                }`}
                onClick={() => handleGradeToggle(grade)}
              >
                {grade}
              </div>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeRestrictionsModal; 