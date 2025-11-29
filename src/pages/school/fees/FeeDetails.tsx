import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import hybridApi from '../../../services/hybridApi';
import { CURRENCY } from '../../../utils/constants';
import ReceiptActions from '../../../components/payments/ReceiptActions';

const FeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  
  const [fee, setFee] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        if (!id || !user?.schoolId) {
          navigate('/school/fees');
          return;
        }
        
        // Fetch fee data
        const feeResponse = await hybridApi.getFees(user.schoolId);
        if (!feeResponse?.success || !feeResponse.data) {
          navigate('/school/fees');
          return;
        }
        
        const feeData = feeResponse.data.find((f: any) => f.id === id);
        if (!feeData) {
          navigate('/school/fees');
          return;
        }
        setFee(feeData);
        
        // Fetch student data
        const studentResponse = await hybridApi.getStudents(user.schoolId);
        if (!studentResponse?.success || !studentResponse.data) {
          console.error('Student data not found');
          return;
        }
        
        const studentData = studentResponse.data.find((s: any) => s.id === feeData.studentId);
        if (!studentData) {
          console.error('Student data not found');
          return;
        }
        setStudent(studentData);
        
        // Get school settings
        const settingsResponse = await hybridApi.getSettings(user.schoolId);
        if (settingsResponse?.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) {
          setSettings(settingsResponse.data[0]);
        }
        
        // Prepare receipt data if fee is paid or partially paid
        if (feeData.status === 'paid' || feeData.status === 'partial') {
          setReceiptData({
            receiptNumber: `R-${feeData.id.substring(0, 6)}`,
            date: new Date().toISOString().split('T')[0],
            studentName: studentData.name,
            studentId: studentData.studentId,
            grade: studentData.grade,
            feeType: feeData.feeType,
            amount: feeData.paid,
            discount: feeData.discount,
            originalAmount: feeData.amount,
            totalAmount: feeData.amount,
            schoolName: user?.schoolName || '',
            schoolId: user?.schoolId,
            schoolLogo: settings?.logo,
            schoolPhone: settings?.phone,
            schoolPhoneWhatsapp: settings?.phoneWhatsapp,
            schoolPhoneCall: settings?.phoneCall,
            schoolEmail: settings?.email,
            isPartialPayment: feeData.status === 'partial',
            showWatermark: settings?.showReceiptWatermark,
            showLogoBackground: settings?.showLogoBackground,
            showStamp: settings?.showStampOnReceipt,
            showSignature: settings?.showSignatureOnReceipt,
            showFooter: settings?.showFooterInReceipts,
            // stamp: settings?.stamp, // Stamp functionality removed
            academicYear: new Date().getFullYear().toString(),
            paymentMethod: 'نقداً'
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, navigate, user]);
  
  // Format date to readable format
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ar-OM');
    } catch (e) {
      return dateString;
    }
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'مدفوع';
      case 'partial':
        return 'مدفوع جزئياً';
      case 'unpaid':
        return 'غير مدفوع';
      default:
        return status;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!fee) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-gray-600">لم يتم العثور على الرسوم</p>
        <button 
          onClick={() => navigate('/school/fees')}
          className="mt-4 btn btn-primary"
        >
          العودة إلى قائمة الرسوم
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button and Actions */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => navigate('/school/fees')}
          className="flex items-center text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} className="ml-1" />
          <span>العودة إلى قائمة الرسوم</span>
        </button>
        
        <div className="flex space-x-2 rtl:space-x-reverse">
          {receiptData && (fee.status === 'paid' || fee.status === 'partial') && (
            <ReceiptActions receiptData={receiptData} />
          )}
          
          <button 
            onClick={() => navigate(`/school/fees/edit/${fee.id}`)}
            className="btn btn-primary btn-sm flex items-center"
          >
            <Edit size={16} className="ml-1" />
            <span>تعديل</span>
          </button>
        </div>
      </div>
      
      {/* Fee Information Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary">تفاصيل الرسوم</h2>
          
          <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusClass(fee.status)}`}>
            {getStatusText(fee.status)}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm text-gray-500">نوع الرسوم</h3>
            <p className="text-lg font-medium">{fee.feeType}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">المبلغ</h3>
            <p className="text-lg font-medium">{fee.amount.toLocaleString()} {CURRENCY}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">الخصم</h3>
            <p className="text-lg font-medium">{(fee.discount || 0).toLocaleString()} {CURRENCY}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">المدفوع</h3>
            <p className="text-lg font-medium">{fee.paid.toLocaleString()} {CURRENCY}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">المتبقي</h3>
            <p className="text-lg font-medium">{fee.balance.toLocaleString()} {CURRENCY}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">تاريخ الاستحقاق</h3>
            <p className="text-lg font-medium">{formatDate(fee.dueDate)}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">تاريخ الإنشاء</h3>
            <p className="text-lg font-medium">{formatDate(fee.createdAt)}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">آخر تحديث</h3>
            <p className="text-lg font-medium">{formatDate(fee.updatedAt)}</p>
          </div>
          
          {fee.description && (
            <div className="col-span-full">
              <h3 className="text-sm text-gray-500">الوصف</h3>
              <p className="text-lg font-medium">{fee.description}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Student Information Card */}
      {student && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-primary mb-6">معلومات الطالب</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm text-gray-500">الاسم</h3>
              <p className="text-lg font-medium">{student.name}</p>
            </div>
            
            <div>
              <h3 className="text-sm text-gray-500">رقم الطالب</h3>
              <p className="text-lg font-medium">{student.studentId}</p>
            </div>
            
            <div>
              <h3 className="text-sm text-gray-500">الصف</h3>
              <p className="text-lg font-medium">{student.grade} {student.division && `- ${student.division}`}</p>
            </div>
            
            <div>
              <h3 className="text-sm text-gray-500">اسم ولي الأمر</h3>
              <p className="text-lg font-medium">{student.parentName}</p>
            </div>
            
            <div>
              <h3 className="text-sm text-gray-500">رقم الهاتف</h3>
              <p className="text-lg font-medium">{student.phone}</p>
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={() => navigate(`/school/students/${student.id}`)}
              className="btn btn-outline-primary"
            >
              عرض تفاصيل الطالب
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeDetails;