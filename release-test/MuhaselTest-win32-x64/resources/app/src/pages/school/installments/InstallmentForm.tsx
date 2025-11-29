import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowRight, Search, Download } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { useReportSettings } from '../../../contexts/ReportSettingsContext';
import { CURRENCY } from '../../../utils/constants';
import hybridApi from '../../../services/hybridApi';
import pdfPrinter from '../../../services/pdfPrinter';
import { generateReceiptNumber } from '../../../utils/helpers';
import { reserveReceiptNumbers } from '../../../utils/receiptCounter';
import { toast } from 'react-hot-toast';
import InstallmentArabicReceiptButton from '../../../components/payments/InstallmentArabicReceiptButton';

interface Student {
  id: string;
  name: string;
  studentId: string;
  grade: string;
  englishName?: string;
  englishGrade?: string;
}

interface Fee {
  id: string;
  feeType: string;
  amount: number;
  balance: number;
  paid: number;
  status: 'paid' | 'partial' | 'unpaid';
  paymentMethod?: string;
  checkNumber?: string;
  checkDate?: string;
  bankNameArabic?: string;
  bankNameEnglish?: string;
}

interface Installment {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
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
  paymentMethod?: 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other';
  paymentNote?: string;
  checkNumber?: string;
  receiptNumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface InstallmentFormData {
  studentId: string;
  feeId: string;
  amount: number | string;
  dueDate: string;
  note: string;
  paidDate: string | null;
  schoolId: string;
  installmentCount: number;
  flexiblePayment: boolean;
  installmentAmounts: (number | string)[];
  installmentMonth?: string;
  receiptNumber?: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB');
};

const InstallmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { settings: reportSettings } = useReportSettings();
  
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState<InstallmentFormData>({
    studentId: '',
    feeId: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    note: '',
    paidDate: null,
    schoolId: user?.schoolId || '',
    installmentCount: 1,
    flexiblePayment: false,
    installmentAmounts: [],
  });
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFees, setStudentFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [receiptData, setReceiptData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch students
        let studentsResponse;
        if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
          studentsResponse = await hybridApi.getStudents(user.schoolId, user.gradeLevels);
        } else {
          studentsResponse = await hybridApi.getStudents(user?.schoolId);
        }
        const studentsList = (studentsResponse?.success && studentsResponse?.data) ? studentsResponse.data : [];
        setStudents(studentsList);
        
        if (isEditMode && id) {
          // Fetch installment data
          const installmentResponse = await hybridApi.getInstallment(id);
          const installment = (installmentResponse?.success && installmentResponse?.data) ? installmentResponse.data : null;
          if (installment) {
            setFormData({
              studentId: installment.studentId,
              feeId: installment.feeId,
              amount: installment.amount,
              dueDate: installment.dueDate,
              note: installment.note || '',
              paidDate: installment.paidDate,
              schoolId: installment.schoolId,
              installmentCount: installment.installmentCount || 1,
              flexiblePayment: true,
              installmentAmounts: [installment.amount],
              installmentMonth: installment.installmentMonth || '',
              // Avoid direct receiptNumber reference to fix type error
              // @ts-ignore - Suppress TypeScript error for receiptNumber
              receiptNumber: (installment as any).receiptNumber
            });
            
            setIsPaid(!!installment.paidDate);
            
            // Find the student
            const student = studentsList.find(s => s.id === installment.studentId);
            if (student) {
              setSelectedStudent(student);
              
              // Fetch student fees
              const feesResponse = await hybridApi.getFees(user?.schoolId, student.id);
              const fees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
              setStudentFees(fees);
            }
          } else {
            navigate('/school/installments');
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, isEditMode, navigate, user]);

  // Fetch school settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (user?.schoolId) {
        try {
          const settingsResponse = await hybridApi.getSettings(user.schoolId);
          const schoolSettings = (settingsResponse?.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : null;
          setSettings(schoolSettings);
        } catch (error) {
          console.error('Error fetching settings:', error);
        }
      }
    };
    
    fetchSettings();
  }, [user?.schoolId]);

  // Update receipt data when relevant state changes
  useEffect(() => {
    const updateReceiptData = async () => {
      if (isEditMode && isPaid && selectedStudent) {
        try {
          const data = await generateReceiptData();
          setReceiptData(data);
        } catch (error) {
          console.error('Error generating receipt data:', error);
          setReceiptData({
            receiptNumber: '',
            date: '',
            studentName: '',
            amount: '',
            totalAmount: ''
          });
        }
      }
    };
    
    updateReceiptData();
  }, [isEditMode, isPaid, selectedStudent, formData.amount, formData.feeId, user?.schoolId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'amount') {
      const newAmount = parseFloat(value) || 0;
      setFormData(prev => {
        const newFormData = {
          ...prev,
          amount: newAmount
        };
        
        // If in edit mode or flexible payment is enabled, update the installment amounts
        if (isEditMode || prev.flexiblePayment) {
          newFormData.installmentAmounts = [newAmount];
        }
        
        return newFormData;
      });
    } else if (name === 'paid') {
      setIsPaid((e.target as HTMLInputElement).checked);
      setFormData({
        ...formData,
        paidDate: (e.target as HTMLInputElement).checked ? new Date().toISOString().split('T')[0] : null
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear any errors when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      ...formData,
      studentId: student.id,
      feeId: ''
    });
    
    // Fetch student fees
    const feesResponse = await hybridApi.getFees(user?.schoolId, student.id);
                const fees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
    setStudentFees(fees);
    
    setShowStudentSelector(false);
  };

  const handleSelectFee = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const feeId = e.target.value;
    if (feeId === 'transportation_and_tuition') {
      // Find tuition and transportation fees
      const tuitionFee = studentFees.find(fee => fee.feeType === 'tuition');
      const transportationFee = studentFees.find(fee => fee.feeType === 'transportation');
      const tuition = tuitionFee ? tuitionFee.balance : 0;
      const transportation = transportationFee ? transportationFee.balance : 0;
      setFormData(prev => ({
        ...prev,
        feeId: feeId,
        amount: tuition + transportation
      }));
      return;
    }
    setFormData({
      ...formData,
      feeId
    });
    // Set default amount from the selected fee's balance
    const selectedFee = studentFees.find(fee => fee.id === feeId);
    if (selectedFee) {
      setFormData(prev => ({
        ...prev,
        feeId,
        amount: Math.min(selectedFee.balance, selectedFee.balance)
      }));
    }
  };

  const handleInstallmentCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    
    setFormData(prev => {
      const newData = {
        ...prev,
        installmentCount: count
      };
      
      // If flexible payment is enabled, update the installment amounts array
      if (prev.flexiblePayment) {
        const equalAmount = prev.amount / count;
        newData.installmentAmounts = Array(count).fill(equalAmount);
      }
      
      return newData;
    });
    
    // Update note with new installment count
    updateInstallmentNote();
  };

  const handleFlexiblePaymentToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isFlexible = e.target.checked;
    setFormData(prev => ({
      ...prev,
      flexiblePayment: isFlexible,
      installmentAmounts: isFlexible 
        ? Array(prev.installmentCount).fill(prev.amount / prev.installmentCount)
        : []
    }));
  };

  const handleInstallmentAmountChange = (index: number, value: number) => {
    const newAmounts = [...formData.installmentAmounts];
    newAmounts[index] = value;
    
    setFormData(prev => ({
      ...prev,
      installmentAmounts: newAmounts
    }));
  };

  const filteredStudents = students.filter(
    (student) => 
      student.name.includes(searchQuery) || 
      student.studentId.includes(searchQuery)
  );

  const getFeeTypeLabel = (type: string) => {
    const feeTypes: Record<string, string> = {
      'tuition': 'رسوم دراسية',
      'transportation': 'نقل مدرسي',
      'activities': 'أنشطة',
      'uniform': 'زي مدرسي',
      'books': 'كتب',
      'other': 'رسوم أخرى',
      'transportation_and_tuition': 'رسوم مدمجة',
    };
    
    return feeTypes[type] || type;
  };

  const updateInstallmentNote = () => {
    if (!selectedStudent || !formData.feeId) return formData.note;
    
    const selectedFee = studentFees.find(fee => fee.id === formData.feeId);
    if (selectedFee) {
      return `القسط المستحق للطالب ${selectedStudent.name} من ${getFeeTypeLabel(selectedFee.feeType)} المستحق بتاريخ ${formatDate(formData.dueDate)}`;
    }
    
    return formData.note;
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedStudent) {
      newErrors.studentId = 'يجب اختيار طالب';
    }
    
    // Additional validation for studentId
    if (!formData.studentId || formData.studentId.trim() === '') {
      newErrors.studentId = 'معرف الطالب مطلوب';
    }
    
    if (!formData.feeId || formData.feeId.trim() === '') {
      newErrors.feeId = 'يجب اختيار الرسوم';
    }
    
    // Additional validation for schoolId
    if (!formData.schoolId || formData.schoolId.trim() === '') {
      newErrors.schoolId = 'معرف المدرسة مطلوب';
    }
    
    if (formData.amount <= 0) {
      newErrors.amount = 'المبلغ يجب أن يكون أكبر من صفر';
    }
    
    // Only check balance limit for new installments, not when editing
    const selectedFee = studentFees.find(fee => fee.id === formData.feeId);
    if (selectedFee && formData.amount > selectedFee.balance && !isEditMode) {
      newErrors.amount = `المبلغ لا يمكن أن يكون أكبر من الرصيد المتبقي (${selectedFee.balance} ${CURRENCY})`;
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'تاريخ الاستحقاق مطلوب';
    }
    
    console.log('Form validation - formData:', {
      studentId: formData.studentId,
      feeId: formData.feeId,
      schoolId: formData.schoolId,
      selectedStudent: selectedStudent?.id
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Get student and fee info
      let studentName = '';
      let grade = '';
      let feeType = '';
      let feeId = formData.feeId;
      
      if (selectedStudent) {
        studentName = selectedStudent.name;
        grade = selectedStudent.grade;
      }
      
      // Handle the special case for transportation_and_tuition
      if (formData.feeId === 'transportation_and_tuition') {
        feeType = 'transportation_and_tuition';
        
        // Create a virtual fee for this combined type
        const tuitionFee = studentFees.find(fee => fee.feeType === 'tuition');
        const transportationFee = studentFees.find(fee => fee.feeType === 'transportation');
        
        if (!tuitionFee && !transportationFee) {
          toast.error('لم يتم العثور على رسوم الدراسة أو النقل');
          setIsSaving(false);
          return;
        }
        
        // Use the tuition fee ID as the base if available, otherwise transportation
        const selectedFeeId = tuitionFee?.id || transportationFee?.id;
            if (selectedFeeId && selectedFeeId.trim() !== '') {
              feeId = selectedFeeId;
            } else {
              console.error('No valid fee ID found for transportation_and_tuition');
              throw new Error('لم يتم العثور على معرف رسوم صحيح للرسوم المدمجة');
            }
      } else {
        // Normal case - get fee type from selected fee
        const selectedFee = studentFees.find(fee => fee.id === formData.feeId);
        if (selectedFee) {
          feeType = selectedFee.feeType;
        }
      }
      
      // Create installments
      const installments = [];
      const baseDate = new Date(formData.dueDate);
      
      // Calculate installment amounts based on payment type
      let installmentAmounts: number[];
      
      if (formData.flexiblePayment && formData.installmentAmounts.length === formData.installmentCount) {
        // Use the custom amounts provided by the user
        installmentAmounts = formData.installmentAmounts;
      } else {
        // Calculate equal installment amounts
        const equalAmount = formData.amount / formData.installmentCount;
        installmentAmounts = Array(formData.installmentCount).fill(equalAmount);
      }
      
      // If in edit mode, get the original installment to calculate payment difference
      let originalAmount = 0;
      let wasPaid = false;
      
      if (isEditMode && id) {
        const originalInstallmentResponse = await hybridApi.getInstallment(id);
        const originalInstallment = (originalInstallmentResponse?.success && originalInstallmentResponse?.data) ? originalInstallmentResponse.data : null;
        if (originalInstallment) {
          originalAmount = originalInstallment.amount;
          wasPaid = !!originalInstallment.paidDate;
        }
      }
      
      for (let i = 0; i < formData.installmentCount; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);
        
        // Determine month name based on date
        const monthNames = [
          'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
          'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        const installmentMonth = monthNames[installmentDate.getMonth()];
        
        const installment = {
          id: isEditMode && i === 0 ? id : '',
          studentId: formData.studentId,
          studentName,
          grade,
          amount: installmentAmounts[i],
          dueDate: installmentDate.toISOString().split('T')[0],
          paidDate: isEditMode && i === 0 ? formData.paidDate : null,
          status: (isEditMode && i === 0 ? (formData.paidDate ? 'paid' : 'upcoming') : 'upcoming') as 'paid' | 'upcoming' | 'overdue',
          feeId,
          feeType,
          note: formData.note,
          schoolId: formData.schoolId,
          installmentCount: formData.installmentCount,
          installmentMonth: installmentMonth
        };
        
        installments.push(installment);
      }
      
      // Save installments
      for (const installment of installments) {
        try {
          // Validate required UUID fields before saving
          if (!installment.studentId || installment.studentId.trim() === '') {
            console.error('Invalid studentId for installment:', installment.studentId, typeof installment.studentId);
            throw new Error('معرف الطالب مطلوب ولا يمكن أن يكون فارغاً');
          }
          if (!installment.feeId || installment.feeId.trim() === '') {
            console.error('Invalid feeId for installment:', installment.feeId, typeof installment.feeId);
            throw new Error('معرف الرسوم مطلوب ولا يمكن أن يكون فارغاً');
          }
          if (!installment.schoolId || installment.schoolId.trim() === '') {
            console.error('Invalid schoolId for installment:', installment.schoolId, typeof installment.schoolId);
            throw new Error('معرف المدرسة مطلوب ولا يمكن أن يكون فارغاً');
          }
          
          console.log('Creating installment with valid IDs:', {
            studentId: installment.studentId,
            feeId: installment.feeId,
            schoolId: installment.schoolId,
            amount: installment.amount
          });
          
          await hybridApi.createInstallment(installment);
        } catch (error) {
          console.error('Error saving installment:', error);
          throw error;
        }
      }
      
      // Update fee status if needed
      if (selectedFee && formData.feeId) {
        try {
          const installmentsResponse = await hybridApi.getInstallments(user?.schoolId, formData.studentId, formData.feeId);
          const allInstallments = (installmentsResponse?.success && installmentsResponse?.data) ? installmentsResponse.data : [];
          const totalPaid = allInstallments.reduce((sum, inst) => {
            if (inst.paidDate) {
              return sum + (inst.paidAmount !== undefined ? inst.paidAmount : inst.amount);
            }
            return sum;
          }, 0);
          
          if (totalPaid > 0) {
            // CRITICAL FIX: Only update paid amount, let database triggers calculate balance and status
            await hybridApi.updateFee({
              ...selectedFee,
              paid: totalPaid
            });
          }
        } catch (error) {
          console.error('Error updating fee status:', error);
        }
      }
      
      // Show success message
      navigate('/school/installments');
    } catch (error) {
      console.error('Error saving installment:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePrintReceipt = async () => {
    try {
      // Get student information
      const student = students.find(s => s.id === formData.studentId);
      if (!student) {
        toast.error('لم يتم العثور على الطالب');
        return;
      }
      
      // Get fee information
      const fee = studentFees.find(f => f.id === formData.feeId);
      if (!fee) {
        toast.error('لم يتم العثور على الرسوم المرتبطة');
        return;
      }
      
      // Get school settings
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
          receiptNumberCounter: 1,
          installmentReceiptNumberCounter: 1,
          installmentReceiptNumberFormat: 'auto',
          installmentReceiptNumberPrefix: '',
          showLogoBackground: true,
          receiptNumberYear: new Date().getFullYear(),
          installmentReceiptNumberYear: new Date().getFullYear()
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
      
      // Ensure schoolSettings is not null for the rest of the function
      if (!schoolSettings) {
        schoolSettings = {};
      }
      
      // Generate receipt number using atomic reservation
      let receiptNumber: string;
      try {
        const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'installment', 1);
        receiptNumber = reservedNumbers[0];
      } catch (error) {
        console.error('Error reserving receipt number for installment, falling back to direct generation:', error);
        // Fallback to direct generation if reservation fails
        receiptNumber = generateReceiptNumber(schoolSettings, student.studentId, undefined, 'installment');
      }
      
      // Prepare receipt data
      const receiptData = {
        receiptNumber,
        date: formatDate(new Date().toISOString()),
        studentName: student.name,
        englishName: student.englishName || '',
        studentId: student.studentId,
        grade: student.grade,
        englishGrade: student.englishGrade || '',
        feeType: fee.feeType,
        amount: formData.amount,
        totalAmount: formData.amount,
        schoolName: schoolSettings.name || '',
        englishSchoolName: schoolSettings.englishName || '',
        schoolLogo: schoolSettings.logo || '',
        schoolPhone: schoolSettings.phone || '',
        schoolPhoneWhatsapp: schoolSettings.phoneWhatsapp || '',
        schoolPhoneCall: schoolSettings.phoneCall || '',
        schoolEmail: schoolSettings.email || '',
        showWatermark: schoolSettings.showReceiptWatermark,
        showLogoBackground: schoolSettings.showLogoBackground,

        showSignature: schoolSettings.showSignatureOnReceipt,

      };
      
      // Download receipt as PDF
      await pdfPrinter.downloadReceiptAsPDF(receiptData);
      
      // After generating/saving the receipt, increment the installment receipt counter
      try {
        const currentSettings = await hybridApi.getSettings(user?.schoolId || '');
        if (currentSettings?.success && currentSettings?.data && Array.isArray(currentSettings.data) && currentSettings.data.length > 0) {
          const settingsData = currentSettings.data[0];
          const updatedSettings = {
            ...settingsData,
            installmentReceiptNumberCounter: (settingsData.installmentReceiptNumberCounter || 0) + 1
          };
          await hybridApi.updateSettings(user?.schoolId || '', updatedSettings);
        }
      } catch (error) {
        console.error('Error incrementing receipt counter:', error);
      }
      
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('حدث خطأ أثناء إنشاء الإيصال');
    }
  };

  const selectedFee = studentFees.find(fee => fee.id === formData.feeId);

  // Generate receipt data from current form state and selected student
  const generateReceiptData = async () => {
    // Get current installment data
    const selectedFee = studentFees.find(fee => fee.id === formData.feeId);
    
    // Generate receipt data from current form state and selected student
    
    if (!selectedStudent || (!selectedFee && formData.feeId !== 'transportation_and_tuition')) return null;
    
    // Handle the special case for transportation_and_tuition
    let tuitionAmount = 0;
    let transportationAmount = 0;
    
    if (formData.feeId === 'transportation_and_tuition') {
      const tuitionFee = studentFees.find(fee => fee.feeType === 'tuition');
      const transportationFee = studentFees.find(fee => fee.feeType === 'transportation');
      
      tuitionAmount = tuitionFee?.amount || 0;
      transportationAmount = transportationFee?.amount || 0;
    }
    
    // Get school settings
    console.log('GENERATE RECEIPT DATA - Fetching settings for schoolId:', user?.schoolId);
    const settingsResponse = await hybridApi.getSettings(user?.schoolId || '');
    console.log('GENERATE RECEIPT DATA - Settings response:', settingsResponse);
    let schoolSettings = (settingsResponse?.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : null;
    console.log('GENERATE RECEIPT DATA - Extracted schoolSettings:', schoolSettings);
    
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
    
    // Ensure schoolSettings is not null for the rest of the function
    if (!schoolSettings) {
      schoolSettings = {};
    }
    
    // Generate receipt number using atomic reservation
    let installmentReceiptNumber: string;
    try {
      const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'installment', 1);
      installmentReceiptNumber = reservedNumbers[0];
    } catch (error) {
      console.error('Error reserving receipt number for installment, falling back to direct generation:', error);
      // Fallback to direct generation if reservation fails
      installmentReceiptNumber = generateReceiptNumber(schoolSettings, selectedStudent.studentId, undefined, 'installment');
    }
    
    const finalReceiptData = {
      id: id || '',
      date: new Date().toISOString().split('T')[0],
      receiptNumber: installmentReceiptNumber,
      schoolName: schoolSettings?.name || '',
      englishSchoolName: schoolSettings?.englishName || '',
      schoolLogo: schoolSettings?.logo || '',
      schoolPhone: schoolSettings?.phone || '',
      schoolPhoneWhatsapp: schoolSettings?.phoneWhatsapp || '',
      schoolPhoneCall: schoolSettings?.phoneCall || '',
      schoolEmail: schoolSettings?.email || '',
      studentName: selectedStudent.name,
      englishName: selectedStudent.englishName || '',
      studentId: selectedStudent.studentId,
      grade: selectedStudent.grade,
      englishGrade: selectedStudent.englishGrade || '',
      feeType: formData.feeId === 'transportation_and_tuition' ? 'transportation_and_tuition' : selectedFee?.feeType || '',
      amount: formData.amount,
      paidAmount: isPaid ? formData.amount : 0,
      remainingAmount: isPaid ? 0 : formData.amount,
      // Add these fields for the combined type
      tuitionAmount: formData.feeId === 'transportation_and_tuition' ? tuitionAmount : 0,
      transportationAmount: formData.feeId === 'transportation_and_tuition' ? transportationAmount : 0,
      includesTransportation: formData.feeId === 'transportation_and_tuition',
      note: formData.note,
      paymentDate: isPaid ? (formData.paidDate || new Date().toISOString().split('T')[0]) : '',
      dueDate: formData.dueDate,
      installmentMonth: formData.installmentMonth || '',
      installmentNumber: 1,
      totalInstallments: formData.installmentCount,
      logo: schoolSettings?.logo || '',
      schoolNameEnglish: schoolSettings?.englishName || '',
      currency: CURRENCY
    };
    
    console.log('GENERATE RECEIPT DATA - Final receipt data:', finalReceiptData);
    console.log('GENERATE RECEIPT DATA - School fields in final data:', {
      schoolName: finalReceiptData.schoolName,
      englishSchoolName: finalReceiptData.englishSchoolName,
      schoolLogo: finalReceiptData.schoolLogo,
      schoolPhone: finalReceiptData.schoolPhone,
      schoolPhoneWhatsapp: finalReceiptData.schoolPhoneWhatsapp,
      schoolPhoneCall: finalReceiptData.schoolPhoneCall,
      schoolEmail: finalReceiptData.schoolEmail
    });
    
    return finalReceiptData;
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/school/installments')}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowRight size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditMode ? 'تعديل القسط' : 'إضافة قسط جديد'}
          </h1>
        </div>
        
        {isEditMode && isPaid && (
          <div className="flex space-x-2 rtl:space-x-reverse">
            <InstallmentArabicReceiptButton
              receiptData={receiptData || {
                receiptNumber: '',
                date: '',
                studentName: '',
                amount: '',
                totalAmount: '',
                schoolName: settings?.name || '',
                englishSchoolName: settings?.englishName || '',
                schoolLogo: settings?.logo || '',
                schoolPhone: settings?.phone || '',
                schoolPhoneWhatsapp: settings?.phoneWhatsapp || '',
                schoolPhoneCall: settings?.phoneCall || '',
                schoolEmail: settings?.email || ''
              }}
            />
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-800">بيانات القسط</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div className="relative">
              <label className="block text-gray-700 mb-2">
                الطالب <span className="text-red-500">*</span>
              </label>
              
              {selectedStudent ? (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border">
                  <div>
                    <div className="font-medium">{selectedStudent.name}</div>
                    <div className="text-sm text-gray-500">
                      {selectedStudent.studentId} - {selectedStudent.grade}
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    className="btn btn-secondary text-sm py-1"
                    onClick={() => setShowStudentSelector(true)}
                    disabled={isEditMode} // Disable changing student in edit mode
                  >
                    تغيير
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary w-full flex items-center justify-center gap-2"
                    onClick={() => setShowStudentSelector(true)}
                  >
                    <Search size={16} />
                    <span>اختيار طالب</span>
                  </button>
                  {errors.studentId && (
                    <p className="text-red-500 text-sm mt-1">{errors.studentId}</p>
                  )}
                </div>
              )}
              
              {showStudentSelector && !isEditMode && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowStudentSelector(false)}>
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="text-xl font-bold">اختيار طالب</h3>
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => setShowStudentSelector(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="p-4 border-b border-gray-200">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="بحث عن طالب..."
                          className="w-full p-3 pr-10 border rounded-lg text-lg"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto p-2">
                      {filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          لا توجد نتائج للبحث
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredStudents.map((student) => (
                            <div 
                              key={student.id} 
                              className="border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => handleSelectStudent(student)}
                            >
                              <div className="font-bold text-lg">{student.name}</div>
                              <div className="flex justify-between items-center mt-2">
                                <div className="text-sm text-gray-600">
                                  <div>الصف: {student.grade}</div>
                                  <div>الرقم: {student.studentId}</div>
                                </div>
                                <button
                                  type="button"
                                  className="bg-primary text-white rounded-md px-3 py-1 text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectStudent(student);
                                  }}
                                >
                                  اختيار
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 border-t border-gray-200 flex justify-end">
                      <button
                        type="button"
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                        onClick={() => setShowStudentSelector(false)}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {selectedStudent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="feeId">
                    الرسوم <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="feeId"
                    name="feeId"
                    className={`input ${errors.feeId ? 'border-red-500' : ''}`}
                    value={formData.feeId}
                    onChange={handleSelectFee}
                    required
                    disabled={isEditMode} // Disable changing fee in edit mode
                  >
                    <option value="">-- اختر الرسوم --</option>
                    {studentFees.map((fee) => (
                      <option key={fee.id} value={fee.id}>
                        {getFeeTypeLabel(fee.feeType)} - المتبقي: {fee.balance.toLocaleString()} {CURRENCY}
                      </option>
                    ))}
                    <option value="transportation_and_tuition">{getFeeTypeLabel('transportation_and_tuition')}</option>
                  </select>
                  {errors.feeId && (
                    <p className="text-red-500 text-sm mt-1">{errors.feeId}</p>
                  )}
                  
                  {studentFees.length === 0 && (
                    <p className="text-yellow-500 text-sm mt-1">
                      لا توجد رسوم لهذا الطالب. يرجى إضافة رسوم أولاً.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="dueDate">
                    تاريخ الاستحقاق <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    className={`input ${errors.dueDate ? 'border-red-500' : ''}`}
                    value={formData.dueDate}
                    onChange={handleChange}
                    required
                  />
                  {errors.dueDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">
                    المبلغ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="w-full border rounded-md p-2"
                    min="0"
                    step="0.01"
                  />
                  {errors.amount && (
                    <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">
                    عدد الأقساط <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="installmentCount"
                    value={formData.installmentCount}
                    onChange={handleInstallmentCountChange}
                    className="w-full border rounded-md p-2"
                    disabled={isEditMode}
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map((count) => (
                      <option key={count} value={count}>
                        {count === 1 ? 'دفعة واحدة' : `${count} أقساط`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <div className="mt-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="flexiblePayment"
                        name="flexiblePayment"
                        checked={formData.flexiblePayment}
                        onChange={handleFlexiblePaymentToggle}
                        className="mr-2"
                      />
                      <label htmlFor="flexiblePayment" className="text-gray-700">
                        دفعات بمبالغ مختلفة
                      </label>
                    </div>
                  </div>
                  
                  {formData.flexiblePayment && (
                    <div className="mt-4 border rounded-md p-4 bg-gray-50">
                      <h3 className="font-medium mb-3">تحديد مبالغ الأقساط</h3>
                      <div className="space-y-3">
                        {Array.from({ length: formData.installmentCount }).map((_, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <span className="text-gray-700 min-w-[80px]">القسط {index + 1}:</span>
                            <input
                      type="number"
                      value={formData.installmentAmounts[index] || ''}
                      onChange={(e) => handleInstallmentAmountChange(index, parseFloat(e.target.value) || 0)}
                      className="border rounded-md p-2 w-full"
                      min="0"
                      step="0.01"
                    />
                          </div>
                        ))}
                        <div className="flex justify-between text-sm mt-2">
                          <span>المجموع:</span>
                          <span className={formData.installmentAmounts.reduce((sum, amount) => sum + amount, 0) !== formData.amount ? 'text-red-500' : 'text-green-600'}>
                            {formData.installmentAmounts.reduce((sum, amount) => sum + amount, 0).toFixed(2)} {CURRENCY} 
                            {formData.installmentAmounts.reduce((sum, amount) => sum + amount, 0) !== formData.amount && 
                              ` (يجب أن يساوي ${formData.amount} ${CURRENCY})`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="flex items-center p-2">
                    <input
                      type="checkbox"
                      name="paid"
                      checked={isPaid}
                      onChange={handleChange}
                      className="h-5 w-5 text-primary rounded"
                    />
                    <span className="mr-2 text-gray-700">تم الدفع</span>
                  </label>
                  
                  {isPaid && (
                    <div className="mt-2">
                      <label className="block text-gray-700 mb-2" htmlFor="paidDate">
                        تاريخ الدفع
                      </label>
                      <input
                        id="paidDate"
                        name="paidDate"
                        type="date"
                        className="input"
                        value={formData.paidDate || ''}
                        onChange={(e) => setFormData({...formData, paidDate: e.target.value})}
                      />
                    </div>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-2" htmlFor="note">
                    ملاحظات
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows={3}
                    className="input"
                    value={formData.note || updateInstallmentNote() || ''}
                    onChange={handleChange}
                    placeholder={selectedFee ? 
                      `القسط المستحق للطالب ${selectedStudent.name} من ${getFeeTypeLabel(selectedFee.feeType)}` : 
                      "ملاحظات حول القسط"}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/school/installments')}
              className="btn btn-secondary ml-3"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={isSaving || !selectedStudent || !formData.feeId}
            >
              <Save size={18} />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstallmentForm;
 