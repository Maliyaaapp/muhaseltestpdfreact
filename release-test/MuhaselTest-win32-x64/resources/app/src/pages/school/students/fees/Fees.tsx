import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  Download, 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Trash,
  Book, 
  Bus, 
  CreditCard,
  Receipt,
  Printer
} from 'lucide-react';
import { CURRENCY } from '../../../../utils/constants';
import * as hybridApi from '../../../../services/hybridApi';
import { useSupabaseAuth } from '../../../../contexts/SupabaseAuthContext';
import { printStudentReport } from '../../../../services/pdfPrinter';
import ReceiptActions from '../../../../components/payments/ReceiptActions';

interface Fee {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  division?: string;
  feeType: string;
  description?: string;
  transportationType?: 'one-way' | 'two-way';
  amount: number;
  discount: number;
  paid: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: string;
  phone?: string;
  paymentDate?: string;
  paymentMethod?: 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other';
  paymentNote?: string;
  checkNumber?: string;
  checkDate?: string;
  bankNameArabic?: string;
  bankNameEnglish?: string;
}

interface StudentFeeReport {
  studentId: string;
  studentName: string;
  grade: string;
  totalAmount: number;
  totalPaid: number;
  totalDiscount: number;
  totalBalance: number;
  tuitionFees: Fee[];
  transportationFees: Fee[];
  miscFees: Fee[];
  recentPayments: any[];
  paymentStatus: 'paid' | 'partial' | 'overdue';
}

const StudentFees = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useSupabaseAuth();
  const [student, setStudent] = useState<any>(null);
  const [studentFees, setStudentFees] = useState<Fee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feeReport, setFeeReport] = useState<StudentFeeReport | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    tuition: true,
    transportation: true,
    misc: true,
    payments: true
  });
  const [settings, setSettings] = useState<any>(null);
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchStudentFees = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get student details
      const studentResponse = await hybridApi.getStudent(id || '');
      const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!student) {
        console.error('Student not found');
        setIsLoading(false);
        return;
      }

      // Get all fees for this student
      const feesResponse = await hybridApi.getFees(student.schoolId, student.id);
      const allFees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
      setStudentFees(allFees);
      
      // Get payments data (empty array for now as getPayments doesn't exist)
      const payments = [];
      
      // Try to get payments from installments if they exist
      try {
        // Use any available payment-related data, or mock it
        const installmentsResponse = await hybridApi.getInstallments(student.schoolId, student.id);
        const installments = (installmentsResponse?.success && installmentsResponse?.data) ? installmentsResponse.data : [];
        // Filter paid installments to use as payments
        const paidInstallments = installments
          .filter(inst => inst.status === 'paid' || inst.paidDate)
          .map(inst => ({
            id: inst.id,
            amount: inst.amount,
            date: inst.paidDate || new Date().toISOString(),
            description: inst.note || 'دفعة'
          }));
        
        if (paidInstallments.length > 0) {
          payments.push(...paidInstallments);
        }
      } catch (error) {
        console.log('No installment data available:', error);
      }

      // If a combined fee exists for this student, hide separate tuition/transportation
      const hasCombinedFee = allFees.some(fee => fee.feeType === 'transportation_and_tuition');
      const filteredFees = hasCombinedFee 
        ? allFees.filter(fee => fee.feeType !== 'tuition' && fee.feeType !== 'transportation')
        : allFees;

      // Prepare the fee report using filtered fees
      const tuitionFees = filteredFees.filter(fee => fee.feeType === 'tuition');
      const transportationFees = filteredFees.filter(fee => fee.feeType === 'transportation');
      const miscFees = filteredFees.filter(fee => !['tuition', 'transportation'].includes(fee.feeType));

      // Calculate totals from filtered fees
      const totalAmount = filteredFees.reduce((sum, fee) => sum + fee.amount, 0);
      const totalPaid = filteredFees.reduce((sum, fee) => sum + fee.paid, 0);
      const totalDiscount = filteredFees.reduce((sum, fee) => sum + fee.discount, 0);
      const totalBalance = filteredFees.reduce((sum, fee) => sum + fee.balance, 0);

      // Determine payment status
      let paymentStatus: 'paid' | 'partial' | 'overdue' = 'paid';
      if (totalBalance > 0) {
        const hasOverdue = allFees.some(fee => {
          const dueDate = new Date(fee.dueDate);
          return fee.balance > 0 && dueDate < new Date();
        });
        paymentStatus = hasOverdue ? 'overdue' : 'partial';
      }

      setFeeReport({
        studentId: student.id,
        studentName: student.name,
        grade: student.grade,
        totalAmount,
        totalPaid,
        totalDiscount,
        totalBalance,
        tuitionFees,
        transportationFees,
        miscFees,
        recentPayments: payments.slice(0, 3), // Get recent 3 payments
        paymentStatus
      });
    } catch (error) {
      console.error('Error fetching student fees:', error);
      
      // If there's an error, set a fallback report with minimal data
      if (id) {
        try {
          const studentResponse = await hybridApi.getStudent(id);
          const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
          if (student) {
            setFeeReport({
              studentId: student.id,
              studentName: student.name,
              grade: student.grade,
              totalAmount: 0,
              totalPaid: 0,
              totalDiscount: 0,
              totalBalance: 0,
              tuitionFees: [],
              transportationFees: [],
              miscFees: [],
              recentPayments: [],
              paymentStatus: 'paid'
            });
          }
        } catch (fallbackError) {
          console.error('Error creating fallback fee report:', fallbackError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchStudentFees();
    }
  }, [id, fetchStudentFees]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-primary bg-opacity-30 text-primary';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'paid': 'مدفوعة',
      'partial': 'مدفوعة جزئياً',
      'unpaid': 'غير مدفوعة',
      'overdue': 'متأخرة'
    };
    return statusMap[status] || status;
  };

  const getFeeTypeLabel = (type: string): string => {
    const feeTypes: Record<string, string> = {
      'tuition': 'رسوم دراسية',
      'transportation': 'نقل مدرسي',
      'activities': 'أنشطة',
      'uniform': 'زي مدرسي',
      'books': 'كتب',
      'other': 'رسوم أخرى'
    };
    
    return feeTypes[type] || type;
  };

  const calculatePaymentPercentage = (): number => {
    if (!feeReport || feeReport.totalAmount === 0) return 0;
    const totalAfterDiscount = feeReport.totalAmount - feeReport.totalDiscount;
    if (totalAfterDiscount === 0) return 100;
    return Math.round((feeReport.totalPaid / totalAfterDiscount) * 100);
  };

  const handlePrintReport = () => {
    if (!feeReport) return;
    
    const reportData = {
      studentName: feeReport.studentName,
      studentId: feeReport.studentId,
      grade: feeReport.grade,
      schoolId: user?.schoolId,
      fees: [
        ...feeReport.tuitionFees,
        ...feeReport.transportationFees,
        ...feeReport.miscFees
      ].map(fee => ({
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
    
    // Print the report
    printStudentReport(reportData);
  };

  const handlePrintAllReceipts = () => {
    if (!feeReport) return;
    
    // Find the first paid fee to use for receipt generation
    const paidFees = [...feeReport.tuitionFees, ...feeReport.miscFees]
      .filter(fee => fee.status === 'paid' || fee.status === 'partial');
    
    if (paidFees.length === 0) return;
    
    // Use the first paid fee to generate a receipt
    const receiptData = generateReceiptDataForFee(paidFees[0]);
    
    if (receiptData) {
      // If there are multiple fees, update the receipt to show total amount
      if (paidFees.length > 1) {
        receiptData.amount = feeReport.totalPaid;
        receiptData.description = 'إجمالي الرسوم المدفوعة';
      }
      
      if (isLoading) {
        return (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
          </div>
        );
      }

      if (!feeReport) {
        return (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            لا توجد معلومات مالية لهذا الطالب
          </div>
        );
      }

      const paymentPercentage = calculatePaymentPercentage();

      return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Enhanced Header */}
          <div className="bg-[#800000] text-white rounded-lg shadow-lg p-6 flex items-center gap-4">
            <Receipt size={32} className="text-white opacity-90" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">تقرير الرسوم</h2>
              <p className="text-white/80 text-sm mt-1">العام الدراسي {new Date().getFullYear()}</p>
            </div>
            <div className="hidden sm:block">
              <Link 
                to={`/school/fees?student=${feeReport?.studentId}`}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
              >
                عرض كل التقارير
              </Link>
            </div>
          </div>

          {/* Troubleshooting Message if needed */}
          {id && !isLoading && !feeReport && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    لم نتمكن من عرض تقرير الرسوم. يرجى التأكد من وجود بيانات مالية للطالب.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Overview Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-8">
              {/* Enhanced Payment Progress Circle */}
              <div className="relative w-48 h-48 flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="12"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="#800000"
                      strokeWidth="12"
                      strokeDasharray={`${(paymentPercentage / 100) * 552} 552`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-[#800000]">{paymentPercentage}%</span>
                    <span className="text-sm text-gray-500 mt-1">تم الدفع</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Financial Summary */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-6">
                  <div className="text-sm text-gray-500 mb-1">إجمالي الرسوم</div>
                  <div className="text-2xl font-bold text-gray-900">{feeReport?.totalAmount.toLocaleString()} {CURRENCY}</div>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-6">
                  <div className="text-sm text-gray-500 mb-1">المدفوع</div>
                  <div className="text-2xl font-bold text-green-600">{feeReport?.totalPaid.toLocaleString()} {CURRENCY}</div>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-6">
                  <div className="text-sm text-gray-500 mb-1">المتبقي</div>
                  <div className="text-2xl font-bold text-[#800000]">{feeReport?.totalBalance.toLocaleString()} {CURRENCY}</div>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-6">
                  <div className="text-sm text-gray-500 mb-1">حالة الدفع</div>
                  <div className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
                    feeReport?.paymentStatus === 'paid' 
                      ? 'bg-[#800000]/10 text-[#800000]' 
                      : feeReport?.paymentStatus === 'partial' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {getStatusLabel(feeReport?.paymentStatus || 'unpaid')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Fee Breakdown Sections */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Tuition Fees Section */}
            {feeReport?.tuitionFees.length > 0 && (
              <div className="border-b border-gray-100">
                <div 
                  className="flex items-center gap-3 p-6 bg-[#800000]/5 cursor-pointer hover:bg-[#800000]/10 transition-colors"
                  onClick={() => toggleSection('tuition')}
                >
                  <div className="text-[#800000]">
                    {expandedSections.tuition ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </div>
                  <Book size={24} className="text-[#800000]" />
                  <h3 className="text-xl font-bold text-gray-900">الرسوم الدراسية</h3>
                </div>
                
                {expandedSections.tuition && (
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-[#800000]/5">
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">الوصف</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المبلغ</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المدفوع</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المتبقي</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {feeReport?.tuitionFees.map((fee, index) => (
                            <tr key={fee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#800000]/5'}>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{fee.description || getFeeTypeLabel(fee.feeType)}</div>
                                <div className="text-sm text-gray-500">تاريخ الاستحقاق: {new Date(fee.dueDate).toLocaleDateString('ar-SA')}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium">{fee.amount.toLocaleString()} {CURRENCY}</div>
                                {fee.discount > 0 && (
                                  <div className="text-xs text-green-600">خصم: {fee.discount.toLocaleString()} {CURRENCY}</div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-green-600 font-medium">{fee.paid.toLocaleString()} {CURRENCY}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-[#800000]">{fee.balance.toLocaleString()} {CURRENCY}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  fee.status === 'paid' 
                                    ? 'bg-[#800000]/10 text-[#800000]' 
                                    : fee.status === 'partial' 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-red-100 text-red-800'
                                }`}>
                                  {getStatusLabel(fee.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transportation Fees Section - Similar styling as Tuition */}
            {feeReport?.transportationFees.length > 0 && (
              <div className="border-b border-gray-100">
                <div 
                  className="flex items-center gap-3 p-6 bg-[#800000]/5 cursor-pointer hover:bg-[#800000]/10 transition-colors"
                  onClick={() => toggleSection('transportation')}
                >
                  <div className="text-[#800000]">
                    {expandedSections.transportation ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </div>
                  <Bus size={24} className="text-[#800000]" />
                  <h3 className="text-xl font-bold text-gray-900">رسوم النقل</h3>
                </div>
                
                {expandedSections.transportation && (
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-[#800000]/5">
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">الوصف</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المبلغ</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المدفوع</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المتبقي</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {feeReport?.transportationFees.map((fee, index) => (
                            <tr key={fee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#800000]/5'}>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{fee.description || getFeeTypeLabel(fee.feeType)}</div>
                                <div className="text-sm text-gray-500">تاريخ الاستحقاق: {new Date(fee.dueDate).toLocaleDateString('ar-SA')}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium">{fee.amount.toLocaleString()} {CURRENCY}</div>
                                {fee.discount > 0 && (
                                  <div className="text-xs text-green-600">خصم: {fee.discount.toLocaleString()} {CURRENCY}</div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-green-600 font-medium">{fee.paid.toLocaleString()} {CURRENCY}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-[#800000]">{fee.balance.toLocaleString()} {CURRENCY}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  fee.status === 'paid' 
                                    ? 'bg-[#800000]/10 text-[#800000]' 
                                    : fee.status === 'partial' 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-red-100 text-red-800'
                                }`}>
                                  {getStatusLabel(fee.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Miscellaneous Fees Section */}
            {feeReport?.miscFees.length > 0 && (
              <div className="border-b border-gray-100">
                <div 
                  className="flex items-center gap-3 p-6 bg-[#800000]/5 cursor-pointer hover:bg-[#800000]/10 transition-colors"
                  onClick={() => toggleSection('misc')}
                >
                  <div className="text-[#800000]">
                    {expandedSections.misc ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </div>
                  <CreditCard size={24} className="text-[#800000]" />
                  <h3 className="text-xl font-bold text-gray-900">رسوم أخرى</h3>
                </div>
                
                {expandedSections.misc && (
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-[#800000]/5">
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">الوصف</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المبلغ</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المدفوع</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المتبقي</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {feeReport?.miscFees.map((fee, index) => (
                            <tr key={fee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#800000]/5'}>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{fee.description || getFeeTypeLabel(fee.feeType)}</div>
                                <div className="text-sm text-gray-500">تاريخ الاستحقاق: {new Date(fee.dueDate).toLocaleDateString('ar-SA')}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium">{fee.amount.toLocaleString()} {CURRENCY}</div>
                                {fee.discount > 0 && (
                                  <div className="text-xs text-green-600">خصم: {fee.discount.toLocaleString()} {CURRENCY}</div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-green-600 font-medium">{fee.paid.toLocaleString()} {CURRENCY}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-[#800000]">{fee.balance.toLocaleString()} {CURRENCY}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  fee.status === 'paid' 
                                    ? 'bg-[#800000]/10 text-[#800000]' 
                                    : fee.status === 'partial' 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-red-100 text-red-800'
                                }`}>
                                  {getStatusLabel(fee.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Payments Section */}
            {feeReport?.recentPayments && feeReport.recentPayments.length > 0 && (
              <div>
                <div 
                  className="flex items-center gap-3 p-6 bg-[#800000]/5 cursor-pointer hover:bg-[#800000]/10 transition-colors"
                  onClick={() => toggleSection('payments')}
                >
                  <div className="text-[#800000]">
                    {expandedSections.payments ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </div>
                  <CreditCard size={24} className="text-[#800000]" />
                  <h3 className="text-xl font-bold text-gray-900">آخر المدفوعات</h3>
                </div>
                
                {expandedSections.payments && (
                  <div className="p-6">
                    <div className="space-y-4">
                      {feeReport.recentPayments.map((payment, index) => (
                        <div 
                          key={payment.id || index} 
                          className={`rounded-lg p-4 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-[#800000]/5'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{payment.description || 'دفعة'}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(payment.date).toLocaleDateString('ar-SA')}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              {payment.amount.toLocaleString()} {CURRENCY}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>


        </div>
      );
    }
  };

  // Update the generateReceiptDataForFee function to include all required properties
  const generateReceiptDataForFee = async (fee: Fee) => {
    if (!fee || !student) return null;
    
    const currentDate = new Date();
    const settingsResponse = await hybridApi.getSettings(user?.schoolId || '');
    let schoolSettings = (settingsResponse?.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : null;
    
    // If no settings exist, create default settings for this school
    if (!schoolSettings && user?.schoolId) {
      console.log('No settings found, creating default settings for school:', user.schoolId);
      const defaultSettings = {
        name: user?.schoolName || 'اسم المدرسة',
        email: user?.schoolEmail || '',
        phone: user?.schoolPhone || '',
        phoneWhatsapp: '',
        phoneCall: '',
        address: '',
        logo: user?.schoolLogo || '',
        englishName: user?.englishSchoolName || 'School Name',
        defaultInstallments: 4,
        tuitionFeeCategory: 'رسوم دراسية',
        transportationFeeOneWay: 150,
        transportationFeeTwoWay: 300,
        receiptNumberFormat: 'auto',
        receiptNumberPrefix: '',
        receiptNumberSuffix: '',
        receiptNumberStart: 1,
        receiptNumberCurrent: 1,
        receiptNumberCounter: 1,
        receiptNumberYear: new Date().getFullYear(),
        installmentReceiptNumberFormat: 'auto',
        installmentReceiptNumberPrefix: '',
        installmentReceiptNumberSuffix: '',
        installmentReceiptNumberStart: 1,
        installmentReceiptNumberCurrent: 1,
        installmentReceiptNumberCounter: 1,
        installmentReceiptNumberYear: new Date().getFullYear(),
        showReceiptWatermark: true,
        showStudentReportWatermark: true,
        showLogoBackground: true,
        showSignatureOnReceipt: true,
        showSignatureOnStudentReport: true,
        showSignatureOnInstallmentReport: true,
        showSignatureOnPartialPayment: true,
        showStampOnReceipt: true,
        showFooterInReceipts: true
      };
      
      try {
        const createResponse = await hybridApi.updateSettings(user.schoolId, defaultSettings);
        if (createResponse.success) {
          schoolSettings = defaultSettings;
          console.log('Default settings created successfully');
        }
      } catch (error) {
        console.error('Error creating default settings:', error);
        schoolSettings = defaultSettings; // Use defaults even if save fails
      }
    }
    
    const receiptData = {
      studentName: student.name,
      studentId: student.studentId,
      grade: student.grade,
      feeType: fee.feeType,
      amount: fee.paid,
      totalAmount: fee.amount,
      date: currentDate.toISOString(),
      description: fee.description || getFeeTypeLabel(fee.feeType),
      schoolName: user?.schoolName || '',
      schoolLogo: schoolSettings?.logo,
      schoolPhone: schoolSettings?.phone,
      schoolEmail: schoolSettings?.email,
      schoolId: user?.schoolId,
      showFooter: schoolSettings?.showFooterInReceipts,
      // Add missing required properties
      academicYear: currentDate.getFullYear() + '-' + (currentDate.getFullYear() + 1),
      receiptNumber: 'R-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      paymentMethod: 'نقداً', // Default to cash
      isPartialPayment: fee.status === 'partial'
    };
    
    // DEBUG: Log the school settings and generated receipt data
    console.log('GENERATE RECEIPT DATA (STUDENT FEES) - School Settings Debug:', {
      schoolSettings: schoolSettings,
      user: user,
      finalSchoolName: receiptData.schoolName,
      finalSchoolLogo: receiptData.schoolLogo,
      finalSchoolPhone: receiptData.schoolPhone,
      finalSchoolEmail: receiptData.schoolEmail,
      hasSchoolLogo: !!receiptData.schoolLogo,
      schoolLogoLength: receiptData.schoolLogo ? receiptData.schoolLogo.length : 0
    });
    
    return receiptData;
  };

  const handlePayment = (feeId: string) => {
    // Open the payment modal for this fee
    setSelectedFeeId(feeId);
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedFeeId || !feeReport) {
      alert('خطأ: لم يتم تحديد الرسوم');
      return;
    }

    if (!paymentAmount || paymentAmount <= 0) {
      alert('خطأ: يجب إدخال مبلغ صحيح');
      return;
    }

    try {
      // Find the selected fee
      const allFees = [...feeReport.tuitionFees, ...feeReport.transportationFees, ...feeReport.miscFees];
      const selectedFee = allFees.find(fee => fee.id === selectedFeeId);
      
      if (!selectedFee) {
        alert('خطأ: لم يتم العثور على الرسوم المحددة');
        return;
      }

      // Check if payment amount exceeds remaining balance
      if (paymentAmount > selectedFee.balance) {
        alert(`خطأ: المبلغ المدخل (${paymentAmount}) أكبر من المبلغ المتبقي (${selectedFee.balance})`);
        return;
      }

      // Calculate new amounts
      const newPaidAmount = selectedFee.paid + paymentAmount;
      const newBalance = selectedFee.balance - paymentAmount;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      // Update the fee
      const updatedFee = {
        ...selectedFee,
        paid: newPaidAmount,
        balance: newBalance,
        status: newStatus,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
        paymentNote: paymentNotes || 'دفع من صفحة الطالب'
      };

      // Save the updated fee
      const response = await hybridApi.saveFee({
        ...updatedFee,
        studentId: updatedFee.studentId,
        schoolId: user?.schoolId
      });

      if (response.success) {
        // Create an installment record for this payment
        const installmentData = {
          id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          feeId: selectedFee.id,
          studentId: selectedFee.studentId,
          studentName: selectedFee.studentName,
          feeType: selectedFee.feeType,
          amount: paymentAmount,
          paidAmount: paymentAmount,
          balance: 0,
          status: 'paid' as const,
          dueDate: selectedFee.dueDate,
          paidDate: new Date().toISOString().split('T')[0],
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote: paymentNotes || 'دفع من صفحة الطالب',
          schoolId: user?.schoolId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await hybridApi.createInstallment(installmentData);

        // Fallback distribution: if combined fee fully paid, mark separate fees as paid
        if (selectedFee.feeType === 'transportation_and_tuition' && newStatus === 'paid') {
          const separateFees = allFees.filter(f => 
            f.studentId === selectedFee.studentId && (f.feeType === 'transportation' || f.feeType === 'tuition')
          );

          for (const fee of separateFees) {
            if (fee.balance > 0) {
              const fullAmount = fee.amount - (fee.discount || 0);
              const updatedSeparateFee = {
                ...fee,
                paid: fullAmount,
                balance: 0,
                status: 'paid' as const,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
                paymentNote: 'دفع من رسوم مدمجة'
              };
              await hybridApi.saveFee(updatedSeparateFee);

              const separateInstallment = {
                id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                feeId: fee.id,
                studentId: fee.studentId,
                studentName: fee.studentName,
                feeType: fee.feeType,
                amount: fullAmount,
                paidAmount: fullAmount,
                balance: 0,
                status: 'paid' as const,
                dueDate: fee.dueDate,
                paidDate: new Date().toISOString().split('T')[0],
                paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
                paymentNote: 'دفع من رسوم مدمجة',
                schoolId: user?.schoolId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await hybridApi.createInstallment(separateInstallment);
            }
          }
        }

        // Refresh the fee report
        await fetchFeeReport();
        
        // Close modal and reset form
        setShowPaymentModal(false);
        setPaymentAmount(0);
        setPaymentMethod('cash');
        setPaymentNotes('');
        setSelectedFeeId(null);
        
        alert(`تم تسجيل الدفع بنجاح! المبلغ: ${paymentAmount} ${CURRENCY}`);
      } else {
        throw new Error('فشل في حفظ الدفع');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
        </div>
      ) : feeReport ? (
        <>
          {/* Student Summary Card */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{feeReport?.studentName}</h1>
                <div className="text-gray-600">{feeReport?.grade}</div>
              </div>
              

            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-[#800000]/5 p-4 rounded-md">
                <div className="text-sm text-gray-500">إجمالي الرسوم</div>
                <div className="text-xl font-bold text-gray-900">{feeReport?.totalAmount.toLocaleString()} {CURRENCY}</div>
              </div>
              
              <div className="bg-[#800000]/5 p-4 rounded-md">
                <div className="text-sm text-gray-500">الخصومات</div>
                <div className="text-xl font-bold text-green-600">{feeReport?.totalDiscount.toLocaleString()} {CURRENCY}</div>
              </div>
              
              <div className="bg-[#800000]/5 p-4 rounded-md">
                <div className="text-sm text-gray-500">رسوم النقل</div>
                <div className="text-xl font-bold text-blue-600">
                  {feeReport?.transportationFees.reduce((sum, fee) => sum + fee.amount, 0).toLocaleString()} {CURRENCY}
                </div>
              </div>
              
              <div className="bg-[#800000]/5 p-4 rounded-md">
                <div className="text-sm text-gray-500">المدفوع</div>
                <div className="text-xl font-bold text-green-600">{feeReport?.totalPaid.toLocaleString()} {CURRENCY}</div>
              </div>
              
              <div className="bg-[#800000]/5 p-4 rounded-md">
                <div className="text-sm text-gray-500">المتبقي</div>
                <div className="text-xl font-bold text-[#800000]">{feeReport?.totalBalance.toLocaleString()} {CURRENCY}</div>
              </div>
            </div>
            

          </div>
          
          {/* Payment Progress */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-gray-900">نسبة السداد</h2>
              <div className="text-lg font-bold text-[#800000]">{calculatePaymentPercentage()}%</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-[#800000] h-2.5 rounded-full" 
                style={{ width: `${calculatePaymentPercentage()}%` }}
              ></div>
            </div>
          </div>



          {/* Miscellaneous Fees Section */}
          {feeReport?.miscFees.length > 0 && (
            <div className="border-b border-gray-100">
              <div 
                className="flex items-center gap-3 p-6 bg-[#800000]/5 cursor-pointer hover:bg-[#800000]/10 transition-colors"
                onClick={() => toggleSection('misc')}
              >
                <div className="text-[#800000]">
                  {expandedSections.misc ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
                <CreditCard size={24} className="text-[#800000]" />
                <h3 className="text-xl font-bold text-gray-900">رسوم أخرى</h3>
              </div>
              
              {expandedSections.misc && (
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-[#800000]/5">
                          <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">الوصف</th>
                          <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المبلغ</th>
                          <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المدفوع</th>
                          <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">المتبقي</th>
                          <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">الحالة</th>
                          <th className="px-6 py-4 text-right text-sm font-medium text-[#800000]">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {feeReport?.miscFees.map((fee, index) => (
                          <tr key={fee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#800000]/5'}>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{fee.description || getFeeTypeLabel(fee.feeType)}</div>
                              <div className="text-sm text-gray-500">تاريخ الاستحقاق: {new Date(fee.dueDate).toLocaleDateString('ar-SA')}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium">{fee.amount.toLocaleString()} {CURRENCY}</div>
                              {fee.discount > 0 && (
                                <div className="text-xs text-green-600">خصم: {fee.discount.toLocaleString()} {CURRENCY}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-green-600 font-medium">{fee.paid.toLocaleString()} {CURRENCY}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-[#800000]">{fee.balance.toLocaleString()} {CURRENCY}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                fee.status === 'paid' 
                                  ? 'bg-[#800000]/10 text-[#800000]' 
                                  : fee.status === 'partial' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-red-100 text-red-800'
                              }`}>
                                {getStatusLabel(fee.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                {fee.balance > 0 && (
                                  <button
                                    onClick={() => handlePayment(fee.id)}
                                    className="text-green-600 hover:text-green-800"
                                    title="دفع"
                                  >
                                    <CreditCard size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}


        </>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-gray-500">لا توجد بيانات متاحة</div>
        </div>
      )}
      
      {/* Payment Modal */}
      {showPaymentModal && selectedFeeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-[#800000]">تسجيل دفعة</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">المبلغ</label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                placeholder="أدخل المبلغ"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">طريقة الدفع</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">نقداً</option>
                <option value="visa">بطاقة ائتمان</option>
                <option value="check">شيك</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">ملاحظات</label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                placeholder="أدخل ملاحظات (اختياري)"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmitPayment}
                className="px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-opacity-50"
              >
                تسجيل الدفع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFees;