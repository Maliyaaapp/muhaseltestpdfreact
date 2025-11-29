import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowRight } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { GRADE_LEVELS, TRANSPORTATION_TYPES, CURRENCY } from '../../../utils/constants';
import { formatPhoneNumber } from '../../../utils/validation';
import hybridApi from '../../../services/hybridApi';
import StudentFees from './fees/Fees';
import { AlertDialog } from '../../../components/ui/Dialog';

interface StudentFormData {
  name: string;
  englishName?: string;
  studentId: string;
  grade: string;
  englishGrade?: string;
  division: string;
  parentName: string;
  parentEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  transportation: 'none' | 'one-way' | 'two-way';
  transportationDirection?: 'to-school' | 'from-school';
  transportationFee?: number;
  customTransportationFee?: boolean;
  tuitionFee?: number;
  tuitionDiscount?: number;
  schoolId: string;
  combinedFees?: boolean;
}

const StudentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    englishName: '',
    studentId: '',
    grade: user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels[0] : '',
    englishGrade: '',
    division: '',
    parentName: '',
    parentEmail: '',
    phone: '',
    whatsapp: '',
    address: '',
    transportation: 'none',
    schoolId: user?.schoolId || undefined
  });
  
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<any>({
    transportationFeeOneWay: 150,
    transportationFeeTwoWay: 300
  });
  
  // Additional state for tuition fee section
  const [showTuitionFeeSection, setShowTuitionFeeSection] = useState(false);
  const [showCombinedFees, setShowCombinedFees] = useState(false);
  
  // Flag to show transportation options
  const [showTransportationSettings, setShowTransportationSettings] = useState(false);

  // New state for installment creation
  const [createInstallments, setCreateInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(1);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (isEditMode && id) {
        try {
          // Fetch student data
          const studentResponse = await hybridApi.getStudent(id);
          const student = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
          
          if (student) {
            setFormData({
              name: student.name,
              englishName: student.englishName,
              studentId: student.studentId,
              grade: student.grade,
              englishGrade: student.englishGrade,
              division: student.division || '',
              parentName: student.parentName,
              parentEmail: student.parentEmail || '',
              phone: student.phone,
              whatsapp: student.whatsapp || student.phone,
              address: student.address || '',
              transportation: student.transportation,
              transportationDirection: student.transportationDirection,
              transportationFee: student.transportationFee,
              customTransportationFee: student.customTransportationFee,
              schoolId: student.schoolId
            });
            
            // Check for existing fees to populate tuition fee fields
            const feesResponse = await hybridApi.getFees(student.schoolId, student.id);
            const studentFees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
            const tuitionFee = studentFees.find(fee => fee.feeType === 'tuition');
            
            if (tuitionFee) {
              setFormData(prev => ({
                ...prev,
                tuitionFee: tuitionFee.amount,
                tuitionDiscount: tuitionFee.discount
              }));
              setShowTuitionFeeSection(true);
            }
          } else {
            navigate('/school/students');
          }
        } catch (error) {
          console.error('Error loading student data:', error);
          navigate('/school/students');
        }
      } else {
        // Initialize new student form with defaults
        // Generate a simple student ID for new students
        const timestamp = Date.now().toString().slice(-6);
        setFormData(prev => ({
          ...prev,
          studentId: `${prev.grade || 'STD'}-${timestamp}`
        }));
      }
      
      // Get school settings
      if (user?.schoolId) {
        try {
          const settingsResponse = await hybridApi.getSettings(user.schoolId);
          const schoolSettings = (settingsResponse?.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : {
            transportationFeeOneWay: 150,
            transportationFeeTwoWay: 300
          };
          setSettings(schoolSettings);
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, [id, isEditMode, navigate, user]);

  // Set transportation fee based on type
  useEffect(() => {
    if (formData.transportation !== 'none' && !formData.customTransportationFee) {
      setFormData(prev => ({
        ...prev,
        transportationFee: prev.transportation === 'one-way' 
          ? settings.transportationFeeOneWay 
          : settings.transportationFeeTwoWay
      }));
    }
  }, [formData.transportation, settings, formData.customTransportationFee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (name === 'phone' || name === 'whatsapp') {
      setFormData({
        ...formData,
        [name]: value
      });
    } else if (name === 'grade' && !isEditMode) {
      // Generate new student ID when grade changes for new students
      const timestamp = Date.now().toString().slice(-6);
      setFormData({
        ...formData,
        grade: value,
        studentId: `${value || 'STD'}-${timestamp}`
      });
    } else if (type === "checkbox" && name === "customTransportationFee") {
      setFormData({
        ...formData,
        customTransportationFee: (e.target as HTMLInputElement).checked
      });
    } else if (type === "checkbox" && name === "transportation") {
      // Handle transportation checkbox
      setFormData({
        ...formData,
        transportation: (e.target as HTMLInputElement).checked ? 'one-way' : 'none',
        transportationFee: (e.target as HTMLInputElement).checked ? settings.transportationFeeOneWay : undefined,
        customTransportationFee: false
      });
    } else if (type === "checkbox" && name === "includeTuition") {
      // Handle tuition fee checkbox
      setShowTuitionFeeSection((e.target as HTMLInputElement).checked);
      if (!(e.target as HTMLInputElement).checked) {
        setFormData({
          ...formData,
          tuitionFee: undefined,
          tuitionDiscount: undefined
        });
      }
    } else if (type === "checkbox" && name === "combinedFees") {
      setShowCombinedFees((e.target as HTMLInputElement).checked);
      setFormData({
        ...formData,
        combinedFees: (e.target as HTMLInputElement).checked
      });
    } else if (name === 'transportationFee') {
      setFormData({
        ...formData,
        transportationFee: parseFloat(value) || 0,
        customTransportationFee: true
      });
    } else if (name === 'tuitionFee' || name === 'tuitionDiscount') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }

    // Clear any existing error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'اسم الطالب مطلوب';
    }
    
    // Validate English name if provided (not required)
    if (formData.englishName && formData.englishName.trim().length > 0 && !/^[A-Za-z\s.'-]+$/.test(formData.englishName.trim())) {
      newErrors.englishName = 'Please enter a valid English name';
    }
    
    if (!formData.studentId.trim()) {
      newErrors.studentId = 'رقم الطالب مطلوب';
    }
    
    if (!formData.grade) {
      newErrors.grade = 'الصف الدراسي مطلوب';
    }
    
    // Validate English grade if provided (not required)
    if (formData.englishGrade && formData.englishGrade.trim().length > 0 && !/^[A-Za-z0-9\s.'-]+$/.test(formData.englishGrade.trim())) {
      newErrors.englishGrade = 'Please enter a valid English grade';
    }
    
    if (!formData.parentName.trim()) {
      newErrors.parentName = 'اسم ولي الأمر مطلوب';
    }
    
    if (formData.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      newErrors.parentEmail = 'البريد الإلكتروني غير صحيح';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    }
    
    if (formData.transportation === 'one-way' && !formData.transportationDirection) {
      newErrors.transportationDirection = 'يرجى تحديد اتجاه النقل';
    }
    
    if (formData.transportation !== 'none' && formData.transportationFee !== undefined && formData.transportationFee <= 0) {
      newErrors.transportationFee = 'يجب أن يكون مبلغ النقل أكبر من صفر';
    }
    
    if (showTuitionFeeSection) {
      if (!formData.tuitionFee || formData.tuitionFee <= 0) {
        newErrors.tuitionFee = 'يجب أن يكون مبلغ الرسوم الدراسية أكبر من صفر';
      }
      const combinedAmount = (formData.tuitionFee || 0) + (formData.transportation !== 'none' ? (formData.transportationFee || 0) : 0);
      if (showCombinedFees) {
        if (formData.tuitionDiscount && formData.tuitionDiscount > combinedAmount) {
          newErrors.tuitionDiscount = 'الخصم لا يمكن أن يكون أكبر من المبلغ المدمج (الرسوم + النقل)';
        }
      } else {
        if (formData.tuitionDiscount && formData.tuitionDiscount > formData.tuitionFee!) {
          newErrors.tuitionDiscount = 'الخصم لا يمكن أن يكون أكبر من مبلغ الرسوم';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Validate that we have a valid school ID before proceeding
    const currentSchoolId = isEditMode ? formData.schoolId : user?.schoolId;
    if (!currentSchoolId || currentSchoolId.trim() === '') {
      setAlertMessage('معرف المدرسة مطلوب. يرجى تسجيل الدخول مرة أخرى.');
      setAlertOpen(true);
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Prepare student data
      const studentData = {
        id: id || undefined,
        name: formData.name,
        englishName: formData.englishName,
        studentId: formData.studentId,
        grade: formData.grade,
        englishGrade: formData.englishGrade,
        division: formData.division,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        phone: formData.phone,
        whatsapp: formData.whatsapp || formData.phone,
        address: formData.address,
        transportation: formData.transportation,
        transportationDirection: formData.transportation === 'one-way' ? formData.transportationDirection : undefined,
        transportationFee: formData.transportation !== 'none' ? formData.transportationFee : undefined,
        customTransportationFee: formData.customTransportationFee,
        schoolId: isEditMode ? formData.schoolId : user.schoolId
      };
      
      const studentResponse = await hybridApi.saveStudent(studentData as any);
      const savedStudent = (studentResponse?.success && studentResponse?.data) ? studentResponse.data : null;
      
      if (!savedStudent) {
        throw new Error('Failed to save student');
      }
      
      // If transportation is selected and not combined, create transportation fee automatically
      if (formData.transportation !== 'none' && !showCombinedFees) {
        const transportationAmount = formData.transportationFee || 
          (formData.transportation === 'one-way' 
            ? settings.transportationFeeOneWay 
            : settings.transportationFeeTwoWay);
          
        // Check if transportation fee already exists for this student
        const schoolIdToUse = isEditMode ? formData.schoolId : user?.schoolId;
        if (!schoolIdToUse) {
          throw new Error('School ID is required');
        }
        
        const feesResponse = await hybridApi.getFees(schoolIdToUse, savedStudent.id);
        const existingFees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
        const existingTransportationFee = existingFees.find(f => f.feeType === 'transportation');
        
        if (!existingTransportationFee || isEditMode) {
          const feeData = {
            ...(existingTransportationFee ? { id: existingTransportationFee.id } : {}),
            studentId: savedStudent.id,
            student_name: savedStudent.name || formData.name,
            grade: savedStudent.grade || formData.grade,
            division: savedStudent.division || formData.division,
            parent_name: savedStudent.parentName || formData.parentName,
            phone: savedStudent.phone || formData.phone,
            feeType: 'transportation',
            description: `رسوم النقل - ${formData.transportation === 'one-way' ? 'اتجاه واحد' : 'اتجاهين'}${formData.transportationDirection ? ` - ${formData.transportationDirection === 'to-school' ? 'إلى المدرسة' : 'من المدرسة'}` : ''}`,
            amount: transportationAmount,
            discount: 0,
            paid: existingTransportationFee?.paid || 0,
            balance: transportationAmount - 0 - (existingTransportationFee?.paid || 0),
            status: existingTransportationFee?.paid ? (existingTransportationFee.paid >= transportationAmount ? 'paid' : 'partial') : 'unpaid',
            dueDate: new Date().toISOString().split('T')[0],
            schoolId: schoolIdToUse,
            transportationType: formData.transportation
          };
          
          await hybridApi.saveFee(feeData as any);
        }
      }
      
      // If tuition fee is selected and not combined, create or update tuition fee
      if (showTuitionFeeSection && formData.tuitionFee && !showCombinedFees) {
        // Check if tuition fee already exists for this student
        const schoolIdToUse = isEditMode ? formData.schoolId : user?.schoolId;
        if (!schoolIdToUse) {
          throw new Error('School ID is required');
        }
        
        const feesResponse = await hybridApi.getFees(schoolIdToUse, savedStudent.id);
        const existingFees = (feesResponse?.success && feesResponse?.data) ? feesResponse.data : [];
        const existingTuitionFee = existingFees.find(f => f.feeType === 'tuition');
        
        const tuitionAmount = formData.tuitionFee;
        const tuitionDiscount = formData.tuitionDiscount || 0;
        
        const feeData = {
          ...(existingTuitionFee ? { id: existingTuitionFee.id } : {}),
          studentId: savedStudent.id,
          student_name: savedStudent.name || formData.name,
          grade: savedStudent.grade || formData.grade,
          division: savedStudent.division || formData.division,
          parent_name: savedStudent.parentName || formData.parentName,
          phone: savedStudent.phone || formData.phone,
          feeType: 'tuition',
          description: `الرسوم الدراسية - ${formData.name}`,
          amount: tuitionAmount,
          discount: tuitionDiscount,
          paid: existingTuitionFee?.paid || 0,
          balance: tuitionAmount - tuitionDiscount - (existingTuitionFee?.paid || 0),
          status: existingTuitionFee?.paid ? (existingTuitionFee.paid >= (tuitionAmount - tuitionDiscount) ? 'paid' : 'partial') : 'unpaid',
          dueDate: new Date().toISOString().split('T')[0],
          schoolId: schoolIdToUse
        };
        
        const feeResponse = await hybridApi.saveFee(feeData as any);
        const savedFee = (feeResponse?.success && feeResponse?.data) ? feeResponse.data : null;
        
        // Create installments if requested
        if (createInstallments && installmentCount > 0 && savedFee) {
          try {
            const netAmount = tuitionAmount - tuitionDiscount;
            const installmentAmount = netAmount / installmentCount;
            
            // Create installments
            const baseDate = new Date();
            
            for (let i = 0; i < installmentCount; i++) {
              const installmentDate = new Date(baseDate);
              installmentDate.setMonth(baseDate.getMonth() + i);
              
              // Ensure we have valid UUIDs before creating installment
              // Check for both existence and that they're not empty strings
              if (!savedStudent.id || !savedFee.id || !schoolIdToUse || 
                  savedStudent.id.trim() === '' || savedFee.id.trim() === '' || schoolIdToUse.trim() === '') {
                console.error('Missing or invalid IDs for installment creation:', {
                  studentId: savedStudent.id,
                  feeId: savedFee.id,
                  schoolId: schoolIdToUse,
                  studentIdType: typeof savedStudent.id,
                  feeIdType: typeof savedFee.id,
                  schoolIdType: typeof schoolIdToUse
                });
                continue; // Skip this installment if we don't have valid IDs
              }
              
              // Additional debug logging for successful validation
              console.log('Creating installment with valid IDs:', {
                studentId: savedStudent.id,
                feeId: savedFee.id,
                schoolId: schoolIdToUse,
                installmentNumber: i + 1
              });
              
              const installment = {
                studentId: savedStudent.id,
                studentName: savedStudent.name,
                grade: savedStudent.grade || formData.grade,
                amount: installmentAmount,
                dueDate: installmentDate.toISOString().split('T')[0],
                paidDate: null,
                status: 'upcoming',
                feeId: savedFee.id,
                feeType: 'tuition',
                note: `القسط رقم ${i + 1} من ${installmentCount} للرسوم الدراسية - ${savedStudent.name}`,
                schoolId: schoolIdToUse,
                installmentCount: installmentCount,
                installmentNumber: i + 1,
                installmentMonth: installmentDate.toISOString().substring(0, 7), // YYYY-MM format
                paidAmount: 0,
                discount: 0,
                paymentMethod: 'cash',
                paymentNote: '',
                checkNumber: '',
                checkDate: null,
                bankNameArabic: '',
                bankNameEnglish: ''
              };
              
              const installmentResult = await hybridApi.saveInstallment(installment as any);
              if (!installmentResult.success) {
                console.error('Failed to create installment:', installmentResult.error);
                // Log the specific installment data that failed
                console.error('Failed installment data:', {
                  studentId: installment.studentId,
                  schoolId: installment.schoolId,
                  feeId: installment.feeId,
                  installmentNumber: installment.installmentNumber
                });
              }
            }
          } catch (error) {
            console.error('Error creating installments:', error);
            // Continue with saving the student even if installment creation fails
          }
        }
      }

      // Combined fee: create a single fee for tuition + transportation if enabled
      if (showTuitionFeeSection && formData.tuitionFee && showCombinedFees) {
        const schoolIdToUse = isEditMode ? formData.schoolId : user?.schoolId;
        if (!schoolIdToUse) {
          throw new Error('School ID is required');
        }
        const transportationAmount = formData.transportation !== 'none'
          ? (formData.transportationFee || (formData.transportation === 'one-way' ? settings.transportationFeeOneWay : settings.transportationFeeTwoWay))
          : 0;
        const combinedAmount = (formData.tuitionFee || 0) + transportationAmount;
        const combinedDiscount = formData.tuitionDiscount || 0;

        const feeData = {
          studentId: savedStudent.id,
          student_name: savedStudent.name || formData.name,
          grade: savedStudent.grade || formData.grade,
          division: savedStudent.division || formData.division,
          parent_name: savedStudent.parentName || formData.parentName,
          phone: savedStudent.phone || formData.phone,
          feeType: 'transportation_and_tuition',
          description: `رسوم دراسية + نقل - ${formData.name}`,
          amount: combinedAmount,
          discount: combinedDiscount,
          paid: 0,
          balance: combinedAmount - combinedDiscount,
          status: 'unpaid',
          dueDate: new Date().toISOString().split('T')[0],
          schoolId: schoolIdToUse
        };

        const feeResponse = await hybridApi.saveFee(feeData as any);
        const savedFee = (feeResponse?.success && feeResponse?.data) ? feeResponse.data : null;

        // Create installments for combined fee if requested
        if (createInstallments && installmentCount > 0 && savedFee) {
          try {
            const netAmount = combinedAmount - combinedDiscount;
            const installmentAmount = netAmount / installmentCount;
            const baseDate = new Date();
            for (let i = 0; i < installmentCount; i++) {
              const installmentDate = new Date(baseDate);
              installmentDate.setMonth(baseDate.getMonth() + i);
              if (!savedStudent.id || !savedFee.id || !schoolIdToUse || savedStudent.id.trim() === '' || savedFee.id.trim() === '' || schoolIdToUse.trim() === '') {
                console.error('Missing or invalid IDs for combined installment creation:', {
                  studentId: savedStudent.id,
                  feeId: savedFee.id,
                  schoolId: schoolIdToUse,
                  installmentNumber: i + 1
                });
                continue;
              }
              const installment = {
                studentId: savedStudent.id,
                studentName: savedStudent.name,
                grade: savedStudent.grade || formData.grade,
                amount: installmentAmount,
                dueDate: installmentDate.toISOString().split('T')[0],
                paidDate: null,
                status: 'upcoming',
                feeId: savedFee.id,
                feeType: 'transportation_and_tuition',
                note: `القسط رقم ${i + 1} من ${installmentCount} للرسوم المدمجة - ${savedStudent.name}`,
                schoolId: schoolIdToUse,
                installmentCount: installmentCount,
                installmentNumber: i + 1,
                installmentMonth: installmentDate.toISOString().substring(0, 7),
                paidAmount: 0,
                discount: 0,
                paymentMethod: 'cash',
                paymentNote: '',
                checkNumber: '',
                checkDate: null,
                bankNameArabic: '',
                bankNameEnglish: ''
              };
              const installmentResult = await hybridApi.saveInstallment(installment as any);
              if (!installmentResult.success) {
                console.error('Failed to create combined installment:', installmentResult.error);
                console.error('Failed combined installment data:', {
                  studentId: installment.studentId,
                  schoolId: installment.schoolId,
                  feeId: installment.feeId,
                  installmentNumber: installment.installmentNumber
                });
              }
            }
          } catch (error) {
            console.error('Error creating combined installments:', error);
          }
        }
      }
      
      setIsSaving(false);
      navigate('/school/students');
    } catch (error) {
      console.error('Error saving student:', error);
      setIsSaving(false);
      setAlertMessage('حدث خطأ أثناء حفظ بيانات الطالب');
      setAlertOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  // Filter grades based on user role
  const availableGrades = user?.role === 'gradeManager' && user?.gradeLevels ? 
    user.gradeLevels : 
    GRADE_LEVELS;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/school/students')}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowRight size={20} className="text-[#800000]" />
        </button>
        <h1 className="text-2xl font-bold text-[#800000] font-heading">
          {isEditMode ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
        </h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-[#800000]/5 border-b border-[#800000]/10">
          <h2 className="text-xl font-bold text-[#800000]">بيانات الطالب</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2 font-medium" htmlFor="name">
                اسم الطالب <span className="text-[#800000]">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={`input ${errors.name ? 'border-red-500' : 'focus:border-[#800000] focus:ring-[#800000]'}`}
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2 font-medium" htmlFor="englishName">
                Student English Name
              </label>
              <input
                id="englishName"
                name="englishName"
                type="text"
                className={`input ${errors.englishName ? 'border-red-500' : 'focus:border-[#800000] focus:ring-[#800000]'}`}
                value={formData.englishName}
                onChange={handleChange}
                placeholder="Enter student name in English"
              />
              {errors.englishName && <p className="text-red-500 text-sm mt-1">{errors.englishName}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="studentId">
                رقم الطالب <span className="text-[#800000]">*</span>
              </label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                className={`input ${errors.studentId ? 'border-red-500' : 'focus:border-[#800000] focus:ring-[#800000]'}`}
                value={formData.studentId}
                onChange={handleChange}
              />
              {errors.studentId && <p className="text-red-500 text-sm mt-1">{errors.studentId}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="grade">
                الصف <span className="text-[#800000]">*</span>
              </label>
              <select
                id="grade"
                name="grade"
                className={`input ${errors.grade ? 'border-red-500' : 'focus:border-[#800000] focus:ring-[#800000]'}`}
                value={formData.grade}
                onChange={handleChange}
                required
                disabled={isEditMode && user?.role === 'gradeManager'}
              >
                <option value="">-- اختر الصف --</option>
                {availableGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              {errors.grade && (
                <p className="text-red-500 text-sm mt-1">{errors.grade}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="englishGrade">
                Grade (English)
              </label>
              <input
                id="englishGrade"
                name="englishGrade"
                type="text"
                className={`input ${errors.englishGrade ? 'border-red-500' : 'focus:border-[#800000] focus:ring-[#800000]'}`}
                value={formData.englishGrade}
                onChange={handleChange}
                placeholder="Enter grade in English"
              />
              {errors.englishGrade && <p className="text-red-500 text-sm mt-1">{errors.englishGrade}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="division">
                الشعبة
              </label>
              <input
                type="text"
                id="division"
                name="division"
                className="input"
                value={formData.division}
                onChange={handleChange}
                placeholder="مثال: أ، ب، 1، 2"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="parentName">
                اسم ولي الأمر <span className="text-[#800000]">*</span>
              </label>
              <input
                id="parentName"
                name="parentName"
                type="text"
                className={`input ${errors.parentName ? 'border-red-500' : ''}`}
                value={formData.parentName}
                onChange={handleChange}
              />
              {errors.parentName && <p className="text-red-500 text-sm mt-1">{errors.parentName}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="parentEmail">
                البريد الإلكتروني
              </label>
              <input
                id="parentEmail"
                name="parentEmail"
                type="email"
                className={`input ${errors.parentEmail ? 'border-red-500' : ''}`}
                value={formData.parentEmail}
                onChange={handleChange}
              />
              {errors.parentEmail && <p className="text-red-500 text-sm mt-1">{errors.parentEmail}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="phone">رقم الهاتف <span className="text-[#800000]">*</span></label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="input"
                value={formData.phone}
                onChange={handleChange}
                placeholder="أدخل رقم الهاتف مع رمز البلد"
              />
              {errors.phone ? (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">أدخل رقم الهاتف مع رمز البلد (مثال: +123456789)</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="whatsapp">رقم الواتساب</label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                className="input"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="أدخل رقم الواتساب مع رمز البلد"
              />
              <p className="text-xs text-gray-500 mt-1">أدخل رقم الواتساب مع رمز البلد (مثال: +123456789)</p>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2 font-medium" htmlFor="address">
                العنوان
              </label>
              <textarea
                id="address"
                name="address"
                className="input min-h-[80px] resize-y"
                value={formData.address}
                onChange={handleChange}
                placeholder="أدخل عنوان الطالب"
                rows={3}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2 font-medium">
                خدمة النقل المدرسي
              </label>
              
              <div className="p-4 bg-[#800000]/5 rounded-md space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="transportationEnabled"
                    name="transportation"
                    className="h-4 w-4 text-[#800000] rounded focus:ring-[#800000]"
                    checked={formData.transportation !== 'none'}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        transportation: e.target.checked ? 'one-way' : 'none',
                        transportationDirection: e.target.checked ? 'to-school' : undefined,
                        customTransportationFee: false
                      });
                    }}
                  />
                  <label htmlFor="transportationEnabled" className="mr-2 text-gray-700 font-medium">
                    تفعيل خدمة النقل المدرسي
                  </label>
                </div>
                
                {formData.transportation !== 'none' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="transportationType">
                        نوع النقل
                      </label>
                      <select
                        id="transportationType"
                        name="transportation"
                        className="input"
                        value={formData.transportation}
                        onChange={handleChange}
                      >
                        <option value="one-way">اتجاه واحد</option>
                        <option value="two-way">اتجاهين</option>
                      </select>
                    </div>
                    
                    {formData.transportation === 'one-way' && (
                      <div>
                        <label className="block text-gray-700 mb-2" htmlFor="transportationDirection">
                          اتجاه النقل <span className="text-[#800000]">*</span>
                        </label>
                        <select
                          id="transportationDirection"
                          name="transportationDirection"
                          className={`input ${errors.transportationDirection ? 'border-red-500' : ''}`}
                          value={formData.transportationDirection || ''}
                          onChange={handleChange}
                        >
                          <option value="">-- اختر الاتجاه --</option>
                          <option value="to-school">من المنزل إلى المدرسة</option>
                          <option value="from-school">من المدرسة إلى المنزل</option>
                        </select>
                        {errors.transportationDirection && (
                          <p className="text-red-500 text-sm mt-1">{errors.transportationDirection}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="checkbox"
                          id="customTransportationFee"
                          name="customTransportationFee"
                          className="h-4 w-4 text-[#800000] rounded focus:ring-[#800000]"
                          checked={!!formData.customTransportationFee}
                          onChange={handleChange}
                        />
                        <label htmlFor="customTransportationFee" className="text-gray-700 font-medium">
                          تعيين رسوم مخصصة للنقل
                        </label>
                      </div>
                      
                      {formData.customTransportationFee && (
                        <div>
                          <label className="block text-gray-700 mb-2" htmlFor="transportationFee">
                            رسوم النقل المخصصة
                          </label>
                          <div className="relative">
                            <input
                              id="transportationFee"
                              name="transportationFee"
                              type="number"
                              className={`input pl-16 ${errors.transportationFee ? 'border-red-500' : ''}`}
                              value={formData.transportationFee || ''}
                              onChange={handleChange}
                              min="0"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center bg-gray-100 border-l border-gray-300 px-3 rounded-l-md">
                              {CURRENCY}
                            </div>
                          </div>
                          {errors.transportationFee && (
                            <p className="text-red-500 text-sm mt-1">{errors.transportationFee}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="p-3 bg-white rounded border border-gray-200 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">الرسوم المترتبة:</span>
                          <span className="font-bold text-[#800000]">
                            {formData.transportationFee !== undefined ? formData.transportationFee : 
                              (formData.transportation === 'one-way' 
                                ? settings.transportationFeeOneWay 
                                : settings.transportationFeeTwoWay)
                            } {CURRENCY}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          سيتم إنشاء رسوم النقل تلقائياً للطالب بعد الحفظ
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tuition Fee Section */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="includeTuition"
                  name="includeTuition"
                  className="h-4 w-4 text-[#800000] rounded focus:ring-[#800000]"
                  checked={showTuitionFeeSection}
                  onChange={handleChange}
                />
                <label htmlFor="includeTuition" className="text-gray-700 font-medium">
                  إضافة رسوم دراسية للطالب
                </label>
              </div>
              
              {showTuitionFeeSection && (
                <div className="p-4 bg-[#800000]/5 rounded-md mt-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="tuitionFee">
                        الرسوم الدراسية <span className="text-[#800000]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="tuitionFee"
                          name="tuitionFee"
                          type="number"
                          className={`input pl-16 ${errors.tuitionFee ? 'border-red-500' : ''}`}
                          value={formData.tuitionFee || ''}
                          onChange={handleChange}
                          min="0"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center bg-gray-100 border-l border-gray-300 px-3 rounded-l-md">
                          {CURRENCY}
                        </div>
                      </div>
                      {errors.tuitionFee && (
                        <p className="text-red-500 text-sm mt-1">{errors.tuitionFee}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="tuitionDiscount">
                        خصم الرسوم الدراسية
                      </label>
                      <div className="relative">
                        <input
                          id="tuitionDiscount"
                          name="tuitionDiscount"
                          type="number"
                          className={`input pl-16 ${errors.tuitionDiscount ? 'border-red-500' : ''}`}
                          value={formData.tuitionDiscount || ''}
                          onChange={handleChange}
                          min="0"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center bg-gray-100 border-l border-gray-300 px-3 rounded-l-md">
                          {CURRENCY}
                        </div>
                      </div>
                      {errors.tuitionDiscount && (
                        <p className="text-red-500 text-sm mt-1">{errors.tuitionDiscount}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="combinedFees"
                      name="combinedFees"
                      className="h-4 w-4 text-[#800000] rounded focus:ring-[#800000]"
                      checked={showCombinedFees}
                      onChange={handleChange}
                    />
                    <label htmlFor="combinedFees" className="text-gray-700 font-medium">
                      رسوم مدمجة (جمع الرسوم الدراسية + النقل في رسم واحد)
                    </label>
                  </div>
                  
                  <div className="p-3 bg-white rounded border border-[#800000]/10 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">المبلغ الصافي:</span>
                      <span className="font-bold text-[#800000]">
                        {(((formData.tuitionFee || 0) + (showCombinedFees && formData.transportation !== 'none' ? (formData.transportationFee || 0) : 0)) - (formData.tuitionDiscount || 0)).toLocaleString()} {CURRENCY}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      سيتم إنشاء {showCombinedFees ? 'رسوم مدمجة واحدة' : 'رسوم دراسية'} تلقائياً للطالب بعد الحفظ
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Add Installments Section - Only show when tuition fees are enabled */}
            {showTuitionFeeSection && (
              <div className="md:col-span-2 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="createInstallments"
                    name="createInstallments"
                    className="h-4 w-4 text-[#800000] rounded focus:ring-[#800000]"
                    checked={createInstallments}
                    onChange={(e) => setCreateInstallments(e.target.checked)}
                  />
                  <label htmlFor="createInstallments" className="text-gray-700 font-medium">
                    إنشاء أقساط للرسوم {showCombinedFees ? 'المدمجة' : 'الدراسية'}
                  </label>
                </div>
                
                {createInstallments && (
                  <div className="p-4 bg-[#800000]/5 rounded-md mt-2 space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="installmentCount">
                        عدد الأقساط
                      </label>
                      <select
                        id="installmentCount"
                        name="installmentCount"
                        className="input"
                        value={installmentCount}
                        onChange={(e) => setInstallmentCount(parseInt(e.target.value))}
                      >
                        {Array.from({length: 12}, (_, i) => i + 1).map((count) => (
                          <option key={count} value={count}>
                            {count === 1 ? 'دفعة واحدة' : `${count} أقساط`}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="p-3 bg-white rounded border border-[#800000]/10">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">قيمة القسط:</span>
                        <span className="font-bold text-[#800000]">
                          {((((formData.tuitionFee || 0) + (showCombinedFees && formData.transportation !== 'none' ? (formData.transportationFee || 0) : 0)) - (formData.tuitionDiscount || 0)) / installmentCount).toLocaleString()} {CURRENCY}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        سيتم إنشاء {installmentCount} قسط بشكل متساوي بعد حفظ بيانات الطالب
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/school/students')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-opacity-50 ml-3"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#800000] text-white rounded-md hover:bg-[#700000] focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-opacity-50 flex items-center gap-2"
              disabled={isSaving}
            >
              <Save size={18} />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}</span>
            </button>
          </div>
        </form>
      </div>
      
      {/* Display Student Fees section only in edit mode */}
      {isEditMode && id && (
        <div className="mt-8" id="student-fees-section">
          <h2 className="text-xl font-bold mb-4 text-[#800000] border-b pb-2 border-[#800000]/10">معلومات الرسوم</h2>
          <StudentFees />
        </div>
      )}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen} title='تنبيه' message={alertMessage} />
    </div>
  );
};

export default StudentForm;
  