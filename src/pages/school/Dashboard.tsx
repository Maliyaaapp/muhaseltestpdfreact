import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, CreditCard, Clock, MessageSquare, RefreshCw } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import * as hybridApi from '../../services/hybridApi';
import LoadingState from '../../components/LoadingState';
import toast from 'react-hot-toast';

interface DashboardData {
  students: {
    total: number;
    byGrade: { grade: string; count: number }[];
  };
  fees: {
    total: number;
    totalAfterDiscount: number;
    discount: number;
    paid: number;
    unpaid: number;
    overdue: number;
  };
  installments: {
    upcoming: { id: string; studentName: string; amount: number; dueDate: string }[];
  };
  messages: {
    count: number;
  };
}

const SchoolDashboard = () => {
  const { user } = useSupabaseAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasData, setHasData] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('📶 Connection restored - refreshing dashboard data');
      fetchDashboardData();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      console.log('📱 Gone offline - using cached data');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Retry function
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchDashboardData();
  };

  // Extract fetchDashboardData function
  const fetchDashboardData = async () => {
    if (!user || !user.schoolId) return;
    
    setIsLoading(true);
    try {
      console.log('📊 Loading school dashboard data...');
      
      // Get students
      const studentsResponse = await hybridApi.getStudents(user?.schoolId || '');
      let students = studentsResponse?.success ? studentsResponse.data : [];
      
      // Filter by grade levels if user is a grade manager
      if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
        students = students.filter((student: any) => user.gradeLevels?.includes(student.grade));
      }
      
      // Get fees (apply grade-level filter for grade managers)
      const feesResponse = await hybridApi.getFees(
        user?.schoolId || '',
        undefined,
        user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels : undefined
      );
      let fees = feesResponse?.success ? feesResponse.data : [];
      
      // Filter fees by grade levels if user is a grade manager
      if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
        const gradeStudentIds = students.map((s: any) => s.id);
        fees = fees.filter((fee: any) => gradeStudentIds.includes(fee.studentId));
      }
      
      // Get installments (apply grade-level filter for grade managers)
      const installmentsResponse = await hybridApi.getInstallments(
        user?.schoolId || '',
        undefined,
        undefined,
        user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels : undefined
      );
      let installments = installmentsResponse?.success ? installmentsResponse.data : [];
      
      // Filter installments by grade levels if user is a grade manager
      if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
        const gradeStudentIds = students.map((s: any) => s.id);
        installments = installments.filter((installment: any) => gradeStudentIds.includes(installment.studentId));
      }
      
      // Get messages (apply grade-level filter for grade managers)
      const messagesResponse = await hybridApi.getMessages(
        user?.schoolId || '',
        undefined,
        user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels : undefined
      );
      const messages = messagesResponse?.success ? messagesResponse.data : [];
      
      // Log data availability for debugging
      console.log('📊 Dashboard data loaded:', {
        students: students.length,
        fees: fees.length,
        installments: installments.length,
        messages: messages.length,
        isOnline: navigator.onLine
      });
      
      // Normalize fees to avoid double-counting when combined fees exist
      // If a student has a 'transportation_and_tuition' fee, exclude separate 'tuition'/'transportation' fees for that student
      const studentsWithCombined = new Set(
        (fees || []).filter((fee: any) => fee.feeType === 'transportation_and_tuition').map((fee: any) => fee.studentId)
      );
      const normalizedFees = (fees || []).filter((fee: any) => {
        if (studentsWithCombined.has(fee.studentId)) {
          return fee.feeType === 'transportation_and_tuition';
        }
        return fee.feeType !== 'transportation_and_tuition' ? true : true; // keep non-combined; keep combined if it's the only one
      });

      // Check if we have any data
      const hasAnyData = students.length > 0 || normalizedFees.length > 0 || installments.length > 0;
      setHasData(hasAnyData);
      
      if (!hasAnyData && !navigator.onLine) {
        console.warn('⚠️ No cached data available for offline viewing');
        toast.info('لا توجد بيانات محفوظة للعرض في وضع عدم الاتصال', {
          duration: 5000,
          position: 'top-center'
        });
        return;
      }
      
      // Process students by grade
       const gradeMap = new Map<string, number>();
       students.forEach((student: any) => {
         const count = gradeMap.get(student.grade) || 0;
         gradeMap.set(student.grade, count + 1);
       });
       
       const byGrade = Array.from(gradeMap.entries()).map(([grade, count]) => ({
         grade,
         count
       }));
       
       // Calculate fee statistics (using normalized fees)
       const totalFees = normalizedFees.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0);
       const totalDiscount = normalizedFees.reduce((sum: number, fee: any) => sum + (fee.discount || 0), 0);
       const totalAfterDiscount = totalFees - totalDiscount;
       const totalPaid = normalizedFees.reduce((sum: number, fee: any) => sum + (fee.paid || 0), 0);
       const totalUnpaid = totalAfterDiscount - totalPaid;
       
       // Calculate overdue fees
       const today = new Date();
       const overdueFees = normalizedFees.filter((fee: any) => {
         if (!fee.dueDate || fee.status === 'paid') return false;
         const dueDate = new Date(fee.dueDate);
         return dueDate < today;
       });
       const totalOverdue = overdueFees.reduce((sum: number, fee: any) => sum + (fee.balance || 0), 0);
       
       // Get upcoming installments (next 30 days)
       const thirtyDaysFromNow = new Date();
       thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
       
       const upcomingInstallments = installments
         .filter((installment: any) => {
           if (!installment.dueDate || installment.status === 'paid') return false;
           const dueDate = new Date(installment.dueDate);
           return dueDate >= today && dueDate <= thirtyDaysFromNow;
         })
         .map((installment: any) => ({
           id: installment.id,
           studentName: installment.studentName || 'غير محدد',
           amount: installment.amount || 0,
           dueDate: installment.dueDate
         }))
         .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
         .slice(0, 5); // Show only first 5
       
       const dashboardData: DashboardData = {
         students: {
           total: students.length,
           byGrade
         },
         fees: {
           total: totalFees,
           totalAfterDiscount,
           discount: totalDiscount,
           paid: totalPaid,
           unpaid: totalUnpaid,
           overdue: totalOverdue
         },
         installments: {
           upcoming: upcomingInstallments
         },
         messages: {
           count: messages.length
         }
       };
       
       setData(dashboardData);
       
       // Show success message on retry
       if (retryCount > 0) {
         toast.success('تم تحديث البيانات بنجاح');
       }
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setData(null);
      
      // Provide more specific error messages based on connection status
      if (!navigator.onLine) {
        console.error('📱 Offline mode: Unable to load dashboard data');
        toast.error('لا يمكن تحميل البيانات في وضع عدم الاتصال');
      } else {
        toast.error('حدث خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
      setInitialLoad(false);
    }
  };

  // Load dashboard data and subscribe to changes
  useEffect(() => {
    if (user?.schoolId) {
      fetchDashboardData();
    }
  }, [user?.schoolId, retryCount]);

  // Show loading state during initial load or when explicitly loading
  if (isLoading || (initialLoad && !data)) {
    return <LoadingState isLoading={true} isOffline={isOffline} showRetry={true} onRetry={handleRetry} />;
  }

  if (!data) {
    if (isOffline && !hasData) {
      return <LoadingState isOffline={true} hasData={false} showRetry={true} onRetry={handleRetry} />;
    }
    if (!isOffline && !hasData) {
      return <LoadingState hasData={false} showRetry={true} onRetry={handleRetry} />;
    }
    return <LoadingState isLoading={true} isOffline={isOffline} showRetry={true} onRetry={handleRetry} />;
  }

  // Calculate collection rate
  const collectionRate = data.fees.totalAfterDiscount > 0 ? Math.round((data.fees.paid / data.fees.totalAfterDiscount) * 100) : 0;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link to="/school/students" className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">الطلبة</h2>
              <p className="text-3xl font-bold text-primary">{data.students.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
          <p className="text-gray-500">
            {user?.role === 'gradeManager' ? 'عدد الطلبة في الصفوف المسؤول عنها' : 'إجمالي عدد الطلبة المسجلين'}
          </p>
        </Link>
        
        <Link to="/school/fees" className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">الرسوم المالية</h2>
              <p className="text-3xl font-bold text-primary">
                {data.fees.totalAfterDiscount.toLocaleString()} ر.ع
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CreditCard size={24} className="text-green-600" />
            </div>
          </div>
          <p className="text-gray-500">
            {user?.role === 'gradeManager' ? 'إجمالي الرسوم للصفوف المسؤول عنها' : 'إجمالي الرسوم بعد الخصم'}
          </p>
        </Link>
        
        <Link to="/school/fees" className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">الخصومات</h2>
              <p className="text-3xl font-bold text-blue-600">
                {data.fees.discount.toLocaleString()} ر.ع
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <CreditCard size={24} className="text-blue-600" />
            </div>
          </div>
          <p className="text-gray-500">
            {user?.role === 'gradeManager' ? 'إجمالي الخصومات للصفوف المسؤول عنها' : 'إجمالي الخصومات المقدمة'}
          </p>
        </Link>
        
        <Link to="/school/installments" className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">الأقساط القادمة</h2>
              <p className="text-3xl font-bold text-primary">{data.installments.upcoming.length}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock size={24} className="text-yellow-600" />
            </div>
          </div>
          <p className="text-gray-500">الأقساط المستحقة خلال الأيام القادمة</p>
        </Link>
        
        <Link to="/school/communications" className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">المراسلات</h2>
              <p className="text-3xl font-bold text-primary">{data.messages.count}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <MessageSquare size={24} className="text-purple-600" />
            </div>
          </div>
          <p className="text-gray-500">الإشعارات المرسلة خلال الشهر الحالي</p>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">نسبة التحصيل</h2>
          <div className="flex justify-between items-center text-sm mb-2">
            <span>المدفوع: {data.fees.paid.toLocaleString()} ر.ع</span>
            <span className="text-primary">{collectionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-primary h-4 rounded-full"
              style={{ width: `${collectionRate}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">المدفوع</p>
              <p className="text-lg font-bold text-green-600">
                {data.fees.paid.toLocaleString()} ر.ع
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">المتبقي</p>
              <p className="text-lg font-bold text-red-600">
                {data.fees.unpaid.toLocaleString()} ر.ع
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">المتأخر</p>
              <p className="text-lg font-bold text-yellow-600">
                {data.fees.overdue.toLocaleString()} ر.ع
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">الخصومات</p>
              <p className="text-lg font-bold text-blue-600">
                {data.fees.discount.toLocaleString()} ر.ع
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">الأقساط القادمة</h2>
          {data.installments.upcoming.length === 0 ? (
            <p className="text-gray-500 text-center py-6">لا توجد أقساط قادمة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الطالب
                    </th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المبلغ
                    </th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ الاستحقاق
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.installments.upcoming.map((installment) => (
                    <tr key={installment.id} className="hover:bg-gray-50">
                      <td className="py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {installment.studentName}
                        </div>
                      </td>
                      <td className="py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {installment.amount.toLocaleString()} ر.ع
                        </div>
                      </td>
                      <td className="py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(installment.dueDate)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolDashboard;
 