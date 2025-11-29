import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash, Filter, CreditCard, MessageSquare, Download, Upload, User, ChevronDown, ChevronUp, Book, Bus, CreditCard as PaymentIcon, ChevronRight, DollarSign } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { FEE_TYPES, CURRENCY } from '../../../utils/constants';
import * as hybridApi from '../../../services/hybridApi';
import pdfPrinter from '../../../services/pdfPrinter';
import { exportReceiptAsPDF } from '../../../services/pdf/receipts/receipt-export';
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
import { AlertDialog } from '../../../components/ui/Dialog';
import FixSettingsError from '../../../components/FixSettingsError';
import { generateReceiptHTML } from '../../../services/pdf/receipts/receipt-html';
import { buildZip } from '../../../utils/zipBuilder';
import whatsappService from '../../../services/whatsapp';

interface Fee {
  id: string;
  studentId: string;
  student_id?: string;
  studentName: string;
  grade: string;
  division?: string;
  feeType: string;
  fee_type?: string;
  description?: string;
  transportationType?: 'one-way' | 'two-way';
  amount: number;
  discount: number;
  paid: number;
  paidAmount?: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: string;
  paidDate?: string;
  phone?: string;
  paymentDate?: string;
  paymentMethod?: 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other';
  paymentNote?: string;
  checkNumber?: string;
  checkDate?: string;
  bankName?: string;
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
  const { settings: _reportSettings } = useReportSettings();
  const location = useLocation();
  const [fees, setFees] = useState<Fee[]>([]);
  const [filteredFees, setFilteredFees] = useState<Fee[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [_isLoading, setIsLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{studentsCount: number; feesCount: number; installmentsCount?: number} | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [paymentProcessing, setPaymentProcessing] = useState<string | null>(null);
  const [_showNoDataMessage, setShowNoDataMessage] = useState(false);
  
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
  
  // Add state for bulk receipt download
  const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
  const [bulkDownloadLoading, setBulkDownloadLoading] = useState(false);
  const [includeUnpaidInBulk, setIncludeUnpaidInBulk] = useState(false);

  // UI controls for list view
  const [feesSearch, setFeesSearch] = useState<string>('');
  const [feesPage, setFeesPage] = useState<number>(1);
  const [feesPageSize, setFeesPageSize] = useState<number>(5);
  // UI controls for student-based view
  const [studentViewSearch, setStudentViewSearch] = useState<string>('');
  const [studentViewPage, setStudentViewPage] = useState<number>(1);
  const [studentViewPageSize, setStudentViewPageSize] = useState<number>(5);

  const handleExportFeesColoredExcel = async () => {
    try {
      const rows = fees.map((fee) => {
        const rawPaymentNote = (fee as any).paymentNote || '';
        const sanitizedPaymentNote = rawPaymentNote.replace(/\[RN:[^\]]+\]/g, '').replace(/[\r\n]+/g, ' ').trim();
        return ({
        studentName: fee.studentName || '',
        grade: fee.grade || '',
        feeType: getFeeTypeLabel(fee.feeType || ''),
        receiptNumber: (fee as any).receiptNumber || '',
        paymentMethod: getPaymentMethodLabel((fee as any).paymentMethod),
        checkNumber: (fee as any).checkNumber || '',
        checkDate: (fee as any).checkDate || '',
        bankName: (fee as any).bankNameArabic || (fee as any).bankName || '',
        paymentNote: sanitizedPaymentNote,
        amount: Number(fee.amount || 0),
        paid: Number((fee as any).paid || (fee.paidAmount ?? 0) || 0),
        balance: Number(fee.balance ?? Math.max(0, Number(fee.amount || 0) - Number((fee as any).paid || fee.paidAmount || 0))),
        status: fee.status || 'unpaid',
        dueDate: fee.dueDate || '',
        paymentDate: (fee as any).paymentDate || fee.paidDate || ''
      })});

      const statusLabel = (s: string) => s === 'paid' ? 'مدفوع' : (s === 'partial' ? 'مدفوع جزئياً' : (s === 'overdue' ? 'متأخر' : 'غير مدفوع'));
      const header = ['الطالب','الصف','نوع الرسوم','رقم الإيصال','طريقة الدفع','رقم الشيك','تاريخ الشيك','اسم البنك','ملاحظة الدفع','القيمة','المدفوع','المتبقي','الحالة','تاريخ الاستحقاق','تاريخ الدفع'];

      const xmlHeader = `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">`;
      const styles = `
        <Styles>
          <Style ss:ID="Default" ss:Name="Normal">
            <Alignment ss:Vertical="Center"/>
            <Font ss:FontName="Calibri" ss:Size="12"/>
          </Style>
          <Style ss:ID="Header">
            <Font ss:Bold="1"/>
            <Interior ss:Color="#DDD9C3" ss:Pattern="Solid"/>
          </Style>
          <Style ss:ID="Paid">
            <Interior ss:Color="#C6EFCE" ss:Pattern="Solid"/>
          </Style>
          <Style ss:ID="Partial">
            <Interior ss:Color="#F4B183" ss:Pattern="Solid"/>
          </Style>
          <Style ss:ID="Unpaid">
            <Interior ss:Color="#C0504D" ss:Pattern="Solid"/>
          </Style>
        </Styles>`;

      const worksheetOpen = `<Worksheet ss:Name="الرسوم"><Table>`;
      const headerRow = `<Row ss:StyleID="Header">${header.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>`;

      const dataRows = rows.map(r => {
        const style = r.status === 'paid' ? 'Paid' : (r.status === 'partial' ? 'Partial' : 'Unpaid');
        const cells = [
          `<Cell><Data ss:Type="String">${r.studentName}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.grade}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.feeType}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.receiptNumber}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.paymentMethod || ''}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.checkNumber}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.checkDate ? formatDate(r.checkDate) : ''}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.bankName}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.paymentNote}</Data></Cell>`,
          `<Cell><Data ss:Type="Number">${r.amount}</Data></Cell>`,
          `<Cell><Data ss:Type="Number">${r.paid}</Data></Cell>`,
          `<Cell><Data ss:Type="Number">${r.balance}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${statusLabel(r.status)}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.dueDate ? formatDate(r.dueDate) : ''}</Data></Cell>`,
          `<Cell><Data ss:Type="String">${r.paymentDate ? formatDate(r.paymentDate) : ''}</Data></Cell>`
        ].join('');
        return `<Row ss:StyleID="${style}">${cells}</Row>`;
      }).join('');

      const worksheetClose = `</Table></Worksheet>`;
      const workbookClose = `</Workbook>`;
      const xml = `${xmlHeader}${styles}${worksheetOpen}${headerRow}${dataRows}${worksheetClose}${workbookClose}`;

      const saveResp = await (window as any).electronAPI.showSaveDialog({
        title: 'تصدير الرسوم إلى Excel (ملوّن)',
        filters: [{ name: 'Excel', extensions: ['xls'] }],
        defaultPath: `fees_${new Date().toISOString().slice(0,10)}.xls`
      });
      const filePath = saveResp?.filePath || saveResp;
      if (!filePath) return;

      const encoder = new TextEncoder();
      const bytes = encoder.encode(xml);
      await (window as any).electronAPI.saveFile(filePath, bytes);
      toast.success('تم تصدير ملف Excel مع تلوين الصفوف حسب الحالة');
    } catch (e) {
      console.error('Colored Excel export error:', e);
      toast.error('فشل تصدير Excel الملوّن');
    }
  };
  
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
      
      // Augment fees with student phone numbers using already fetched students (local-first)
      const studentPhoneById = new Map<string, string>();
      for (const s of fetchedStudents) {
        if (s?.id) studentPhoneById.set(s.id, s.phone || '');
      }
      const augmentedFees = fetchedFees.map((fee: any) => ({
        ...fee,
        phone: (fee?.studentId && studentPhoneById.get(fee.studentId)) || ''
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

      console.log('📊 Setting fees state with', visibleFees.length, 'fees');
      console.log('💰 Fee statuses:', visibleFees.map((f: any) => ({ 
        id: f.id.substring(0, 8), 
        type: f.feeType, 
        paid: f.paid, 
        balance: f.balance, 
        status: f.status 
      })));
      
      // CRITICAL FIX: Merge with existing state to preserve optimistic updates
      // If a fee was marked as paid optimistically, keep that status unless
      // the fetched data also shows it as paid (confirming the update)
      setFees(prevFees => {
        // If no previous fees, just use fetched data
        if (!prevFees || prevFees.length === 0) {
          return visibleFees;
        }
        
        // Create a map of optimistically paid fees (status changed to 'paid' locally)
        const optimisticPaidFees = new Map<string, Fee>();
        prevFees.forEach(f => {
          if (f.status === 'paid') {
            optimisticPaidFees.set(f.id, f);
          }
        });
        
        // Merge: use fetched data but preserve optimistic paid status
        return visibleFees.map((fetchedFee: any) => {
          const optimisticFee = optimisticPaidFees.get(fetchedFee.id);
          
          // If fee was optimistically marked as paid but fetched data shows unpaid,
          // keep the optimistic paid status (database might not have synced yet)
          if (optimisticFee && optimisticFee.status === 'paid' && fetchedFee.status !== 'paid') {
            console.log(`🔄 Preserving optimistic paid status for fee ${fetchedFee.id.substring(0, 8)}`);
            return {
              ...fetchedFee,
              paid: optimisticFee.paid,
              balance: optimisticFee.balance,
              status: optimisticFee.status,
              paymentDate: optimisticFee.paymentDate,
              paymentMethod: optimisticFee.paymentMethod,
              paymentNote: optimisticFee.paymentNote,
              receiptNumber: optimisticFee.receiptNumber || fetchedFee.receiptNumber
            };
          }
          
          return fetchedFee;
        });
      });
      
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
      studentGroup.totalAmount += fee.amount;
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

   const _handlePrintReceipt = async (fee: Fee) => {
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
        const tuitionFee = allFees.find((f: any) => f.feeType === 'tuition');
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
      schoolPhone: schoolSettings?.phone || '',
      schoolPhoneWhatsapp: schoolSettings?.phoneWhatsapp || '',
      schoolPhoneCall: schoolSettings?.phoneCall || '',
      schoolEmail: schoolSettings?.email || '',
      schoolAddress: schoolSettings?.address || '',
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
      
      await whatsappService.sendWhatsAppMessage(student.phone, message);
      
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
    
    console.log('💳 handlePaymentComplete called for fee:', fee);
    
    // Set the fee ID and open the payment modal
    setSingleFeeId(id);
    setSelectedStudentId(null); // Clear student ID to indicate single fee payment
    setSelectedStudentName(fee.studentName);
    setSelectedStudentTotalAmount(fee.balance);
    setPayAllModalOpen(true);
  };

  // Add this new function to handle single fee payment with chosen payment method
  // NOTE: This is the old blocking version, kept for reference. Use handleSingleFeePaymentOptimistic instead.
  const _handleSingleFeePayment = async (
    paymentMethod: string,
    paymentNote: string,
    checkNumber?: string,
    checkDate?: string,
    bankNameArabic?: string,
    bankNameEnglish?: string,
    paymentDate?: string
  ) => {
    console.log('💰 handleSingleFeePayment called with:', {
      singleFeeId,
      paymentMethod,
      paymentNote,
      paymentDate
    });
    
    if (!singleFeeId) {
      console.error('❌ No singleFeeId set!');
      return;
    }
    
    setPaymentProcessing(singleFeeId);
    try {
      // Find the fee
      const fee = fees.find(f => f.id === singleFeeId);
      console.log('🔍 Found fee:', fee);
      
      if (!fee) {
        console.error('❌ Fee not found!');
        return;
      }
      
      // Calculate the full payment amount (amount minus discount)
      const fullPaymentAmount = fee.amount - (fee.discount || 0);
      
      // CRITICAL: Reserve receipt number if fee doesn't have one
      let receiptNumber = fee.receiptNumber;
      if (!receiptNumber || receiptNumber.trim() === '') {
        try {
          const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'fee', 1);
          receiptNumber = reservedNumbers[0];
        } catch (error) {
          console.error('Error reserving receipt number:', error);
          // Fallback: fetch settings and generate using current counter
          const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
          const schoolSettings = (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) ? settingsResp.data[0] : {};
          receiptNumber = generateReceiptNumber(schoolSettings, fee.studentId, undefined, 'fee');
        }
      }
      
      // SIMPLE APPROACH: Just update the fee directly with all values
      const updatedFee = {
        id: fee.id,
        schoolId: user?.schoolId,
        studentId: fee.studentId,
        studentName: fee.studentName,
        grade: fee.grade,
        feeType: fee.feeType,
        description: fee.description,
        amount: fee.amount,
        discount: fee.discount || 0,
        paid: fullPaymentAmount,
        balance: 0,
        status: 'paid' as const,
        dueDate: fee.dueDate,
        transportationType: fee.transportationType,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
        paymentNote,
        checkNumber,
        checkDate,
        bankNameArabic,
        bankNameEnglish,
        receiptNumber: receiptNumber // CRITICAL: Save receipt number to database
      };
      
      console.log('💾 Saving fee as paid:', updatedFee);
      
      const saveResult = await hybridApi.saveFee(updatedFee);
      console.log('✅ Fee saved:', saveResult.success);
      
      if (!saveResult?.success) {
        throw new Error('Failed to save fee: ' + (saveResult?.error || 'Unknown error'));
      }
      
      // Update the local fees state immediately for instant UI update
      setFees(prevFees => prevFees.map(f => 
        f.id === fee.id ? { 
          ...f, 
          paid: fullPaymentAmount, 
          balance: 0, 
          status: 'paid' as const, 
          paymentDate, 
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other', 
          paymentNote,
          receiptNumber: receiptNumber // Include receipt number in local state
        } : f
      ));
      
      // Close modal and show success
      setPayAllModalOpen(false);
      setSingleFeeId(null);
      setPaymentProcessing(null);
      toast.success('تم دفع الرسوم بنجاح');
    } catch (error) {
      console.error('Error processing single fee payment:', error);
      setAlertMessage('حدث خطأ أثناء معالجة الدفع');
      setAlertOpen(true);
      setPaymentProcessing(null);
      setPayAllModalOpen(false);
      setSingleFeeId(null); // Reset single fee ID
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

  // Handle checkbox selection for bulk receipt download
  const handleFeeCheckboxChange = (feeId: string, checked: boolean) => {
    const newSelectedFees = new Set(selectedFees);
    if (checked) {
      newSelectedFees.add(feeId);
    } else {
      newSelectedFees.delete(feeId);
    }
    setSelectedFees(newSelectedFees);
  };

  // Handle select all checkbox for a student
  const handleSelectAllStudentFees = (student: StudentFeeGroup, checked: boolean) => {
    const newSelectedFees = new Set(selectedFees);
    const selectableFees = [
      ...student.tuitionFees,
      ...student.transportationFees,
      ...student.otherFees
    ].filter(fee => includeUnpaidInBulk || fee.status === 'paid' || fee.status === 'partial');
    const allStudentFeeIds = selectableFees.map(fee => fee.id);
    
    if (checked) {
      allStudentFeeIds.forEach(feeId => newSelectedFees.add(feeId));
    } else {
      allStudentFeeIds.forEach(feeId => newSelectedFees.delete(feeId));
    }
    setSelectedFees(newSelectedFees);
  };

  // Check if all fees for a student are selected
  const isAllStudentFeesSelected = (student: StudentFeeGroup): boolean => {
    const allStudentFeeIds = [
      ...student.tuitionFees,
      ...student.transportationFees,
      ...student.otherFees
    ].map(fee => fee.id);
    return allStudentFeeIds.length > 0 && allStudentFeeIds.every(feeId => selectedFees.has(feeId));
  };

  // Bulk download selected receipts
  const handleBulkReceiptDownload = async () => {
    if (selectedFees.size === 0) {
      toast.error('الرجاء اختيار رسوم لتحميل الإيصالات');
      return;
    }

    setBulkDownloadLoading(true);
    
    try {
      const selectedFeesData = fees.filter(fee => selectedFees.has(fee.id));
      const downloadedFiles: string[] = [];
      
      // Group fees by student for better organization
      const feesByStudent = selectedFeesData.reduce((acc, fee) => {
        if (!acc[fee.studentId]) {
          acc[fee.studentId] = [];
        }
        acc[fee.studentId].push(fee);
        return acc;
      }, {} as Record<string, Fee[]>);

      // Download receipts for each student
      for (const [_studentId, studentFees] of Object.entries(feesByStudent)) {
        for (const fee of studentFees) {
          try {
            const receiptData = await generateReceiptDataForFee(fee);
            if (receiptData) {
              const fileName = await exportReceiptAsPDF(receiptData);
              downloadedFiles.push(fileName);
            }
          } catch (error) {
            console.error(`Error downloading receipt for fee ${fee.id}:`, error);
          }
        }
      }

      toast.success(`تم تحميل ${downloadedFiles.length} إيصال بنجاح`);
      
      // Clear selection after successful download
      setSelectedFees(new Set());
    } catch (error) {
      console.error('Error during bulk receipt download:', error);
      toast.error('حدث خطأ أثناء تحميل الإيصالات');
    } finally {
      setBulkDownloadLoading(false);
    }
  };

  // Update handlePayAllFeesConfirm to include bankName, checkDate, and paymentDate
  // OPTIMIZED: Dialog closes instantly, database processes in background
  const handlePayAllFeesConfirm = async (
    paymentMethod: string, 
    paymentNote: string, 
    checkNumber?: string, 
    checkDate?: string, 
    bankNameArabic?: string,
    bankNameEnglish?: string,
    paymentDate?: string
  ) => {
    // Check if this is a single fee payment or bulk payment
    if (singleFeeId) {
      console.log('💰 Processing single fee payment for fee ID:', singleFeeId);
      // For single fee, use the optimized handler
      handleSingleFeePaymentOptimistic(paymentMethod, paymentNote, checkNumber, checkDate, bankNameArabic, bankNameEnglish, paymentDate);
      return;
    }
    
    if (!selectedStudentId) return;
    
    // STEP 1: CLOSE DIALOG IMMEDIATELY (before any async operations)
    const studentIdToProcess = selectedStudentId;
    const studentNameToProcess = selectedStudentName;
    setPayAllModalOpen(false);
    setSelectedStudentId(null);
    setSingleFeeId(null);
    setPaymentProcessing(null);
    
    // Find all unpaid fees for this student (synchronous)
    const studentFees = fees.filter(f => f.studentId === studentIdToProcess && f.balance > 0);
    if (studentFees.length === 0) return;
    
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
    
    // STEP 2: OPTIMISTIC UI UPDATE (instant, before database)
    // Save original fees for potential rollback
    const originalFees = [...fees];
    const feeIdsToUpdate = studentFees.map(f => f.id);
    
    // Prepare optimistic fee updates
    const optimisticFeeUpdates = studentFees.map(fee => ({
      id: fee.id,
      paid: fee.amount - (fee.discount || 0),
      balance: 0,
      status: 'paid' as const,
      paymentDate: paymentDate,
      paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
      paymentNote: paymentNote
    }));
    
    // Update UI immediately
    setFees(prevFees => prevFees.map(f => {
      const update = optimisticFeeUpdates.find(u => u.id === f.id);
      if (update) {
        return {
          ...f,
          paid: update.paid,
          balance: update.balance,
          status: update.status,
          paymentDate: update.paymentDate,
          paymentMethod: update.paymentMethod,
          paymentNote: update.paymentNote
        };
      }
      return f;
    }));
    
    console.log(`[PayAll] UI updated optimistically for ${studentFees.length} fees`);
    
    // STEP 3: SHOW LOADING TOAST
    const toastId = toast.loading('جاري حفظ الدفع...');
    
    // STEP 4: PROCESS DATABASE IN BACKGROUND (non-blocking)
    (async () => {
      try {
        const startTime = Date.now();
        
        // Fetch settings for receipt number
        let reservedReceiptNumber: string | undefined;
        try {
          const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
          const schoolSettings = (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) ? settingsResp.data[0] : null;
          if (schoolSettings) {
            const needNewNumber = studentFees.some(f => !f.receiptNumber || f.receiptNumber.trim() === '');
            if (needNewNumber) {
              reservedReceiptNumber = generateReceiptNumber(schoolSettings, studentIdToProcess);
            }
          }
        } catch (e) {
          console.warn('Failed to prepare reserved receipt number for bulk payment:', e);
        }
        
        // Collect all fee updates for batch operation
        const feesToUpdate: any[] = [];
        const installmentsToUpdate: any[] = [];
        
        // Fetch installments
        const allInstallmentsResponse = await hybridApi.getInstallments(user?.schoolId);
        const allInstallments = (allInstallmentsResponse?.success && allInstallmentsResponse?.data) ? allInstallmentsResponse.data : [];
        
        for (const fee of studentFees) {
          const updatedFee = {
            ...fee,
            paid: fee.amount - (fee.discount || 0),
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
            includesTransportation: hasTransportationFee,
            studentId: fee.studentId,
            schoolId: user?.schoolId
          };
          feesToUpdate.push(updatedFee);
          
          // Find related installments
          const relatedInstallments = allInstallments.filter((inst: any) => inst.feeId === fee.id || inst.fee_id === fee.id);
          for (const installment of relatedInstallments) {
            installmentsToUpdate.push({
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
            });
          }
        }
        
        // BATCH UPDATE: Database operations
        console.log(`[PayAll] Batch updating ${feesToUpdate.length} fees and ${installmentsToUpdate.length} installments`);
        
        await hybridApi.batchUpdateFees(feesToUpdate);
        
        if (installmentsToUpdate.length > 0) {
          await hybridApi.batchUpdateInstallments(installmentsToUpdate);
        }
        
        console.log(`[PayAll] Batch update completed in ${Date.now() - startTime}ms`);
        
        // Update receipt number in UI if we generated one
        if (reservedReceiptNumber) {
          setFees(prevFees => prevFees.map(f => {
            if (feeIdsToUpdate.includes(f.id) && (!f.receiptNumber || f.receiptNumber.trim() === '')) {
              return { ...f, receiptNumber: reservedReceiptNumber };
            }
            return f;
          }));
          
          // Increment receipt counter
          try {
            const settingsResp2 = await hybridApi.getSettings(user?.schoolId || '');
            if (settingsResp2?.success && settingsResp2?.data && settingsResp2.data.length > 0) {
              const currentSettings = settingsResp2.data[0];
              await hybridApi.updateSettings(user?.schoolId || '', {
                ...currentSettings,
                receiptNumberCounter: (currentSettings.receiptNumberCounter || 0) + 1
              });
            }
          } catch (err) {
            console.error('Error incrementing receipt counter:', err);
          }
        }
        
        // Invalidate caches
        hybridApi.invalidateCache('fees');
        hybridApi.invalidateCache('installments');
        
        // SUCCESS: Update toast immediately (don't wait for refetch)
        toast.success(`تم حفظ الدفع بنجاح للطالب ${studentNameToProcess}`, { id: toastId });
        
        // DELAYED REFRESH: Wait for cache to update before refetching
        // This prevents race condition where stale data overwrites optimistic update
        setTimeout(() => {
          console.log('[PayAll] Delayed refresh starting after cache update...');
          fetchData().catch(err => console.warn('Delayed refresh failed:', err));
        }, 2000); // Wait 2 seconds for cache to fully update
        
      } catch (error) {
        console.error('Error processing bulk payment:', error);
        
        // ROLLBACK: Revert optimistic UI update on error
        setFees(originalFees);
        
        // Show error toast
        toast.error('فشل حفظ الدفع - تم التراجع عن التغييرات', { id: toastId });
      }
    })();
  };
  
  // Optimistic single fee payment handler
  const handleSingleFeePaymentOptimistic = (
    paymentMethod: string,
    paymentNote: string,
    checkNumber?: string,
    checkDate?: string,
    bankNameArabic?: string,
    bankNameEnglish?: string,
    paymentDate?: string
  ) => {
    if (!singleFeeId) return;
    
    const feeId = singleFeeId;
    const fee = fees.find(f => f.id === feeId);
    if (!fee) return;
    
    // STEP 1: CLOSE DIALOG IMMEDIATELY
    setPayAllModalOpen(false);
    setSelectedStudentId(null);
    setSingleFeeId(null);
    setPaymentProcessing(null);
    
    // STEP 2: OPTIMISTIC UI UPDATE
    const originalFees = [...fees];
    const fullPaymentAmount = fee.amount - (fee.discount || 0);
    
    setFees(prevFees => prevFees.map(f => {
      if (f.id === feeId) {
        return {
          ...f,
          paid: fullPaymentAmount,
          balance: 0,
          status: 'paid' as const,
          paymentDate: paymentDate,
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote: paymentNote
        };
      }
      return f;
    }));
    
    // STEP 3: SHOW LOADING TOAST
    const toastId = toast.loading('جاري حفظ الدفع...');
    
    // STEP 4: PROCESS IN BACKGROUND
    (async () => {
      try {
        // Reserve receipt number if needed
        let receiptNumber = fee.receiptNumber;
        if (!receiptNumber || receiptNumber.trim() === '') {
          try {
            const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'fee', 1);
            receiptNumber = reservedNumbers[0];
          } catch (error) {
            console.error('Error reserving receipt number:', error);
            const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
            const schoolSettings = (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) ? settingsResp.data[0] : {};
            receiptNumber = generateReceiptNumber(schoolSettings, fee.studentId, undefined, 'fee');
          }
        }
        
        // Update fee in database
        const updatedFee = {
          id: fee.id,
          schoolId: user?.schoolId,
          studentId: fee.studentId,
          studentName: fee.studentName,
          grade: fee.grade,
          feeType: fee.feeType,
          description: fee.description,
          amount: fee.amount,
          discount: fee.discount || 0,
          paid: fullPaymentAmount,
          balance: 0,
          status: 'paid',
          paymentDate: paymentDate,
          paymentMethod: paymentMethod,
          paymentNote: paymentNote,
          checkNumber: checkNumber,
          checkDate: checkDate,
          bankNameArabic,
          bankNameEnglish,
          receiptNumber: receiptNumber
        };
        
        await hybridApi.saveFee(updatedFee);
        
        // Update receipt number in UI
        if (receiptNumber) {
          setFees(prevFees => prevFees.map(f => {
            if (f.id === feeId) {
              return { ...f, receiptNumber };
            }
            return f;
          }));
        }
        
        // Invalidate caches
        hybridApi.invalidateCache('fees');
        
        // SUCCESS: Update toast immediately (don't wait for refetch)
        toast.success(`تم حفظ الدفع بنجاح`, { id: toastId });
        
        // DELAYED REFRESH: Wait for cache to update before refetching
        // This prevents race condition where stale data overwrites optimistic update
        setTimeout(() => {
          console.log('[SingleFee] Delayed refresh starting after cache update...');
          fetchData().catch(err => console.warn('Delayed refresh failed:', err));
        }, 2000); // Wait 2 seconds for cache to fully update
        
      } catch (error) {
        console.error('Error processing single fee payment:', error);
        
        // ROLLBACK
        setFees(originalFees);
        toast.error('فشل حفظ الدفع - تم التراجع عن التغييرات', { id: toastId });
      }
    })();
  };
  
  const _handlePrintStudentReport = async (studentId: string) => {
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
    if (!type) return '';
    if (type === 'transportation_and_tuition') return 'رسوم مدمجة';
    if (type === 'tuition') return 'رسوم دراسية';
    if (type === 'transportation') return 'نقل مدرسي';
    return type;
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
      // CRITICAL FIX: Clear installments cache to ensure fresh data
      console.log('🗑️ Clearing installments cache before payment processing');
      hybridApi.invalidateCache('installments');
      
      // CRITICAL FIX: Update installments first, then recalculate fee totals from installments
      console.log('🔍 Fetching installments for fee:', selectedFee.id);
      let installmentsResponse = await hybridApi.getInstallments(undefined, undefined, selectedFee.id);
      console.log('📦 Installments response (by fee_id):', installmentsResponse);
      let relatedInstallments = (installmentsResponse?.success && installmentsResponse?.data) ? installmentsResponse.data : [];
      console.log('📋 Related installments count (by fee_id):', relatedInstallments.length);
      
      // AUTO-LINK: If no installments found by fee_id, find and link them automatically
      if (relatedInstallments.length === 0) {
        console.log('🔍 No installments found by fee_id, auto-linking...');
        console.log('🔍 Looking for installments with:', {
          studentId: selectedFee.studentId || selectedFee.student_id,
          feeType: selectedFee.feeType || selectedFee.fee_type,
          feeId: selectedFee.id
        });
        
        // CRITICAL FIX: Clear cache before querying to ensure fresh data
        hybridApi.invalidateCache('installments');
        
        // Get ALL installments for this student - use both camelCase and snake_case
        const studentIdToUse = selectedFee.studentId || selectedFee.student_id;
        console.log('🔍 Using student_id:', studentIdToUse);
        
        const allStudentInstallmentsResponse = await hybridApi.getInstallments(undefined, studentIdToUse);
        const allStudentInstallments = (allStudentInstallmentsResponse?.success && allStudentInstallmentsResponse?.data) ? allStudentInstallmentsResponse.data : [];
        console.log('📦 Total student installments:', allStudentInstallments.length);
        console.log('📦 Response details:', {
          success: allStudentInstallmentsResponse?.success,
          dataLength: allStudentInstallmentsResponse?.data?.length,
          fromCache: allStudentInstallmentsResponse?.fromCache,
          fromLocalStorage: allStudentInstallmentsResponse?.fromLocalStorage
        });
        
        if (allStudentInstallments.length > 0) {
          console.log('📋 Sample installment:', {
            id: allStudentInstallments[0].id,
            feeType: allStudentInstallments[0].feeType,
            feeId: allStudentInstallments[0].feeId,
            studentId: allStudentInstallments[0].studentId
          });
        }
        
        // Find installments that match this fee (by fee_type and no existing fee_id)
        const matchedInstallments = allStudentInstallments.filter((inst: any) => 
          inst.feeType === selectedFee.feeType && !inst.feeId
        );
        
        console.log('📋 Found unlinked installments (no fee_id):', matchedInstallments.length);
        
        // Also try to find installments that might already be linked to this fee
        const alreadyLinked = allStudentInstallments.filter((inst: any) => 
          inst.feeType === selectedFee.feeType && inst.feeId === selectedFee.id
        );
        console.log('📋 Already linked installments:', alreadyLinked.length);
        
        if (matchedInstallments.length > 0) {
          console.log('🔗 Auto-linking installments to fee...');
          
          // Link them all in parallel
          await Promise.all(matchedInstallments.map(async (inst: any) => {
            try {
              await hybridApi.saveInstallment({
                ...inst,
                feeId: selectedFee.id,
                studentId: selectedFee.studentId // Ensure student_id is set
              });
              console.log('✅ Linked:', inst.id.substring(0, 8));
            } catch (error) {
              console.error('❌ Failed to link:', inst.id.substring(0, 8), error);
            }
          }));
          
          // Re-fetch installments after linking
          const reloadResponse = await hybridApi.getInstallments(undefined, undefined, selectedFee.id);
          relatedInstallments = (reloadResponse?.success && reloadResponse?.data) ? reloadResponse.data : [];
          console.log('✅ Auto-linked', relatedInstallments.length, 'installments');
        } else {
          console.log('⚠️ No unlinked installments found for this fee type');
        }
      }
      
      if (relatedInstallments && relatedInstallments.length > 0) {
        // Sort installments by due date to pay them in order
        const sortedInstallments = relatedInstallments.sort((a: any, b: any) => 
          new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime()
        );
        
        console.log('💰 PAYMENT DISTRIBUTION START:', {
          totalPayment: amount,
          feeId: selectedFee.id,
          feeAmount: selectedFee.amount,
          feeDiscount: selectedFee.discount,
          feeBalance: selectedFee.balance,
          installmentCount: sortedInstallments.length,
          installments: sortedInstallments.map((i: any) => ({
            id: i.id,
            amount: i.amount,
            discount: i.discount || 0,
            paidAmount: i.paidAmount ?? (i as any).paid_amount ?? 0,
            balance: i.amount - (i.paidAmount ?? (i as any).paid_amount ?? 0),
            dueDate: i.dueDate,
            status: i.status
          })),
          totalInstallmentAmount: sortedInstallments.reduce((sum: number, i: any) => sum + i.amount, 0),
          totalInstallmentDiscount: sortedInstallments.reduce((sum: number, i: any) => sum + (i.discount || 0), 0)
        });
        
        let remainingAmount = amount;
        let totalDistributed = 0;
        const updatedPaidAmounts = new Map<string, number>(); // Track what we saved
        
        // Distribute the payment across unpaid installments
        for (const installment of sortedInstallments) {
          if (remainingAmount <= 0) break;
          
          // Handle both camelCase and snake_case for paid amount
          const existingPaid = installment.paidAmount ?? (installment as any).paid_amount ?? 0;
          const unpaidAmount = installment.amount - existingPaid;
          if (unpaidAmount <= 0) continue; // Skip already paid installments
          
          const paymentForThisInstallment = Math.min(remainingAmount, unpaidAmount);
          const newPaidAmount = existingPaid + paymentForThisInstallment;
          
          console.log(`💳 Installment ${sortedInstallments.indexOf(installment) + 1}:`, {
            id: installment.id,
            amount: installment.amount,
            previousPaid: existingPaid,
            unpaidAmount,
            payingNow: paymentForThisInstallment,
            newPaidAmount,
            newBalance: installment.amount - newPaidAmount
          });
          
          totalDistributed += paymentForThisInstallment;
          updatedPaidAmounts.set(installment.id, newPaidAmount); // Track the new amount
          
          const updatedInstallment = {
            id: installment.id,
            feeId: installment.feeId,
            studentId: installment.studentId,
            studentName: installment.studentName,
            grade: installment.grade,
            feeType: installment.feeType,
            amount: installment.amount,
            paidAmount: newPaidAmount,
            balance: Math.max(0, installment.amount - newPaidAmount),
            status: newPaidAmount >= installment.amount ? 'paid' as 'paid' : 'partial' as 'partial',
            dueDate: installment.dueDate,
            paidDate: newPaidAmount >= installment.amount ? (paymentDate || new Date().toISOString().split('T')[0]) : installment.paidDate,
            paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
            paymentNote: paymentNote,
            checkNumber: checkNumber,
            checkDate: checkDate,
            bankNameArabic,
            bankNameEnglish,
            schoolId: installment.schoolId,
            installmentNumber: installment.installmentNumber,
            installmentCount: installment.installmentCount,
            installmentMonth: installment.installmentMonth,
            discount: installment.discount
          };
          
          console.log('💾 Saving installment:', {
            id: updatedInstallment.id,
            paidAmount: updatedInstallment.paidAmount,
            balance: updatedInstallment.balance,
            status: updatedInstallment.status
          });
          
          const saveResult = await hybridApi.saveInstallment(updatedInstallment);
          console.log('✅ Installment save result:', saveResult.success);
          
          if (!saveResult.success) {
            console.error('❌ Failed to save installment:', saveResult.error);
            throw new Error('Failed to save installment: ' + saveResult.error);
          }
          
          remainingAmount -= paymentForThisInstallment;
        }
        
        console.log('✅ PAYMENT DISTRIBUTION COMPLETE:', {
          totalPayment: amount,
          totalDistributed,
          remaining: remainingAmount,
          difference: amount - totalDistributed
        });
        
        // Calculate TOTAL paid across ALL installments using the tracked values
        const totalPaidFromInstallments = sortedInstallments.reduce((sum: number, inst: any) => {
          // Use the updated amount if we updated this installment, otherwise use existing
          // Handle both camelCase (paidAmount) and snake_case (paid_amount)
          const existingPaid = inst.paidAmount ?? (inst as any).paid_amount ?? 0;
          const paidAmount = updatedPaidAmounts.get(inst.id) ?? existingPaid;
          return sum + paidAmount;
        }, 0);
        
        console.log('💰 Total paid across all installments:', totalPaidFromInstallments);
        
        const feeNetAmount = selectedFee.amount - (selectedFee.discount || 0);
        const newBalance = Math.max(0, feeNetAmount - totalPaidFromInstallments);
        const newStatus = totalPaidFromInstallments === 0 ? 'unpaid' : (newBalance === 0 ? 'paid' : 'partial');
        
        console.log('📊 Fee totals:', {
          feeNetAmount,
          totalPaidFromInstallments,
          newBalance,
          newStatus
        });
        
        // CRITICAL: Clear ALL caches globally so Installments page sees the update
        await hybridApi.clearCache(); // Clear everything, not just specific tables
        
        // Wait for database to fully process
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('📊 Calculated fee totals from installments:', {
          totalPaidFromInstallments,
          feeNetAmount,
          newBalance,
          newStatus
        });
        
        // Update the fee with calculated values
        const updatedFee = {
          id: selectedFee.id,
          schoolId: user?.schoolId,
          studentId: selectedFee.studentId,
          studentName: selectedFee.studentName,
          grade: selectedFee.grade,
          feeType: selectedFee.feeType,
          description: selectedFee.description,
          amount: selectedFee.amount,
          discount: selectedFee.discount || 0,
          paid: totalPaidFromInstallments,
          balance: newBalance,
          status: newStatus as 'paid' | 'partial' | 'unpaid',
          dueDate: selectedFee.dueDate,
          transportationType: selectedFee.transportationType,
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote,
          checkNumber,
          checkDate,
          bankNameArabic,
          bankNameEnglish
        };
        
        console.log('💾 Saving fee to database:', {
          id: updatedFee.id,
          paid: updatedFee.paid,
          balance: updatedFee.balance,
          status: updatedFee.status
        });
        
        const updateResponse = await hybridApi.saveFee(updatedFee);
        console.log('✅ Fee save response:', updateResponse);
        console.log('✅ Fee save response DATA:', updateResponse.data);
        
        // CRITICAL DEBUG: Check what was returned immediately
        if (updateResponse.data) {
          console.log('🔍 Supabase returned IMMEDIATELY after save:', {
            paid: updateResponse.data.paid,
            balance: updateResponse.data.balance,
            status: updateResponse.data.status
          });
        }
        
        if (!updateResponse?.success) {
          throw new Error('Failed to update fee');
        }
        
        // CRITICAL: Invalidate installments cache so Installments page shows updated data
        hybridApi.invalidateCache('installments');
        console.log('✅ Fee successfully saved and installments cache invalidated');
        
        // Update local state immediately
        setFees(prevFees => prevFees.map(f => 
          f.id === selectedFee.id ? { 
            ...f, 
            paid: totalPaidFromInstallments, 
            balance: newBalance, 
            status: newStatus as 'paid' | 'partial' | 'unpaid',
            paymentDate, 
            paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other', 
            paymentNote 
          } : f
        ));
      } else {
        // No installments exist - this is a fee without installment plan
        // Just update the fee directly with the payment
        console.log('⚠️ No installments found for this fee - updating fee directly');
        
        const newPaidAmount = selectedFee.paid + amount;
        const feeNetAmount = selectedFee.amount - (selectedFee.discount || 0);
        const newBalance = Math.max(0, feeNetAmount - newPaidAmount);
        const newStatus = newPaidAmount === 0 ? 'unpaid' : (newBalance === 0 ? 'paid' : 'partial');
        
        console.log('📊 Calculated fee totals (no installments):', {
          previousPaid: selectedFee.paid,
          paymentAmount: amount,
          newPaidAmount,
          feeNetAmount,
          newBalance,
          newStatus
        });
        
        const updatedFee = {
          id: selectedFee.id,
          schoolId: user?.schoolId,
          studentId: selectedFee.studentId,
          studentName: selectedFee.studentName,
          grade: selectedFee.grade,
          feeType: selectedFee.feeType,
          description: selectedFee.description,
          amount: selectedFee.amount,
          discount: selectedFee.discount || 0,
          paid: newPaidAmount,
          balance: newBalance,
          status: newStatus as 'paid' | 'partial' | 'unpaid',
          dueDate: selectedFee.dueDate,
          transportationType: selectedFee.transportationType,
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
          paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other',
          paymentNote,
          checkNumber,
          checkDate,
          bankNameArabic,
          bankNameEnglish
        };
        
        console.log('💾 Saving fee (no installments):', updatedFee);
        
        const updateResponse = await hybridApi.saveFee(updatedFee);
        console.log('✅ Fee save result:', updateResponse.success);
        
        if (!updateResponse?.success) {
          console.error('❌ Failed to save fee:', updateResponse.error);
          throw new Error('Failed to update fee: ' + updateResponse.error);
        }
        
        // Update local state immediately
        setFees(prevFees => prevFees.map(f => 
          f.id === selectedFee.id ? { 
            ...f, 
            paid: newPaidAmount, 
            balance: newBalance, 
            status: newStatus as 'paid' | 'partial' | 'unpaid',
            paymentDate, 
            paymentMethod: paymentMethod as 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other', 
            paymentNote 
          } : f
        ));
        
        console.log('✅ Local state updated');
      }
      
      // Close modal and show success
      setPartialPaymentModalOpen(false);
      setPaymentProcessing(null);
      toast.success('تم دفع المبلغ بنجاح');
    } catch (error) {
      console.error('❌ Error processing partial payment:', error);
      setAlertMessage('حدث خطأ أثناء معالجة الدفع الجزئي');
      setAlertOpen(true);
      setPaymentProcessing(null);
      setPartialPaymentModalOpen(false);
    }
  };
  
  // Add a new handler for printing partial payment receipts
  const _handlePrintPartialReceipt = async (id: string, amountPaid: number) => {
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
        const tuitionFee = allFees.find((f: any) => f.feeType === 'tuition');
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
      const latestFee = latestFees.find((f: any) => f.id === fee.id);
      
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
          email: '',
          phone: '',
          phoneWhatsapp: '',
          phoneCall: '',
          address: '',
          logo: user?.schoolLogo || '',
          englishName: 'School Name',
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
        const tuitionFee = allFees.find((f: any) => f.feeType === 'tuition');
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
      const tuitionFeeRecords = allFees.filter((f: any) => f.feeType === 'tuition' || f.feeType === 'رسوم دراسية');
      tuitionFeeRecords.forEach((tuitionFee: any) => {
        remainingTuitionAmount += tuitionFee.balance || 0;
      });
      
      // Calculate remaining transportation fees
      const transportationFeeRecords = allFees.filter((f: any) => 
        f.feeType === 'transportation' || 
        f.feeType === 'transport' || 
        f.feeType === 'مواصلات'
      );
      transportationFeeRecords.forEach((transportFee: any) => {
        remainingTransportationAmount += transportFee.balance || 0;
      });
      
      // Calculate actual paid amounts by fee type
      let tuitionPaidAmount = 0;
      let transportationPaidAmount = 0;
      
      tuitionFeeRecords.forEach((tuitionFee: any) => {
        tuitionPaidAmount += tuitionFee.paid || 0;
      });
      
      transportationFeeRecords.forEach((transportFee: any) => {
        transportationPaidAmount += transportFee.paid || 0;
      });
      
      // Transportation-only receipt adjustments
      const isTransportation = (
        currentFee.feeType === 'transportation' ||
        (typeof currentFee.feeType === 'string' && (
          currentFee.feeType.includes('نقل') ||
          currentFee.feeType.toLowerCase().includes('transport')
        ))
      );

      if (isTransportation) {
        tuitionFees = 0;
        tuitionPaidAmount = 0;
        remainingTuitionAmount = 0;
        transportationPaidAmount = currentFee.paid || 0;
        remainingTransportationAmount = currentFee.balance || 0;
      }

      const receiptData = {
        receiptNumber,
        date: currentFee.paymentDate || new Date().toISOString(),
        studentName: currentFee.studentName,
        studentId: student.studentId,
        grade: currentFee.grade,
        englishName: student.englishName || '',
        englishGrade: student.englishGrade || '',
        student: student, // Add the entire student object
        tuitionFees: tuitionFees, // Add tuition fees amount
        feeType: getFeeTypeLabel(currentFee.feeType),
        amount: currentFee.paid, // Amount paid for this receipt
        paidAmount: currentFee.paid, // CRITICAL: Explicit paid amount for English receipt
        originalAmount: currentFee.amount,
        discount: currentFee.discount,
        totalAmount: currentFee.amount,
        balance: currentFee.balance, // CRITICAL: Explicit balance for English receipt
        remainingTuitionAmount: remainingTuitionAmount, // Add remaining tuition amount
        remainingTransportationAmount: remainingTransportationAmount, // Add remaining transportation amount
        tuitionPaidAmount: tuitionPaidAmount, // Add actual tuition paid amount
        transportationPaidAmount: transportationPaidAmount, // Add actual transportation paid amount
        remainingAmount: currentFee.balance, // Keep the original remaining amount for this specific fee
        status: currentFee.status,
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
            
            {/* Bulk download button */}
            <button
              onClick={handleBulkReceiptDownload}
              disabled={selectedFees.size === 0 || bulkDownloadLoading}
              className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg ${
                selectedFees.size === 0
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50'
              }`}
            >
              <Download size={18} />
              <span className="font-medium">
                {bulkDownloadLoading ? 'جاري التحميل...' : `تحميل الإيصالات (${selectedFees.size})`}
              </span>
            </button>

            {/* Bulk zip download button */}
            <button
              onClick={async () => {
                if (selectedFees.size === 0 || bulkDownloadLoading) return;
                setBulkDownloadLoading(true);
                try {
                  const saveResp = await (window as any).electronAPI.showSaveDialog({
                    title: 'حفظ ملف مضغوط للإيصالات',
                    filters: [{ name: 'ZIP', extensions: ['zip'] }],
                    defaultPath: `receipts_${new Date().toISOString().slice(0,10)}.zip`
                  });
                  const zipPath = saveResp?.filePath || saveResp;
                  if (!zipPath) {
                    toast.error('تم إلغاء حفظ الملف المضغوط');
                    setBulkDownloadLoading(false);
                    return;
                  }

                  const selectedFeesData = fees.filter(fee => selectedFees.has(fee.id));
                  const filesForZip: { name: string; data: Uint8Array }[] = [];
                  const tmpDir = 'C:\\Windows\\Temp';
                  for (const fee of selectedFeesData) {
                    const receiptData = await generateReceiptDataForFee(fee);
                    if (!receiptData) continue;
                    const html = await generateReceiptHTML(receiptData);
                    const safeName = (receiptData.studentName || 'Student').normalize('NFC').replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '-');
                    const rnSafe = String(receiptData.receiptNumber || '').replace(/[\\/:*?"<>|]/g, '-');
                    const fileName = `Receipt_${rnSafe}_${safeName}.pdf`;
                    const pdfPath = `${tmpDir}\\${fileName}`;
                    if ((window as any).electronAPI?.printToPdfWithPath) {
                      await (window as any).electronAPI.printToPdfWithPath(html, pdfPath, {
                        format: 'A4', landscape: false, printBackground: true, preferCSSPageSize: true,
                        margin: { top: '0', bottom: '0', left: '0', right: '0' }
                      });
                      const fb = await (window as any).electronAPI.readFile(pdfPath);
                      const raw = fb?.data;
                      let u: Uint8Array | null = null;
                      if (raw instanceof Uint8Array) u = raw; else if (Array.isArray(raw)) u = new Uint8Array(raw); else if (raw?.data && Array.isArray(raw.data)) u = new Uint8Array(raw.data);
                      if (u) filesForZip.push({ name: fileName, data: u });
                    } else if ((window as any).electronAPI?.generatePDF) {
                      const res = await (window as any).electronAPI.generatePDF(html, fileName, {
                        format: 'A4', landscape: false, printBackground: true, preferCSSPageSize: true,
                        margin: { top: '0', bottom: '0', left: '0', right: '0' }
                      });
                      const p = res?.filePath;
                      if (p) {
                        const fb = await (window as any).electronAPI.readFile(p);
                        const raw = fb?.data;
                        let u: Uint8Array | null = null;
                        if (raw instanceof Uint8Array) u = raw; else if (Array.isArray(raw)) u = new Uint8Array(raw); else if (raw?.data && Array.isArray(raw.data)) u = new Uint8Array(raw.data);
                        if (u) filesForZip.push({ name: fileName, data: u });
                      }
                    }
                  }

                  if (filesForZip.length === 0) {
                    toast.error('لم يتم إنشاء أي إيصالات');
                    setBulkDownloadLoading(false);
                    return;
                  }

                  const zipBytes = buildZip(filesForZip);
                  await (window as any).electronAPI.saveFile(zipPath, zipBytes);
                  toast.success(`تم حفظ ملف مضغوط يحتوي ${filesForZip.length} إيصال`);
                } catch (e) {
                  console.error('Bulk ZIP error:', e);
                  toast.error('حدث خطأ أثناء إنشاء الملف المضغوط');
                } finally {
                  setBulkDownloadLoading(false);
                }
              }}
              disabled={selectedFees.size === 0 || bulkDownloadLoading}
              className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg ${
                selectedFees.size === 0
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50'
              }`}
            >
              <Download size={18} />
              <span className="font-medium">
                {bulkDownloadLoading ? 'جاري التحميل...' : 'تحميل كملف مضغوط'}
              </span>
            </button>

            {/* Colored Excel export */}
            <button
              onClick={handleExportFeesColoredExcel}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
              title="تصدير Excel ملوّن حسب الحالة"
            >
              <Download size={18} />
              <span className="font-medium">تصدير Excel ملوّن</span>
            </button>

            {/* Include unpaid toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                checked={includeUnpaidInBulk}
                onChange={(e) => setIncludeUnpaidInBulk(e.target.checked)}
              />
              <span>تضمين غير المدفوعة</span>
            </label>

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
          onClose={() => {
            setShowSettingsError(false);
            setSettingsError(null);
          }}
        />
      )}
      
      <div className="bg-white rounded-lg shadow-md border p-2 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-4">
          <span className="font-bold">عرض:</span>
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-3 py-1 ${displayMode === 'list' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setDisplayMode('list')}
            >
              قائمة الرسوم
            </button>
            <button
              className={`px-3 py-1 ${displayMode === 'student' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setDisplayMode('student')}
            >
              حسب الطالب
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 items-center flex-wrap">
          {/* Report dropdown */}
          <div className="relative inline-block" ref={reportDropdownRef}>
            <button
              onClick={() => setReportDropdownOpen(!reportDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 bg-[#800000] hover:bg-[#600000] text-white rounded-md transition-colors"
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
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            onClick={() => handleImportClick('fees')}
            title="استيراد الرسوم من ملف CSV"
          >
            <Upload size={16} />
            <span>استيراد</span>
          </button>
          
          <button
            type="button" 
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            onClick={handleExportFees}
            title="تصدير قائمة الرسوم"
          >
            <Download size={16} />
            <span>تصدير</span>
          </button>
        </div>
        {/* Inline compact filters */}
        <div className="flex items-center gap-1">
          <Filter size={16} className="text-gray-600" />
          <select
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <option value="all">الكل</option>
            {grades.filter((g) => g !== 'all').map((grade) => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">الأنواع</option>
            {FEE_TYPES.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">الحالة</option>
            <option value="paid">مدفوع</option>
            <option value="partial">جزئي</option>
            <option value="unpaid">غير مدفوع</option>
          </select>
          <select
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="all">الطلبة</option>
            {studentList.map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
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
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md border overflow-hidden">
            <div className="p-2 bg-gray-50 border-b flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <User size={20} className="text-primary" />
                <h2 className="text-lg font-bold text-gray-800">الرسوم حسب الطالب</h2>
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {studentFeeGroups.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <input
                    type="text"
                    value={studentViewSearch}
                    onChange={(e) => { setStudentViewSearch(e.target.value); setStudentViewPage(1); }}
                    className="outline-none text-sm"
                    placeholder="بحث باسم الطالب"
                  />
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">النتائج: {(() => {
                    const base = studentFeeGroups || [];
                    const filtered = studentViewSearch.trim() ? base.filter(s => (s.studentName || '').toLowerCase().includes(studentViewSearch.trim().toLowerCase())) : base;
                    return filtered.length;
                  })()}</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-600">عدد الطلبة في الصفحة:</span>
                  <select value={studentViewPageSize} onChange={(e) => { setStudentViewPageSize(Number(e.target.value)); setStudentViewPage(1); }} className="px-2 py-1 border rounded-md text-sm">
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          {studentFeeGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              لا توجد رسوم مطابقة لمعايير البحث
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[72vh]">
              {(() => {
                const base = studentFeeGroups || [];
                const filtered = studentViewSearch.trim() ? base.filter(s => (s.studentName || '').toLowerCase().includes(studentViewSearch.trim().toLowerCase())) : base;
                const totalPages = Math.max(1, Math.ceil(filtered.length / studentViewPageSize));
                const current = Math.min(studentViewPage, totalPages);
                const start = (current - 1) * studentViewPageSize;
                return filtered.slice(start, start + studentViewPageSize);
              })().map(student => (
                <div key={student.studentId} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div 
                  className="p-4 border-b bg-gray-50 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleStudentExpanded(student.studentId)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      checked={isAllStudentFeesSelected(student)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectAllStudentFees(student, e.target.checked);
                      }}
                      title="اختيار جميع رسوم هذا الطالب"
                    />
                    {expandedStudents[student.studentId] ? (
                      <ChevronDown size={20} className="text-gray-600" />
                    ) : (
                      <ChevronUp size={20} className="text-gray-600" />
                    )}
                    <div>
                      <div className="font-bold text-lg break-words whitespace-normal leading-tight max-w-[420px] sm:max-w-[520px]">
                        {student.studentName}
                      </div>
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
                          <h3 className="text-base font-bold">الرسوم الدراسية</h3>
                          {student.expandedSections.tuition ? (
                            <ChevronDown size={16} className="text-gray-600" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-600" />
                          )}
                        </div>
                        
                        {student.expandedSections.tuition && (
                          <div className="overflow-x-auto max-h-40 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200 border rounded-lg text-xs">
                              <thead className="bg-gradient-to-r from-white via-gray-50 to-gray-100">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                      checked={isAllStudentFeesSelected(student)}
                                      onChange={(e) => handleSelectAllStudentFees(student, e.target.checked)}
                                      title="اختيار الكل"
                                    />
                                  </th>
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
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                        checked={selectedFees.has(fee.id)}
                                        onChange={(e) => handleFeeCheckboxChange(fee.id, e.target.checked)}
                                        disabled={!includeUnpaidInBulk && fee.status !== 'paid' && fee.status !== 'partial'}
                                        title={!includeUnpaidInBulk && fee.status !== 'paid' && fee.status !== 'partial' ? 'لا يمكن تحميل إيصال لرسوم غير مدفوعة' : 'اختيار للتحميل'}
                                      />
                                    </td>
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
                          <h3 className="text-base font-bold">رسوم النقل</h3>
                          {student.expandedSections.transportation ? (
                            <ChevronDown size={16} className="text-gray-600" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-600" />
                          )}
                        </div>
                        
                        {student.expandedSections.transportation && (
                          <div className="overflow-x-auto max-h-40 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200 border rounded-lg text-xs">
                              <thead className="bg-gradient-to-r from-white via-gray-50 to-gray-100">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                      checked={isAllStudentFeesSelected(student)}
                                      onChange={(e) => handleSelectAllStudentFees(student, e.target.checked)}
                                      title="اختيار الكل"
                                    />
                                  </th>
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
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                        checked={selectedFees.has(fee.id)}
                                        onChange={(e) => handleFeeCheckboxChange(fee.id, e.target.checked)}
                                        disabled={!includeUnpaidInBulk && fee.status !== 'paid' && fee.status !== 'partial'}
                                        title={!includeUnpaidInBulk && fee.status !== 'paid' && fee.status !== 'partial' ? 'لا يمكن تحميل إيصال لرسوم غير مدفوعة' : 'اختيار للتحميل'}
                                      />
                                    </td>
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
                          <h3 className="text-base font-bold">رسوم أخرى</h3>
                          {student.expandedSections.other ? (
                            <ChevronDown size={16} className="text-gray-600" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-600" />
                          )}
                        </div>
                        
                        {student.expandedSections.other && (
                          <div className="overflow-x-auto max-h-40 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200 border rounded-lg text-xs">
                              <thead className="bg-gradient-to-r from-white via-gray-50 to-gray-100">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-[#800000] uppercase tracking-wider">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                      checked={isAllStudentFeesSelected(student)}
                                      onChange={(e) => handleSelectAllStudentFees(student, e.target.checked)}
                                      title="اختيار الكل"
                                    />
                                  </th>
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
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                        checked={selectedFees.has(fee.id)}
                                        onChange={(e) => handleFeeCheckboxChange(fee.id, e.target.checked)}
                                        disabled={!includeUnpaidInBulk && fee.status !== 'paid' && fee.status !== 'partial'}
                                        title={!includeUnpaidInBulk && fee.status !== 'paid' && fee.status !== 'partial' ? 'لا يمكن تحميل إيصال لرسوم غير مدفوعة' : 'اختيار للتحميل'}
                                      />
                                    </td>
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
              ))}
            </div>
          )}
          {studentFeeGroups.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="flex items-center gap-3">
                <button type="button" className="px-3 py-1 bg-white border rounded-md text-sm" onClick={() => setStudentViewPage((p) => Math.max(1, p - 1))}>السابق</button>
                {(() => {
                  const base = studentFeeGroups || [];
                  const filtered = studentViewSearch.trim() ? base.filter(s => (s.studentName || '').toLowerCase().includes(studentViewSearch.trim().toLowerCase())) : base;
                  const total = Math.max(1, Math.ceil(filtered.length / studentViewPageSize));
                  const current = Math.min(studentViewPage, total);
                  const start = Math.max(1, current - 2);
                  const end = Math.min(total, current + 2);
                  const seq: number[] = [];
                  if (start > 1) seq.push(1, -1);
                  for (let p = start; p <= end; p++) seq.push(p);
                  if (end < total) seq.push(-2, total);
                  return (
                    <div className="flex items-center gap-1">
                      {seq.map((p, i) => p > 0 ? (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setStudentViewPage(p)}
                          className={`px-3 py-1 rounded-md text-sm border ${p === current ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                        >{p}</button>
                      ) : (
                        <span key={i} className="px-2 text-gray-500">…</span>
                      ))}
                    </div>
                  );
                })()}
                <button type="button" className="px-3 py-1 bg-white border rounded-md text-sm" onClick={() => setStudentViewPage((p) => {
                  const base = studentFeeGroups || [];
                  const filtered = studentViewSearch.trim() ? base.filter(s => (s.studentName || '').toLowerCase().includes(studentViewSearch.trim().toLowerCase())) : base;
                  const total = Math.max(1, Math.ceil(filtered.length / studentViewPageSize));
                  return Math.min(total, p + 1);
                })}>التالي</button>
              </div>
              <div className="text-xs text-gray-500">
                {(() => {
                  const base = studentFeeGroups || [];
                  const filtered = studentViewSearch.trim() ? base.filter(s => (s.studentName || '').toLowerCase().includes(studentViewSearch.trim().toLowerCase())) : base;
                  const total = filtered.length;
                  const current = Math.min(studentViewPage, Math.max(1, Math.ceil(total / studentViewPageSize)));
                  const start = (current - 1) * studentViewPageSize + 1;
                  const end = Math.min(total, start - 1 + studentViewPageSize);
                  return `عرض ${start}-${end} من ${total} طلبة`;
                })()}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* List View */}
      {displayMode === 'list' && (
        <div className="bg-white rounded-lg shadow-md border overflow-hidden">
          <div className="p-2 bg-gray-50 border-b flex items-center justify-between gap-2">
            <CreditCard size={20} className="text-primary" />
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-800">قائمة الرسوم</h2>
              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                {filteredFees.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <input
                  type="text"
                  value={feesSearch}
                  onChange={(e) => { setFeesSearch(e.target.value); setFeesPage(1); }}
                  className="outline-none text-sm"
                  placeholder="بحث باسم الطالب"
                />
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">النتائج: {(() => {
                  const base = filteredFees || [];
                  const filtered = feesSearch.trim() ? base.filter(f => (f.studentName || '').toLowerCase().includes(feesSearch.trim().toLowerCase())) : base;
                  return filtered.length;
                })()}</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-600">عدد الصفوف:</span>
                <select value={feesPageSize} onChange={(e) => { setFeesPageSize(Number(e.target.value)); setFeesPage(1); }} className="px-2 py-1 border rounded-md text-sm">
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
          
          {filteredFees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              لا توجد رسوم مطابقة لمعايير البحث
            </div>
          ) : (
            <div className="overflow-auto max-h-[72vh]">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gradient-to-r from-white via-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-[#800000] uppercase tracking-wider">
                      الطالب
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-[#800000] uppercase tracking-wider">
                      الصف
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-[#800000] uppercase tracking-wider">
                      نوع الرسوم
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-[#800000] uppercase tracking-wider">
                      المبلغ
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-[#800000] uppercase tracking-wider">
                      المدفوع
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-[#800000] uppercase tracking-wider">
                      المتبقي
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-[#800000] uppercase tracking-wider">
                      الحالة
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-[#800000] uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const base = filteredFees || [];
                    const filtered = feesSearch.trim() ? base.filter(f => (f.studentName || '').toLowerCase().includes(feesSearch.trim().toLowerCase())) : base;
                    const totalPages = Math.max(1, Math.ceil(filtered.length / feesPageSize));
                    const clampedPage = Math.min(feesPage, totalPages);
                    const start = (clampedPage - 1) * feesPageSize;
                    return filtered.slice(start, start + feesPageSize);
                  })().map((fee) => (
                    <tr key={fee.id} className="hover:bg-gray-50">
                      <td className="px-3 py-1 whitespace-nowrap">
                                  <div className="font-medium text-gray-900 break-words whitespace-normal leading-snug text-sm max-w-[380px] sm:max-w-[460px]">{fee.studentName}</div>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="text-gray-500">{fee.grade}</div>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
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
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="text-gray-900 font-medium">{fee.amount.toLocaleString()} {CURRENCY}</div>
                        {fee.discount > 0 && (
                          <div className="text-xs text-green-600">
                            خصم: {fee.discount.toLocaleString()} {CURRENCY}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="text-green-600">{fee.paid.toLocaleString()} {CURRENCY}</div>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className={`${fee.balance > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {fee.balance.toLocaleString()} {CURRENCY}
                        </div>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(fee.status)}`}>
                          {getStatusLabel(fee.status)}
                        </span>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
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
          {filteredFees.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="flex items-center gap-3">
                <button type="button" className="px-3 py-1 bg-white border rounded-md text-sm" onClick={() => setFeesPage((p) => Math.max(1, p - 1))}>السابق</button>
                {(() => {
                  const base = filteredFees || [];
                  const filtered = feesSearch.trim() ? base.filter(f => (f.studentName || '').toLowerCase().includes(feesSearch.trim().toLowerCase())) : base;
                  const total = Math.max(1, Math.ceil(filtered.length / feesPageSize));
                  const current = Math.min(feesPage, total);
                  const start = Math.max(1, current - 2);
                  const end = Math.min(total, current + 2);
                  const seq: number[] = [];
                  if (start > 1) seq.push(1, -1);
                  for (let p = start; p <= end; p++) seq.push(p);
                  if (end < total) seq.push(-2, total);
                  return (
                    <div className="flex items-center gap-1">
                      {seq.map((p, i) => p > 0 ? (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFeesPage(p)}
                          className={`px-3 py-1 rounded-md text-sm border ${p === current ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                        >{p}</button>
                      ) : (
                        <span key={i} className="px-2 text-gray-500">…</span>
                      ))}
                    </div>
                  );
                })()}
                <button type="button" className="px-3 py-1 bg-white border rounded-md text-sm" onClick={() => setFeesPage((p) => {
                  const base = filteredFees || [];
                  const filtered = feesSearch.trim() ? base.filter(f => (f.studentName || '').toLowerCase().includes(feesSearch.trim().toLowerCase())) : base;
                  const total = Math.max(1, Math.ceil(filtered.length / feesPageSize));
                  return Math.min(total, p + 1);
                })}>التالي</button>
              </div>
              <div className="text-xs text-gray-500">
                {(() => {
                  const base = filteredFees || [];
                  const filtered = feesSearch.trim() ? base.filter(f => (f.studentName || '').toLowerCase().includes(feesSearch.trim().toLowerCase())) : base;
                  const total = filtered.length;
                  const current = Math.min(feesPage, Math.max(1, Math.ceil(total / feesPageSize)));
                  const start = (current - 1) * feesPageSize + 1;
                  const end = Math.min(total, start - 1 + feesPageSize);
                  return `عرض ${start}-${end} من ${total} رسوم`;
                })()}
              </div>
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
          setSelectedStudentId(null); // Reset selected student ID
        }}
        onConfirm={handlePayAllFeesConfirm}
        studentName={selectedStudentName}
        totalAmount={selectedStudentTotalAmount}
      />
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen} title='تنبيه' message={alertMessage} />
    </div>
  );
};

export default Fees;
 