import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, Filter, CreditCard, MessageSquare, Download, Upload, User, ChevronDown, ChevronUp, Book, Bus, CreditCard as PaymentIcon, ChevronRight, DollarSign, List } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { FEE_TYPES, CURRENCY } from '../../../utils/constants';
import * as hybridApi from '../../../services/hybridApi';
import pdfPrinter from '../../../services/pdfPrinter';
import { generateFeeTemplateCSV, generateInstallmentTemplateCSV, exportFeesToCSV } from '../../../services/importExport';
import ImportDialog from '../../../components/ImportDialog';
import { initializeSampleData } from '../../../utils/initialData';
import { generateReceiptNumber } from '../../../utils/helpers';
import { reserveReceiptNumbers } from '../../../utils/receiptCounter';
import PartialPaymentModal from './PartialPaymentModal';
import PayAllFeesModal from './PayAllFeesModal';
import { useReportSettings } from '../../../contexts/ReportSettingsContext';
import ReceiptActions from '../../../components/payments/ReceiptActions';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog } from '../../../components/ui/Dialog';
import FixSettingsError from '../../../components/FixSettingsError';

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
  receiptNumber?: string;
  includesTransportation?: boolean;
}

interface StudentFeeGroup {
  studentId: string;
  studentName: string;
  grade: string;
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  tuitionFees: Fee[];
  transportationFees: Fee[];
  otherFees: Fee[];
  expandedSections: {
    tuition: boolean;
    transportation: boolean;
    other: boolean;
  }
}

// Add formatDate function at the top of the file with other utility functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB');
};

const Fees = () => {
  const { user } = useSupabaseAuth();
  const { settings: reportSettings } = useReportSettings();
  const location = useLocation();
  const [fees, setFees] = useState<Fee[]>([]);
  const [filteredFees, setFilteredFees] = useState<Fee[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{studentsCount: number; feesCount: number; installmentsCount?: number} | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [paymentProcessing, setPaymentProcessing] = useState<string | null>(null);
  const [showNoDataMessage, setShowNoDataMessage] = useState(false);
  
  // For partial payment feature
  const [partialPaymentModalOpen, setPartialPaymentModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  
  // For pay all fees feature
  const [payAllModalOpen, setPayAllModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [selectedStudentTotalAmount, setSelectedStudentTotalAmount] = useState<number>(0);
  
  // For student-based view
  const [studentList, setStudentList] = useState<{id: string, name: string, grade: string}[]>([]);
  const [studentFeeGroups, setStudentFeeGroups] = useState<StudentFeeGroup[]>([]);
  const [displayMode, setDisplayMode] = useState<'list' | 'student'>('student');
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [importType, setImportType] = useState<'fees' | 'installments'>('fees');
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  
  // Reference for the report dropdown
  const reportDropdownRef = useRef<HTMLDivElement>(null);

  // Add this state near the other state declarations
  const [singleFeeId, setSingleFeeId] = useState<string | null>(null);
  
  // Add state for alert dialog
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // Add state for PGRST204 error handling
  const [showSettingsError, setShowSettingsError] = useState(false);
  const [settingsError, setSettingsError] = useState<any>(null);
  
  // Handle click outside to close the report dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reportDropdownRef.current && !reportDropdownRef.current.contains(event.target as Node)) {
        setReportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize sample data if needed
  useEffect(() => {
    const checkAndInitializeData = async () => {
      try {
        const storedFees = localStorage.getItem('fees');
        const parsedFees = storedFees ? JSON.parse(storedFees) : [];
        
        if (!Array.isArray(parsedFees) || parsedFees.length === 0) {
          console.log('No fees data found, initializing sample data...');
          const result = initializeSampleData(false);
          if (result) {
            console.log('Sample data initialized successfully');
          }
        }
      } catch (err) {
        console.error('Error checking/initializing data:', err);
      }
    };
    
    checkAndInitializeData();
  }, []);
  
  // Function to fetch data - defined outside useEffect for reuse
  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching data from Supabase with fallback to localStorage');
      
      let feesResponse;
      let studentsResponse;
      
      if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
        feesResponse = await hybridApi.getFees(user.schoolId, undefined, user.gradeLevels);
        studentsResponse = await hybridApi.getStudents(user.schoolId, user.gradeLevels);
      } else {
        feesResponse = await hybridApi.getFees(user?.schoolId);
        studentsResponse = await hybridApi.getStudents(user?.schoolId);
      }
      
      // Extract data from ApiResponse objects
      const fetchedFees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
      const fetchedStudents = (studentsResponse?.success && studentsResponse?.data) ? studentsResponse.data : [];
      
      // Check if we have data
      if (!Array.isArray(fetchedFees) || fetchedFees.length === 0) {
        setShowNoDataMessage(true);
      } else {
        setShowNoDataMessage(false);
      }
      
      // Augment fees with student phone numbers for WhatsApp
      const augmentedFees = await Promise.all(fetchedFees.map(async (fee: any) => {
        if (!fee.studentId) {
          console.warn('Fee missing studentId:', fee);
          return {
            ...fee,
            phone: '',
          };
        }
        const studentResponse = await hybridApi.getStudent(fee.studentId);
        const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
        return {
          ...fee,
          phone: student?.phone || '',
        };
      }));

      // If a combined fee exists for a student, hide separate tuition/transportation fees for that student
      const combinedStudents = new Set(
        augmentedFees
          .filter((f: any) => f.feeType === 'transportation_and_tuition')
          .map((f: any) => f.studentId)
      );
      const visibleFees = augmentedFees.filter((f: any) => {
        if (combinedStudents.has(f.studentId)) {
          return f.feeType !== 'tuition' && f.feeType !== 'transportation';
        }
        return true;
      });

      setFees(visibleFees);
      
      // Format student data
      const formattedStudents = fetchedStudents.map((student: any) => ({
        id: student.id,
        name: student.name,
        grade: student.grade
      }));
      
      setStudentList(formattedStudents);
      
      // Process student fee groups using the filtered list
      processStudentFeeGroups(visibleFees);
    } catch (error) {
      console.error('Error loading fees:', error);
      // Set empty arrays on error to prevent map errors
      setFees([]);
      setStudentList([]);
      setStudentFeeGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data and subscribe to changes
  useEffect(() => {
    // Create an async function inside the effect
    const initData = async () => {
      await fetchData();
    };
    
    // Call the async function
    initData();
    
    // Note: hybridApi doesn't have a subscription mechanism like dataStore
    // Data will be refreshed when component mounts or when operations are performed
  }, [user, location.pathname]);

  // Apply filters whenever fees or filter options change
  useEffect(() => {
    try {
      let result = fees;
      
      if (selectedGrade !== 'all') {
        result = result.filter((fee) => fee.grade === selectedGrade);
      }
      
      if (selectedType !== 'all') {
        result = result.filter((fee) => fee.feeType === selectedType);
      }
      
      if (selectedStatus !== 'all') {
        result = result.filter((fee) => fee.status === selectedStatus);
      }
      
      if (selectedStudent !== 'all') {
        result = result.filter((fee) => fee.studentId === selectedStudent);
      }
      
      setFilteredFees(result);
      processStudentFeeGroups(result);
    } catch (error) {
      console.error('Error applying filters:', error);
      // If there's an error, at least show the unfiltered data
      setFilteredFees(fees);
      processStudentFeeGroups(fees);
    }
  }, [selectedGrade, selectedType, selectedStatus, selectedStudent, fees]);

  const processStudentFeeGroups = (feesList: Fee[]) => {
    // Add safety check to ensure feesList is an array
    if (!feesList || !Array.isArray(feesList)) {
      console.error('Error: feesList is not an array:', feesList);
      setStudentFeeGroups([]);
      return;
    }
    
    const studentMap = new Map<string, StudentFeeGroup>();
    
    feesList.forEach(fee => {
      if (!fee || typeof fee !== 'object') {
        console.error('Invalid fee object:', fee);
        return; // Skip this iteration
      }
      
      // Skip fees with missing required data
      if (!fee.studentId || !fee.studentName) {
        console.error('Fee is missing studentId or studentName:', fee);
        return;
      }
      
      if (!studentMap.has(fee.studentId)) {
        studentMap.set(fee.studentId, {
          studentId: fee.studentId,
          studentName: fee.studentName || 'Unknown Student',
          grade: fee.grade || 'Unknown Grade',
          totalAmount: 0,
          totalPaid: 0,
          totalBalance: 0,
          tuitionFees: [],
          transportationFees: [],
          otherFees: [],
          expandedSections: {
            tuition: true,
            transportation: true,
            other: true
          }
        });
      }
      
      const studentGroup = studentMap.get(fee.studentId)!;
      studentGroup.totalAmount += (fee.amount - fee.discount); // Use net amount after discount
      studentGroup.totalPaid += fee.paid;
      studentGroup.totalBalance += fee.balance;
      
      // Categorize fee
      if (fee.feeType === 'tuition') {
        studentGroup.tuitionFees.push(fee);
      } else if (fee.feeType === 'transportation') {
        studentGroup.transportationFees.push(fee);
      } else {
        studentGroup.otherFees.push(fee);
      }
    });
    
    // Convert to array and filter out any groups with invalid data
    const groups = Array.from(studentMap.values())
      .filter(group => group && typeof group.studentName === 'string');
    
    // Add null-safe sorting
    if (groups.length > 0) {
      groups.sort((a, b) => {
        return (a.studentName || '').localeCompare(b.studentName || '');
      });
    }
    
    setStudentFeeGroups(groups);
  };

  const toggleStudentExpanded = (studentId: string) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const toggleFeeSection = (studentId: string, sectionType: 'tuition' | 'transportation' | 'other') => {
    const updatedGroups = studentFeeGroups.map(group => {
      if (group.studentId === studentId) {
        return {
          ...group,
          expandedSections: {
            ...group.expandedSections,
            [sectionType]: !group.expandedSections[sectionType]
          }
        };
      }
      return group;
    });
    
    setStudentFeeGroups(updatedGroups);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الرسوم؟')) {
      try {
        await hybridApi.removeFee(id);
        // Refresh data after deletion
        await fetchData();
      } catch (error) {
        console.error('Error deleting fee:', error);
        setAlertMessage('حدث خطأ أثناء حذف الرسوم');
        setAlertOpen(true);
      }
    }
  };

   const handlePrintReceipt = async (fee: Fee) => {
    try {
      if (!fee.studentId) {
        console.error('Fee missing studentId:', fee);
        setAlertMessage('عذراً، معرف الطالب مفقود');
        setAlertOpen(true);
        return;
      }
      
      const studentResponse = await hybridApi.getStudent(fee.studentId);
      const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      
      if (!student) {
        console.error('Student not found:', fee.studentId);
        setAlertMessage('عذراً، لم يتم العثور على بيانات الطالب');
        setAlertOpen(true);
        return;
      }
      
      // Get school settings
      const schoolSettingsResponse = await hybridApi.getSettings(user?.schoolId || '');
      const schoolSettings = (schoolSettingsResponse?.success && schoolSettingsResponse?.data) ? schoolSettingsResponse.data[0] : {};
    
      // Get tuition fee amount if available
      let tuitionFees = 0;
      if ((student as any).tuitionFee) {
        tuitionFees = (student as any).tuitionFee;
      } else {
        // Try to find a tuition fee record
        const allFeesResponse = await hybridApi.getFees(user?.schoolId || '', student.id);
        const allFees = (allFeesResponse?.success && allFeesResponse?.data) ? allFeesResponse.data : [];
        const tuitionFee = allFees.find(f => f.feeType === 'tuition');
      if (tuitionFee) {
          tuitionFees = tuitionFee.amount;
        }
      }
    
    // Generate or reuse receipt number and academic year for full payment
    let fullReceiptNumber = fee.receiptNumber && fee.receiptNumber.trim() !== '' 
      ? fee.receiptNumber 
      : '';
    
    if (!fullReceiptNumber) {
      try {
        // Use atomic reservation for new full payment receipt numbers
        const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'fee', 1);
        fullReceiptNumber = reservedNumbers[0];
      } catch (error) {
        console.error('Error reserving receipt number for full payment, falling back to direct generation:', error);
        // Fallback to direct generation if reservation fails
        fullReceiptNumber = generateReceiptNumber(schoolSettings, student.studentId);
      }
    }
    const fullFormat = schoolSettings?.receiptNumberFormat || 'auto';
    const fullConfiguredYear = schoolSettings?.receiptNumberYear || new Date().getFullYear();
    const fullAcademicYearDisplay = fullFormat === 'year'
      ? String(fullConfiguredYear)
      : (fullFormat === 'short-year' ? String(fullConfiguredYear).slice(-2) : undefined);

    const receiptData: any = {
      receiptNumber: fullReceiptNumber,
      date: fee.paymentDate || new Date().toISOString(),
      studentName: student.name,
      englishName: student.englishName || '',
      englishGrade: student.englishGrade || '',
      studentId: student.id,
      grade: student.grade,
      student: student, // Add the entire student object
      tuitionFees: tuitionFees, // Add tuition fees amount
      feeType: fee.feeType,
      amount: fee.paid,
      discount: fee.discount,
      originalAmount: fee.amount,
      totalAmount: fee.paid,
      schoolName: schoolSettings?.name || user?.schoolName || 'المدرسة',
      englishSchoolName: schoolSettings?.englishName || '',
      schoolId: user?.schoolId,
      schoolLogo: schoolSettings?.logo || user?.schoolLogo || '',
      schoolPhone: schoolSettings?.phone || user?.schoolPhone || '',
      schoolPhoneWhatsapp: schoolSettings?.phoneWhatsapp || user?.schoolPhoneWhatsapp || '',
      schoolPhoneCall: schoolSettings?.phoneCall || user?.schoolPhoneCall || '',
      schoolEmail: schoolSettings?.email || user?.schoolEmail || '',
      schoolAddress: schoolSettings?.address || user?.schoolAddress || '',
      paymentMethod: fee.paymentMethod || 'نقداً',
      showStamp: true,
      showSignature: true,
      checkNumber: fee.checkNumber,
      checkDate: fee.checkDate,
      bankName: fee.bankName,
      paymentDate: fee.paymentDate,
      paymentNote: fee.paymentNote,
      isPartialPayment: fee.paid < fee.amount,
      academicYear: fullAcademicYearDisplay
      };
      
      // Reserve receipt number and increment counter only if we generated a new one
      if (!fee.receiptNumber || fee.receiptNumber.trim() === '') {
        try {
          await hybridApi.saveFee({ id: fee.id, receiptNumber: fullReceiptNumber, studentId: fee.studentId, schoolId: user?.schoolId });
        } catch (e) {
          console.warn('Failed to reserve receipt number on fee:', e);
        }
        try {
          const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
          if (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) {
            const currentSettings = settingsResp.data[0];
            const updatedSettings = {
              ...currentSettings,
              receiptNumberCounter: (currentSettings.receiptNumberCounter || 0) + 1
            };
            await hybridApi.updateSettings(user?.schoolId || '', updatedSettings);
          }
        } catch (error) {
          console.error('Error incrementing receipt counter:', error);
        }
      }
      await pdfPrinter.printReceipt(receiptData);
    } catch (error) {
      console.error('Error printing receipt:', error);
      setAlertMessage('حدث خطأ أثناء طباعة الإيصال');
      setAlertOpen(true);
    }
  };

  const handleSendWhatsApp = async (id: string) => {
    // Find the fee to send message about
    const fee = fees.find(f => f.id === id);
    if (!fee) return;
    
    try {
      if (!fee.studentId) {
        console.error('Fee missing studentId:', fee);
        setAlertMessage('عذراً، معرف الطالب مفقود');
        setAlertOpen(true);
        return;
      }
      
      // Get student to get the phone number
      const studentResponse = await hybridApi.getStudent(fee.studentId);
      const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!student) {
        setAlertMessage('لم يتم العثور على بيانات الطالب');
        setAlertOpen(true);
        return;
      }
      
      const message = `تذكير: الرسوم المستحقة للطالب ${fee.studentName} بمبلغ ${fee.balance} ${CURRENCY} من ${user?.schoolName || 'المدرسة'}`;
      
      // For demo, open WhatsApp web
      const encodedMessage = encodeURIComponent(message);
      const phone = student.phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
      
      // Add message to history
      await hybridApi.saveMessage({
        id: '',
        studentId: fee.studentId,
        studentName: fee.studentName,
        grade: fee.grade,
        parentName: student.parentName,
        phone: student.phone,
        template: 'تذكير بالرسوم',
        message,
        sentAt: new Date().toISOString(),
        status: 'delivered',
        schoolId: user?.schoolId || ''
      });
      
      setAlertMessage(`تم إرسال إشعار دفع عبر الواتساب للطالب ${fee.studentName}`);
      setAlertOpen(true);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      setAlertMessage('حدث خطأ أثناء إرسال الرسالة');
      setAlertOpen(true);
    }
  };
  
  const handlePaymentComplete = (id: string) => {
    // Find the fee to mark as paid
    const fee = fees.find(f => f.id === id);
    if (!fee) return;
    
    // Set the fee ID and open the payment modal
    setSingleFeeId(id);
    setSelectedStudentName(fee.studentName);
    setSelectedStudentTotalAmount(fee.balance);
    setPayAllModalOpen(true);
  };

  // Add this new function to handle single fee payment with chosen payment method
  const handleSingleFeePayment = async (
    paymentMethod: string,
    paymentNote: string,
    checkNumber?: string,
    checkDate?: string,
    bankNameArabic?: string,
    bankNameEnglish?: string,
    paymentDate?: string
  ) => {
    if (!singleFeeId) return;
    setPaymentProcessing(singleFeeId);
    try {
      // Find the fee
      const fee = fees.find(f => f.id === singleFeeId);
      if (!fee) return;
      
      // Update fee with payment info
      const updatedFee: Partial<Fee> = {
        ...fee,
        paid: fee.amount - (fee.discount || 0), // Pay full amount minus discount
        balance: 0,
        status: 'paid',
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
        paymentNote,
        checkNumber,
        checkDate,
        bankNameArabic,
        bankNameEnglish
      };
      
      // Save updated fee
      await hybridApi.saveFee({
        ...updatedFee,
        studentId: updatedFee.studentId, // Add student_id for database constraint
        schoolId: user?.schoolId // Add school_id for RLS policy
      });

      // If this is a combined fee, ensure separate tuition/transportation fees are marked paid too
      if (fee.feeType === 'transportation_and_tuition') {
        const separateFees = fees.filter(f => 
          f.studentId === fee.studentId && (f.feeType === 'transportation' || f.feeType === 'tuition')
        );

        for (const sepFee of separateFees) {
          if (sepFee.balance > 0) {
            const fullAmount = sepFee.amount - (sepFee.discount || 0);
            const updatedSepFee: Partial<Fee> = {
              ...sepFee,
              paid: fullAmount,
              balance: 0,
              status: 'paid' as 'paid',
              paymentDate: paymentDate || new Date().toISOString().split('T')[0],
              paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
              paymentNote: 'دفع من رسوم مدمجة'
            };
            await hybridApi.saveFee({
              ...updatedSepFee,
              studentId: updatedSepFee.studentId,
              schoolId: user?.schoolId
            });

            const sepInstallment = {
              id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              feeId: sepFee.id,
              studentId: sepFee.studentId,
              studentName: sepFee.studentName,
              feeType: sepFee.feeType,
              amount: fullAmount,
              paidAmount: fullAmount,
              balance: 0,
              status: 'paid' as const,
              dueDate: sepFee.dueDate,
              paidDate: paymentDate || new Date().toISOString().split('T')[0],
              paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
              paymentNote: 'دفع من رسوم مدمجة',
              schoolId: user?.schoolId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await hybridApi.createInstallment(sepInstallment);
          }
        }
      }
      
      // CRITICAL FIX: Update all related installments to paid status
      const installmentsResponse = await hybridApi.getInstallments(undefined, undefined, fee.id);
      const relatedInstallments = (installmentsResponse?.success && installmentsResponse?.data) ? installmentsResponse.data : [];
      if (relatedInstallments && relatedInstallments.length > 0) {
        // Mark each installment as paid
        for (const installment of relatedInstallments) {
          const updatedInstallment = {
            ...installment,
            paidDate: paymentDate || new Date().toISOString().split('T')[0],
            paidAmount: installment.amount,
            balance: 0, // CRITICAL FIX: Set balance to 0 when fully paid
            status: 'paid' as 'paid',
            paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
            paymentNote: paymentNote,
            checkNumber: checkNumber,
            checkDate: checkDate,
            bankNameArabic,
            bankNameEnglish,
          };
          await hybridApi.saveInstallment(updatedInstallment);
        }
      }
      
      // Refresh data after payment
      await fetchData();
      setTimeout(() => {
        setPaymentProcessing(null);
        setPayAllModalOpen(false);
      }, 800);
    } catch (error) {
      console.error('Error processing single fee payment:', error);
      setAlertMessage('حدث خطأ أثناء معالجة الدفع');
      setAlertOpen(true);
      setPaymentProcessing(null);
      setPayAllModalOpen(false);
    }
  };
  
  const handlePayAllFeesForStudent = (studentId: string) => {
    // Find all unpaid fees for this student
    const studentFees = fees.filter(f => f.studentId === studentId && f.balance > 0);
    if (studentFees.length === 0) return;
    
    // Calculate total amount
    const totalAmount = studentFees.reduce((sum, fee) => sum + fee.balance, 0);
    
    // Set selected student data for the modal
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentFees[0].studentName);
    setSelectedStudentTotalAmount(totalAmount);
    
    // Open the payment modal
    setPayAllModalOpen(true);
  };

  // Update handlePayAllFeesConfirm to include bankName, checkDate, and paymentDate
  const handlePayAllFeesConfirm = async (
    paymentMethod: string, 
    paymentNote: string, 
    checkNumber?: string, 
    checkDate?: string, 
    bankNameArabic?: string,
    bankNameEnglish?: string,
    paymentDate?: string
  ) => {
    if (!selectedStudentId) return;
    
    setPaymentProcessing(selectedStudentId);
    
    try {
      // Find all unpaid fees for this student
      const studentFees = fees.filter(f => f.studentId === selectedStudentId && f.balance > 0);
      
      // Check if there are any transportation fees being paid
      const hasTransportationFee = studentFees.some(fee => 
        fee.feeType === 'transportation' || 
        (typeof fee.feeType === 'string' && (
          fee.feeType === 'نقل مدرسي' || 
          fee.feeType === 'رسوم النقل' || 
          fee.feeType === 'رسوم التقل' ||
          fee.feeType === 'رسوم النقل المدرسي' ||
          fee.feeType.toLowerCase().includes('transport') || 
          fee.feeType.includes('نقل')
        ))
      );
      
      // Fetch settings and reserve a single receipt number for this student's bulk payment if needed
      let reservedReceiptNumber: string | undefined;
      try {
        const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
        const schoolSettings = (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) ? settingsResp.data[0] : null;
        if (schoolSettings) {
          const needNewNumber = studentFees.some(f => !f.receiptNumber || f.receiptNumber.trim() === '');
          if (needNewNumber) {
            reservedReceiptNumber = generateReceiptNumber(schoolSettings, selectedStudentId);
          }
        }
      } catch (e) {
        console.warn('Failed to prepare reserved receipt number for bulk payment:', e);
      }
      
      // Update all fees to paid status
      for (const fee of studentFees) {
        // CRITICAL FIX: If we're paying all fees including transportation, mark this in the fee data
        const updatedFee: Partial<Fee> = {
          ...fee,
          paid: fee.amount - fee.discount, // Pay full amount minus discount
          balance: 0,
          status: 'paid' as 'paid',
          paymentDate: paymentDate,
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote: paymentNote,
          checkNumber: checkNumber,
          checkDate: checkDate,
          bankNameArabic,
          bankNameEnglish,
          ...(reservedReceiptNumber && (!fee.receiptNumber || fee.receiptNumber.trim() === '') ? { receiptNumber: reservedReceiptNumber } : {}),
          // Add a flag to indicate this fee was paid as part of a bulk payment that included transportation
          includesTransportation: hasTransportationFee
        };
        
        // Save updated fee
        await hybridApi.saveFee({
          ...updatedFee,
          studentId: updatedFee.studentId, // Add student_id for database constraint
          schoolId: user?.schoolId // Add school_id for RLS policy
        });
        
        // Update all related installments to paid status
        const installmentsResponse = await hybridApi.getInstallments(undefined, undefined, fee.id);
        const relatedInstallments = (installmentsResponse?.success && installmentsResponse?.data) ? installmentsResponse.data : [];
        if (relatedInstallments && relatedInstallments.length > 0) {
          // Mark each existing installment as fully paid
          for (const installment of relatedInstallments) {
            const updatedInstallment = {
              ...installment,
              paidDate: paymentDate,
              paidAmount: installment.amount,
              balance: 0,
              status: 'paid' as 'paid',
              paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
              paymentNote: paymentNote,
              checkNumber: checkNumber,
              checkDate: checkDate,
              bankNameArabic,
              bankNameEnglish,
            };
            await hybridApi.saveInstallment(updatedInstallment);
          }
        } else {
          // No installments exist for this fee; create a single full-paid installment
          const fullAmount = Math.max(0, (fee.amount || 0) - (fee.discount || 0));
          const newInstallment = {
            id: uuidv4(),
            feeId: fee.id,
            studentId: fee.studentId,
            grade: fee.grade,
            studentName: fee.studentName,
            feeType: fee.feeType,
            amount: fullAmount,
            paidAmount: fullAmount,
            balance: 0,
            status: 'paid' as const,
            dueDate: fee.dueDate,
            paidDate: paymentDate || new Date().toISOString().split('T')[0],
            paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
            paymentNote: paymentNote,
            schoolId: user?.schoolId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await hybridApi.createInstallment(newInstallment);
        }

        // If paying all fees and a combined fee exists for this student, ensure separate fees are marked paid
        const hasCombined = studentFees.some(f => f.feeType === 'transportation_and_tuition');
        if (hasCombined && (fee.feeType === 'transportation' || fee.feeType === 'tuition')) {
          // Already set to paid above; ensure installment exists if none
          const instResp = await hybridApi.getInstallments(undefined, undefined, fee.id);
          const existingInst = (instResp?.success && instResp?.data) ? instResp.data : [];
          if (!existingInst || existingInst.length === 0) {
            const fullAmount = fee.amount - (fee.discount || 0);
            const sepInstallment = {
              id: uuidv4(),
              feeId: fee.id,
              studentId: fee.studentId,
              grade: fee.grade,
              studentName: fee.studentName,
              feeType: fee.feeType,
              amount: fullAmount,
              paidAmount: fullAmount,
              balance: 0,
              status: 'paid' as const,
              dueDate: fee.dueDate,
              paidDate: paymentDate || new Date().toISOString().split('T')[0],
              paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
              paymentNote: 'دفع من رسوم مدمجة',
              schoolId: user?.schoolId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await hybridApi.createInstallment(sepInstallment);
          }
        }
      }
      
      // Increment receipt counter once if we reserved a new receipt number
      if (reservedReceiptNumber) {
        try {
          const settingsResp2 = await hybridApi.getSettings(user?.schoolId || '');
          if (settingsResp2?.success && settingsResp2?.data && settingsResp2.data.length > 0) {
            const currentSettings = settingsResp2.data[0];
            const updatedSettings = {
              ...currentSettings,
              receiptNumberCounter: (currentSettings.receiptNumberCounter || 0) + 1
            };
            await hybridApi.updateSettings(user?.schoolId || '', updatedSettings);
          }
        } catch (err) {
          console.error('Error incrementing receipt counter after bulk payment:', err);
        }
      }
      
      // Refresh data after bulk payment
      await fetchData();
      
      setAlertMessage(`تم دفع جميع الرسوم بنجاح للطالب ${selectedStudentName}`);
      setAlertOpen(true);
      
      // Close modal and reset processing state
      setPayAllModalOpen(false);
      setTimeout(() => {
        setPaymentProcessing(null);
      }, 800);
    } catch (error) {
      console.error('Error processing bulk payment:', error);
      setAlertMessage('حدث خطأ أثناء معالجة عملية الدفع');
      setAlertOpen(true);
      setPayAllModalOpen(false);
      setPaymentProcessing(null);
    }
  };
  
  const handlePrintStudentReport = async (studentId: string) => {
    try {
      const studentResponse = await hybridApi.getStudent(studentId);
      const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!student) return;
      
      const studentFees = fees.filter(f => f.studentId === studentId);
      
      // Get school settings to ensure we have the latest logo and name
      const schoolSettingsResponse = await hybridApi.getSettings(user?.schoolId || '');
      const schoolSettings = (schoolSettingsResponse?.success && schoolSettingsResponse?.data && Array.isArray(schoolSettingsResponse.data) && schoolSettingsResponse.data.length > 0) ? schoolSettingsResponse.data[0] : {};
    
    const reportData = {
      studentName: student.name,
      studentId: student.studentId,
      grade: student.grade,
      fees: studentFees.map(fee => ({
        type: getFeeTypeLabel(fee.feeType) + (fee.transportationType ? 
          ` (${fee.transportationType === 'one-way' ? 'اتجاه واحد' : 'اتجاهين'})` : ''),
        amount: fee.amount,
        discount: fee.discount,
        paid: fee.paid,
        balance: fee.balance
      })),
      schoolName: schoolSettings.name || user?.schoolName || 'مدرسة السلطان قابوس',
      schoolLogo: schoolSettings.logo || user?.schoolLogo || '',
      schoolPhone: schoolSettings.phone || '',
      schoolPhoneWhatsapp: schoolSettings.phoneWhatsapp || '',
      schoolPhoneCall: schoolSettings.phoneCall || '',
      schoolEmail: schoolSettings.email || '',
      showWatermark: schoolSettings.showStudentReportWatermark,
      showLogoBackground: schoolSettings.showLogoBackground,
      // Add stamp and signature settings
        // stamp: schoolSettings.stamp || '', // Stamp functionality removed
      showStamp: schoolSettings.showStampOnStudentReport !== false,
      showSignature: schoolSettings.showSignatureOnStudentReport !== false,
      date: new Date().toISOString().split('T')[0]
    };
    
    try {
        // Download report as PDF instead of printing
        pdfPrinter.downloadStudentReportAsPDF(reportData);
      } catch (error) {
        console.error('Error generating student report:', error);
        setAlertMessage('حدث خطأ أثناء إنشاء التقرير المالي للطالب');
        setAlertOpen(true);
      }
    } catch (error) {
      console.error('Error in handlePrintStudentReport:', error);
      setAlertMessage('حدث خطأ أثناء إنشاء التقرير المالي للطالب');
      setAlertOpen(true);
    }
  };
  
  const handleImportClick = (type: 'fees' | 'installments') => {
    setImportType(type);
    setImportDialogOpen(true);
  };

  const handleImportSuccess = (result: {studentsCount: number; feesCount: number; installmentsCount?: number}) => {
    setImportResult(result);
    setImportSuccess(true);
    // Refresh data
    fetchData();
  };
  
  const handleExportFees = async () => {
    try {
      // Generate CSV content with color coding and Excel formulas
      const csvContent = await exportFeesToCSV(user?.schoolId || '');
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Get current year for filename
      const currentYear = new Date().getFullYear();
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `الكشف_المالي_${currentYear}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // No alert needed - remove success message popup
    } catch (error) {
      console.error('Error exporting fees:', error);
      setAlertMessage('حدث خطأ أثناء تصدير الرسوم');
      setAlertOpen(true);
    }
  };

  // Generate and print fees collection report
  const handleGenerateFeesCollectionReport = async () => {
    try {
      // Get school settings to ensure we have the latest logo and name
      const schoolSettingsResponse = await hybridApi.getSettings(user?.schoolId || '');
      const schoolSettings = (schoolSettingsResponse?.success && schoolSettingsResponse?.data && Array.isArray(schoolSettingsResponse.data) && schoolSettingsResponse.data.length > 0) ? schoolSettingsResponse.data[0] : {};
      
      // Prepare report data using filtered fees
      const reportData = {
        title: 'تقرير تحصيل الرسوم',
        date: new Date().toISOString(),
        reportDate: new Date().toISOString(),
        fees: await Promise.all(filteredFees.map(async fee => {
          const studentResponse = await hybridApi.getStudent(fee.studentId);
          const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
          return {
            id: fee.id,
            studentName: fee.studentName,
            studentNameEn: student?.englishName || '',
            studentId: student?.studentId || fee.studentId || '',
            grade: fee.grade,
            feeType: fee.feeType,
            amount: fee.amount,
            discount: fee.discount,
            paid: fee.paid,
            balance: fee.balance,
            status: fee.status,
            dueDate: fee.dueDate,
            paymentDate: fee.paymentDate,
            totalFees: fee.amount, // or sum if needed
            paidAmount: fee.paid,
            remainingAmount: fee.balance,
          };
        })),
        schoolName: schoolSettings?.name || user?.schoolName || 'المدرسة',
        schoolLogo: schoolSettings?.logo || user?.schoolLogo || '',
        schoolPhone: schoolSettings?.phone || '',
        schoolPhoneWhatsapp: schoolSettings?.phoneWhatsapp || '',
        schoolPhoneCall: schoolSettings?.phoneCall || '',
        schoolEmail: schoolSettings?.email || '',
        showWatermark: schoolSettings?.showStudentReportWatermark,
        showLogoBackground: schoolSettings?.showLogoBackground,
        // Add stamp and signature settings
        // stamp: schoolSettings.stamp || '', // Stamp functionality removed
        showStamp: schoolSettings?.showStampOnStudentReport !== false,
        showSignature: schoolSettings?.showSignatureOnStudentReport !== false,
      };
      
      // Print the report
      pdfPrinter.printFeesCollectionReport(reportData);
    } catch (error) {
      console.error('Error generating fees collection report:', error);
      setAlertMessage('حدث خطأ أثناء إنشاء تقرير تحصيل الرسوم');
      setAlertOpen(true);
    }
  };

  // Download fees collection report as PDF
  const handleDownloadFeesCollectionReport = async () => {
    try {
      // Get school settings to ensure we have the latest logo and name
      const schoolSettingsResponse = await hybridApi.getSettings(user?.schoolId || '');
      const schoolSettings = (schoolSettingsResponse?.success && schoolSettingsResponse?.data) ? schoolSettingsResponse.data[0] : {};
      
      // Prepare report data using filtered fees
      const reportData = {
        title: 'تقرير تحصيل الرسوم',
        date: new Date().toISOString(),
        reportDate: new Date().toISOString(),
        fees: await Promise.all(filteredFees.map(async fee => {
          const studentResponse = await hybridApi.getStudent(fee.studentId);
          const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
          return {
            id: fee.id,
            studentName: fee.studentName,
            studentNameEn: student?.englishName || '',
            studentId: student?.studentId || fee.studentId || '',
            grade: fee.grade,
            feeType: fee.feeType,
            amount: fee.amount,
            discount: fee.discount,
            paid: fee.paid,
            balance: fee.balance,
            status: fee.status,
            dueDate: fee.dueDate,
            paymentDate: fee.paymentDate,
            totalFees: fee.amount, // or sum if needed
            paidAmount: fee.paid,
            remainingAmount: fee.balance,
          };
        })),
        schoolName: schoolSettings?.name || user?.schoolName || 'المدرسة',
        schoolLogo: schoolSettings?.logo || user?.schoolLogo || '',
        schoolPhone: schoolSettings?.phone || '',
        schoolPhoneWhatsapp: schoolSettings?.phoneWhatsapp || '',
        schoolPhoneCall: schoolSettings?.phoneCall || '',
        schoolEmail: schoolSettings?.email || '',
        showWatermark: schoolSettings?.showStudentReportWatermark,
        showLogoBackground: schoolSettings?.showLogoBackground,
        // Add stamp and signature settings
        // stamp: schoolSettings.stamp || '', // Stamp functionality removed
        showStamp: schoolSettings?.showStampOnStudentReport !== false,
        showSignature: schoolSettings?.showSignatureOnStudentReport !== false,
      };
      
      // Download the report as PDF
      pdfPrinter.downloadFeesCollectionReportAsPDF(reportData);
    } catch (error) {
      console.error('Error downloading fees collection report:', error);
      setAlertMessage('حدث خطأ أثناء تنزيل تقرير تحصيل الرسوم');
      setAlertOpen(true);
    }
  };

  const getFeeTypeLabel = (type: string) => {
    return type === 'tuition' ? 'رسوم دراسية' : type === 'transportation' ? 'رسوم نقل' : type;
  };

  // Add a function to translate payment method codes to Arabic display text
  const getPaymentMethodLabel = (method?: string) => {
    switch(method) {
      case 'cash': return 'نقداً';
      case 'visa': return 'بطاقة ائتمان';
      case 'check': return 'شيك';
      case 'bank-transfer': return 'تحويل بنكي';
      case 'other': return 'أخرى';
      default: return 'نقداً';
    }
  };
  
  const getStatusLabel = (status: string) => {
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

  const getStatusColor = (status: string) => {
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

  // Get unique grades for filter
  const grades = ['all', ...Array.from(new Set(fees.map((fee) => fee.grade)))];

  // Add a new handler for opening the partial payment modal
  const handlePartialPayment = (id: string) => {
    const fee = fees.find(f => f.id === id);
    if (!fee) return;
    
    setSelectedFee(fee);
    setPartialPaymentModalOpen(true);
  };
  
  // Add a new handler for processing partial payments
  const handlePartialPaymentConfirm = async (
    amount: number, 
    paymentMethod?: string, 
    paymentNote?: string, 
    checkNumber?: string, 
    checkDate?: string, 
    bankNameArabic?: string, 
    bankNameEnglish?: string, 
    paymentDate?: string
  ) => {
    if (!selectedFee) return;
    
    setPaymentProcessing(selectedFee.id);
    
    try {
      // CRITICAL FIX: Update installments first, then recalculate fee totals from installments
      const installmentsResponse = await hybridApi.getInstallments(undefined, undefined, selectedFee.id);
      const relatedInstallments = (installmentsResponse?.success && installmentsResponse?.data) ? installmentsResponse.data : [];
      
      if (relatedInstallments && relatedInstallments.length > 0) {
        // Sort installments by due date to pay them in order
        const sortedInstallments = relatedInstallments.sort((a, b) => 
          new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime()
        );
        
        let remainingAmount = amount;
        
        // Distribute the payment across unpaid installments
        for (const installment of sortedInstallments) {
          if (remainingAmount <= 0) break;
          
          const unpaidAmount = installment.amount - (installment.paidAmount || 0);
          if (unpaidAmount <= 0) continue; // Skip already paid installments
          
          const paymentForThisInstallment = Math.min(remainingAmount, unpaidAmount);
          const newPaidAmount = (installment.paidAmount || 0) + paymentForThisInstallment;
          
          const updatedInstallment = {
            ...installment,
            paidAmount: newPaidAmount,
            balance: Math.max(0, installment.amount - newPaidAmount), // CRITICAL FIX: Calculate balance
            status: newPaidAmount >= installment.amount ? 'paid' as 'paid' : 'partial' as 'partial',
            paidDate: newPaidAmount >= installment.amount ? (paymentDate || new Date().toISOString().split('T')[0]) : installment.paidDate,
            paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
            paymentNote: paymentNote,
            checkNumber: checkNumber,
            checkDate: checkDate,
            bankNameArabic,
            bankNameEnglish,
          };
          
          await hybridApi.saveInstallment(updatedInstallment);
          remainingAmount -= paymentForThisInstallment;
        }
        
        // CRITICAL FIX: Let database triggers handle balance and status calculations
        // Only update payment metadata, not calculated fields
        const updatedFee: Partial<Fee> = {
          ...selectedFee,
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote,
          checkNumber,
          checkDate,
          bankNameArabic,
          bankNameEnglish
        };
        
        // Save updated fee using hybridApi - triggers will calculate paid, balance, status
        const updateResponse = await hybridApi.updateFee(selectedFee.id, updatedFee);
        if (!updateResponse?.success) {
          throw new Error('Failed to update fee');
        }
      } else {
        // If no installments exist, update fee directly with payment amount
        const newPaidAmount = selectedFee.paid + amount;
        
        const updatedFee: Partial<Fee> = {
          ...selectedFee,
          paid: newPaidAmount,
          // CRITICAL FIX: Let database triggers calculate balance and status
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote,
          checkNumber,
          checkDate,
          bankNameArabic,
          bankNameEnglish
        };
        
        const updateResponse = await hybridApi.updateFee(selectedFee.id, updatedFee);
        if (!updateResponse?.success) {
          throw new Error('Failed to update fee');
        }
      }
      
      // Refresh the fees data
      await fetchData();
      
      // Close the modal without automatically printing receipt
      setTimeout(() => {
        setPaymentProcessing(null);
        setPartialPaymentModalOpen(false);
      }, 800);
    } catch (error) {
      console.error('Error processing partial payment:', error);
      setAlertMessage('حدث خطأ أثناء معالجة الدفع الجزئي');
      setAlertOpen(true);
      setPaymentProcessing(null);
      setPartialPaymentModalOpen(false);
    }
  };
  
  // Add a new handler for printing partial payment receipts
  const handlePrintPartialReceipt = async (id: string, amountPaid: number) => {
    try {
      // Get the fee
      const feeResponse = await hybridApi.getFee(id);
      const fee = (feeResponse?.success && feeResponse?.data) ? feeResponse.data as Fee : null;
      if (!fee) return;
      
      // Get the student
      const studentResponse = await hybridApi.getStudent(fee.studentId);
      const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!student) return;
      
      // Get the school settings
      const settingsResponse = await hybridApi.getSettings(user?.schoolId || '');
      const settings = (settingsResponse?.success && settingsResponse?.data && settingsResponse.data.length > 0) ? settingsResponse.data[0] : null;
      
      // Always generate a new unique receipt number for each partial payment using atomic reservation
      let receiptNumber: string;
      let usedReservation = false;
      try {
        const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'fee', 1);
        receiptNumber = reservedNumbers[0];
        usedReservation = true;
      } catch (error) {
        console.error('Error reserving receipt number for partial payment, falling back to direct generation:', error);
        // Fallback to direct generation if reservation fails
        receiptNumber = generateReceiptNumber(settings, student.studentId);
      }
      
      // Get tuition fee amount if available
      let tuitionFees = 0;
      if ((student as any).tuitionFee) {
        tuitionFees = (student as any).tuitionFee;
      } else {
        // Try to find a tuition fee record
        const feesResponse = await hybridApi.getFees(user?.schoolId || '', student.id);
        const allFees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
        const tuitionFee = allFees.find(f => f.feeType === 'tuition');
        if (tuitionFee) {
          tuitionFees = tuitionFee.amount;
        }
      }
      
      // Compute academic year display based on settings format
      const format = settings?.receiptNumberFormat || 'auto';
      const configuredYear = settings?.receiptNumberYear || new Date().getFullYear();
      const academicYearDisplay = format === 'year'
        ? String(configuredYear)
        : (format === 'short-year' ? String(configuredYear).slice(-2) : undefined);

      // Create receipt data with partial payment amount
      const receiptData = {
        receiptNumber,
        date: fee.paymentDate || new Date().toISOString().split('T')[0], // Use payment date if available
        studentName: fee.studentName,
        studentId: student.studentId,
        grade: fee.grade,
        englishName: student.englishName || '',
        englishGrade: student.englishGrade || '',
        student: student, // Add the entire student object
        tuitionFees: tuitionFees, // Add tuition fees amount
        feeType: fee.feeType,
        amount: amountPaid, // Use the partial amount paid, not the total fee amount
        originalAmount: fee.amount,
        totalAmount: fee.amount,
        discount: 0, // No discount on partial payments
        showWatermark: settings.showReceiptWatermark,
        showLogoBackground: settings.showLogoBackground,
        schoolName: settings.name,
        schoolId: user?.schoolId,
        schoolLogo: settings.logo,
        schoolPhone: settings.phone,
        schoolPhoneWhatsapp: settings.phoneWhatsapp,
        schoolPhoneCall: settings.phoneCall,
        schoolEmail: settings.email,
        isPartialPayment: true, // Flag to indicate this is a partial payment
        academicYear: academicYearDisplay,
        paymentMethod: fee.paymentMethod || 'نقداً',
        paymentNote: fee.paymentNote || '',
        // Add cheque details for partial payments
        checkNumber: fee.checkNumber || '',
        checkDate: fee.checkDate || '',
        bankNameArabic: fee.bankNameArabic || '',
        bankNameEnglish: fee.bankNameEnglish || '',
        // Use specific settings for partial payments
        showStamp: settings.showStampOnPartialPayment,
        showSignature: settings.showSignatureOnPartialPayment,
        // Include the specific settings for partial payment receipts
        showStampOnPartialPayment: settings.showStampOnPartialPayment,
        showSignatureOnPartialPayment: settings.showSignatureOnPartialPayment,
        // Footer settings
        showFooter: settings.showFooterInReceipts,
        // stamp: settings.stamp // Stamp functionality removed
      };
      
      // Increment receipt counter only if reservation failed
      if (!usedReservation) {
        try {
          const settingsResponse2 = await hybridApi.getSettings(user?.schoolId || '');
          if (settingsResponse2?.success && settingsResponse2?.data && settingsResponse2.data.length > 0) {
            const currentSettings2 = settingsResponse2.data[0];
            const updatedSettings2 = {
              ...currentSettings2,
              receiptNumberCounter: (currentSettings2.receiptNumberCounter || 0) + 1
            };
            await hybridApi.updateSettings(user?.schoolId || '', updatedSettings2);
          }
        } catch (error) {
          console.error('Error incrementing receipt counter:', error);
        }
      }
      
      // Print the receipt
      await pdfPrinter.printReceipt(receiptData);
    } catch (error) {
      console.error('Error printing partial receipt:', error);
      setAlertMessage('حدث خطأ أثناء طباعة الإيصال الجزئي');
      setAlertOpen(true);
    }
  };

  // First, add a function to generate receipt data for a fee
  const generateReceiptDataForFee = async (fee: Fee) => {
    console.log('DEBUG: generateReceiptDataForFee called for fee:', fee.id);
    try {
      // CRITICAL DEBUG: Log the fee object to see if cheque details are present
      console.log('GENERATE RECEIPT DATA - Fee Object Debug:', {
        feeId: fee.id,
        checkNumber: fee.checkNumber,
        checkDate: fee.checkDate,
        bankNameArabic: fee.bankNameArabic,
        bankNameEnglish: fee.bankNameEnglish,
        paymentMethod: fee.paymentMethod,
        paymentNote: fee.paymentNote,
        paymentDate: fee.paymentDate,
        status: fee.status
      });
      
      // CRITICAL FIX: Fetch the latest fee data from database to ensure we have updated cheque details
      const latestFeeResponse = await hybridApi.getFees(user?.schoolId || '', fee.studentId);
      const latestFees = (latestFeeResponse?.success && latestFeeResponse?.data) ? latestFeeResponse.data : [];
      const latestFee = latestFees.find(f => f.id === fee.id);
      
      // Use the latest fee data if available, otherwise fall back to the passed fee
      const currentFee = latestFee || fee;
      
      console.log('GENERATE RECEIPT DATA - Latest Fee Debug:', {
        feeId: currentFee.id,
        checkNumber: currentFee.checkNumber,
        checkDate: currentFee.checkDate,
        bankNameArabic: currentFee.bankNameArabic,
        bankNameEnglish: currentFee.bankNameEnglish,
        paymentMethod: currentFee.paymentMethod,
        paymentNote: currentFee.paymentNote,
        paymentDate: currentFee.paymentDate,
        status: currentFee.status
      });
      
      const studentResponse = await hybridApi.getStudent(currentFee.studentId);
      const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!student) return null;
      
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
        } catch (error: any) {
          console.error('Error creating default settings:', error);
          
          // Check if this is a PGRST204 error for missing address column
          if (error?.code === 'PGRST204' && error?.message?.includes("address")) {
            // Throw a specific error that can be caught by the calling component
            throw {
              type: 'SETTINGS_SCHEMA_ERROR',
              code: 'PGRST204',
              message: error.message,
              component: 'FixSettingsError'
            };
          }
          
          schoolSettings = defaultSettings; // Use defaults even if save fails
        }
      }
      
      // DEBUG: Check if fee has existing receipt number
      console.log('DEBUG: Checking currentFee for existing receipt number:', {
        feeId: currentFee.id,
        hasReceiptNumber: !!currentFee.receiptNumber,
        receiptNumber: currentFee.receiptNumber,
        receiptNumberType: typeof currentFee.receiptNumber,
        receiptNumberTrimmed: currentFee.receiptNumber?.trim()
      });
      
      const extractRN = (note?: string) => {
        if (!note) return '';
        const m = note.match(/\[RN:([^\]]+)\]/);
        return m ? m[1] : '';
      };
      const addRN = (note: string | undefined, rn: string) => {
        const base = note || '';
        return base.includes('[RN:') ? base : `[RN:${rn}] ${base}`.trim();
      };

      let receiptNumber: string = (currentFee.receiptNumber && currentFee.receiptNumber.trim() !== '')
        ? currentFee.receiptNumber
        : extractRN(currentFee.paymentNote);
      
      console.log('DEBUG: Extracted receipt number result:', {
        fromReceiptNumber: currentFee.receiptNumber,
        fromPaymentNote: extractRN(currentFee.paymentNote),
        finalReceiptNumber: receiptNumber
      });
      if (!receiptNumber) {
        try {
          const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'fee', 1);
          receiptNumber = reservedNumbers[0];
          console.log('DEBUG: Reserved new receipt number:', receiptNumber);
          
          // Save to payment_note field to avoid database schema errors
          const updatedNote = addRN(currentFee.paymentNote, receiptNumber);
          await hybridApi.updateFee(currentFee.id, { paymentNote: updatedNote });
          console.log('DEBUG: Saved receipt number to payment_note field');
        } catch (error) {
          receiptNumber = generateReceiptNumber(schoolSettings, student.studentId);
          const updatedNote = addRN(currentFee.paymentNote, receiptNumber);
          try {
            await hybridApi.updateFee(currentFee.id, { paymentNote: updatedNote });
            const settingsResponse2 = await hybridApi.getSettings(user?.schoolId || '');
            if (settingsResponse2?.success && settingsResponse2?.data && settingsResponse2.data.length > 0) {
              const currentSettings2 = settingsResponse2.data[0];
              const updatedSettings2 = {
                ...currentSettings2,
                receiptNumberCounter: (currentSettings2.receiptNumberCounter || 0) + 1
              };
              await hybridApi.updateSettings(user?.schoolId || '', updatedSettings2);
            }
          } catch {}
        }
      }
      
      // Get tuition fee amount if available
      let tuitionFees = 0;
      if ((student as any).tuitionFee) {
        tuitionFees = (student as any).tuitionFee;
      } else {
        // Try to find a tuition fee record
        const feesResponse = await hybridApi.getFees(user?.schoolId || '', student.id);
        const allFees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
        const tuitionFee = allFees.find(f => f.feeType === 'tuition');
        if (tuitionFee) {
          tuitionFees = tuitionFee.amount;
        }
      }
      
      // Calculate remaining amounts for tuition and transportation fees
      let remainingTuitionAmount = 0;
      let remainingTransportationAmount = 0;
      
      // Get all fees for this student to calculate remaining amounts
      const feesResponse = await hybridApi.getFees(user?.schoolId || '', student.id);
      const allFees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
      
      // Calculate remaining tuition fees
      const tuitionFeeRecords = allFees.filter(f => f.feeType === 'tuition' || f.feeType === 'رسوم دراسية');
      tuitionFeeRecords.forEach(tuitionFee => {
        remainingTuitionAmount += tuitionFee.balance || 0;
      });
      
      // Calculate remaining transportation fees
      const transportationFeeRecords = allFees.filter(f => 
        f.feeType === 'transportation' || 
        f.feeType === 'transport' || 
        f.feeType === 'مواصلات'
      );
      transportationFeeRecords.forEach(transportFee => {
        remainingTransportationAmount += transportFee.balance || 0;
      });
      
      // Calculate actual paid amounts by fee type
      let tuitionPaidAmount = 0;
      let transportationPaidAmount = 0;
      
      tuitionFeeRecords.forEach(tuitionFee => {
        tuitionPaidAmount += tuitionFee.paid || 0;
      });
      
      transportationFeeRecords.forEach(transportFee => {
        transportationPaidAmount += transportFee.paid || 0;
      });
      
      const receiptData = {
        receiptNumber,
        date: currentFee.paymentDate || formatDate(new Date().toISOString()), // Use payment date if available
        studentName: currentFee.studentName,
        studentId: student.studentId,
        grade: currentFee.grade,
        englishName: student.englishName || '',
        englishGrade: student.englishGrade || '',
        student: student, // Add the entire student object
        tuitionFees: tuitionFees, // Add tuition fees amount
        feeType: getFeeTypeLabel(currentFee.feeType),
        amount: currentFee.paid,
        originalAmount: currentFee.amount,
        discount: currentFee.discount,
        totalAmount: currentFee.amount,
        remainingTuitionAmount: remainingTuitionAmount, // Add remaining tuition amount
        remainingTransportationAmount: remainingTransportationAmount, // Add remaining transportation amount
        tuitionPaidAmount: tuitionPaidAmount, // Add actual tuition paid amount
        transportationPaidAmount: transportationPaidAmount, // Add actual transportation paid amount
        remainingAmount: currentFee.balance, // Keep the original remaining amount for this specific fee
        schoolName: schoolSettings?.name || user?.schoolName || '',
        englishSchoolName: schoolSettings?.englishName || '',
        schoolId: user?.schoolId,
        schoolLogo: schoolSettings?.logo || user?.schoolLogo || '',
        schoolPhone: schoolSettings?.phone || '',
        schoolPhoneWhatsapp: schoolSettings?.phoneWhatsapp || '',
        schoolPhoneCall: schoolSettings?.phoneCall || '',
        schoolEmail: schoolSettings?.email || '',
        showWatermark: schoolSettings?.showReceiptWatermark,
        showLogoBackground: schoolSettings?.showLogoBackground,
        showStamp: schoolSettings?.showStampOnReceipt,
        showSignature: schoolSettings?.showSignatureOnReceipt,
        showFooter: schoolSettings?.showFooterInReceipts,
        // stamp: schoolSettings?.stamp, // Stamp functionality removed
        academicYear: new Date().getFullYear().toString(),
        paymentMethod: getPaymentMethodLabel(currentFee.paymentMethod),
        paymentNote: currentFee.paymentNote || '',
        checkNumber: currentFee.checkNumber || '',
        checkDate: currentFee.checkDate || '',
        bankName: currentFee.bankName || '',
        bankNameArabic: currentFee.bankNameArabic || '',
        bankNameEnglish: currentFee.bankNameEnglish || '',
        isPartialPayment: currentFee.status === 'partial'
      };
      
      // DEBUG: Log the school settings and generated receipt data
      console.log('GENERATE RECEIPT DATA (FEES) - School Settings Debug:', {
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
    } catch (error: any) {
      console.error('Error generating receipt data:', error);
      
      // Check if this is a settings schema error
      if (error?.type === 'SETTINGS_SCHEMA_ERROR') {
        setSettingsError(error);
        setShowSettingsError(true);
      }
      
      return null;
    }
  };

  // Removed per user request: Download All Receipts handler was deleted

  // Removed per user request: View All Receipts
  // const handleViewAllReceipts = async () => {
  //   if (isViewingAll) return;
  //   setIsViewingAll(true);
  //
  //   try {
  //     const feesWithPayments = fees.filter(fee => fee.status === 'paid' || fee.status === 'partial');

      /*
      if (feesWithPayments.length === 0) {
        toast.success('لا توجد إيصالات مدفوعة للعرض');
        setIsViewingAll(false);
        return;
      }

      const receiptsBodies: string[] = [];
      let headStyles: string | null = null;

      for (let i = 0; i < feesWithPayments.length; i++) {
        const fee = feesWithPayments[i];
        try {
          const receiptData = await generateReceiptDataForFee(fee);
          if (!receiptData) continue;

          const html = await pdfPrinter.generateReceiptHTML(receiptData);
          if (!html) continue;

          if (headStyles === null) {
            const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
            headStyles = headMatch ? headMatch[0] : '<head></head>';
          }

          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const bodyContent = bodyMatch ? bodyMatch[1] : html;
          receiptsBodies.push(bodyContent);

          if ((i + 1) % 5 === 0) {
            toast.success(`تم تجهيز ${i + 1} من ${feesWithPayments.length} إيصال للعرض`);
          }
        } catch (err) {
          console.error('Error generating receipt HTML:', err);
        }
      }

      if (receiptsBodies.length === 0) {
        toast.error('تعذر إنشاء محتوى الإيصالات للعرض');
        setIsViewingAll(false);
        return;
      }

      const extraStyles = `
        <style>
          @media print {
            .receipt-container { page-break-after: always; }
            .receipt-container:last-child { page-break-after: auto; }
          }
          body { background: #f5f5f5; margin: 0; padding: 20px; }
          .stack { display: flex; flex-direction: column; gap: 20px; align-items: center; }
          .receipt-container { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        </style>
      `;

      const headBlock = headStyles ? headStyles.replace('</head>', `${extraStyles}</head>`) : `<head>${extraStyles}</head>`;

      const combinedHtml = `<!DOCTYPE html><html lang="ar" dir="rtl">${headBlock}<body><div class="stack">${receiptsBodies.join('\n')}</div></body></html>`;
      */

  //     await pdfPrinter.openPrintWindow(combinedHtml, 500);
  //     toast.success('تم عرض جميع الإيصالات في نافذة واحدة');
  //   } catch (error) {
  //     console.error('Error viewing all receipts:', error);
  //     toast.error('حدث خطأ أثناء عرض الإيصالات');
  //   } finally {
  //     setIsViewingAll(false);
  //   }
  // };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="loader"></div>
      </div>
    );
  }

  if (showNoDataMessage) {
    return (
      <div className="p-6">
        <div className="mb-4 flex justify-between">
          <h1 className="text-2xl font-bold">الرسوم الدراسية</h1>
          <div className="flex space-x-2">
            <Link to="/school/fees/new" className="btn btn-primary flex items-center space-x-1">
              <Plus size={16} />
              <span>إضافة رسوم</span>
            </Link>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold mb-2">لا توجد بيانات</h2>
          <p className="mb-4">لم يتم العثور على أي رسوم دراسية. يمكنك إضافة رسوم جديدة أو استخدام البيانات التجريبية.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-50/80 via-slate-50/60 to-gray-50/40 rounded-lg shadow-sm p-6 border border-gray-100">
        <div>
          <div className="flex items-center space-x-4 space-x-reverse mb-6">
            <div className="bg-[#800000] p-3 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة الرسوم</h1>
              <p className="text-gray-600">إدارة ومتابعة الرسوم الدراسية والمالية للطلاب</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-start">
            <div className="dropdown relative inline-block group">
              <button
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Upload size={18} />
                <span className="font-medium">استيراد متقدم</span>
              </button>
              <div className="dropdown-menu absolute hidden group-hover:block right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                <button
                  onClick={() => handleImportClick('fees')}
                  className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  استيراد الرسوم
                </button>
                <button
                  onClick={() => handleImportClick('installments')}
                  className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  استيراد الأقساط
                </button>
              </div>
            </div>
            <Link to="/school/fees/new" className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg">
              <Plus size={18} />
              <span className="font-medium">إضافة رسوم</span>
            </Link>

          </div>
        </div>
      </div>
      
      {importSuccess && importResult && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-start">
          <div className="flex-shrink-0 mr-3">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-medium">تم الاستيراد بنجاح!</p>
            <p className="text-sm">
              {importResult.studentsCount > 0 ? `تم استيراد ${importResult.studentsCount} طالب و ` : ''}
              تم استيراد {importResult.feesCount} رسوم مالية بنجاح.
            </p>
          </div>
        </div>
      )}
      
      {showSettingsError && settingsError && (
        <FixSettingsError 
          error={settingsError}
          onClose={() => {
            setShowSettingsError(false);
            setSettingsError(null);
          }}
        />
      )}
      
      <div className="bg-white rounded-lg shadow-md p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="font-bold">عرض:</span>
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-4 py-2 ${displayMode === 'list' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setDisplayMode('list')}
            >
              قائمة الرسوم
            </button>
            <button
              className={`px-4 py-2 ${displayMode === 'student' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setDisplayMode('student')}
            >
              حسب الطالب
            </button>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Report dropdown */}
          <div className="relative inline-block" ref={reportDropdownRef}>
            <button
              onClick={() => setReportDropdownOpen(!reportDropdownOpen)}
              className="flex items-center gap-1 px-3 py-1 bg-[#800000] hover:bg-[#600000] text-white rounded-md transition-colors"
              title="تقرير تحصيل الرسوم"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>تقرير</span>
              <ChevronDown size={14} />
            </button>
            
            {reportDropdownOpen && (
              <div className="absolute left-0 mt-1 py-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <button
                  onClick={() => {
                    handleGenerateFeesCollectionReport();
                    setReportDropdownOpen(false);
                  }}
                  className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  عرض تقرير الرسوم
                </button>
                <button
                  onClick={() => {
                    handleDownloadFeesCollectionReport();
                    setReportDropdownOpen(false);
                  }}
                  className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  تنزيل التقرير كملف PDF
                </button>
              </div>
            )}
          </div>
          
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            onClick={() => handleImportClick('fees')}
            title="استيراد الرسوم من ملف CSV"
          >
            <Upload size={16} />
            <span>استيراد</span>
          </button>
          
          <button
            type="button" 
            className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            onClick={handleExportFees}
            title="تصدير قائمة الرسوم"
          >
            <Download size={16} />
            <span>تصدير</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600" />
            <span>تصفية:</span>
          </div>
          
          <select
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <option value="all">جميع الصفوف</option>
            {grades.filter((g) => g !== 'all').map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          
          <select
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">جميع أنواع الرسوم</option>
            {FEE_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          
          <select
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">جميع الحالات</option>
            <option value="paid">مدفوع</option>
            <option value="partial">مدفوع جزئياً</option>
            <option value="unpaid">غير مدفوع</option>
          </select>
          
          <select
            className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="all">جميع الطلبة</option>
            {studentList.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {user?.schoolId && (
        <ImportDialog
          isOpen={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          onSuccess={handleImportSuccess}
          templateGenerator={importType === 'fees' ? generateFeeTemplateCSV : generateInstallmentTemplateCSV}
          templateFileName={importType === 'fees' ? "قالب_استيراد_الرسوم.csv" : "قالب_استيراد_الأقساط.csv"}
          schoolId={user.schoolId}
          importType={importType}
        />
      )}
      
      {!user?.schoolId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-yellow-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="mr-3">
              <p className="text-sm text-yellow-700">
                لا يمكن استيراد البيانات. المستخدم غير مرتبط بمدرسة. يرجى التواصل مع المدير.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Student-based View */}
      {displayMode === 'student' && (
        <div className="space-y-6">
          {studentFeeGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              لا توجد رسوم مطابقة لمعايير البحث
            </div>
          ) : (
            studentFeeGroups.map(student => (
              <div key={student.studentId} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div 
                  className="p-4 border-b bg-gray-50 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleStudentExpanded(student.studentId)}
                >
                  <div className="flex items-center gap-3">
                    {expandedStudents[student.studentId] ? (
                      <ChevronDown size={20} className="text-gray-600" />
                    ) : (
                      <ChevronUp size={20} className="text-gray-600" />
                    )}
                    <div>
                      <div className="font-bold text-lg">{student.studentName}</div>
                      <div className="text-gray-600 text-sm">{student.grade}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">الإجمالي</div>
                      <div className="font-bold">{student.totalAmount.toLocaleString()} {CURRENCY}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-500">الخصومات</div>
                      <div className="font-bold text-blue-600">
                        {student.tuitionFees
                          .concat(student.transportationFees, student.otherFees)
                          .reduce((sum, fee) => {
                            const discountComputed = Math.max(0, (fee.amount || 0) - (fee.paid || 0) - (fee.balance || 0));
                            return sum + discountComputed;
                          }, 0)
                          .toLocaleString()} {CURRENCY}
                      </div>
                    </div>
                    {/* Transportation fees amount in orange */}
                    <div className="text-right">
                      <div className="text-sm text-gray-500">رسوم النقل</div>
                      <div className="font-bold" style={{ color: 'orange' }}>
                        {student.transportationFees.reduce((sum, fee) => sum + fee.amount, 0).toLocaleString()} {CURRENCY}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">المدفوع</div>
                      <div className="font-bold text-green-600">{student.totalPaid.toLocaleString()} {CURRENCY}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">المتبقي</div>
                      <div className="font-bold text-red-600">{student.totalBalance.toLocaleString()} {CURRENCY}</div>
                    </div>
                    <div className="flex gap-2">
                      {/* Partial payment button for student-based view */}
                      {student.totalBalance > 0 && (
                        <>
                          <button
                            type="button"
                            className="p-2 rounded-full hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Find the first unpaid fee for this student
                              const firstUnpaidFee = student.tuitionFees.concat(student.transportationFees, student.otherFees).find(f => f.balance > 0);
                              if (firstUnpaidFee) {
                                setSelectedFee(firstUnpaidFee);
                                setPartialPaymentModalOpen(true);
                              }
                            }}
                            title="دفع جزئي"
                          >
                            <CreditCard size={18} className="text-yellow-500" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-full hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePayAllFeesForStudent(student.studentId);
                            }}
                            disabled={paymentProcessing === student.studentId}
                            title="دفع جميع الرسوم المستحقة"
                          >
                            <PaymentIcon size={18} className="text-green-600" />
                          </button>
                        </>
                      )}
                      {/* Receipt download buttons for paid/partial fees, but exclude transportation fees */}
                      {student.tuitionFees.concat(student.otherFees)
                        .filter(fee => fee.status === 'paid' || fee.status === 'partial')
                        .map((fee) => (
                          <div key={fee.id} className="inline-block" onClick={e => e.stopPropagation()}>
                            <ReceiptActions 
                              fee={fee} 
                              generateReceiptData={generateReceiptDataForFee}
                              compact={true} 
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
                
                {expandedStudents[student.studentId] && (
                  <div className="p-4">
                    {/* Tuition Fees Section */}
                    {student.tuitionFees.length > 0 && (
                      <div className="mb-6">
                        <div 
                          className="flex items-center gap-2 mb-3 cursor-pointer"
                          onClick={() => toggleFeeSection(student.studentId, 'tuition')}
                        >
                          <Book size={18} className="text-primary" />
                          <h3 className="text-lg font-bold">الرسوم الدراسية</h3>
                          {student.expandedSections.tuition ? (
                            <ChevronDown size={16} className="text-gray-600" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-600" />
                          )}
                        </div>
                        
                        {student.expandedSections.tuition && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                              <thead className="bg-gradient-to-r from-white via-gray-50 to-gray-100">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الوصف
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    المبلغ
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    المدفوع
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الخصم
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    المتبقي
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الحالة
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الإجراءات
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {student.tuitionFees.map(fee => (
                                  <tr key={fee.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{fee.description || getFeeTypeLabel(fee.feeType)}</div>
                                      <div className="text-sm text-gray-500">تاريخ الاستحقاق: {new Date(fee.dueDate).toLocaleDateString('en-GB')}</div>
                                      {fee.paymentDate && fee.status !== 'unpaid' && (
                                        <>
                                          {/* Check Number */}
                                          {fee.checkNumber && (
                                            <div className="text-sm text-purple-600">رقم الشيك: {fee.checkNumber}</div>
                                          )}
                                          <div className="text-sm text-green-600">تاريخ الدفع: {new Date(fee.paymentDate).toLocaleDateString('en-GB')}</div>
                                          {fee.paymentMethod && (
                                            <div className="text-sm text-blue-600">طريقة الدفع: {getPaymentMethodLabel(fee.paymentMethod)}</div>
                                          )}
                                          {fee.paymentNote && (
                                            <div className="text-sm text-gray-500 italic">ملاحظات: {fee.paymentNote}</div>
                                          )}
                                        </>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium">{fee.amount.toLocaleString()} {CURRENCY}</div>
                                      {fee.discount > 0 && (
                                        <div className="text-xs text-green-600">خصم: {fee.discount.toLocaleString()} {CURRENCY}</div>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-green-600 font-medium">{fee.paid.toLocaleString()} {CURRENCY}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-green-600">{fee.discount.toLocaleString()} {CURRENCY}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className={`text-sm ${fee.balance > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                        {fee.balance.toLocaleString()} {CURRENCY}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(fee.status)}`}>
                                        {getStatusLabel(fee.status)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <div className="flex items-center gap-2">
                                        <Link to={`/school/fees/${fee.id}`} className="text-indigo-600 hover:text-indigo-900">
                                          <Edit size={16} />
                                        </Link>
                                        {fee.status !== 'paid' && (
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePaymentComplete(fee.id);
                                            }}
                                            disabled={paymentProcessing === fee.id}
                                            className="text-green-600 hover:text-green-900"
                                          >
                                            <PaymentIcon size={16} />
                                          </button>
                                        )}
                                        {fee.status !== 'paid' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePartialPayment(fee.id);
                                            }}
                                            disabled={paymentProcessing === fee.id}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            <DollarSign size={16} />
                                          </button>
                                        )}
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(fee.id);
                                          }}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          <Trash size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Transportation Fees Section */}
                    {student.transportationFees.length > 0 && (
                      <div className="mb-6">
                        <div 
                          className="flex items-center gap-2 mb-3 cursor-pointer"
                          onClick={() => toggleFeeSection(student.studentId, 'transportation')}
                        >
                          <Bus size={18} className="text-primary" />
                          <h3 className="text-lg font-bold">رسوم النقل</h3>
                          {student.expandedSections.transportation ? (
                            <ChevronDown size={16} className="text-gray-600" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-600" />
                          )}
                        </div>
                        
                        {student.expandedSections.transportation && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                              <thead className="bg-gradient-to-r from-white via-gray-50 to-gray-100">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الوصف
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    المبلغ
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الخصم
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    المدفوع
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    المتبقي
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الحالة
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الإجراءات
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {student.transportationFees.map(fee => (
                                  <tr key={fee.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{fee.description || getFeeTypeLabel(fee.feeType)}</div>
                                      <div className="text-sm text-gray-500">تاريخ الاستحقاق: {new Date(fee.dueDate).toLocaleDateString('en-GB')}</div>
                                      {fee.paymentDate && fee.status !== 'unpaid' && (
                                        <>
                                          {/* Check Number */}
                                          {fee.checkNumber && (
                                            <div className="text-sm text-purple-600">رقم الشيك: {fee.checkNumber}</div>
                                          )}
                                          <div className="text-sm text-green-600">تاريخ الدفع: {new Date(fee.paymentDate).toLocaleDateString('en-GB')}</div>
                                          {fee.paymentMethod && (
                                            <div className="text-sm text-blue-600">طريقة الدفع: {getPaymentMethodLabel(fee.paymentMethod)}</div>
                                          )}
                                          {fee.paymentNote && (
                                            <div className="text-sm text-gray-500 italic">ملاحظات: {fee.paymentNote}</div>
                                          )}
                                        </>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium">{fee.amount.toLocaleString()} {CURRENCY}</div>
                                      {fee.discount > 0 && (
                                        <div className="text-xs text-green-600">خصم: {fee.discount.toLocaleString()} {CURRENCY}</div>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-green-600">{fee.discount.toLocaleString()} {CURRENCY}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-green-600 font-medium">{fee.paid.toLocaleString()} {CURRENCY}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className={`text-sm ${fee.balance > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                        {fee.balance.toLocaleString()} {CURRENCY}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(fee.status)}`}>
                                        {getStatusLabel(fee.status)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <div className="flex items-center gap-2">
                                        <Link to={`/school/fees/${fee.id}`} className="text-indigo-600 hover:text-indigo-900">
                                          <Edit size={16} />
                                        </Link>
                                        {fee.status !== 'paid' && (
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePaymentComplete(fee.id);
                                            }}
                                            disabled={paymentProcessing === fee.id}
                                            className="text-green-600 hover:text-green-900"
                                          >
                                            <PaymentIcon size={16} />
                                          </button>
                                        )}
                                        {fee.status !== 'paid' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePartialPayment(fee.id);
                                            }}
                                            disabled={paymentProcessing === fee.id}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            <DollarSign size={16} />
                                          </button>
                                        )}
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(fee.id);
                                          }}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          <Trash size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Other Fees Section */}
                    {student.otherFees.length > 0 && (
                      <div>
                        <div 
                          className="flex items-center gap-2 mb-3 cursor-pointer"
                          onClick={() => toggleFeeSection(student.studentId, 'other')}
                        >
                          <CreditCard size={18} className="text-primary" />
                          <h3 className="text-lg font-bold">رسوم أخرى</h3>
                          {student.expandedSections.other ? (
                            <ChevronDown size={16} className="text-gray-600" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-600" />
                          )}
                        </div>
                        
                        {student.expandedSections.other && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                              <thead className="bg-gradient-to-r from-white via-gray-50 to-gray-100">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    النوع
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    المبلغ
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الخصم
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    المدفوع
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    المتبقي
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الحالة
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    الإجراءات
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {student.otherFees.map(fee => (
                                  <tr key={fee.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{fee.description || getFeeTypeLabel(fee.feeType)}</div>
                                      <div className="text-sm text-gray-500">تاريخ الاستحقاق: {new Date(fee.dueDate).toLocaleDateString('en-GB')}</div>
                                      {fee.paymentDate && fee.status !== 'unpaid' && (
                                        <>
                                          {/* Check Number */}
                                          {fee.checkNumber && (
                                            <div className="text-sm text-purple-600">رقم الشيك: {fee.checkNumber}</div>
                                          )}
                                          <div className="text-sm text-green-600">تاريخ الدفع: {new Date(fee.paymentDate).toLocaleDateString('en-GB')}</div>
                                          {fee.paymentMethod && (
                                            <div className="text-sm text-blue-600">طريقة الدفع: {getPaymentMethodLabel(fee.paymentMethod)}</div>
                                          )}
                                          {fee.paymentNote && (
                                            <div className="text-sm text-gray-500 italic">ملاحظات: {fee.paymentNote}</div>
                                          )}
                                        </>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium">{fee.amount.toLocaleString()} {CURRENCY}</div>
                                      {fee.discount > 0 && (
                                        <div className="text-xs text-green-600">خصم: {fee.discount.toLocaleString()} {CURRENCY}</div>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-green-600">{fee.discount.toLocaleString()} {CURRENCY}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-green-600 font-medium">{fee.paid.toLocaleString()} {CURRENCY}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className={`text-sm ${fee.balance > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                        {fee.balance.toLocaleString()} {CURRENCY}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(fee.status)}`}>
                                        {getStatusLabel(fee.status)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <div className="flex items-center gap-2">
                                        <Link to={`/school/fees/${fee.id}`} className="text-indigo-600 hover:text-indigo-900">
                                          <Edit size={16} />
                                        </Link>
                                        {fee.status !== 'paid' && (
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePaymentComplete(fee.id);
                                            }}
                                            disabled={paymentProcessing === fee.id}
                                            className="text-green-600 hover:text-green-900"
                                          >
                                            <PaymentIcon size={16} />
                                          </button>
                                        )}
                                        {fee.status !== 'paid' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePartialPayment(fee.id);
                                            }}
                                            disabled={paymentProcessing === fee.id}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            <DollarSign size={16} />
                                          </button>
                                        )}
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(fee.id);
                                          }}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          <Trash size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      {/* List View */}
      {displayMode === 'list' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
            <CreditCard size={20} className="text-primary" />
            <h2 className="text-xl font-bold text-gray-800">قائمة الرسوم</h2>
            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
              {filteredFees.length}
            </span>
          </div>
          
          {filteredFees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              لا توجد رسوم مطابقة لمعايير البحث
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-white via-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                      الطالب
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                      الصف
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                      نوع الرسوم
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                      المبلغ
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                      المدفوع
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                      المتبقي
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                      الحالة
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{fee.studentName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-500">{fee.grade}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-500">
                          {getFeeTypeLabel(fee.feeType)}
                          {fee.transportationType && (
                            <span className="text-xs block">
                              {fee.transportationType === 'one-way' ? 'اتجاه واحد' : 'اتجاهين'}
                            </span>
                          )}
                          <div className="text-xs text-gray-400">
                            تاريخ الاستحقاق: {new Date(fee.dueDate).toLocaleDateString('en-GB')}
                          </div>
                          {fee.paymentDate && fee.status !== 'unpaid' && (
                            <>
                              {/* Check Number */}
                              {fee.checkNumber && (
                                <div className="text-sm text-purple-600">رقم الشيك: {fee.checkNumber}</div>
                              )}
                              <div className="text-xs text-green-600">
                                تاريخ الدفع: {new Date(fee.paymentDate).toLocaleDateString('en-GB')}
                              </div>
                              {fee.paymentMethod && (
                                <div className="text-xs text-blue-600">طريقة الدفع: {getPaymentMethodLabel(fee.paymentMethod)}</div>
                              )}
                              {fee.paymentNote && (
                                <div className="text-xs text-gray-500 italic">ملاحظات: {fee.paymentNote}</div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900 font-medium">{fee.amount.toLocaleString()} {CURRENCY}</div>
                        {fee.discount > 0 && (
                          <div className="text-xs text-green-600">
                            خصم: {fee.discount.toLocaleString()} {CURRENCY}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-green-600">{fee.paid.toLocaleString()} {CURRENCY}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`${fee.balance > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {fee.balance.toLocaleString()} {CURRENCY}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(fee.status)}`}>
                          {getStatusLabel(fee.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1 rtl:space-x-reverse">
                          {fee.status !== 'paid' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePaymentComplete(fee.id);
                                }}
                                disabled={paymentProcessing === fee.id}
                                className="p-1 text-green-600 hover:text-green-800 transition-colors"
                                title="دفع كامل المبلغ"
                              >
                                <CreditCard size={18} />
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePartialPayment(fee.id);
                                }}
                                disabled={paymentProcessing === fee.id}
                                className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                title="دفع جزئي"
                              >
                                <DollarSign size={18} />
                              </button>
                            </>
                          )}
                          
                          {(fee.status === 'paid' || fee.status === 'partial') && (
                            <>
                              <div className="inline-block" onClick={(e) => e.stopPropagation()}>
                                <ReceiptActions fee={fee} generateReceiptData={generateReceiptDataForFee} compact={true} />
                              </div>
                            </>
                          )}
                          
                          {fee.status === 'unpaid' && (
                            <button
                              disabled
                              className="p-1 text-gray-400 cursor-not-allowed"
                              title="لا يمكن طباعة إيصال لرسوم غير مدفوعة"
                            >
                              <Download size={18} />
                            </button>
                          )}
                          
                          {fee.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendWhatsApp(fee.id);
                              }}
                              className="p-1 text-green-600 hover:text-green-800 transition-colors"
                              title="إرسال رسالة واتساب"
                            >
                              <MessageSquare size={18} />
                            </button>
                          )}
                          <Link
                            to={`/school/fees/${fee.id}/edit`}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="تعديل الرسوم"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(fee.id);
                            }}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="حذف الرسوم"
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
          )}
        </div>
      )}
      
      {/* Add the partial payment modal */}
      <PartialPaymentModal
        open={partialPaymentModalOpen}
        onClose={() => setPartialPaymentModalOpen(false)}
        onConfirm={handlePartialPaymentConfirm}
        fee={selectedFee ? {
          id: selectedFee.id,
          amount: selectedFee.amount,
          discount: selectedFee.discount,
          paid: selectedFee.paid,
          balance: selectedFee.balance,
          studentId: selectedFee.studentId,
          receiptNumber: selectedFee.receiptNumber,
          type: selectedFee.feeType,
        } : null}
      />
      
      {/* Add the PayAllFeesModal to the return statement, right before the closing tag */}
      <PayAllFeesModal
        open={payAllModalOpen}
        onClose={() => {
          setPayAllModalOpen(false);
          setSingleFeeId(null); // Reset the single fee ID when closing
        }}
        onConfirm={(paymentMethod, paymentNote, checkNumber, checkDate, bankNameArabic, bankNameEnglish, paymentDate) => {
          // Decide which handler to use based on whether we're paying a single fee or multiple fees
          if (singleFeeId) {
            handleSingleFeePayment(paymentMethod, paymentNote, checkNumber, checkDate, bankNameArabic, bankNameEnglish, paymentDate);
          } else {
            handlePayAllFeesConfirm(paymentMethod, paymentNote, checkNumber, checkDate, bankNameArabic, bankNameEnglish, paymentDate);
          }
        }}
        studentName={selectedStudentName}
        totalAmount={selectedStudentTotalAmount}
      />
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen} title='تنبيه' message={alertMessage} />
    </div>
  );
};

export default Fees;
 