import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash, Upload, Download, Search, CheckSquare, Square } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { TRANSPORTATION_TYPES, GRADE_LEVELS, CURRENCY } from '../../../utils/constants';
import * as hybridApi from '../../../services/hybridApi';
import SimpleImportDialog from '../../../components/SimpleImportDialog';
import ImportDialog from '../../../components/ImportDialog';
import { parseCSV, excelToCSV, processImportedStudents, generateStudentTemplateCSV } from '../../../services/importExport';
import { AlertDialog } from '../../../components/ui/Dialog';

interface Student {
  id: string;
  name: string;
  parentNameArabic?: string;
  parentNameEnglish?: string;
  thirdName?: string;
  lastName?: string;
  englishLastName?: string;
  studentId: string;
  grade: string;
  division?: string;
  parentName: string;
  parentEmail?: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  transportation: 'none' | 'one-way' | 'two-way';
  transportationDirection?: 'to-school' | 'from-school';
  schoolId: string;
}

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const [settings, setSettings] = useState({
    transportationFeeOneWay: 150,
    transportationFeeTwoWay: 300
  });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [simpleImportDialogOpen, setSimpleImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{studentsCount: number; feesCount: number; installmentsCount?: number} | null>(null);
  
  // Bulk selection functionality
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const { user } = useSupabaseAuth();
  const location = useLocation();

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Define fetchStudents outside the useEffect to make it accessible to handleDelete
  const fetchStudentsData = async () => {
    setIsLoading(true);
    
    try {
      let response;
      if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
        response = await hybridApi.getStudents(user.schoolId, user.gradeLevels);
      } else {
        response = await hybridApi.getStudents(user?.schoolId);
      }
      
      console.log('Fetched students response:', response);
      
      if (response.success && response.data) {
        setStudents(response.data);
      } else {
        console.error('Failed to fetch students:', response.error);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get school settings
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
    
    fetchSettings();
    
    fetchStudentsData();
    
    // Note: hybridApi doesn't have a subscription mechanism like dataStore
    // Data will be refreshed when component mounts, when operations are performed, or when navigating back to this page
  }, [user, location.pathname]);

  // Effect to filter students based on search and grade
  useEffect(() => {
    let result = students;
    
    // Apply grade filter
    if (gradeFilter !== 'all') {
      result = result.filter((student) => student.grade === gradeFilter);
    }
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((student) => 
        ([student.name, student.thirdName, student.lastName].filter(Boolean).join(' ').toLowerCase().includes(searchLower)) ||
        student.studentId.toLowerCase().includes(searchLower) ||
        student.parentName.toLowerCase().includes(searchLower) ||
        student.phone.includes(searchTerm)
      );
    }
    
    setFilteredStudents(result);
    setCurrentPage(1); // Reset to first page on filter change
    
    // Clear selections when filter changes
    setSelectedStudents([]);
    setSelectAll(false);
  }, [students, searchTerm, gradeFilter]);

  // Get unique grades for filter
  const grades = ['all', ...Array.from(new Set((students || []).map((student) => student.grade)))];

  const fullName = (s: Student) => [s.name, s.thirdName, s.lastName].filter(Boolean).join(' ');

  const handleImportSuccess = (result: { studentsCount: number, feesCount: number, installmentsCount?: number }) => {
    // Store result
    setImportResult(result);
  };

  const handleAdvancedImport = () => {
    setImportDialogOpen(true);
    setImportResult(null);
  };
  
  const handleSimpleImportStudents = () => {
    setSimpleImportDialogOpen(true);
    setImportResult(null);
  };

  // Pagination
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Handle single student delete
  const handleDelete = (student: Student) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
  };

  // Confirm single student delete
  const confirmDelete = async () => {
    if (selectedStudent) {
      try {
        const response = await hybridApi.deleteStudent(selectedStudent.id);
        
        if (response.success) {
          // Update the UI immediately
          setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
          setFilteredStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
          
          setShowDeleteModal(false);
          setSelectedStudent(null);
        } else {
          console.error('Failed to delete student:', response.error);
          setAlertMessage('حدث خطأ أثناء حذف الطالب');
          setAlertOpen(true);
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        setAlertMessage('حدث خطأ أثناء حذف الطالب');
        setAlertOpen(true);
      }
    }
  };
  
  // Toggle selection of a student
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };
  
  // Toggle select all students on current page
  const toggleSelectAll = () => {
    if (selectAll) {
      // If all are selected, deselect all
      setSelectedStudents([]);
    } else {
      // Select all students on the current page
      const currentIds = currentStudents.map(student => student.id);
      setSelectedStudents(currentIds);
    }
    setSelectAll(!selectAll);
  };
  
  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    
    try {
      // Delete all selected students one by one
      const deletePromises = selectedStudents.map(async (id) => {
        const response = await hybridApi.deleteStudent(id);
        if (!response.success) {
          throw new Error(`Failed to delete student ${id}: ${response.error}`);
        }
        return response;
      });
      
      await Promise.all(deletePromises);
      
      // Update the UI immediately
      setStudents(prev => prev.filter(s => !selectedStudents.includes(s.id)));
      setFilteredStudents(prev => prev.filter(s => !selectedStudents.includes(s.id)));
      
      // Reset selection state
      setSelectedStudents([]);
      setSelectAll(false);
      setShowBulkDeleteModal(false);
      
      setAlertMessage(`تم حذف ${selectedStudents.length} طالب بنجاح`);
      setAlertOpen(true);
    } catch (error) {
      console.error('Error bulk deleting students:', error);
      setAlertMessage('حدث خطأ أثناء حذف الطلاب');
      setAlertOpen(true);
    }
  };

  

  // Add a function to export students to CSV
  const handleExportStudents = () => {
    try {
      // Create BOM for UTF-8
      const BOM = "\uFEFF";
      
      // Define headers
      const headers = [
        'رقم الطالب',
        'الاسم الكامل',
        'الاسم الإنجليزي',
        'الصف',
        'الشعبة',
        'اسم ولي الأمر',
        'رقم الهاتف',
        'واتساب',
        'العنوان',
        'وسيلة النقل',
        'رسوم النقل'
      ];
      
      // Map students to CSV rows
      const rows = filteredStudents.map(student => {
        // Get transportation in Arabic
        const transportationArabic = TRANSPORTATION_TYPES.find(t => t.id === student.transportation)?.name || '';
        
        // Calculate transportation fees based on type
        let transportationFees = 0;
        if (student.transportation === 'one-way') {
          transportationFees = settings.transportationFeeOneWay || 0;
        } else if (student.transportation === 'two-way') {
          transportationFees = settings.transportationFeeTwoWay || 0;
        }
        
        // Escape CSV fields by wrapping in quotes and escaping internal quotes
        const escapeCSVField = (field: string | number) => {
          const str = String(field || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        };
        
        const fullName = [student.name, student.thirdName, student.lastName].filter(Boolean).join(' ');
        const fullEnglishName = [student.englishName || '', student.englishLastName || ''].filter(Boolean).join(' ').trim();
        return [
          escapeCSVField(student.studentId),
          escapeCSVField(fullName),
          escapeCSVField(fullEnglishName),
          escapeCSVField(student.grade),
          escapeCSVField(student.division || ''),
          escapeCSVField(student.parentName),
          escapeCSVField(student.phone),
          escapeCSVField(student.whatsapp || ''),
          escapeCSVField(student.address || ''),
          escapeCSVField(transportationArabic),
          escapeCSVField(transportationFees)
        ].join(',');
      });
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows
      ].join('\n');
      
      // Get current year for filename
      const currentYear = new Date().getFullYear();
      
      // Create a blob and download
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `كشف_الطلبة_${currentYear}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting students:', error);
      setAlertMessage('حدث خطأ أثناء تصدير قائمة الطلاب');
      setAlertOpen(true);
    }
  };

  const handleExportStudentTemplate = async () => {
    try {
      const csv = generateStudentTemplateCSV();
      const defaultName = `نموذج_استيراد_الطلاب_${new Date().getFullYear()}.csv`;
      if ((window as any).electronAPI?.showSaveDialog && (window as any).electronAPI?.saveFile) {
        const saveResp = await (window as any).electronAPI.showSaveDialog({
          title: 'حفظ نموذج استيراد الطلاب',
          filters: [{ name: 'CSV', extensions: ['csv'] }],
          defaultPath: defaultName
        });
        const filePath = saveResp?.filePath || saveResp;
        if (!filePath) return;
        const encoder = new TextEncoder();
        await (window as any).electronAPI.saveFile(filePath, encoder.encode(csv));
      } else {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting student template:', error);
      setAlertMessage('حدث خطأ أثناء تصدير نموذج الطلاب');
      setAlertOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-blue-50/80 via-slate-50/60 to-gray-50/40 rounded-lg p-3 border border-gray-200/50 shadow">
        {/* Professional Header Title */}
        <div className="flex items-center space-x-4 space-x-reverse mb-6">
          <div className="bg-[#800000] p-3 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-heading mb-1">إدارة الطلاب</h1>
              <p className="text-gray-600 text-sm font-medium">عرض وإدارة بيانات الطلاب المسجلين</p>
          </div>
        </div>
        
        {/* Action Buttons - RTL Layout */}
        <div className="flex flex-wrap gap-2 justify-start">
          <Link
            to="/school/students/new"
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Plus size={18} />
            <span className="font-medium">إضافة طالب</span>
          </Link>
          
          <button
            onClick={() => setImportDialogOpen(true)}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Upload size={18} />
            <span className="font-medium">استيراد متقدم</span>
          </button>
          <button
            onClick={handleExportStudentTemplate}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
            title="تصدير نموذج CSV للطلاب"
          >
            <Download size={18} />
            <span className="font-medium">تصدير نموذج</span>
          </button>
          

          
          <button
            onClick={handleExportStudents}
            className="px-5 py-2.5 bg-[#800000] text-white rounded-lg hover:bg-[#700000] focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Download size={18} />
            <span className="font-medium">تصدير</span>
          </button>
        </div>
      </div>
      
      {!user?.schoolId && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-600">
              <strong>تحذير:</strong> المستخدم غير مرتبط بمدرسة. لن تتمكن من استيراد البيانات. يرجى التواصل مع المدير لربط حسابك بمدرسة.
            </div>
          </div>
        </div>
      )}
      
      {/* Search, Filter, Page Size, and Top Navigation */}
      <div className="my-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="بحث عن طالب..."
              className="w-full h-9 px-2 pr-8 border border-gray-300 rounded focus:border-[#800000] focus:ring-[#800000] text-sm"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            <div className="absolute left-2.5 top-2 text-gray-400">
              <Search size={16} />
            </div>
          </div>
          <select
            className="h-9 px-2 border border-gray-300 rounded focus:border-[#800000] focus:ring-[#800000] text-sm"
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setCurrentPage(1); }}
          >
            {grades.map((grade) => (
              <option key={grade} value={grade}>
                {grade === 'all' ? 'جميع الصفوف' : grade}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">عدد الطلبة:</span>
            <select
              className="h-9 px-2 border border-gray-300 rounded focus:border-[#800000] focus:ring-[#800000] text-sm"
              value={studentsPerPage}
              onChange={(e) => { setStudentsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            className="h-9 px-3 py-1 bg-white border rounded text-sm"
          >السابق</button>
          {(() => {
            const total = totalPages;
            const current = currentPage;
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
                    onClick={() => handlePageChange(p)}
                    className={`h-9 px-3 py-1 rounded text-sm border ${p === current ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                  >{p}</button>
                ) : (
                  <span key={i} className="px-2 text-gray-500">…</span>
                ))}
              </div>
            );
          })()}
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            className="h-9 px-3 py-1 bg-white border rounded text-sm"
          >التالي</button>
        </div>
      </div>
      
      {/* Bulk Actions */}
      {selectedStudents.length > 0 && (
        <div className="bg-gray-100 p-3 rounded-md flex justify-between items-center">
          <div>
            <span className="font-medium">تم تحديد {selectedStudents.length} طالب</span>
          </div>
          <div>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
            >
              <Trash size={16} />
              <span>حذف المحدد</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Students Table */}
      <div className="overflow-auto max-h-[66vh] bg-white rounded-lg shadow-xl shadow-[#800000]/15 border border-[#800000]/10">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-br from-white via-gray-50 to-gray-100">
            <tr>
              <th className="px-3 py-3 text-center">
                <button onClick={toggleSelectAll} className="text-gray-500 hover:text-[#800000]">
                  {selectAll ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              </th>
              <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                  اسم الطالب
                </th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                  الاسم الإنجليزي
                </th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                  رقم الطالب
                </th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                  الصف
                </th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                  ولي الأمر
                </th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                  رقم الهاتف
                </th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                  واتساب
                </th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                  العنوان
                </th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#800000] uppercase tracking-wider">
                  إجراءات
                </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentStudents.length > 0 ? (
              currentStudents.map((student, index) => (
                <tr key={student.id} className="hover:bg-[#800000]/5">
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => toggleStudentSelection(student.id)}
                      className="text-gray-500 hover:text-[#800000]"
                    >
                      {selectedStudents.includes(student.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {indexOfFirstStudent + index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{fullName(student)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.englishName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.studentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.grade} {student.division && `- ${student.division}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.parentNameArabic || student.parentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.whatsapp || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <Link
                        to={`/school/students/${student.id}`}
                        className="text-[#800000] hover:text-[#600000]"
                        title="تعديل"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(student)}
                        className="text-red-600 hover:text-red-900"
                        title="حذف"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-6 py-4 text-center text-gray-500">
                  لا يوجد طلاب مطابقين للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {filteredStudents.length > 0 && (
        <div className="mt-2 flex justify-end">
          <div className="text-xs text-gray-600">
            {(() => {
              const total = filteredStudents.length;
              const start = (currentPage - 1) * studentsPerPage + 1;
              const end = Math.min(total, start - 1 + studentsPerPage);
              return `عرض ${start}-${end} من ${total} طلبة`;
            })()}
          </div>
        </div>
      )}
      
      {/* Single Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-[#800000]">تأكيد الحذف</h3>
            <p className="mb-6">
              هل أنت متأكد من رغبتك في حذف الطالب <strong>{selectedStudent.name}</strong>؟ سيتم حذف جميع البيانات المتعلقة بهذا الطالب بما في ذلك الرسوم والمدفوعات.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-[#800000]">تأكيد حذف متعدد</h3>
            <p className="mb-6">
              هل أنت متأكد من رغبتك في حذف <strong>{selectedStudents.length}</strong> طالب؟ سيتم حذف جميع البيانات المتعلقة بهؤلاء الطلاب بما في ذلك الرسوم والمدفوعات.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                حذف {selectedStudents.length} طالب
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Import Dialogs */}
      {user?.schoolId && (
        <>
          <SimpleImportDialog
            isOpen={simpleImportDialogOpen}
            onClose={() => setSimpleImportDialogOpen(false)}
            schoolId={user.schoolId}
            onSuccess={handleImportSuccess}
          />
          
          <ImportDialog
            isOpen={importDialogOpen}
            onClose={() => setImportDialogOpen(false)}
            onSuccess={handleImportSuccess}
            templateGenerator={generateStudentTemplateCSV}
            templateFileName="نموذج_استيراد_الطلاب.csv"
            schoolId={user.schoolId}
            importType="students"
          />
        </>
      )}
      
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen} title='تنبيه' message={alertMessage} />
    </div>
  );
};

export default Students;
 
