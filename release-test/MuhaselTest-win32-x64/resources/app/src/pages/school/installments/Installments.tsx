import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Edit, Filter, CreditCard, Check, Clock, MessageSquare, Download, Upload, User, ChevronDown, ChevronRight, Trash2, Calendar, FileText, Eye } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { useReportSettings } from '../../../contexts/ReportSettingsContext';
import { CURRENCY as CURRENCY_SYMBOL } from '../../../utils/constants';
import hybridApi from '../../../services/hybridApi';
import dataStore, { Template } from '../../../services/dataStore';
import pdfPrinter from '../../../services/pdfPrinter';
import { generateInstallmentTemplateCSV, exportInstallmentsToCSV } from '../../../services/importExport';
import PDFExportButton from '../../../components/pdf/PDFExportButton';
import { exportStudentInstallmentsReportAsPDF } from '../../../utils/pdfExport';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { generateReceiptNumber } from '../../../utils/helpers';
import { reserveReceiptNumbers, getNextReceiptNumber } from '../../../utils/receiptCounter';
import ImportDialog from '../../../components/ImportDialog';
import EnglishReceiptButton from '../../../components/payments/EnglishReceiptButton';
import InstallmentEnglishReceiptButton from '../../../components/payments/InstallmentEnglishReceiptButton';
import { exportToPdf } from '../../../utils/electronPdfExport';
import { Input } from '../../../components/ui/Input';
import { AlertDialog } from '../../../components/ui/Dialog';

// Format phone number - preserve as entered
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Just trim and return as is
  return phone.trim();
};

// Add date formatting function
const formatDate = (date: string) => {
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return date; // Return original if invalid date
    }
    
    // Format as DD/MM/YYYY
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date; // Return original if error
  }
};

// Define fee type labels function
const getFeeTypeLabel = (type: string): string => {
  const feeTypes: Record<string, string> = {
    'tuition': 'رسوم دراسية',
    'transportation': 'نقل مدرسي',
    'activities': 'أنشطة',
    'uniform': 'زي مدرسي',
    'books': 'كتب',
    'other': 'رسوم أخرى',
    'transportation_and_tuition': 'رسوم مدمجة'
  };
  
  return feeTypes[type] || type;
};

// Define status label function
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'مدفوع';
    case 'upcoming':
      return 'الدفعة القادمة';
    case 'overdue':
      return 'متأخر';
    case 'partial':
      return 'مدفوع جزئياً';
    case 'unpaid':
      return 'غير مدفوع';
    default:
      return status;
  }
};

// Define a function to sort installments
const getSortedInstallments = (installments: Installment[] | undefined): Installment[] => {
  if (!installments || installments.length === 0) return [];
  
  return [...installments].sort((a, b) => {
    // Just sort by due date (oldest first for payment order)
    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    return dateA - dateB; // Ascending order (oldest first)
  });
};

// Define a function that includes status in sorting (for display purposes)
const getSortedInstallmentsByStatus = (installments: Installment[] | undefined): Installment[] => {
  if (!installments || installments.length === 0) return [];
  
  return [...installments].sort((a, b) => {
    // First sort by status
    if (a.status !== b.status) {
      // Define status priority: overdue, upcoming, partial, paid
      const statusPriority: { [key: string]: number } = {
        'overdue': 0,
        'upcoming': 1,
        'partial': 2,
        'paid': 3
      };
      return statusPriority[a.status] - statusPriority[b.status];
    }
    
    // Then sort by due date (oldest first for payment order)
    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    return dateA - dateB; // Ascending order (oldest first)
  });
};

interface Student {
  id: string;
  name: string;
  grade: string;
  installments: Installment[];
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
}

interface Installment {
  id: string;
  studentId: string;
  studentCustomId?: string; // this is K1001
  studentName: string;
  grade: string;
  englishName?: string; // English name of the student
  englishGrade?: string; // English grade of the student
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: 'paid' | 'upcoming' | 'overdue' | 'partial';
  feeId: string;
  feeType: string;
  note?: string;
  schoolId: string;
  installmentCount: number;
  installmentMonth?: string;
  paidAmount?: number;
  discount?: number;
  paymentMethod?: string;
  paymentNote?: string;
  checkNumber?: string;
  receiptNumber?: string; // Add receipt number to track assigned receipt numbers
}

// Add a Fee interface with receiptNumber
interface Fee {
  id: string;
  studentId: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  type: string;
  discount: number;
  note?: string;
  schoolId: string;
  installmentCount?: number;
  receiptNumber?: string;
  paymentMethod?: string;
  paymentNote?: string;
  checkNumber?: string;
  checkDate?: string;
  bankNameArabic?: string;
  bankNameEnglish?: string;
}

interface InstallmentsReportData {
  title: string;
  installments: Installment[];
  fees?: Fee[];
  schoolName: string;
  date: string;
  filters: {
    month: string;
    status: string;
    grade: string;
  };
  schoolInfo: {
    email: string;
    phone: string;
    phoneWhatsapp: string;
    phoneCall: string;
    logo?: string;
    showLogoBackground?: boolean;


    signature?: string;
    showSignature?: boolean;
  };
}

const Installments = () => {
  const { user } = useSupabaseAuth();
  const location = useLocation();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  // Helper function to find installment by ID from component state
  const findInstallmentById = (id: string | null): Installment | undefined => {
    if (!id) return undefined;
    return installments.find(inst => inst.id === id);
  };

  // Helper function to calculate remaining amounts for a student
  const calculateRemainingAmounts = async (studentId: string) => {
    let remainingTuitionAmount = 0;
    let remainingTransportationAmount = 0;
    
    try {
      // Get all fees for this student to calculate total remaining amounts
      const studentFeesResponse = await hybridApi.getFees(user?.schoolId, studentId);
      if (studentFeesResponse?.success && studentFeesResponse?.data) {
        const studentFees = studentFeesResponse.data;
        
        // Calculate total tuition and transportation fees
        let totalTuitionFees = 0;
        let totalTransportationFees = 0;
        let totalTuitionPaid = 0;
        let totalTransportationPaid = 0;
        
        for (const studentFee of studentFees) {
          if (studentFee.feeType === 'tuition' || studentFee.feeType === 'رسوم دراسية') {
            totalTuitionFees += (studentFee.amount - studentFee.discount);
            totalTuitionPaid += studentFee.paid || 0;
          } else if (studentFee.feeType === 'transportation' || studentFee.feeType === 'رسوم نقل') {
            totalTransportationFees += (studentFee.amount - studentFee.discount);
            totalTransportationPaid += studentFee.paid || 0;
          }
        }
        
        remainingTuitionAmount = Math.max(0, totalTuitionFees - totalTuitionPaid);
        remainingTransportationAmount = Math.max(0, totalTransportationFees - totalTransportationPaid);
      }
    } catch (error) {
      console.error('Error calculating remaining amounts:', error);
      // Fallback to 0 if calculation fails
      remainingTuitionAmount = 0;
      remainingTransportationAmount = 0;
    }
    
    return { remainingTuitionAmount, remainingTransportationAmount };
  };

  // Helper function to get installment number for a specific installment
  const getInstallmentNumber = (installment: Installment): number => {
    // Get all installments for the same student and fee type
    const studentInstallments = installments.filter(inst => 
      inst.studentId === installment.studentId && 
      inst.feeType === installment.feeType
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    // Find the position of this installment (1-based)
    const position = studentInstallments.findIndex(inst => inst.id === installment.id) + 1;
    return position > 0 ? position : 1;
  };
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [displayMode, setDisplayMode] = useState<'student' | 'list'>('student');
  const [selectedInstallments, setSelectedInstallments] = useState<Record<string, boolean>>({});
  const [selectAllChecked, setSelectAllChecked] = useState<Record<string, boolean>>({});
  const [showCustomPayment, setShowCustomPayment] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customTemplate, setCustomTemplate] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{studentsCount: number; feesCount: number; installmentsCount?: number} | null>(null);
  const [showMonthFilterDialog, setShowMonthFilterDialog] = useState(false);
  // Add state for payment method, payment note, and check number
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  // Add state variables for full payment dialog
  const [showFullPaymentDialog, setShowFullPaymentDialog] = useState(false);
  const [fullPaymentInstallmentId, setFullPaymentInstallmentId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);

  // Fetch school settings
  const fetchSettings = async () => {
    if (user?.schoolId) {
      try {
        const response = await hybridApi.getSettings(user.schoolId);
        if (response.success && response.data && response.data.length > 0) {
          setSettings(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    }
  };

  // Move fetchInstallments outside useEffect to make it reusable
  const fetchInstallments = async () => {
    setIsLoading(true);
    
    try {
      console.log('Installments component: Fetching data from hybridApi');
      
      // Get installments based on user role
      let fetchedInstallments: Installment[] = [];
      const installmentsResponse = await hybridApi.getInstallments(
        user?.schoolId,
        undefined,
        undefined,
        user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels : undefined
      );
      fetchedInstallments = (installmentsResponse?.success && installmentsResponse?.data) ? installmentsResponse.data : [];
      
      // Filter by grade levels if user is a grade manager
      if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
        fetchedInstallments = fetchedInstallments.filter(installment => 
          user.gradeLevels?.includes(installment.grade)
        );
      }

      // Remove separate transportation installments from display (keep combined transportation & tuition)
      fetchedInstallments = fetchedInstallments.filter(inst => inst.feeType !== 'transportation');
      
      // Update installments with latest student data
      const updatedInstallments = await Promise.all(
        fetchedInstallments.map(async (installment: Installment) => {
          try {
            const studentResponse = await hybridApi.getStudent(installment.studentId);
            const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
            if (student) {
              return {
                ...installment,
                studentName: student.name,
                grade: student.grade,
                studentCustomId: student.studentId, // attach student.studentId as studentCustomId
                englishName: student.englishName, // attach student.englishName
                englishGrade: student.englishGrade, // attach student.englishGrade
                paymentMethod: installment.paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other' | undefined
              };
            }
            return installment;
          } catch (error) {
            console.error('Error fetching student data for installment:', error);
            return installment;
          }
        })
      );
      
      setInstallments(updatedInstallments);
      
      // Group installments by student
      const studentMap = new Map<string, Student>();
      
      updatedInstallments.forEach((installment: Installment) => {
        const { studentId, studentName, grade } = installment;
        
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            id: studentId,
            name: studentName,
            grade,
            installments: [],
            totalAmount: 0,
            totalPaid: 0,
            totalDue: 0
          });
        }
        
        const student = studentMap.get(studentId)!;
        student.installments.push(installment);
      });
      
      // Calculate financial summaries for each student
      studentMap.forEach(student => {
        // Calculate total amount
        student.totalAmount = student.installments.reduce((sum, inst) => sum + inst.amount, 0);
        
        // Calculate total paid based on paidAmount when available
        student.totalPaid = student.installments.reduce((sum, inst) => {
          if (inst.paidDate) {
            return sum + (inst.paidAmount !== undefined ? inst.paidAmount : inst.amount);
          }
          return sum;
        }, 0);
        
        // Calculate total due
        student.totalDue = student.totalAmount - student.totalPaid;
      });
      
      // Convert to array and sort by name
      const studentArray = Array.from(studentMap.values());
      studentArray.sort((a, b) => a.name.localeCompare(b.name));
      
      setStudents(studentArray);
      setFilteredStudents(studentArray);
      
      // Fetch templates
      try {
        const templatesResponse = await hybridApi.getTemplates(user?.schoolId);
        if (templatesResponse?.success && templatesResponse?.data) {
          setTemplates(templatesResponse.data);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    } catch (error) {
      console.error('Error loading installments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update useEffect to use the function
  useEffect(() => {
    // Initial fetch
    fetchInstallments();
    fetchSettings();
    
    // Note: hybridApi doesn't have a subscription mechanism like dataStore
    // Data will be refreshed when component mounts or when operations are performed
  }, [user?.schoolId, user?.role, user?.gradeLevels, location.pathname]);

  // Apply filters whenever installments or filter options change
  useEffect(() => {
    let filteredStuds = students;
    
    if (selectedGrade !== 'all') {
      filteredStuds = filteredStuds.filter((student) => student.grade === selectedGrade);
    }
    
    if (selectedStatus !== 'all') {
      filteredStuds = filteredStuds.filter((student) => {
        // Filter students that have installments matching the selected status
        const hasMatchingInstallments = student.installments.some(inst => {
          if (selectedStatus === 'paid') {
            return inst.status === 'paid';
          } else if (selectedStatus === 'unpaid') {
            return inst.status === 'unpaid' || inst.status === 'upcoming';
          } else if (selectedStatus === 'overdue') {
            return inst.status === 'overdue';
          } else if (selectedStatus === 'partial') {
            return inst.status === 'partial';
          }
          return true;
        });
        
        return hasMatchingInstallments;
      });
      
      // Also filter the installments within each student to only show the selected status
      filteredStuds = filteredStuds.map(student => {
        const filteredInstallments = student.installments.filter(inst => {
          if (selectedStatus === 'paid') {
            return inst.status === 'paid';
          } else if (selectedStatus === 'unpaid') {
            return inst.status === 'unpaid' || inst.status === 'upcoming';
          } else if (selectedStatus === 'overdue') {
            return inst.status === 'overdue';
          } else if (selectedStatus === 'partial') {
            return inst.status === 'partial';
          }
          return true;
        });
        
        return {
          ...student,
          installments: filteredInstallments
        };
      });
    }
    
    if (selectedMonth !== 'all') {
      // Define month names once to avoid repetition
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      
      filteredStuds = filteredStuds.filter((student) => {
        // Filter students that have installments for the selected month
        // or installments where we can determine the month from the due date
        const hasMatchingMonth = student.installments.some(inst => {
          // Check if installment has explicit month that matches
          if (inst.installmentMonth === selectedMonth) {
            return true;
          }
          
          // If installmentMonth is not set, try to determine it from the due date
          try {
            const dueDate = new Date(inst.dueDate);
            const monthFromDate = monthNames[dueDate.getMonth()];
            return monthFromDate === selectedMonth;
          } catch (e) {
            return false;
          }
        });
        
        return hasMatchingMonth;
      });
      
      // Also filter the installments within each student to only show the selected month
      filteredStuds = filteredStuds.map(student => {
        const filteredInstallments = student.installments.filter(inst => {
          // Check if installment has explicit month that matches
          if (inst.installmentMonth === selectedMonth) {
            return true;
          }
          
          // If installmentMonth is not set, try to determine it from the due date
          try {
            const dueDate = new Date(inst.dueDate);
            const monthFromDate = monthNames[dueDate.getMonth()];
            return monthFromDate === selectedMonth;
          } catch (e) {
            return false;
          }
        });
        
        return {
          ...student,
          installments: filteredInstallments
        };
      });
    }
    
    setFilteredStudents(filteredStuds);
  }, [selectedGrade, selectedStatus, selectedMonth, students]);

  const toggleExpandStudent = (studentId: string) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const expandAllStudents = () => {
    const expanded: Record<string, boolean> = {};
    students.forEach(student => {
      expanded[student.id] = true;
    });
    setExpandedStudents(expanded);
  };

  const collapseAllStudents = () => {
    setExpandedStudents({});
  };

  // Modify the existing handleMarkAsPaid function
  const handleMarkAsPaid = (id: string, customAmount?: number) => {
    // If it's a custom amount (partial payment), process it directly
    if (customAmount !== undefined) {
      processInstallmentPayment(id, customAmount);
    } else {
      // For full payment, show the dialog
      setFullPaymentInstallmentId(id);
      setShowFullPaymentDialog(true);
    }
  };

  // Add a new function to process the payment
  const processInstallmentPayment = async (id: string, customAmount?: number) => {
    try {
      const installmentResponse = await hybridApi.getInstallment(id);
      const installment = (installmentResponse?.success && installmentResponse?.data) ? installmentResponse.data : null;
      if (!installment) {
        setAlertMessage('لم يتم العثور على القسط');
        setAlertOpen(true);
        return;
      }
      
      // Get the original amount and the payment amount
      const originalAmount = installment.amount;
      
      // If using the pay icon (not custom payment), always mark as fully paid
      const paymentAmount = customAmount !== undefined ? customAmount : originalAmount;
      
      // Get the parent fee
      const feeResponse = await hybridApi.getFee(installment.feeId);
      const fee = (feeResponse?.success && feeResponse?.data) ? feeResponse.data : null;
      if (!fee) {
        setAlertMessage('لم يتم العثور على الرسوم المرتبطة بهذا القسط');
        setAlertOpen(true);
        return;
      }
      
      // Get all installments for this fee
      const allInstallmentsResponse = await hybridApi.getInstallments(user?.schoolId, undefined, installment.feeId);
      const allInstallments = (allInstallmentsResponse?.success && allInstallmentsResponse?.data) ? allInstallmentsResponse.data : [];
      
      // Calculate previous paid amount (if any)
      const previouslyPaid = installment.paidAmount || 0;
      const paymentToApply = Math.min(paymentAmount, originalAmount - previouslyPaid);
      const totalPaidForThisInstallment = previouslyPaid + paymentToApply;
      
      // Get student information for receipt number generation
      const studentResponse = await hybridApi.getStudent(installment.studentId);
      const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!student) {
        setAlertMessage('لم يتم العثور على الطالب');
        setAlertOpen(true);
        return;
      }
      
      // Get school settings for receipt number generation
      let schoolSettings = await hybridApi.getSettings(user?.schoolId || '');
      
      // If no settings exist, create default settings
      if (!schoolSettings || schoolSettings.length === 0) {
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
          await hybridApi.updateSettings(user?.schoolId || '', defaultSettings);
          schoolSettings = [defaultSettings];
        } catch (error) {
          console.error('Error creating default settings:', error);
          schoolSettings = [defaultSettings];
        }
      }
      
      // Reserve receipt number atomically to prevent duplicates
      let receiptNumber = installment.receiptNumber;
      
      if (!receiptNumber) {
        try {
          const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'installment', 1);
          receiptNumber = reservedNumbers[0];
        } catch (error) {
          console.error('Error reserving receipt number, falling back to direct generation:', error);
          // Fallback to direct generation if reservation fails
          receiptNumber = generateReceiptNumber(schoolSettings, student.studentId, undefined, 'installment');
        }
      }
      
      // Update the current installment based on payment amount
      if (totalPaidForThisInstallment >= originalAmount) {
        // Full payment or overpayment
        // @ts-ignore - Adding receiptNumber to installment
        await hybridApi.saveInstallment({
          ...installment,
          paidAmount: originalAmount, // Always set to full amount for the current installment
          balance: 0, // CRITICAL FIX: Set balance to 0 when fully paid
          paidDate: new Date().toISOString().split('T')[0],
          status: 'paid',
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote: paymentNote,
          checkNumber: paymentMethod === 'check' ? checkNumber : '',
          receiptNumber: receiptNumber // Add receipt number
        } as Installment);

        try {
          const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
          if (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) {
            const currentSettings = settingsResp.data[0];
            const updatedSettings = {
              ...currentSettings,
              installmentReceiptNumberCounter: (currentSettings.installmentReceiptNumberCounter || 0) + 1
            };
            await hybridApi.updateSettings(user?.schoolId || '', updatedSettings);
          }
        } catch (e) {
          console.error('Error incrementing installment receipt counter:', e);
        }
        
        // If there's an overpayment, apply it to the next unpaid installment
        const overpayment = totalPaidForThisInstallment - originalAmount;
        
        if (overpayment > 0) {
          // Find the next unpaid installments
          const unpaidInstallments = allInstallments
            .filter((inst: Installment) => (inst.status !== 'paid' && inst.id !== id))
            .sort((a: Installment, b: Installment) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          
          let remainingOverpayment = overpayment;
          
          // Apply overpayment to subsequent installments
          for (let i = 0; i < unpaidInstallments.length && remainingOverpayment > 0; i++) {
            const nextInstallment = unpaidInstallments[i];
            const nextInstallmentPreviouslyPaid = nextInstallment.paidAmount || 0;
            const nextInstallmentTotalAfterPayment = nextInstallmentPreviouslyPaid + remainingOverpayment;
            
            // Reserve receipt number atomically for the next installment to prevent duplicates
            let nextReceiptNumber = '';
            try {
              const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'installment', 1);
              nextReceiptNumber = reservedNumbers[0];
            } catch (error) {
              console.error('Error reserving receipt number for overpayment, falling back to direct generation:', error);
              // Fallback to direct generation if reservation fails
              nextReceiptNumber = generateReceiptNumber(schoolSettings, student.studentId, undefined, 'installment');
            }
            
            // If overpayment covers the full next installment
            if (nextInstallmentTotalAfterPayment >= nextInstallment.amount) {
              // @ts-ignore - Adding receiptNumber to next installment
              await hybridApi.saveInstallment({
                ...nextInstallment,
                paidAmount: nextInstallment.amount,
                balance: 0, // CRITICAL FIX: Set balance to 0 when fully paid
                paidDate: new Date().toISOString().split('T')[0],
                status: 'paid',
                paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
                paymentNote: paymentNote,
                checkNumber: paymentMethod === 'check' ? checkNumber : '',
                receiptNumber: nextReceiptNumber // Add receipt number for next installment
              } as Installment);

              try {
                const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
                if (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) {
                  const currentSettings = settingsResp.data[0];
                  const updatedSettings = {
                    ...currentSettings,
                    installmentReceiptNumberCounter: (currentSettings.installmentReceiptNumberCounter || 0) + 1
                  };
                  await hybridApi.updateSettings(user?.schoolId || '', updatedSettings);
                }
              } catch (e) {
                console.error('Error incrementing installment receipt counter:', e);
              }
              
              remainingOverpayment -= (nextInstallment.amount - nextInstallmentPreviouslyPaid);
            } else {
              // Partial payment for next installment
              // @ts-ignore - Adding receiptNumber to next installment
              await hybridApi.saveInstallment({
                ...nextInstallment,
                paidAmount: nextInstallmentTotalAfterPayment,
                balance: Math.max(0, nextInstallment.amount - nextInstallmentTotalAfterPayment), // CRITICAL FIX: Calculate balance
                paidDate: new Date().toISOString().split('T')[0],
                status: 'partial',
                paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
                paymentNote: paymentNote,
                checkNumber: paymentMethod === 'check' ? checkNumber : '',
                receiptNumber: nextReceiptNumber // Add receipt number for next installment
              } as Installment);

              try {
                const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
                if (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) {
                  const currentSettings = settingsResp.data[0];
                  const updatedSettings = {
                    ...currentSettings,
                    installmentReceiptNumberCounter: (currentSettings.installmentReceiptNumberCounter || 0) + 1
                  };
                  await hybridApi.updateSettings(user?.schoolId || '', updatedSettings);
                }
              } catch (e) {
                console.error('Error incrementing installment receipt counter:', e);
              }
              
              remainingOverpayment = 0;
            }
          }
        }
      } else {
        // Partial payment
        // @ts-ignore - Adding receiptNumber to installment
        await hybridApi.saveInstallment({
          ...installment,
          paidAmount: totalPaidForThisInstallment,
          balance: Math.max(0, originalAmount - totalPaidForThisInstallment), // CRITICAL FIX: Calculate balance
          paidDate: new Date().toISOString().split('T')[0],
          status: 'partial',
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote: paymentNote,
          checkNumber: paymentMethod === 'check' ? checkNumber : '',
          receiptNumber: receiptNumber // Add receipt number
        } as Installment);

        try {
          const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
          if (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) {
            const currentSettings = settingsResp.data[0];
            const updatedSettings = {
              ...currentSettings,
              installmentReceiptNumberCounter: (currentSettings.installmentReceiptNumberCounter || 0) + 1
            };
            await hybridApi.updateSettings(user?.schoolId || '', updatedSettings);
          }
        } catch (e) {
          console.error('Error incrementing installment receipt counter:', e);
        }
      }
      
      // Recalculate total paid amount for the fee from installments only
      const updatedInstallmentsResponse = await hybridApi.getInstallments(user?.schoolId, undefined, fee.id);
      const updatedInstallments = (updatedInstallmentsResponse?.success && updatedInstallmentsResponse?.data) ? updatedInstallmentsResponse.data : [];
      const totalPaidFromInstallments = updatedInstallments.reduce((sum: number, inst: Installment) => {
        // Use paidAmount if available, otherwise use amount for paid installments
        if (inst.paidDate) {
          return sum + (inst.paidAmount !== undefined ? inst.paidAmount : inst.amount);
        }
        return sum;
      }, 0);
      
      // Calculate remaining amount after discount
      const totalAmount = fee.amount - (fee.discount || 0);
      const remainingAmount = Math.max(0, totalAmount - totalPaidFromInstallments);
      
      // Update fee status
      let updatedStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (remainingAmount <= 0) {
        updatedStatus = 'paid';
      } else if (totalPaidFromInstallments > 0) {
        updatedStatus = 'partial';
      }
      
      // CRITICAL FIX: Only update fee if it was created through installments
      // Don't overwrite fees that were paid directly
      // Only update if the fee's current paid amount matches the installment total (indicating it's synced)
      // OR if the fee has no direct payments (paid === 0 and status === 'unpaid')
      const feeWasPaidDirectly = fee.paid > 0 && fee.status !== 'unpaid' && Math.abs(fee.paid - totalPaidFromInstallments) > 0.01;
      
      if (!feeWasPaidDirectly) {
        // Save the updated fee with receipt number
        // @ts-ignore - Adding receiptNumber to fee
        await hybridApi.saveFee({
          ...fee,
          studentId: fee.studentId, // Add student_id for database constraint
          schoolId: user?.schoolId, // Add school_id for RLS policy
          paid: Math.min(totalPaidFromInstallments, totalAmount), // Use installment-based calculation
          balance: remainingAmount,
          status: updatedStatus,
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote: paymentNote,
          receiptNumber: receiptNumber // Add receipt number to fee
        } as Fee);
      }
      
      // Reset payment fields after successful payment
      setPaymentMethod('cash');
      setPaymentNote('');
      setCheckNumber('');
      
      // Refresh data after payment
      await fetchInstallments();
      
    } catch (error) {
      console.error('Error updating payment:', error);
      setAlertMessage('حدث خطأ أثناء تحديث الدفعة');
      setAlertOpen(true);
    }
  };

  // Add a handler for the full payment dialog confirmation
  const handleFullPaymentConfirm = async () => {
    if (fullPaymentInstallmentId) {
      await processInstallmentPayment(fullPaymentInstallmentId);
      setShowFullPaymentDialog(false);
      setFullPaymentInstallmentId(null);
    }
  };

  const handlePrintReceipt = async (id: string) => {
    try {
      const installmentResponse = await hybridApi.getInstallmentById(id);
      const installment = (installmentResponse?.success && installmentResponse?.data) ? installmentResponse.data : null;
      if (!installment) {
        setAlertMessage('لم يتم العثور على القسط');
        setAlertOpen(true);
        return;
      }
      
      // Check if installment is paid - either by paidDate or status
      if (!installment.paidDate && installment.status !== 'paid') {
        setAlertMessage('لا يمكن طباعة إيصال لقسط غير مدفوع');
        setAlertOpen(true);
        return;
      }
      
      // Get student information
      const studentResponse = await hybridApi.getStudent(installment.studentId);
        const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!student) {
        setAlertMessage('لم يتم العثور على الطالب');
        setAlertOpen(true);
        return;
      }
      
      // Get fee information
      const feeResponse = await hybridApi.getFeeById(installment.feeId);
      if (!feeResponse.success || !feeResponse.data) {
        setAlertMessage('لم يتم العثور على الرسوم المرتبطة');
        setAlertOpen(true);
        return;
      }
      
      const fee = feeResponse.data;
      
      // Get school settings
      console.log('INSTALLMENTS.TSX - Fetching settings for schoolId:', user?.schoolId);
      let schoolSettingsResponse = await hybridApi.getSettings(user?.schoolId || '');
      console.log('INSTALLMENTS.TSX - Raw schoolSettings response:', schoolSettingsResponse);
      let schoolSettings = Array.isArray(schoolSettingsResponse) ? schoolSettingsResponse : (schoolSettingsResponse && Array.isArray(schoolSettingsResponse.data) ? schoolSettingsResponse.data : []);
      
      // If no settings exist, create default settings
      if (!schoolSettings || schoolSettings.length === 0) {
        console.log('INSTALLMENTS.TSX - No settings found, creating defaults');
        const defaultSettings = {
          schoolId: user?.schoolId || '',
          schoolName: '',
          schoolEmail: '',
          schoolPhone: '',
          schoolAddress: '',
          schoolLogo: '',
          defaultInstallments: 4,
          feeCategories: ['رسوم دراسية', 'رسوم كتب', 'رسوم نشاطات', 'رسوم أخرى'],
          receiptNumberFormat: 'REC-{YYYY}-{MM}-{COUNTER}',
          installmentReceiptFormat: 'INST-{YYYY}-{MM}-{COUNTER}',
          receiptCounter: 1,
          installmentReceiptCounter: 1,
          showWatermark: true
        };
        
        try {
          await hybridApi.updateSettings(user?.schoolId || '', defaultSettings);
          schoolSettings = [defaultSettings];
        } catch (error) {
          console.error('Error creating default settings:', error);
          schoolSettings = [defaultSettings];
        }
      }
      
      // Prepare Supabase settings object and reserve receipt number atomically
      const settings = (Array.isArray(schoolSettings) ? schoolSettings[0] : schoolSettings) || {};
      
      let receiptNumber = installment.receiptNumber;
      
      if (!receiptNumber) {
        try {
          // Reserve receipt number atomically to prevent duplicates
          const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'installment', 1);
          receiptNumber = reservedNumbers[0];
          console.log('Reserved receipt number for installment:', receiptNumber);
        } catch (error) {
          console.error('Error reserving receipt number, falling back to direct generation:', error);
          // Fallback to direct generation if reservation fails
          receiptNumber = generateReceiptNumber(settings, student.studentId, undefined, 'installment');
          console.log('Using fallback receipt number for installment:', receiptNumber);
        }
      }

      // Save the receipt number back to the installment if it's not already there
      // @ts-ignore - The receiptNumber property is defined in the interface but TypeScript doesn't recognize it
      if (!installment.receiptNumber && receiptNumber) {
        // @ts-ignore - Add receiptNumber to installment
        await hybridApi.saveInstallment({
          ...installment,
          receiptNumber: receiptNumber
        } as Installment);
        
        // Also save it to the parent fee for consistency
        if (fee) {
          // @ts-ignore - The receiptNumber property may exist on Fee
          if (!fee.receiptNumber) {
            // @ts-ignore - Add receiptNumber to fee
            await hybridApi.saveFee({
              ...fee,
              studentId: installment.studentId, // Add student_id for database constraint
              schoolId: user?.schoolId, // Add school_id for RLS policy
              receiptNumber: receiptNumber
            } as Fee);
          }
        }
      }
      
      // Settings already prepared above
      console.log('INSTALLMENTS.TSX - Extracted settings object:', settings);
      console.log('INSTALLMENTS.TSX - Settings school fields:', {
        name: settings.name,
        schoolName: settings.schoolName,
        englishName: settings.englishName,
        schoolNameEnglish: settings.schoolNameEnglish,
        logo: settings.logo,
        schoolLogo: settings.schoolLogo,
        phone: settings.phone,
        schoolPhone: settings.schoolPhone,
        email: settings.email,
        schoolEmail: settings.schoolEmail
      });
      
      // Calculate remaining tuition and transportation amounts for the student
      const { remainingTuitionAmount, remainingTransportationAmount } = await calculateRemainingAmounts(installment.studentId);
      
      // Prepare receipt data
      const receiptData = {
        receiptNumber,
        date: formatDate(new Date().toISOString()),
        studentName: student.name,
        englishName: student.englishName || student.name, // Add English name for English receipts
        studentId: student.studentId, // Use formatted student ID instead of UUID
        grade: student.grade,
        englishGrade: student.englishGrade || student.grade, // Add English grade for English receipts
        feeType: getFeeTypeLabel(installment.feeType),
        amount: installment.paidAmount || installment.amount, // Use paid amount for installment receipts
        totalAmount: installment.amount, // Total installment amount
        paidAmount: installment.paidAmount || installment.amount, // Amount actually paid
        schoolName: settings.name || settings.schoolName || '',
        englishSchoolName: settings.englishName || settings.schoolNameEnglish || '',
        schoolLogo: settings.logo || settings.schoolLogo || '',
        schoolPhone: settings.phone || settings.schoolPhone || '',
        schoolPhoneWhatsapp: settings.phoneWhatsapp || settings.schoolPhoneWhatsapp || '',
        schoolPhoneCall: settings.phoneCall || settings.schoolPhoneCall || '',
        schoolEmail: settings.email || settings.schoolEmail || '',
        // Receipt visual settings sourced from Supabase school settings
        showWatermark: settings.showReceiptWatermark !== undefined ? settings.showReceiptWatermark : true,
        showLogoBackgroundOnReceipt: settings.showLogoBackgroundOnReceipt !== undefined ? settings.showLogoBackgroundOnReceipt : (settings.showLogoBackground !== undefined ? settings.showLogoBackground : true),
        showSignatureOnInstallmentReceipt: settings.showSignatureOnInstallmentReceipt !== undefined ? settings.showSignatureOnInstallmentReceipt : (settings.showSignatureOnReceipt !== undefined ? settings.showSignatureOnReceipt : true),
        // Maintain generic showSignature for components that expect it
        showSignature: settings.showSignatureOnReceipt !== undefined ? settings.showSignatureOnReceipt : true,
        paymentMethod: installment.paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other' || 'cash',
        paymentNote: installment.paymentNote || '',
        checkNumber: installment.checkNumber || '',
        // Add calculated remaining amounts
        remainingTuitionAmount,
        remainingTransportationAmount,
        installmentNumber: getInstallmentNumber(installment).toString(),
        installmentMonth: installment.installmentMonth ? `شهر ${installment.installmentMonth}` : '',
        installmentDetails: (() => {
          // Always show installment number even if installmentCount is not available
          const installmentNumber = getInstallmentNumber(installment);
          const totalInstallments = installment.installmentCount || installments.filter(inst => 
            inst.studentId === installment.studentId && 
            inst.feeType === installment.feeType
          ).length;
          
          let details = '';
          if (installment.installmentMonth) {
            details += `قسط شهر ${installment.installmentMonth} `;
          }
          
          // Always add the installment number format
          details += `(القسط رقم ${installmentNumber}`;
          if (totalInstallments > 1) {
            details += ` من ${totalInstallments}`;
          }
          details += ')';
          
          return details;
        })(),
        // Include all receipt-related settings from schoolSettings
        schoolSettings: {
          // Include all original settings
          ...settings,
          // Make sure receipt number settings are included
          installmentReceiptNumberFormat: settings.installmentReceiptNumberFormat,
          installmentReceiptNumberPrefix: settings.installmentReceiptNumberPrefix,
          installmentReceiptNumberCounter: settings.installmentReceiptNumberCounter,
          // Regular fee receipt settings
          receiptNumberFormat: settings.receiptNumberFormat,
          receiptNumberPrefix: settings.receiptNumberPrefix,
          receiptNumberCounter: settings.receiptNumberCounter
        }
      };
      
      console.log('INSTALLMENTS.TSX - Final receiptData being sent to PDF:', receiptData);
      console.log('INSTALLMENTS.TSX - Final receiptData school fields:', {
        schoolName: receiptData.schoolName,
        englishSchoolName: receiptData.englishSchoolName,
        schoolLogo: receiptData.schoolLogo,
        schoolPhone: receiptData.schoolPhone,
        schoolPhoneWhatsapp: receiptData.schoolPhoneWhatsapp,
        schoolPhoneCall: receiptData.schoolPhoneCall,
        schoolEmail: receiptData.schoolEmail
      });
      
      // Use the new installment-specific receipt function
      await pdfPrinter.downloadInstallmentReceiptAsPDF(receiptData);
      
      // Note: Receipt counter increment will be handled by hybridApi in the future
    } catch (error) {
      console.error('Error downloading receipt:', error);
      setAlertMessage('حدث خطأ أثناء تنزيل الإيصال');
      setAlertOpen(true);
    }
  };

  const handleSendReminder = async (id: string) => {
    try {
      const installment = await hybridApi.getInstallmentById(id);
      if (!installment) return;
      
      // Get student to get the phone number
      const studentResponse = await hybridApi.getStudent(installment.studentId);
        const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!student) {
        setAlertMessage('لم يتم العثور على بيانات الطالب');
        setAlertOpen(true);
        return;
      }

      // Get available templates
      const templates = await hybridApi.getTemplates(user?.schoolId);
      
      // Create default template if none exists
      if (!templates || templates.length === 0) {
        const defaultTemplate = {
          id: 'default',
          schoolId: user?.schoolId || '',
          name: 'تذكير بالقسط',
          content: `نفيدكم بأن القسط المستحق على الطالب {studentName} بمبلغ {amount} ${CURRENCY_SYMBOL} مستحقة بتاريخ {dueDate}، نرجو دفع المستحقات في اقرب فرصة ممكنة.`
        };
        await hybridApi.saveTemplate(defaultTemplate);
      }

      // Show template selection dialog
      setSelectedInstallmentId(id);
      setShowTemplateDialog(true);
      
    } catch (error) {
      console.error('Error preparing reminder:', error);
      setAlertMessage('حدث خطأ أثناء إعداد التذكير');
      setAlertOpen(true);
    }
  };
  
  const handleExportInstallments = async () => {
    try {
      // Generate CSV content with color coding for Excel
      const csvContent = await exportInstallmentsToCSV(user?.schoolId || '');
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'قائمة_الأقساط_ملونة.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // No alert needed - remove success message popup
    } catch (error) {
      console.error('Error exporting installments:', error);
      setAlertMessage('حدث خطأ أثناء تصدير الأقساط');
      setAlertOpen(true);
    }
  };
  
  const handleImportSuccess = (result: {studentsCount: number; feesCount: number; installmentsCount?: number}) => {
    setImportResult(result);
    console.log('Import successful, refreshing data:', result);
    
    // Close the import dialog
    setImportDialogOpen(false);
    
    // Show a notification to the user
    if (result.installmentsCount && result.installmentsCount > 0) {
      setAlertMessage(`تم استيراد ${result.installmentsCount} قسط بنجاح`);
      setAlertOpen(true);
    }
    
    // Force refresh data with multiple attempts
    fetchInstallments();
    
    // Schedule additional refreshes with delays to ensure data is loaded
    setTimeout(() => {
      fetchInstallments();
      
      setTimeout(() => {
        fetchInstallments();
      }, 500);
    }, 300);
  };

  // Print student financial report
  const handlePrintStudentReport = async (studentId: string) => {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) {
        setAlertMessage('لم يتم العثور على الطالب');
        setAlertOpen(true);
        return;
      }
      
      // Get the student data to retrieve the assigned studentId
      const studentResponse = await hybridApi.getStudent(studentId);
        const studentData = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!studentData) {
        setAlertMessage("لم يتم العثور على بيانات الطالب");
        setAlertOpen(true);
        return;
      }
      
      // Get all installments for this student with proper details
      const studentInstallments = await Promise.all(
        student.installments.map(async installment => {
          // Get the full installment details
          const installmentResponse = await hybridApi.getInstallmentById(installment.id);
          const fullInstallment = (installmentResponse?.success && installmentResponse?.data) ? installmentResponse.data : installment;
          return fullInstallment;
        })
      );
      
      // Get school settings
       const schoolSettings = await hybridApi.getSettings(user?.schoolId || '');
       
       toast.loading('جاري إنشاء التقرير...', { id: 'student-report' });
      
      // Prepare data for installments report
      const reportData = {
        studentName: student.name,
        studentId: studentData.studentId, // Use the assigned student ID, not the UUID
        grade: student.grade,
        installments: studentInstallments,
        academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        schoolName: schoolSettings.name || '',
        schoolLogo: schoolSettings.logo,
        schoolPhone: schoolSettings.phone,
        schoolPhoneWhatsapp: schoolSettings.phoneWhatsapp,
        schoolPhoneCall: schoolSettings.phoneCall,
        schoolEmail: schoolSettings.email,
        showWatermark: schoolSettings.showStudentReportWatermark,
        showLogoBackground: schoolSettings.showLogoBackground,


        signature: (schoolSettings as any).signature || '',
        showSignature: (schoolSettings as any).showSignatureOnStudentReport || false,
        showFooter: false // Always hide footer
      };
      
      // Print the installments report
      pdfPrinter.printStudentInstallmentsReport(reportData);
      toast.success('تم فتح نافذة التقرير بنجاح', { id: 'student-report' });
    } catch (error) {
      console.error('Error generating student report:', error);
      setAlertMessage(`فشل إنشاء التقرير: ${error instanceof Error ? error.message : String(error)}`);
      setAlertOpen(true);
    }
  };

  // Handle PDF export for student report
  const handleExportStudentReportPDF = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      setAlertMessage('لم يتم العثور على الطالب');
      setAlertOpen(true);
      return;
    }
    
    try {
      // Get the student data to retrieve the assigned studentId
      const studentResponse = await hybridApi.getStudent(studentId);
        const studentData = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!studentData) {
        setAlertMessage("لم يتم العثور على بيانات الطالب");
        setAlertOpen(true);
        return;
      }
      
      // Get all installments for this student with proper details
      const studentInstallments = await Promise.all(
        student.installments.map(async installment => {
          // Get the full installment details
          const installmentResponse = await hybridApi.getInstallmentById(installment.id);
          const fullInstallment = (installmentResponse?.success && installmentResponse?.data) ? installmentResponse.data : installment;
          return fullInstallment;
        })
      );
      
      if (studentInstallments.length === 0) {
        setAlertMessage('لا يوجد أقساط لهذا الطالب');
        setAlertOpen(true);
        return;
      }
      
      // Get school settings
      const settingsResponse = await hybridApi.getSettings(user?.schoolId);
      const schoolSettings = settingsResponse?.success && settingsResponse?.data && settingsResponse.data.length > 0 ? settingsResponse.data[0] : {};
    
    // Prepare data for installments report
    const reportData = {
      studentName: student.name,
      studentNameEn: studentData.englishName || '',
      studentId: studentData.studentId, // Use the assigned student ID, not the UUID
      grade: student.grade,
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      installments: studentInstallments,
      schoolName: schoolSettings.name || '',
      schoolLogo: schoolSettings.logo,
      schoolPhone: schoolSettings.phone,
      schoolPhoneWhatsapp: schoolSettings.phoneWhatsapp,
      schoolPhoneCall: schoolSettings.phoneCall,
      schoolEmail: schoolSettings.email,
      showWatermark: schoolSettings.showStudentReportWatermark,
      showLogoBackground: true, // Always show logo as watermark
      
      
      signature: (schoolSettings as any).signature || '',
      showSignature: (schoolSettings as any).showSignatureOnReceipt || false,
      showFooter: false // Always hide footer
    };
    
    toast.loading('جاري تصدير التقرير...', { id: 'pdf-export' });
    
      exportStudentInstallmentsReportAsPDF(reportData)
        .then((result) => {
          if (result.success) {
            toast.success('تم تصدير التقرير بنجاح', { id: 'pdf-export' });
          } else {
            setAlertMessage(`فشل تصدير التقرير: ${result.error || 'خطأ غير معروف'}`);
            setAlertOpen(true);
          }
        })
        .catch((error: unknown) => {
          console.error('Error exporting PDF:', error);
          setAlertMessage(`فشل تصدير التقرير: ${error instanceof Error ? error.message : String(error)}`);
          setAlertOpen(true);
        });
    } catch (error) {
      console.error('Error preparing student report:', error);
      setAlertMessage(`فشل إعداد التقرير: ${error instanceof Error ? error.message : String(error)}`);
      setAlertOpen(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get unique grades for filter
  const grades = ['all', ...Array.from(new Set(students.map((student) => student.grade)))];

  const toggleSelectInstallment = (installmentId: string) => {
    setSelectedInstallments(prev => ({
      ...prev,
      [installmentId]: !prev[installmentId]
    }));
  };

  const toggleSelectAllInstallments = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const isAllSelected = selectAllChecked[studentId] || false;
    const newSelectAllChecked = {
      ...selectAllChecked,
      [studentId]: !isAllSelected
    };
    setSelectAllChecked(newSelectAllChecked);

    // Get all unpaid installments for this student
    const unpaidInstallments = student.installments.filter(i => !i.paidDate);
    const newSelectedInstallments = { ...selectedInstallments };

    unpaidInstallments.forEach(installment => {
      newSelectedInstallments[installment.id] = !isAllSelected;
    });

    setSelectedInstallments(newSelectedInstallments);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف جميع أقساط هذا الطالب؟')) return;
    
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) {
        setAlertMessage('لم يتم العثور على الطالب');
        setAlertOpen(true);
        return;
      }
      
      // Delete all installments for this student
      const deletePromises = student.installments.map(installment => 
        hybridApi.deleteInstallment(installment.id)
      );
      
      await Promise.all(deletePromises);
      
      // Refresh data after deletion
      await fetchInstallments();
      
    } catch (error) {
      console.error('Error deleting student installments:', error);
      setAlertMessage('حدث خطأ أثناء حذف أقساط الطالب');
      setAlertOpen(true);
    }
  };

  const handlePaySelectedInstallments = async () => {
    const selectedIds = Object.keys(selectedInstallments).filter(id => selectedInstallments[id]);
    if (selectedIds.length === 0) {
      setAlertMessage('الرجاء اختيار قسط واحد على الأقل');
      setAlertOpen(true);
      return;
    }

    if (!window.confirm(`هل أنت متأكد من تحديث ${selectedIds.length} قسط كمدفوع؟`)) return;

    try {
      // Mark all selected installments as paid
      for (const id of selectedIds) {
        const installment = await hybridApi.getInstallmentById(id);
        if (!installment) continue;
        
        // Update the installment
        await hybridApi.saveInstallment({
          ...installment,
          paidDate: new Date().toISOString().split('T')[0],
          status: 'paid'
        });
        
        // Update the parent fee
        const feeResponse = await hybridApi.getFeeById(installment.feeId);
        if (feeResponse.success && feeResponse.data) {
          const fee = feeResponse.data;
          // Get all installments for this fee
          const allInstallments = await hybridApi.getInstallments(user?.schoolId, undefined, installment.feeId);
          
          // Calculate total paid amount
          const totalPaid = allInstallments.reduce((sum: number, inst: Installment) => {
            if (inst.paidDate || selectedIds.includes(inst.id)) {
              return sum + inst.amount;
            }
            return sum;
          }, 0);
          
          // Calculate remaining amount after discount
          const totalAmount = fee.amount - fee.discount;
          const remainingAmount = Math.max(0, totalAmount - totalPaid);
          
          // Update fee status
          let updatedStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
          if (remainingAmount <= 0) {
            updatedStatus = 'paid';
          } else if (totalPaid > 0) {
            updatedStatus = 'partial';
          }
          
          // Save the updated fee
          await hybridApi.saveFee({
            ...fee,
            studentId: fee.studentId, // Add student_id for database constraint
            schoolId: user?.schoolId, // Add school_id for RLS policy
            paid: Math.min(totalPaid, totalAmount),
            balance: remainingAmount,
            status: updatedStatus,
            paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
            paymentNote: paymentNote
          });
        }
      }

      // Clear selection
      setSelectedInstallments({});
      setSelectAllChecked({});
      
      // Refresh data
      await fetchInstallments();
      
      setAlertMessage(`تم تحديث ${selectedIds.length} قسط كمدفوع بنجاح`);
      setAlertOpen(true);
    } catch (error) {
      console.error('Error marking installments as paid:', error);
      setAlertMessage('حدث خطأ أثناء تحديث الأقساط كمدفوعة');
      setAlertOpen(true);
    }
  };

  const handleCustomPayment = async (id: string) => {
    const installment = await hybridApi.getInstallmentById(id);
    if (!installment) return;
    
    setSelectedInstallmentId(id);
    setCustomAmount(installment.amount);
    setPaymentMethod('cash');
    setPaymentNote('');
    setCheckNumber('');
    setShowCustomPayment(true);
  };

  const handleCustomPaymentSubmit = () => {
    if (selectedInstallmentId && customAmount > 0) {
      handleMarkAsPaid(selectedInstallmentId, customAmount);
      setShowCustomPayment(false);
      setSelectedInstallmentId(null);
      setCustomAmount(0);
      setPaymentMethod('cash');
      setPaymentNote('');
      setCheckNumber('');
    }
  };

  // Update the handleDeleteInstallment function
  const handleDeleteInstallment = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسط؟')) return;
    
    try {
      // Get the installment first to check if it exists
      const installment = await hybridApi.getInstallmentById(id);
      if (!installment) {
        setAlertMessage('لم يتم العثور على القسط');
        setAlertOpen(true);
        return;
      }

      // Delete the installment
      await hybridApi.deleteInstallment(id);
      
      // Refresh data
      await fetchInstallments();
      
    } catch (error) {
      console.error('Error deleting installment:', error);
      setAlertMessage('حدث خطأ أثناء حذف القسط');
      setAlertOpen(true);
    }
  };

  // Add a function to get the correct month name from a date
  const getMonthNameFromDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      
      return monthNames[date.getMonth()];
    } catch (error) {
      console.error('Error getting month name from date:', error);
      return '-';
    }
  };

  // Add template handling functions
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleSendTemplate = async () => {
    if (!selectedInstallmentId) return;
    
    try {
      const installment = await hybridApi.getInstallmentById(selectedInstallmentId);
      if (!installment) return;
      
      const studentResponse = await hybridApi.getStudent(installment.studentId);
        const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      if (!student) return;

      let message = '';
      if (selectedTemplate === 'custom') {
        message = customTemplate;
      } else {
        const templatesResponse = await hybridApi.getTemplates(user?.schoolId);
        const templates = templatesResponse?.success && templatesResponse?.data ? templatesResponse.data : [];
        const template = templates.find(t => t.id === selectedTemplate);
        if (!template) return;
        message = template.content;
      }

      // Replace template variables
      message = message
        .replace(/{studentName}/g, installment.studentName)
        .replace(/{amount}/g, installment.amount.toString())
        .replace(/{currency}/g, CURRENCY_SYMBOL)
        .replace(/{dueDate}/g, formatDate(installment.dueDate))
        .replace(/{grade}/g, installment.grade || '')
        .replace(/{feeType}/g, getFeeTypeLabel(installment.feeType));

      // Send WhatsApp message
      const encodedMessage = encodeURIComponent(message);
      const phone = student.phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');

      // Save message to history
      await hybridApi.saveMessage({
        id: '',
        studentId: installment.studentId,
        studentName: installment.studentName,
        grade: installment.grade,
        parentName: student.parentName,
        phone: student.phone,
        template: selectedTemplate === 'custom' ? 'قالب مخصص' : selectedTemplate,
        message,
        sentAt: new Date().toISOString(),
        status: 'delivered',
        schoolId: user?.schoolId || ''
      });

      setShowTemplateDialog(false);
      setSelectedTemplate('');
      setCustomTemplate('');
      setSelectedInstallmentId(null);
      
      setAlertMessage(`تم إرسال تذكير عبر الواتساب للطالب ${installment.studentName}`);
      setAlertOpen(true);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      setAlertMessage('حدث خطأ أثناء إرسال الرسالة');
      setAlertOpen(true);
    }
  };

  // Get all available months from installments
  const getAvailableMonths = (): string[] => {
    // Define all months in Arabic calendar order
    const allMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    // Create a set to track which months have installments
    const monthsWithInstallments = new Set<string>();
    
    students.forEach(student => {
      student.installments.forEach(inst => {
        if (inst.installmentMonth) {
          monthsWithInstallments.add(inst.installmentMonth);
        } else {
          // If installmentMonth is not set, try to determine it from the due date
          try {
            const dueDate = new Date(inst.dueDate);
            const month = allMonths[dueDate.getMonth()];
            monthsWithInstallments.add(month);
          } catch (e) {
            console.error('Error parsing due date for installment month:', e);
          }
        }
      });
    });
    
    // Return all months, always showing all 12 months
    return allMonths;
  };

  /**
   * Export installments report as PDF using Electron's printToPDF
   * This function collects filtered installments data and generates an HTML report
   * which is then converted to PDF using Electron's native printToPDF functionality
   */
  const exportInstallmentsReportAsPDF = async () => {
    try {
      setIsExporting(true);
      toast.loading('جاري إنشاء ملف PDF...', { id: 'pdf-export' });
      
      // Get all installments that match the current filters
      let filteredInstallments: Installment[] = [];
      filteredStudents.forEach(student => {
        filteredInstallments = [...filteredInstallments, ...student.installments];
      });
      
      // Apply additional status filter directly to installments if a specific status is selected
      if (selectedStatus !== 'all') {
        filteredInstallments = filteredInstallments.filter(inst => {
          if (selectedStatus === 'paid') {
            return inst.status === 'paid';
          } else if (selectedStatus === 'unpaid') {
            return inst.status === 'unpaid' || inst.status === 'upcoming';
          } else if (selectedStatus === 'overdue') {
            return inst.status === 'overdue';
          } else if (selectedStatus === 'partial') {
            return inst.status === 'partial';
          }
          return true;
        });
      }
      
      if (filteredInstallments.length === 0) {
        toast.error('لا توجد أقساط مطابقة للفلاتر المحددة', { id: 'pdf-export' });
        setIsExporting(false);
        return;
      }
      
      // Format the report title based on filters
      let reportTitle = 'تقرير الأقساط';
      if (selectedMonth !== 'all') {
        reportTitle += ` - شهر ${selectedMonth}`;
      }
      
      if (selectedStatus !== 'all') {
        const statusLabels: Record<string, string> = {
          'paid': 'المدفوعة',
          'unpaid': 'غير المدفوعة',
          'overdue': 'المتأخرة',
          'partial': 'المدفوعة جزئياً'
        };
        reportTitle += ` - ${statusLabels[selectedStatus] || ''}`;
      }
      
      if (selectedGrade !== 'all') {
        reportTitle += ` - ${selectedGrade}`;
      }
      
      // Get school settings for footer information
      const settingsResponse = await hybridApi.getSettings(user?.schoolId);
      const schoolSettings = settingsResponse?.success && settingsResponse?.data && settingsResponse.data.length > 0 ? settingsResponse.data[0] : {};
      
      // Get all fees for discount calculations
      const feesResponse = await hybridApi.getFees(user?.schoolId);
      const fees = feesResponse?.success && feesResponse?.data ? feesResponse.data : [];
      
      // Generate HTML for the report
      const reportHtml = generateInstallmentsReportHTML({
        title: reportTitle,
        installments: filteredInstallments,
        fees: fees,
        schoolName: schoolSettings.name || user?.schoolName || '',
        date: new Date().toLocaleDateString('en-GB'),
        filters: {
          month: selectedMonth !== 'all' ? selectedMonth : 'الكل',
          status: selectedStatus !== 'all' ? getStatusLabel(selectedStatus) : 'الكل',
          grade: selectedGrade !== 'all' ? selectedGrade : 'الكل'
        },
        schoolInfo: {
          email: schoolSettings.email || '',
          phone: schoolSettings.phone || '',
          phoneWhatsapp: schoolSettings.phoneWhatsapp || '',
          phoneCall: schoolSettings.phoneCall || '',
          logo: schoolSettings.logo || user?.schoolLogo || '',
          showLogoBackground: schoolSettings.showLogoBackground,
  
   
          signature: (schoolSettings as any).signature || '',
          showSignature: (schoolSettings as any).showSignatureOnReceipt || false,
          showFooter: false // Always hide footer
        }
      });
      
      // Use Electron's PDF save dialog if available
      if (window.electronAPI?.generatePDF) {
        const fileName = `${reportTitle.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
        const result = await window.electronAPI.generatePDF(reportHtml, fileName, {
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: {
            top: '10mm',
            bottom: '10mm',
            left: '10mm',
            right: '10mm'
          },
          displayHeaderFooter: false,
          preferCSSPageSize: true
        });
        if (result.success) {
          toast.success('تم تنزيل ملف PDF بنجاح', { id: 'pdf-export' });
        } else if (result.canceled) {
          toast('تم إلغاء حفظ ملف PDF', { id: 'pdf-export' });
        } else {
          toast.error('فشل إنشاء ملف PDF: ' + (result.error || 'خطأ غير معروف'), { id: 'pdf-export' });
        }
        setIsExporting(false);
        return;
      }
      
      // Fallback to direct browser printing if Electron is not available
      toast.error('هذه الميزة متاحة فقط في تطبيق سطح المكتب (Electron).', { id: 'pdf-export' });
      setIsExporting(false);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      toast.error(`فشل إنشاء ملف PDF: ${error instanceof Error ? error.message : String(error)}`, { id: 'pdf-export' });
      setIsExporting(false);
    }
  };

  /**
   * Generate and display monthly installments report in a new window
   * This provides an HTML preview that users can print directly from the browser
   */
  const generateMonthlyInstallmentsReport = async () => {
    try {
      toast.loading('جاري إنشاء التقرير...', { id: 'installments-report' });
      
      // Get all installments that match the current filters
      let filteredInstallments: Installment[] = [];
      filteredStudents.forEach(student => {
        filteredInstallments = [...filteredInstallments, ...student.installments];
      });
      
      // Apply additional status filter directly to installments if a specific status is selected
      if (selectedStatus !== 'all') {
        filteredInstallments = filteredInstallments.filter(inst => {
          if (selectedStatus === 'paid') {
            return inst.status === 'paid';
          } else if (selectedStatus === 'unpaid') {
            return inst.status === 'unpaid' || inst.status === 'upcoming';
          } else if (selectedStatus === 'overdue') {
            return inst.status === 'overdue';
          } else if (selectedStatus === 'partial') {
            return inst.status === 'partial';
          }
          return true;
        });
      }
      
      if (filteredInstallments.length === 0) {
        toast.error('لا توجد أقساط مطابقة للفلاتر المحددة', { id: 'installments-report' });
        return;
      }
      
      // Format the report title based on filters
      let reportTitle = 'تقرير الأقساط';
      if (selectedMonth !== 'all') {
        reportTitle += ` - شهر ${selectedMonth}`;
      }
      
      if (selectedStatus !== 'all') {
        const statusLabels: Record<string, string> = {
          'paid': 'المدفوعة',
          'unpaid': 'غير المدفوعة',
          'overdue': 'المتأخرة',
          'partial': 'المدفوعة جزئياً'
        };
        reportTitle += ` - ${statusLabels[selectedStatus] || ''}`;
      }
      
      if (selectedGrade !== 'all') {
        reportTitle += ` - ${selectedGrade}`;
      }
      
      // Get school settings for footer information
      const settingsResponse = await hybridApi.getSettings(user?.schoolId);
      const schoolSettings = settingsResponse?.success && settingsResponse?.data && settingsResponse.data.length > 0 ? settingsResponse.data[0] : {};
      
      // Get all fees for discount calculations
      const feesResponse = await hybridApi.getFees(user?.schoolId);
      const fees = feesResponse?.success && feesResponse?.data ? feesResponse.data : [];

      // Generate HTML for report (using the same function as PDF export)
      const reportData: InstallmentsReportData = {
        title: reportTitle,
        installments: filteredInstallments,
        fees: fees,
        schoolName: schoolSettings.name || user?.schoolName || '',
        date: new Date().toLocaleDateString('en-GB'),
        filters: {
          month: selectedMonth !== 'all' ? selectedMonth : 'الكل',
          status: selectedStatus !== 'all' ? getStatusLabel(selectedStatus) : 'الكل',
          grade: selectedGrade !== 'all' ? selectedGrade : 'الكل'
        },
        schoolInfo: {
          email: schoolSettings.email || '',
          phone: schoolSettings.phone || '',
          phoneWhatsapp: schoolSettings.phoneWhatsapp || '',
          phoneCall: schoolSettings.phoneCall || '',
          logo: schoolSettings.logo || user?.schoolLogo || '',
          showLogoBackground: schoolSettings.showLogoBackground,
  
          
          signature: (schoolSettings as any).signature || '',
          showSignature: (schoolSettings as any).showSignatureOnReceipt || false,
          showFooter: false // Always hide footer
        }
      };
      
      const html = generateInstallmentsReportHTML(reportData);
      
      // Add custom CSS for screen display only (not affecting PDF export)
      const customStyles = `
        <style>
          /* Override A4 sizing for screen display only */
          @media screen {
            @page {
              size: auto !important;
            }
            
            html, body {
              width: 100% !important;
              min-height: 100% !important;
              height: auto !important;
              overflow-x: auto !important;
              overflow-y: auto !important;
            }
            
            .report-container {
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              box-shadow: none !important;
              margin: 0 !important;
              overflow: visible !important;
            }
            
            table {
              width: 100% !important;
              table-layout: auto !important;
              font-size: 14px !important;
              border-collapse: collapse !important;
            }
            
            th, td {
              padding: 10px 8px !important;
              white-space: normal !important;
              overflow: visible !important;
            }
            
            /* Adjust column widths for better display */
            th:nth-child(1), td:nth-child(1) { width: 3% !important; min-width: 30px !important; }
            th:nth-child(2), td:nth-child(2) { width: 17% !important; min-width: 120px !important; }
            th:nth-child(3), td:nth-child(3) { width: 7% !important; min-width: 60px !important; }
            th:nth-child(4), td:nth-child(4) { width: 11% !important; min-width: 90px !important; }
            th:nth-child(5), td:nth-child(5) { width: 8% !important; min-width: 70px !important; }
            th:nth-child(6), td:nth-child(6) { width: 11% !important; min-width: 90px !important; }
            th:nth-child(7), td:nth-child(7) { width: 9% !important; min-width: 70px !important; }
            th:nth-child(8), td:nth-child(8) { width: 9% !important; min-width: 70px !important; }
            th:nth-child(9), td:nth-child(9) { 
              width: 18% !important;
              min-width: 160px !important;
              text-align: center !important;
              padding: 8px 4px !important;
            }
            
            /* Ensure status badges display correctly */
            .status {
              display: inline-block !important;
              min-width: 130px !important;
              max-width: none !important;
              width: auto !important;
              overflow: visible !important;
              white-space: nowrap !important;
              text-align: center !important;
              padding: 6px 12px !important;
              font-size: 13px !important;
            }
            
            .status-partial {
              min-width: 130px !important;
              width: auto !important;
              font-weight: bold !important;
            }
            
            /* Remove A4 size restriction */
            .report-container {
              width: auto !important;
              max-width: none !important;
              min-height: auto !important;
            }
            
            /* Make print button more prominent */
            .no-print button {
              padding: 10px 20px !important;
              font-size: 16px !important;
              margin: 20px auto !important;
              display: block !important;
              background-color: #800000 !important;
              color: white !important;
              border: none !important;
              border-radius: 4px !important;
              cursor: pointer !important;
              font-family: 'Tajawal', sans-serif !important;
            }
          }
        </style>
      `;
      
      // Insert custom styles right before the closing </head> tag
      const modifiedHtml = html.replace('</head>', `${customStyles}</head>`);
      
      // Open the report in a new window without print dialog
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(modifiedHtml);
        reportWindow.document.close();
        toast.success('تم عرض التقرير بنجاح', { id: 'installments-report' });
      } else {
        toast.error('فشل فتح نافذة التقرير. يرجى السماح بالنوافذ المنبثقة.', { id: 'installments-report' });
      }
    } catch (error) {
      console.error('Error generating HTML report:', error);
      toast.error(`فشل إنشاء التقرير: ${error instanceof Error ? error.message : String(error)}`, { id: 'installments-report' });
    }
  };

  // Define currency symbol for use in the HTML template
  const CURRENCY = CURRENCY_SYMBOL;

  // Generate HTML for installments report
  const generateInstallmentsReportHTML = (data: InstallmentsReportData): string => {
    // Sort installments by status and student name
    const sortedInstallments = [...data.installments].sort((a, b) => {
      // First sort by status
      if (a.status !== b.status) {
        // Define status priority: overdue, upcoming, partial, paid
        const statusPriority: { [key: string]: number } = {
          'overdue': 0,
          'upcoming': 1,
          'partial': 2,
          'paid': 3
        };
        return statusPriority[a.status] - statusPriority[b.status];
      }
      
      // Then sort by student name
      return a.studentName.localeCompare(b.studentName);
    });
    
    // Calculate totals
    const totalAmount = sortedInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    const totalPaid = sortedInstallments.reduce((sum, inst) => {
      if (inst.status === 'paid') {
        return sum + inst.amount;
      } else if (inst.status === 'partial' && inst.paidAmount !== undefined) {
        return sum + inst.paidAmount;
      }
      return sum;
    }, 0);
    const totalDue = totalAmount - totalPaid;
    
    // Group installments by status for summary
    const statusCounts = {
      paid: sortedInstallments.filter(inst => inst.status === 'paid').length,
      upcoming: sortedInstallments.filter(inst => inst.status === 'upcoming').length,
      overdue: sortedInstallments.filter(inst => inst.status === 'overdue').length,
      partial: sortedInstallments.filter(inst => inst.status === 'partial').length
    };
    
    // Generate HTML
    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
          
          /* CSS Reset */
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Base document styles - exact A4 sizing with safe print margins */
          @page {
            size: 210mm 297mm; /* A4 portrait */
            margin: 0 !important;
            padding: 0 !important;
          }
          
          html, body {
            width: 100% !important;
            min-height: 297mm;
            font-family: 'Tajawal', sans-serif;
            background-color: white;
            color: #333;
            direction: rtl;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden;
            position: relative;
          }
          
          /* Screen display styles */
          @media screen {
            body {
              background-color: #f8f9fa;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: flex-start;
            }
            
            .report-container {
              box-shadow: 0 0 30px rgba(0, 0, 0, 0.15);
              width: 210mm;
              max-width: 210mm;
              min-height: 297mm;
              margin: 0 auto 2rem auto;
              background-color: white;
              position: relative;
              overflow: hidden;
              page-break-after: always;
            }
          }
          
          /* Add styles for logo watermark */
          .logo-background {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            opacity: 0.15;
            z-index: 999;
            pointer-events: none;
            background-image: ${data.schoolInfo.logo ? `url('${data.schoolInfo.logo}')` : 'none'};
          }
          
          @media print {
            /* Ensure logo watermark prints correctly */
            .logo-background {
              display: block !important;
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 80% !important;
              height: 80% !important;
              opacity: 0.15 !important;
              z-index: 9999 !important;
              background-size: contain !important;
              background-position: center !important;
              background-repeat: no-repeat !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          
          .report-header {
            background: linear-gradient(135deg, #800020 0%, #A52A2A 100%);
            color: white;
            padding: 25px 0;
            text-align: center;
            position: relative;
            z-index: 20;
            width: 100% !important;
            margin: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          .report-header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: white;
          }
          
          .school-logo {
            max-width: 80px;
            max-height: 80px;
            object-fit: contain;
            margin: 0 auto 10px;
            display: block;
            background-color: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            padding: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          
          .school-contact {
            margin-top: 5px;
            font-size: 14px;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
            direction: rtl;
            width: 100%;
            box-sizing: border-box;
            padding: 0 10px;
            color: white;
          }
          
          .report-info {
            display: flex;
            justify-content: space-between;
            padding: 15px 25px;
            border-bottom: 1px solid #E2E8F0;
            background-color: #F8F9FA;
            position: relative;
            z-index: 5;
          }
          
          .filters {
            background-color: #F8F9FA;
            padding: 15px 25px;
            border-bottom: 1px solid #E2E8F0;
            position: relative;
            z-index: 5;
          }
          
          .filter-item {
            display: inline-block;
            margin-left: 20px;
            font-size: 14px;
          }
          
          .filter-label {
            font-weight: bold;
            color: #800020;
          }
          
          .summary {
            display: flex;
            justify-content: space-between;
            padding: 15px 25px;
            background-color: #F8F9FA;
            border-bottom: 1px solid #E2E8F0;
            position: relative;
            z-index: 5;
          }
          
          .summary-item {
            text-align: center;
          }
          
          .summary-value {
            font-size: 18px;
            font-weight: bold;
            color: #800020;
          }
          
          .summary-label {
            font-size: 14px;
            color: #4A5568;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse;
            position: relative;
            z-index: 5;
            table-layout: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 2px solid #800020;
          }
          
          th, td {
            padding: 12px 8px !important;
            text-align: right;
            border-bottom: 1px solid #E2E8F0;
            font-size: 15px !important;
            white-space: normal !important;
            overflow: visible !important;
            word-wrap: break-word !important;
            height: auto !important;
          }
          
          /* Column width adjustments - using percentages with min-width */
          th:nth-child(1), td:nth-child(1) { 
            width: 3% !important; 
            min-width: 30px !important;
          }
          th:nth-child(2), td:nth-child(2) { 
            width: 20% !important; 
            min-width: 160px !important;
          } /* Student name */
          th:nth-child(3), td:nth-child(3) { 
            width: 8% !important; 
            min-width: 70px !important;
          } /* Grade */
          th:nth-child(4), td:nth-child(4) { 
            width: 13% !important; 
            min-width: 100px !important;
          } /* Fee type */
          th:nth-child(5), td:nth-child(5) { 
            width: 8% !important; 
            min-width: 70px !important;
          } /* Month */
          th:nth-child(6), td:nth-child(6) { 
            width: 12% !important;
            min-width: 100px !important;
          } /* Amount */
          th:nth-child(7), td:nth-child(7) { 
            width: 10% !important;
            min-width: 80px !important;
          } /* Discount */
          th:nth-child(8), td:nth-child(8) { 
            width: 10% !important;
            min-width: 90px !important;
          } /* Due date */
          th:nth-child(9), td:nth-child(9) { 
            width: 16% !important;
            min-width: 120px !important;
          } /* Status */
          
          th {
            background: linear-gradient(135deg, #800020 0%, #A52A2A 100%);
            font-weight: bold;
            color: white;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          
          tr:nth-child(even) {
            background-color: #F8F9FA;
          }
          
          /* Status badges styled like in fees collection report */
          .status {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            min-width: 100px;
            max-width: 100%;
            overflow: visible;
            text-align: center;
          }
          
          .status-paid {
            background-color: rgba(56, 161, 105, 0.15);
            color: #276749;
            border: 1px solid rgba(56, 161, 105, 0.3);
          }
          
          .status-upcoming {
            background-color: rgba(49, 130, 206, 0.15);
            color: #2A4365;
            border: 1px solid rgba(49, 130, 206, 0.3);
          }
          
          .status-overdue {
            background-color: rgba(229, 62, 62, 0.15);
            color: #9B2C2C;
            border: 1px solid rgba(229, 62, 62, 0.3);
          }
          
          .status-partial {
            background-color: rgba(236, 201, 75, 0.15);
            color: #975A16;
            border: 1px solid rgba(236, 201, 75, 0.3);
            min-width: 120px !important;
            width: auto !important;
          }
          
          .footer {
            padding: 20px 0 !important;
            text-align: center;
            font-size: 16px;
            color: white;
            background: linear-gradient(135deg, #800020 0%, #A52A2A 100%);
            border-top: 1px solid #E2E8F0;
            position: relative;
            width: 100% !important;
            margin: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            z-index: 20;
          }
          
          .signatures {
            display: flex;
            justify-content: space-between;
            margin: 30px 40px;
            padding-bottom: 20px;
          }
          
          .signature-box {
            text-align: center;
            width: 150px;
          }
          
          .signature-line {
            border-bottom: 1px solid #333;
            margin-bottom: 5px;
            height: 40px;
          }
          
          /* Print-specific styles with enhanced compatibility */
          @media print {
            @page {
              size: 210mm 297mm; /* A4 portrait */
              margin: 0 !important;
            }
            
            html, body {
              width: 100% !important;
              height: 297mm;
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              overflow: visible !important;
            }
            
            .report-container {
              position: relative !important;
              width: 100% !important;
              min-height: 297mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              box-shadow: none !important;
              overflow: visible !important;
              page-break-inside: avoid;
            }
            
            /* Force column widths in print */
            th:nth-child(1), td:nth-child(1) { width: 3% !important; }
            th:nth-child(2), td:nth-child(2) { width: 20% !important; } /* Student name */
            th:nth-child(3), td:nth-child(3) { width: 8% !important; } /* Grade */
            th:nth-child(4), td:nth-child(4) { width: 13% !important; } /* Fee type */
            th:nth-child(5), td:nth-child(5) { width: 8% !important; } /* Month */
            th:nth-child(6), td:nth-child(6) { width: 12% !important; } /* Amount */
            th:nth-child(7), td:nth-child(7) { width: 10% !important; } /* Discount */
            th:nth-child(8), td:nth-child(8) { width: 10% !important; } /* Due date */
            th:nth-child(9), td:nth-child(9) { width: 16% !important; } /* Status */
            
            /* Ensure status badges display properly in print */
            .status {
              display: inline-block !important;
              min-width: 120px !important;
              width: 100% !important;
              overflow: visible !important;
              white-space: nowrap !important;
              text-align: center !important;
            }
            
            .status-partial {
              min-width: 120px !important;
              width: auto !important;
            }
            
            .report-header {
              background: linear-gradient(135deg, #800020 0%, #A52A2A 100%) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .report-header h1, 
            .report-header div {
              color: white !important;
            }
            
            .report-body {
              padding-bottom: 20px !important; /* Space for footer */
            }
            
            table {
              page-break-inside: auto !important;
            }
            
            tr {
              page-break-inside: avoid !important;
              page-break-after: auto !important;
            }
            
            thead {
              display: table-header-group !important;
            }
            
            tfoot {
              display: table-footer-group !important;
            }
            
            th {
              background: linear-gradient(135deg, #800020 0%, #A52A2A 100%) !important;
              color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .footer {
              position: fixed !important;
              bottom: 0 !important;
              left: 0 !important;
              width: 100% !important;
              background: linear-gradient(135deg, #800020 0%, #A52A2A 100%) !important;
              color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .footer div, 
            .footer span {
              color: white !important;
            }
            
            .no-print {
              display: none !important;
            }
            
            /* Status badges for print */
            .status-paid {
              background-color: rgba(56, 161, 105, 0.15) !important;
              color: #276749 !important;
              border: 1px solid rgba(56, 161, 105, 0.3) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .status-upcoming {
              background-color: rgba(49, 130, 206, 0.15) !important;
              color: #2A4365 !important;
              border: 1px solid rgba(49, 130, 206, 0.3) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .status-overdue {
              background-color: rgba(229, 62, 62, 0.15) !important;
              color: #9B2C2C !important;
              border: 1px solid rgba(229, 62, 62, 0.3) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .status-partial {
              background-color: rgba(236, 201, 75, 0.15) !important;
              color: #975A16 !important;
              border: 1px solid rgba(236, 201, 75, 0.3) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <!-- Add only logo watermark, without text watermark -->
            ${data.schoolInfo.logo ? `<div class="logo-background"></div>` : ''}
            
            <div class="report-header">
              ${data.schoolInfo.logo ? `<img src="${data.schoolInfo.logo}" class="school-logo" alt="${data.schoolName}" />` : ''}
              <h1>${data.title}</h1>
              <div>${data.schoolName}</div>
              <div class="school-contact">
                ${data.schoolInfo.phone ? `<div>هاتف: ${formatPhoneNumber(data.schoolInfo.phone)}</div>` : ''}
                ${data.schoolInfo.phoneWhatsapp ? `<div>واتساب: ${formatPhoneNumber(data.schoolInfo.phoneWhatsapp)}</div>` : ''}
                ${data.schoolInfo.phoneCall ? `<div>هاتف للاتصال: ${formatPhoneNumber(data.schoolInfo.phoneCall)}</div>` : ''}
                ${data.schoolInfo.email ? `<div>البريد الإلكتروني: ${data.schoolInfo.email}</div>` : ''}
              </div>
            </div>
            
            <div class="report-body">
              <div class="report-info">
                <div>تاريخ التقرير: ${data.date}</div>
                <div>عدد الأقساط: ${sortedInstallments.length}</div>
              </div>
              
              <div class="filters">
                <div class="filter-item">
                  <span class="filter-label">الشهر:</span>
                  <span>${data.filters.month}</span>
                </div>
                <div class="filter-item">
                  <span class="filter-label">الحالة:</span>
                  <span>${data.filters.status}</span>
                </div>
                <div class="filter-item">
                  <span class="filter-label">الصف:</span>
                  <span>${data.filters.grade}</span>
                </div>
              </div>
              
              <div class="summary">
                <div class="summary-item">
                  <div class="summary-value">${totalAmount.toLocaleString()} ${CURRENCY}</div>
                  <div class="summary-label">إجمالي المبلغ</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${totalPaid.toLocaleString()} ${CURRENCY}</div>
                  <div class="summary-label">إجمالي المدفوع</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${totalDue.toLocaleString()} ${CURRENCY}</div>
                  <div class="summary-label">إجمالي المستحق</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${statusCounts.paid}</div>
                  <div class="summary-label">مدفوع</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${statusCounts.upcoming}</div>
                  <div class="summary-label">غير مدفوع</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${statusCounts.overdue}</div>
                  <div class="summary-label">متأخر</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${statusCounts.partial}</div>
                  <div class="summary-label">مدفوع جزئياً</div>
                </div>
              </div>
              
              <table style="width: auto;">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم الطالب</th>
                    <th>الصف</th>
                    <th>نوع الرسوم</th>
                    <th>الشهر</th>
                    <th>المبلغ</th>
                    <th>المدفوع</th>
                    <th>الخصم</th>
                    <th>تاريخ الاستحقاق</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedInstallments.map((inst, index) => {
                    const statusClass = `status-${inst.status}`;
                    const statusLabel = getStatusLabel(inst.status);
                    // Get the fee for this installment to check for discount
                    const fee = data.fees?.find(f => f.id === inst.feeId);
                    const discount = fee?.discount || 0;
                    
                    return `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${inst.studentName}</td>
                        <td>${inst.grade}</td>
                        <td>${getFeeTypeLabel(inst.feeType)}</td>
                        <td>${inst.installmentMonth || '-'}</td>
                        <td>${Math.round(inst.amount).toLocaleString('en-US')} ${CURRENCY}</td>
                        <td>${Math.round(inst.paidAmount || 0).toLocaleString('en-US')} ${CURRENCY}</td>
                        <td>${discount > 0 ? `${Math.round(discount).toLocaleString('en-US')} ${CURRENCY}` : '-'}</td>
                        <td>${formatDate(inst.dueDate)}</td>
                        <td style="text-align:center; min-width:120px; padding:8px 4px !important;">
                          <span class="status ${statusClass}" style="min-width:120px; display:inline-block; width:auto; padding:4px 12px;">
                            ${statusLabel}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
              
              ${(data.schoolInfo.showStamp || data.schoolInfo.showSignature) ? `
              <div class="signatures">
                ${false ? `
                <div class="signature-box">
                  <img src="" alt="School Stamp" style="max-width: 100px; max-height: 100px;" />
                  <div>ختم المدرسة</div>
                </div>
                ` : ''}
                
                ${data.schoolInfo.showSignature ? `
                <div class="signature-box">
                  <div class="signature-line"></div>
                  <div>التوقيع</div>
                </div>
                ` : ''}
              </div>
              ` : ''}
            </div>
            
            <div class="no-print">
              <button onclick="window.print()" style="margin: 20px auto; display: block; padding: 8px 16px; background-color: #800000; color: white; border: none; border-radius: 4px; cursor: pointer;">
                طباعة التقرير
              </button>
            </div>
          </div>
        </body>
        </html>
    `;
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
      {/* Header Section with Buttons - Matching Fees Section Style */}
      <div className="bg-gradient-to-br from-blue-50/80 via-slate-50/60 to-gray-50/40 rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-4 space-x-reverse mb-6">
          <div className="bg-[#800000] p-3 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة الأقساط</h1>
            <p className="text-gray-600">إدارة ومتابعة أقساط الطلاب الدراسية</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-start">
          {/* View Report Button - moved next to colored buttons */}
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1 bg-[#800000] hover:bg-[#600000] text-white rounded-md transition-colors"
            onClick={generateMonthlyInstallmentsReport}
            title="عرض تقرير الأقساط المفلترة"
          >
            <Eye size={16} />
            <span>عرض التقرير</span>
          </button>
          
          <div className="dropdown relative inline-block group">
            <button
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Upload size={18} />
              <span className="font-medium">استيراد متقدم</span>
            </button>
            <div className="dropdown-menu absolute hidden group-hover:block right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
              <button
                onClick={() => setImportDialogOpen(true)}
                className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                استيراد الأقساط
              </button>
            </div>
          </div>
          <Link to="/school/installments/new" className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg">
            <Plus size={18} />
            <span className="font-medium">إضافة قسط</span>
          </Link>
          <button
            type="button"
            onClick={exportInstallmentsReportAsPDF}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
            title="تنزيل تقرير الأقساط كملف PDF"
          >
            <Download size={18} />
            <span className="font-medium">تنزيل PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportInstallments}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
            title="تصدير قائمة الأقساط كملف CSV مع التلوين"
          >
            <Download size={18} />
            <span className="font-medium">تصدير</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4 flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <span className="font-bold">عرض:</span>
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-4 py-2 ${displayMode === 'student' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setDisplayMode('student')}
            >
              حسب الطالب
            </button>
            <button
              className={`px-4 py-2 ${displayMode === 'list' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setDisplayMode('list')}
            >
              قائمة الأقساط
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters section - separate like in fees section */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-4 items-center">
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">جميع الحالات</option>
            <option value="paid">مدفوع</option>
            <option value="unpaid">غير مدفوع</option>
            <option value="overdue">متأخر</option>
            <option value="partial">مدفوع جزئياً</option>
          </select>
          
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-600" />
            <select
              className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">جميع الشهور</option>
              {getAvailableMonths().map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {user?.schoolId && (
        <ImportDialog
          isOpen={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          onSuccess={handleImportSuccess}
          templateGenerator={generateInstallmentTemplateCSV}
          templateFileName="قالب_استيراد_الأقساط.csv"
          schoolId={user.schoolId}
          importType="installments"
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
      
      {/* Student View Mode */}
      {displayMode === 'student' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <User size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-gray-800">الأقساط حسب الطالب</h2>
            </div>
            
            {filteredStudents.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-sm px-3 py-1 text-gray-600 hover:text-gray-800"
                  onClick={expandAllStudents}
                >
                  عرض الكل
                </button>
                <button
                  type="button"
                  className="text-sm px-3 py-1 text-gray-600 hover:text-gray-800"
                  onClick={collapseAllStudents}
                >
                  إخفاء الكل
                </button>
              </div>
            )}
          </div>
          
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              لا يوجد طلبة بالأقساط المحددة
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <div 
                  key={student.id} 
                  className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4"
                >
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpandStudent(student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                          <p className="text-sm text-gray-500">
                            {student.grade} - {student.studentId || ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-4 text-sm">
                          <div className="text-right">
                            <div className="text-gray-500">الإجمالي</div>
                            <div className="font-medium">{student.totalAmount.toLocaleString()} {CURRENCY}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-500">المدفوع</div>
                            <div className="font-medium text-green-600">{student.totalPaid.toLocaleString()} {CURRENCY}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-500">المتبقي</div>
                            <div className="font-medium text-red-600">{student.totalDue.toLocaleString()} {CURRENCY}</div>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-500 hover:text-red-700"
                          title="حذف أقساط الطالب"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {expandedStudents[student.id] && (
                    <div className="bg-gray-50 p-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border rounded-lg bg-white">
                          <thead className="bg-gray-100">
                            <tr>
                              <th scope="col" className="px-4 py-3 text-right">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectAllChecked[student.id] || false}
                                    onChange={() => toggleSelectAllInstallments(student.id)}
                                    className="h-4 w-4 text-primary rounded"
                                  />
                                  <span className="mr-2 text-xs font-medium text-gray-500 uppercase tracking-wider">تحديد الكل</span>
                                </div>
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                رقم القسط
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                نوع الرسوم
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                المبلغ
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                تاريخ الاستحقاق
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                شهر القسط
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                تاريخ الدفع
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الحالة
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الإجراءات
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {getSortedInstallmentsByStatus(student.installments || []).map((installment, index) => (
                              <tr key={installment.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {!installment.paidDate && (
                                    <input
                                      type="checkbox"
                                      checked={selectedInstallments[installment.id] || false}
                                      onChange={() => toggleSelectInstallment(installment.id)}
                                      className="h-4 w-4 text-primary rounded"
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-gray-500 font-medium">
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-gray-900">{getFeeTypeLabel(installment.feeType)}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-gray-900 font-medium">
                                    {Math.round(installment.amount).toLocaleString('en-US')} {CURRENCY}
                                    {installment.status === 'partial' && installment.paidAmount !== undefined && (
                                      <div className="text-green-500 text-sm">
                                        مدفوع: {Math.round(installment.paidAmount).toLocaleString('en-US')} {CURRENCY}
                                        <div className="text-red-500">
                                          متبقي: {Math.round(installment.amount - installment.paidAmount).toLocaleString('en-US')} {CURRENCY}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-gray-500">
                                    {formatDate(installment.dueDate)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-gray-500">
                                    {getMonthNameFromDate(installment.dueDate)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-gray-500">
                                    {installment.paidDate ? formatDate(installment.paidDate) : '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(installment.status)}`}>
                                    {getStatusLabel(installment.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center space-x-2 space-x-reverse">
                                    <Link
                                      to={`/school/installments/${installment.id}`}
                                      className="text-primary hover:text-primary-dark"
                                      title="تعديل"
                                    >
                                      <Edit size={16} />
                                    </Link>
                                    
                                    {installment.status !== 'paid' && (
                                      <button
                                        type="button"
                                        onClick={() => handleMarkAsPaid(installment.id)}
                                        className="text-green-600 hover:text-green-800"
                                        title="تحديد كمدفوع"
                                      >
                                        <Check size={16} />
                                      </button>
                                    )}
                                    
                                    {installment.status === 'paid' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handlePrintReceipt(installment.id)}
                                          className="text-gray-600 hover:text-gray-800"
                                          title="تنزيل الإيصال"
                                        >
                                          <Download size={16} />
                                        </button>
                                          <InstallmentEnglishReceiptButton 
                                          receiptData={{
                                            receiptNumber: installment.receiptNumber || generateReceiptNumber(settings, installment.studentId, undefined, 'installment'),
                                            date: formatDate(new Date().toISOString()),
                                            studentName: installment.studentName,
                                            englishName: installment.englishName || '',
                                            studentId: installment.studentCustomId || installment.studentId,
                                            grade: installment.grade,
                                            englishGrade: installment.englishGrade || '',
                                            feeType: getFeeTypeLabel(installment.feeType),
                                            amount: installment.amount,
                                            totalAmount: installment.amount,
                                            schoolName: settings?.name || '',
                                            englishSchoolName: settings?.englishName || '',
                                            schoolLogo: settings?.logo || '',
                                            schoolPhone: settings?.phone || '',
                                            schoolPhoneWhatsapp: settings?.phoneWhatsapp || '',
                                            schoolPhoneCall: settings?.phoneCall || '',
                                            schoolEmail: settings?.email || '',
                                            isPaid: installment.status === 'paid',
                                            status: installment.status,
                                            isPartialPayment: Boolean(installment.status && installment.status.includes('partial')),
                                            paidAmount: installment.paidAmount,
                                            installmentNumber: (() => {
                                              const allInstallments = installments.filter(inst => inst.studentId === installment.studentId && inst.feeId === installment.feeId);
                                              const sortedByDueDate = getSortedInstallments(allInstallments);
                                              const position = sortedByDueDate.findIndex(inst => inst.id === installment.id) + 1;
                                              
                                              // If it's the first installment by due date
                                              if (position === 1) {
                                                return "1"; // This will be transformed into "First Installment" or "الدفعة الأولى" in the receipt template
                                              }
                                              
                                              return position.toString();
                                            })(),
                                            installmentMonth: installment.installmentMonth || '',
                                            installmentDetails: installment.note || '',
                                            checkNumber: installment.checkNumber || '',
                                            paymentMethod: installment.paymentMethod || '',
                            paymentNote: installment.paymentNote || '',
                            remainingTuitionAmount: 0, // Will be calculated dynamically
                            remainingTransportationAmount: 0 // Will be calculated dynamically
                          }} 
                          compact={true} 
                        />
                                      </>
                                    )}
                                    
                                    {installment.status !== 'paid' && (
                                      <button
                                        type="button"
                                        onClick={() => handleSendReminder(installment.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                        title="إرسال تذكير واتساب"
                                      >
                                        <MessageSquare size={16} />
                                      </button>
                                    )}
                                    
                                    {installment.status !== 'paid' && (
                                      <button
                                        type="button"
                                        onClick={() => handleCustomPayment(installment.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                        title="دفع مبلغ مختلف"
                                      >
                                        <CreditCard size={16} className="text-yellow-500" />
                                      </button>
                                    )}
                                    
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInstallment(installment.id)}
                                      className="text-red-500 hover:text-red-700"
                                      title="حذف القسط"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-4 flex justify-between">
                        <div>
                          {Object.keys(selectedInstallments).some(id => selectedInstallments[id]) && (
                            <button
                              type="button"
                              onClick={handlePaySelectedInstallments}
                              className="btn btn-primary flex items-center gap-2 text-sm"
                            >
                              <Check size={16} />
                              <span>تحديد كمدفوع</span>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-red-500 hover:text-red-700"
                            title="حذف الرسوم والأقساط"
                          >
                            <Trash2 size={18} />
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePrintStudentReport(student.id)}
                              className="text-gray-600 hover:text-gray-800"
                              title="عرض التقرير"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportStudentReportPDF(student.id)}
                              className="text-gray-600 hover:text-gray-800 mr-2"
                              title="تنزيل PDF"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* List View Mode */}
      {displayMode === 'list' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
            <CreditCard size={20} className="text-primary" />
            <h2 className="text-xl font-bold text-gray-800">قائمة الأقساط</h2>
          </div>
          
          {installments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              لا توجد أقساط مسجلة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الطالب
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الصف
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      رقم القسط
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      نوع الرسوم
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المبلغ
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ الاستحقاق
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      شهر القسط
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ الدفع
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedInstallmentsByStatus(installments).map((installment) => {
                    // Find this installment's position within its fee's installments
                    const schoolId = user?.schoolId || '';
                    const feeInstallments = installments.filter(inst => inst.studentId === installment.studentId && inst.feeId === installment.feeId);
                    const sortedByDueDate = getSortedInstallments(feeInstallments);
                    const installmentNumber = sortedByDueDate.findIndex(i => i.id === installment.id) + 1;
                    
                    return (
                      <tr key={installment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{installment.studentName}</div>
                          <div className="text-gray-500 text-sm">
                            {installment.studentCustomId ?? installment.studentId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-500">{installment.grade}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-700 font-medium">{installmentNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-500">{getFeeTypeLabel(installment.feeType)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 font-medium">
                            {Math.round(installment.amount).toLocaleString('en-US')} {CURRENCY}
                            {installment.status === 'partial' && installment.paidAmount !== undefined && (
                              <div className="text-green-500 text-sm">
                                مدفوع: {Math.round(installment.paidAmount).toLocaleString('en-US')} {CURRENCY}
                                <div className="text-red-500">
                                  متبقي: {Math.round(installment.amount - installment.paidAmount).toLocaleString('en-US')} {CURRENCY}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-500">
                            {formatDate(installment.dueDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-500">
                            {getMonthNameFromDate(installment.dueDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-500">
                            {installment.paidDate ? formatDate(installment.paidDate) : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(installment.status)}`}>
                            {getStatusLabel(installment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium flex items-center space-x-2 space-x-reverse">
                          <Link
                            to={`/school/installments/${installment.id}`}
                            className="text-primary hover:text-primary-dark"
                            title="تعديل"
                          >
                            <Edit size={18} />
                          </Link>
                          
                          {installment.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(installment.id)}
                              className="text-green-600 hover:text-green-800"
                              title="تحديد كمدفوع"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          
                          {installment.status === 'paid' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePrintReceipt(installment.id)}
                                className="text-gray-600 hover:text-gray-800"
                                title="تنزيل الإيصال"
                              >
                                <Download size={18} />
                              </button>
                              <InstallmentEnglishReceiptButton 
                                receiptData={{
                                  receiptNumber: installment.receiptNumber || generateReceiptNumber(settings, installment.studentId, undefined, 'installment'),
                                  date: formatDate(new Date().toISOString()),
                                  studentName: installment.studentName,
                                  englishName: installment.englishName || '',
                                  studentId: installment.studentCustomId || installment.studentId,
                                  grade: installment.grade,
                                  englishGrade: installment.englishGrade || '',
                                  feeType: getFeeTypeLabel(installment.feeType),
                                  amount: installment.amount,
                                  totalAmount: installment.amount,
                                  schoolName: settings?.name || '',
                                  englishSchoolName: settings?.englishName || '',
                                  schoolLogo: settings?.logo || '',
                                  schoolPhone: settings?.phone || '',
                                  schoolPhoneWhatsapp: settings?.phoneWhatsapp || '',
                                  schoolPhoneCall: settings?.phoneCall || '',
                                  schoolEmail: settings?.email || '',
                                  isPaid: installment.status === 'paid',
                                  status: installment.status,
                                  isPartialPayment: Boolean(installment.status && installment.status.includes('partial')),
                                  paidAmount: installment.paidAmount,
                                  installmentNumber: installmentNumber.toString(),
                                  installmentMonth: installment.installmentMonth ? `شهر ${installment.installmentMonth}` : '',
                                  installmentDetails: installment.note || '',
                                  checkNumber: installment.checkNumber || '',
                                  paymentMethod: installment.paymentMethod || '',
                                  paymentNote: installment.paymentNote || ''
                                }} 
                                compact={true} 
                              />
                            </>
                          )}
                          
                          {installment.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => handleSendReminder(installment.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="إرسال تذكير واتساب"
                            >
                              <MessageSquare size={18} />
                            </button>
                          )}
                          
                          {installment.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => handleCustomPayment(installment.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="دفع مبلغ مختلف"
                            >
                              <CreditCard size={16} className="text-yellow-500" />
                            </button>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteInstallment(installment.id)}
                            className="text-red-500 hover:text-red-700"
                            title="حذف القسط"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {showCustomPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">دفع مبلغ مختلف</h3>
            
            {selectedInstallmentId && (
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  قيمة القسط الأصلية: <span className="font-medium">{Math.round(findInstallmentById(selectedInstallmentId)?.amount || 0).toLocaleString('en-US')} {CURRENCY}</span>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ المراد دفعه
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  min="0"
                  step="0.01"
                  max={(() => {
                    const inst = findInstallmentById(selectedInstallmentId);
                    if (!inst) return undefined;
                    const alreadyPaid = inst.paidAmount || 0;
                    return inst.amount - alreadyPaid;
                  })()}
                />
                {(() => {
                  const inst = findInstallmentById(selectedInstallmentId);
                  return inst && customAmount > 0 && customAmount < (inst.amount - (inst.paidAmount || 0));
                })() && (
                  <p className="text-yellow-600 text-sm mt-1">
                    سيتم تسجيل هذا كدفع جزئي للقسط
                  </p>
                )}
                {(() => {
                  const inst = findInstallmentById(selectedInstallmentId);
                  return inst && customAmount > (inst.amount - (inst.paidAmount || 0));
                })() && (
                  <p className="text-red-600 text-sm mt-1">
                    لا يمكن دفع أكثر من المتبقي لهذا القسط
                  </p>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    طريقة الدفع
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="cash">نقداً</option>
                    <option value="visa">بطاقة ائتمان</option>
                    <option value="check">شيك</option>
                    <option value="bank-transfer">تحويل بنكي</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                {paymentMethod === 'check' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رقم الشيك
                    </label>
                    <Input
                      type="text"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      className="w-full"
                      placeholder="أدخل رقم الشيك"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات الدفع
                  </label>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={2}
                    placeholder="أدخل أي ملاحظات إضافية عن الدفع"
                  ></textarea>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomPayment(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCustomPaymentSubmit}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                disabled={customAmount <= 0}
              >
                تأكيد الدفع
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showFullPaymentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">تأكيد دفع القسط</h3>
            
            {fullPaymentInstallmentId && (
              <div className="mb-4">
                <p className="text-gray-600 mb-4">
                  أنت على وشك تسجيل دفع القسط بالكامل بقيمة: <span className="font-medium">{Math.round(findInstallmentById(fullPaymentInstallmentId)?.amount || 0).toLocaleString('en-US')} {CURRENCY}</span>
                </p>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    طريقة الدفع
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="cash">نقداً</option>
                    <option value="visa">بطاقة ائتمان</option>
                    <option value="check">شيك</option>
                    <option value="bank-transfer">تحويل بنكي</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                {paymentMethod === 'check' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رقم الشيك
                    </label>
                    <input
                      type="text"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="أدخل رقم الشيك"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات الدفع
                  </label>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={2}
                    placeholder="أدخل أي ملاحظات إضافية عن الدفع"
                  ></textarea>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFullPaymentDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleFullPaymentConfirm}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                تأكيد الدفع
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px]">
            <h3 className="text-lg font-semibold mb-4">إدارة قوالب الرسائل</h3>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  القوالب المتاحة
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    setSelectedTemplate('custom');
                    setCustomTemplate('');
                  }}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  إضافة قالب جديد
                </button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {templates.map((template: Template) => (
                  <div key={template.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.content}</div>
                    </div>
                      <button
                        type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      استخدام
                      </button>
                  </div>
                ))}
              </div>
            </div>

            {selectedTemplate && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedTemplate === 'custom' ? 'قالب جديد' : 'تعديل القالب'}
                </label>
                <input
                  type="text"
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary mb-2"
                  placeholder="اسم القالب"
                />
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={4}
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  placeholder="يمكنك استخدام المتغيرات التالية: {studentName}, {amount}, {currency}, {dueDate}, {grade}, {feeType}"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTemplateDialog(false);
                  setSelectedTemplate('');
                  setCustomTemplate('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={async () => {
                    if (customTemplate) {
                      const templateData = {
                      id: selectedTemplate === 'custom' ? uuidv4() : selectedTemplate,
                      name: customTemplate.split('\n')[0] || 'قالب جديد',
                      content: customTemplate
                    };
                    try {
                      await hybridApi.createTemplate(templateData);
                      // Refresh templates
                      const templatesResponse = await hybridApi.getTemplates(user?.schoolId);
                      if (templatesResponse?.success && templatesResponse?.data) {
                        setTemplates(templatesResponse.data);
                      }
                    } catch (error) {
                      console.error('Error saving template:', error);
                     }
                       setSelectedTemplate('');
                       setCustomTemplate('');
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  disabled={!customTemplate}
                >
                  حفظ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen} title='تنبيه' message={alertMessage} />
    </div>
  );
};

export default Installments;
 
