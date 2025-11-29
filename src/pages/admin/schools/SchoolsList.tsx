import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash, Database, RefreshCw } from 'lucide-react';
import { getSchools, deleteSchool } from '../../../services/schoolService';

interface School {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  location: string;
  active: boolean;
  subscriptionStart: string;
  subscriptionEnd: string;
  logo: string;
}

const SchoolsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean, id: string, name: string}>({
    show: false,
    id: '',
    name: ''
  });

  useEffect(() => {
    // Check for success message in location state
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      // Clear the location state
      window.history.replaceState({}, document.title);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  useEffect(() => {
    // Fetch schools
    const loadSchools = async () => {
      try {
        setIsLoading(true);
        const schoolsList = await getSchools();
        
        // Check if we received valid data
        if (!Array.isArray(schoolsList)) {
          console.error('Invalid schools data received:', schoolsList);
          setSchools([]);
          return;
        }
        
        // Filter out any null or non-object items
        const validSchools = schoolsList.filter(school => 
          school && 
          typeof school === 'object' && 
          school !== null
        );
        
        // Log validation info for debugging
        if (validSchools.length !== schoolsList.length) {
          console.warn(`Filtered out ${schoolsList.length - validSchools.length} invalid school entries`);
        }
        
        // Sort schools alphabetically by name with robust null/undefined handling
        validSchools.sort((a, b) => {
          // Safe access to name property with fallbacks
          const nameA = a && a.name ? String(a.name).trim() : '';
          const nameB = b && b.name ? String(b.name).trim() : '';
          
          return nameA.localeCompare(nameB);
        });
        
        setSchools(validSchools);
      } catch (error) {
        console.error('Error loading schools:', error);
        setSchools([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSchools();
  }, [refreshTrigger]);

  const handleAddSchool = () => {
    navigate('/admin/schools/new');
  };
  
  const handleRefreshSchools = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleDeleteSchool = (id: string, name: string) => {
    setDeleteConfirmation({
      show: true,
      id,
      name
    });
  };
  
  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      // Delete the school from Firebase (including related accounts)
      await deleteSchool(deleteConfirmation.id);
      
      // Update local state
      setSchools(schools.filter(school => school.id !== deleteConfirmation.id));
      setDeleteConfirmation({ show: false, id: '', name: '' });
      
      // Show success message
      setSuccessMessage(`تم حذف المدرسة "${deleteConfirmation.name}" وجميع البيانات المرتبطة بها بنجاح`);
      
      // Force refresh the list to ensure sync with dataStore and Firebase
      handleRefreshSchools();
      
      // Auto-dismiss message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error deleting school:', error);
      alert('حدث خطأ أثناء حذف المدرسة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, id: '', name: '' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">إدارة المدارس</h1>
        <div className="flex gap-2">
          <button 
            onClick={handleRefreshSchools}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={18} />
            <span>تحديث</span>
          </button>
          <button 
            onClick={handleAddSchool}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>إضافة مدرسة</span>
          </button>
        </div>
      </div>
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-start">
          <div className="flex-shrink-0 mr-3">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
          <Database size={20} className="text-primary" />
          <h2 className="text-xl font-bold text-gray-800">قائمة المدارس</h2>
          <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">{schools.length}</span>
        </div>
        
        {schools.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا توجد مدارس مسجلة في النظام
          </div>
        ) :
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اسم المدرسة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    معلومات الاتصال
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الموقع
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الاشتراك
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {school.logo ? (
                          <img 
                            src={school.logo} 
                            alt={`شعار ${school.name}`} 
                            className="h-10 w-10 rounded-full mr-3 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full mr-3 bg-primary-light text-primary flex items-center justify-center font-bold">
                            {school.name ? school.name.charAt(0).toUpperCase() : "S"}
                          </div>
                        )}
                        <div className="font-medium text-gray-900">{school.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {school.email && <div><span className="text-gray-700">البريد:</span> {school.email}</div>}
                        {school.phone && <div><span className="text-gray-700">الهاتف:</span> {school.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{school.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        school.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {school.active ? 'نشطة' : 'غير نشطة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        <div>من: {formatDate(school.subscriptionStart)}</div>
                        <div>إلى: {formatDate(school.subscriptionEnd)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Link
                          to={`/admin/schools/${school.id}`}
                          className="text-primary hover:text-primary-dark"
                          title="تعديل"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDeleteSchool(school.id, school.name)}
                          className="text-red-600 hover:text-red-800"
                          title="حذف"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">تأكيد الحذف</h3>
            <p className="mb-6 text-gray-600">
              هل أنت متأكد من حذف المدرسة "{deleteConfirmation.name}"؟ سيتم حذف جميع البيانات المرتبطة بها بما في ذلك:
              <ul className="list-disc list-inside mt-2 mr-4 text-red-600">
                <li>حسابات المستخدمين</li>
                <li>بيانات الطلاب</li>
                <li>الرسوم والأقساط</li>
                <li>الإعدادات</li>
              </ul>
              <div className="text-red-600 font-semibold mt-4">لا يمكن التراجع عن هذا الإجراء!</div>
            </p>
            <div className="flex justify-end space-x-2 space-x-reverse">
              <button
                onClick={cancelDelete}
                className="btn btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-danger"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolsList;
 