import React, { useState, useEffect } from 'react';
import { Database, School, Users, CreditCard, RefreshCw, Settings } from 'lucide-react';
import hybridApi from '../../services/hybridApi';
import { Link } from 'react-router-dom';
import { getSchools } from '../../services/schoolService';

interface SchoolData {
  id: string;
  name: string;
  active: boolean;
  students: number;
  fees: number;
  collectionRate: number;
  logo?: string;
}

const AdminDashboard = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    totalAccounts: 0,
    totalStudents: 0,
    totalFees: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data and subscribe to changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get schools from hybridApi
        const schoolsResponse = await hybridApi.getSchools();
        const schools = schoolsResponse.success ? schoolsResponse.data : [];
        console.log('Dashboard: Fetched schools:', schools.length);
        
        // Process schools data
        const processedSchools = await processSchoolsData(schools);
        
        // Get accounts from hybridApi
        const accountsResponse = await hybridApi.getAccounts();
        const accounts = accountsResponse.success ? accountsResponse.data : [];
        
        // Update state with processed data
        setSchools(processedSchools);
        setStats({
          totalSchools: schools.length,
          activeSchools: schools.filter(s => s.active).length,
          totalAccounts: accounts.length,
          totalStudents: processedSchools.reduce((sum, school) => sum + school.students, 0),
          totalFees: processedSchools.reduce((sum, school) => sum + school.fees, 0)
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setIsLoading(false);
      }
    };
    
    const processSchoolsData = async (schoolsList: any[]) => {
      // Make sure we have valid data
      if (!Array.isArray(schoolsList)) {
        console.error('Invalid schools data received:', schoolsList);
        return [];
      }
      
      // Filter out invalid schools
      const validSchools = schoolsList.filter(school => school && typeof school === 'object');
      
      // Process school data with student and fee counts
      const processedSchools = await Promise.all(validSchools.map(async school => {
        const studentsResponse = await hybridApi.getStudents(school.id);
        const schoolStudents = studentsResponse.success ? studentsResponse.data : [];
        
        const feesResponse = await hybridApi.getFees(school.id);
        const schoolFees = feesResponse.success ? feesResponse.data : [];
        
        const totalFees = schoolFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
        const paidFees = schoolFees.reduce((sum, fee) => sum + (fee.paid || 0), 0);
        const collectionRate = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0;
        
        return {
          id: school.id,
          name: school.name || 'مدرسة غير معروفة',
          active: !!school.active,
          logo: school.logo || '',
          students: schoolStudents.length,
          fees: totalFees,
          collectionRate
        };
      }));
      
      // Sort schools by name with null checks
      return processedSchools.sort((a, b) => {
        const nameA = a?.name || '';
        const nameB = b?.name || '';
        return nameA.localeCompare(nameB);
      });
    };
    
    // Load data initially
    fetchData();
    
    // Note: hybridApi doesn't have a subscribe method like dataStore
    // Data will be refreshed manually or through other triggers
  }, [refreshTrigger]);

  // Force a complete refresh including re-fetching from dataStore
  const handleRefresh = () => {
    console.log('Dashboard: Manual refresh triggered');
    setRefreshTrigger(prev => prev + 1);
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
        <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم الرئيسية</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/reset"
            className="btn btn-outline-danger flex items-center gap-2"
            title="إعادة تعيين النظام"
          >
            <Settings size={18} />
            <span>إعادة تعيين النظام</span>
          </Link>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={18} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">المدارس</h2>
              <p className="text-3xl font-bold text-primary">{stats.totalSchools}</p>
            </div>
            <div className="bg-primary-light/10 p-3 rounded-full">
              <Database size={24} className="text-primary" />
            </div>
          </div>
          <p className="text-gray-500">
            {stats.activeSchools} مدرسة نشطة من {stats.totalSchools}
          </p>
          <Link to="/admin/schools" className="text-sm text-primary hover:underline block mt-2">
            عرض تفاصيل المدارس
          </Link>
        </div>
        
        <div className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">الحسابات</h2>
              <p className="text-3xl font-bold text-primary">{stats.totalAccounts}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
          <p className="text-gray-500">إجمالي حسابات المستخدمين في النظام</p>
          <Link to="/admin/accounts" className="text-sm text-primary hover:underline block mt-2">
            إدارة الحسابات
          </Link>
        </div>
        
        <div className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">الطلبة</h2>
              <p className="text-3xl font-bold text-primary">
                {stats.totalStudents}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <School size={24} className="text-green-600" />
            </div>
          </div>
          <p className="text-gray-500">إجمالي الطلبة في جميع المدارس</p>
        </div>
        
        <div className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">إجمالي الرسوم</h2>
              <p className="text-3xl font-bold text-primary">
                {stats.totalFees.toLocaleString()} ر.ع
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <CreditCard size={24} className="text-yellow-600" />
            </div>
          </div>
          <p className="text-gray-500">إجمالي الرسوم المستحقة</p>
        </div>
        
        <div className="dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-700">متوسط التحصيل</h2>
              <p className="text-3xl font-bold text-primary">
                {schools.length > 0 
                  ? Math.round(schools.reduce((sum, school) => sum + school.collectionRate, 0) / schools.length)
                  : 0}%
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <CreditCard size={24} className="text-purple-600" />
            </div>
          </div>
          <p className="text-gray-500">متوسط نسبة تحصيل الرسوم</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">المدارس المشتركة</h2>
          <Link to="/admin/schools" className="btn btn-sm btn-primary">
            عرض جميع المدارس
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم المدرسة
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عدد الطلبة
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  إجمالي الرسوم
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نسبة التحصيل
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schools.length > 0 ? (
                schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {school.logo ? (
                          <img 
                            src={school.logo} 
                            alt={`شعار ${school.name}`} 
                            className="h-8 w-8 rounded-full mr-3 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full mr-3 bg-primary-light text-primary flex items-center justify-center font-bold">
                            {school.name ? school.name.charAt(0).toUpperCase() : "S"}
                          </div>
                        )}
                        <Link to={`/admin/schools/${school.id}`} className="font-medium text-gray-900 hover:text-primary">
                          {school.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        school.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {school.active ? 'نشطة' : 'غير نشطة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {school.students}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {school.fees.toLocaleString()} ر.ع
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            school.collectionRate >= 75 ? 'bg-green-500' :
                            school.collectionRate >= 50 ? 'bg-yellow-500' :
                            school.collectionRate >= 25 ? 'bg-orange-500' : 'bg-red-500'
                          }`} 
                          style={{ width: `${school.collectionRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 mt-1 block">{school.collectionRate}%</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    لا توجد مدارس مسجلة في النظام
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
 