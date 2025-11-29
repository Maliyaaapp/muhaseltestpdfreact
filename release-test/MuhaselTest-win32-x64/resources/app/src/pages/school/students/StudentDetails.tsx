import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, FileText, Download, Edit, Trash } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import * as hybridApi from '../../../services/hybridApi';
import { CURRENCY } from '../../../utils/constants';
import { printStudentReport, printStudentInstallmentsReport, downloadStudentReportAsPDF, downloadInstallmentsReportAsPDF } from '../../../services/pdfPrinter';
import { AlertDialog } from '../../../components/ui/Dialog';

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  
  const [student, setStudent] = useState<any>(null);
  const [studentFees, setStudentFees] = useState<any[]>([]);
  const [studentInstallments, setStudentInstallments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'fees' | 'installments'>('fees');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  useEffect(() => {
    const fetchStudentData = async () => {
      setIsLoading(true);
      
      try {
        if (!id || !user?.schoolId) {
          navigate('/school/students');
          return;
        }
        
        // Fetch student data
        const studentResponse = await hybridApi.getStudent(id);
        if (!studentResponse?.success || !studentResponse?.data) {
          navigate('/school/students');
          return;
        }
        setStudent(studentResponse.data);
        
        // Fetch student fees
        const feesResponse = await hybridApi.getFees(user.schoolId, id);
        const fees = feesResponse?.success ? feesResponse.data : [];
        setStudentFees(fees);
        
        // Fetch student installments
        const installmentsResponse = await hybridApi.getInstallments(user.schoolId, id);
        const installments = installmentsResponse?.success ? installmentsResponse.data : [];
        setStudentInstallments(installments);
        
        // Get school settings
        const settingsResponse = await hybridApi.getSettings(user.schoolId);
        const schoolSettings = (settingsResponse?.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : null;
        setSettings(schoolSettings);
      } catch (error) {
        console.error('Error fetching student data:', error);
        setAlertMessage('حدث خطأ أثناء جلب بيانات الطالب');
        setAlertOpen(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudentData();
  }, [id, navigate, user]);
  
  // Calculate fee totals
  const totalAmount = studentFees.reduce((sum, fee) => sum + fee.amount, 0);
  const totalDiscount = studentFees.reduce((sum, fee) => sum + (fee.discount || 0), 0);
  const totalPaid = studentFees.reduce((sum, fee) => sum + fee.paid, 0);
  const totalBalance = studentFees.reduce((sum, fee) => sum + fee.balance, 0);
  
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
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
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
      case 'upcoming':
        return 'قادم';
      case 'overdue':
        return 'متأخر';
      default:
        return status;
    }
  };
  
  const printReport = () => {
    if (!student) return;
    
    const reportData = {
      studentName: student.name,
      studentId: student.studentId,
      grade: student.grade,
      schoolId: user?.schoolId,
      fees: studentFees.map(fee => ({
        type: fee.feeType,
        amount: fee.amount,
        discount: fee.discount,
        paid: fee.paid,
        balance: fee.balance
      })),
      schoolName: user?.schoolName || '',
      schoolLogo: settings?.logo,
      schoolPhone: settings?.phone,
      schoolEmail: settings?.email,
      showWatermark: true
    };
    
    // Open a modal or dialog to choose print or download
    const printChoice = window.confirm('هل تريد طباعة التقرير أم تنزيله؟ اضغط "موافق" للطباعة أو "إلغاء" للتنزيل');
    
    if (printChoice) {
      // Print the report
      printStudentReport(reportData);
    } else {
      // Download the report
      downloadStudentReportAsPDF(reportData);
    }
  };
  
  const printInstallmentsReport = () => {
    if (!student) return;
    
    const reportData = {
      studentName: student.name,
      studentId: student.studentId,
      grade: student.grade,
      schoolId: user?.schoolId,
      installments: studentInstallments.map(inst => ({
        id: inst.id,
        feeType: inst.feeType,
        amount: inst.amount,
        dueDate: inst.dueDate,
        paidDate: inst.paidDate,
        status: inst.status,
        installmentCount: inst.installmentCount || 1,
        installmentMonth: inst.installmentMonth
      })),
      schoolName: user?.schoolName || '',
      schoolLogo: settings?.logo,
      schoolPhone: settings?.phone,
      schoolEmail: settings?.email,
      showWatermark: true
    };
    
    // Open a modal or dialog to choose print or download
    const printChoice = window.confirm('هل تريد طباعة تقرير الأقساط أم تنزيله؟ اضغط "موافق" للطباعة أو "إلغاء" للتنزيل');
    
    if (printChoice) {
      // Print the report
      printStudentInstallmentsReport(reportData);
    } else {
      // Download the report
      downloadInstallmentsReportAsPDF(reportData);
    }
  };
  
  const handleDeleteStudent = () => {
    if (!student) return;
    setShowDeleteModal(true);
  };
  
  const confirmDeleteStudent = async () => {
    if (!student) return;
    
    try {
      const deleteResponse = await hybridApi.deleteStudent(student.id);
      if (deleteResponse?.success) {
        setShowDeleteModal(false);
        navigate('/school/students');
      } else {
        setAlertMessage('حدث خطأ أثناء حذف الطالب');
        setAlertOpen(true);
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      setAlertMessage('حدث خطأ أثناء حذف الطالب');
      setAlertOpen(true);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!student) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-gray-600">لم يتم العثور على الطالب</p>
        <button 
          onClick={() => navigate('/school/students')}
          className="mt-4 btn btn-primary"
        >
          العودة إلى قائمة الطلاب
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button and Actions */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => navigate('/school/students')}
          className="flex items-center text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} className="ml-1" />
          <span>العودة إلى قائمة الطلاب</span>
        </button>
        
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button 
            onClick={() => navigate(`/school/students/${student.id}`)}
            className="btn btn-secondary btn-sm flex items-center"
          >
            <Edit size={16} className="ml-1" />
            <span>تعديل</span>
          </button>
          
          <button 
            onClick={handleDeleteStudent}
            className="btn btn-danger btn-sm flex items-center"
          >
            <Trash size={16} className="ml-1" />
            <span>حذف</span>
          </button>
        </div>
      </div>
      
      {/* Student Information Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-primary mb-4">معلومات الطالب</h2>
        
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
          
          <div>
            <h3 className="text-sm text-gray-500">واتساب</h3>
            <p className="text-lg font-medium">{student.whatsapp || '-'}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">البريد الإلكتروني</h3>
            <p className="text-lg font-medium">{student.parentEmail || '-'}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">العنوان</h3>
            <p className="text-lg font-medium">{student.address || '-'}</p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">النقل</h3>
            <p className="text-lg font-medium">
              {student.transportation === 'none' && 'لا يوجد'}
              {student.transportation === 'one-way' && 'اتجاه واحد'}
              {student.transportation === 'two-way' && 'اتجاهين'}
              {student.transportationDirection && ` (${student.transportationDirection === 'to-school' ? 'إلى المدرسة' : 'من المدرسة'})`}
            </p>
          </div>
        </div>
      </div>
      
      {/* Financial Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary">المعلومات المالية</h2>
          
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button 
              onClick={printReport}
              className="btn btn-secondary btn-sm flex items-center"
            >
              <Printer size={16} className="ml-1" />
              <span>طباعة التقرير المالي</span>
            </button>
            
            <button 
              onClick={printInstallmentsReport}
              className="btn btn-secondary btn-sm flex items-center"
            >
              <FileText size={16} className="ml-1" />
              <span>طباعة تقرير الأقساط</span>
            </button>
          </div>
        </div>
        
        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <h3 className="text-sm text-gray-500 mb-1">إجمالي الرسوم</h3>
            <p className="text-xl font-bold text-primary">{totalAmount.toLocaleString()} {CURRENCY}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <h3 className="text-sm text-gray-500 mb-1">الخصم</h3>
            <p className="text-xl font-bold text-green-600">{totalDiscount.toLocaleString()} {CURRENCY}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <h3 className="text-sm text-gray-500 mb-1">المدفوع</h3>
            <p className="text-xl font-bold text-blue-600">{totalPaid.toLocaleString()} {CURRENCY}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <h3 className="text-sm text-gray-500 mb-1">المتبقي</h3>
            <p className="text-xl font-bold text-red-600">{totalBalance.toLocaleString()} {CURRENCY}</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-4 rtl:space-x-reverse">
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'fees' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('fees')}
            >
              الرسوم
            </button>
            
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'installments' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('installments')}
            >
              الأقساط
            </button>
          </div>
        </div>
        
        {/* Fees Table */}
        {activeTab === 'fees' && (
          <div className="overflow-x-auto">
            {studentFees.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      نوع الرسوم
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المبلغ
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الخصم
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المدفوع
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المتبقي
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentFees.map((fee) => (
                    <tr key={fee.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {fee.feeType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fee.amount.toLocaleString()} {CURRENCY}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(fee.discount || 0).toLocaleString()} {CURRENCY}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fee.paid.toLocaleString()} {CURRENCY}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fee.balance.toLocaleString()} {CURRENCY}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(fee.status)}`}>
                          {getStatusText(fee.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">لا توجد رسوم مسجلة لهذا الطالب</p>
              </div>
            )}
          </div>
        )}
        
        {/* Installments Table */}
        {activeTab === 'installments' && (
          <div className="overflow-x-auto">
            {studentInstallments.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      نوع الرسوم
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      القسط
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المبلغ
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ الاستحقاق
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ الدفع
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentInstallments.map((installment) => (
                    <tr key={installment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {installment.feeType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {installment.installmentCount || 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {installment.amount.toLocaleString()} {CURRENCY}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(installment.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {installment.paidDate ? formatDate(installment.paidDate) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(installment.status)}`}>
                          {getStatusText(installment.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">لا توجد أقساط مسجلة لهذا الطالب</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-primary">تأكيد الحذف</h3>
            <p className="mb-6">
              هل أنت متأكد من رغبتك في حذف الطالب <strong>{student.name}</strong>؟ سيتم حذف جميع البيانات المتعلقة بهذا الطالب بما في ذلك الرسوم والمدفوعات.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteStudent}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
      
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen} title='تنبيه' message={alertMessage} />
    </div>
  );
};

export default StudentDetails;