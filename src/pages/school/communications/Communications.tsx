import React, { useState, useEffect, useRef } from 'react';
import { Send, Filter, MessageSquare, RefreshCw, AlertCircle, Download, AlertTriangle, Calendar, X, Eye } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { CURRENCY } from '../../../utils/constants';
import * as hybridApiMessages from '../../../services/hybridApi';
import * as hybridApi from '../../../services/hybridApi';
import whatsappService from '../../../services/whatsapp';

import { formatDate } from '../../../utils/formatters';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/Dialog';

// Define all interfaces to ensure type safety
interface Student {
  id: string;
  name: string;
  grade: string;
  parentName: string;
  phone: string;
}

interface Fee {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  balance: number;
  feeType: string;
  status: 'paid' | 'partial' | 'unpaid';
  description?: string;
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
  amount: number;
  dueDate: string;
  status: string;
  feeType: string;
  paidAmount?: number;
  checkNumber?: string;
  checkDate?: string;
  bankNameArabic?: string;
  bankNameEnglish?: string;
}

interface Message {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  parentName: string;
  phone: string;
  recipient: string; // Required field for database
  template: string;
  message: string;
  sentAt: string;
  status: 'delivered' | 'failed' | 'pending';
  schoolId: string;
  messageType?: 'admin_notification' | 'school_communication';
}

interface MessageTemplate {
  id: string;
  name: string;
  message: string;
}

const Communications = () => {
  const { user } = useSupabaseAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [selectedStudentFees, setSelectedStudentFees] = useState<Fee[]>([]);
  const [selectedStudentInstallments, setSelectedStudentInstallments] = useState<Installment[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Online status is now managed in the main header
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Filter and selection state
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Message composition state
  const [messageText, setMessageText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [previewAmount, setPreviewAmount] = useState(0);
  const [previewDate, setPreviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeFinancialTab, setActiveFinancialTab] = useState<'fees' | 'installments' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [selectAllMessages, setSelectAllMessages] = useState(false);
  
  const messagePreviewRef = useRef<HTMLDivElement>(null);

  const getFeeTypeLabel = (type: string) => {
    if (!type) return '';
    if (type === 'transportation_and_tuition') return 'رسوم مدمجة';
    if (type === 'tuition') return 'رسوم دراسية';
    if (type === 'transportation') return 'نقل مدرسي';
    return type;
  };
  
  // Custom templates state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<MessageTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateMessage, setNewTemplateMessage] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  // Predefined message templates
  const messageTemplates: MessageTemplate[] = [
    {
      id: '1',
      name: 'تذكير بموعد القسط',
      message: 'الفاضل ولي الامر المحترم\n\nنود افادتكم بموعد سداد القسط المستحق على الطالب اسم الطالب و البالغ قدره المبلغ ريال عماني بتاريخ التاريخ. لذا نرجو منكم التكرم بسداد المبلغ.\n\nشاكرين لكم تعاونكم'
    },
    {
      id: '2',
      name: 'إشعار بتأخر سداد',
      message: 'الفاضل ولي الامر المحترم\n\nنود افادتكم بأن القسط المستحق على الطالب اسم الطالب بمبلغ المبلغ ريال عماني قد تأخر سداده. لذا نرجو منكم التكرم بسداد المبلغ في أقرب وقت ممكن.\n\nشاكرين لكم تعاونكم'
    },
    {
      id: '3',
      name: 'تأكيد استلام الدفعة',
      message: 'الفاضل ولي الامر المحترم\n\nنشكركم على سداد الدفعة المستحقة للطالب اسم الطالب بمبلغ المبلغ ريال عماني بتاريخ التاريخ.\n\nشاكرين لكم تعاونكم'
    },
    {
      id: '4',
      name: 'معلومات عامة',
      message: 'الفاضل ولي الامر المحترم\n\nنود إعلامكم بخصوص الطالب اسم الطالب، بأن هناك معلومات هامة. للاستفسار يرجى التواصل على هاتف المدرسة.\n\nشاكرين لكم تعاونكم'
    },
    {
       id: '5',
       name: 'تذكير بالرسوم الدراسية',
       message: 'الفاضل ولي الامر المحترم\n\nنود افادتكم بموعد سداد الرسوم الدراسية المستحقة على الطالب اسم الطالب و البالغ قدرها المبلغ ريال عماني بتاريخ التاريخ. لذا نرجو منكم التكرم بسداد المبلغ.\n\nشاكرين لكم تعاونكم'
     },
     {
       id: '6',
       name: 'إشعار بتأخر سداد الرسوم الدراسية',
       message: 'الفاضل ولي الامر المحترم\n\nنود افادتكم بأن الرسوم الدراسية المستحقة على الطالب اسم الطالب بمبلغ المبلغ ريال عماني قد تأخر سدادها. لذا نرجو منكم التكرم بسداد المبلغ في أقرب وقت ممكن.\n\nشاكرين لكم تعاونكم'
     },
     {
       id: '7',
       name: 'تأكيد استلام الرسوم الدراسية',
       message: 'الفاضل ولي الامر المحترم\n\nنشكركم على سداد الرسوم الدراسية المستحقة للطالب اسم الطالب بمبلغ المبلغ ريال عماني بتاريخ التاريخ.\n\nشاكرين لكم تعاونكم'
     }
  ];
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Get students using hybridApi for proper field mapping
        let studentsResponse;
        if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
          studentsResponse = await hybridApi.getStudents(user?.schoolId || '', user.gradeLevels);
        } else {
          studentsResponse = await hybridApi.getStudents(user?.schoolId || '');
        }
        
        if (studentsResponse.success && studentsResponse.data) {
          setStudents(studentsResponse.data);
        } else {
          console.error('Failed to fetch students:', studentsResponse.error);
          setStudents([]);
        }
        
        // Get messages with detailed logging
        try {
          const messagesResponse = await hybridApiMessages.getMessages(
            user?.schoolId || '',
            undefined,
            user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels : undefined
          );
          if (messagesResponse?.success && messagesResponse?.data) {
            setMessages(messagesResponse.data);
          } else {
            console.error('Failed to fetch messages:', messagesResponse?.error);
            setMessages([]);
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
          setMessages([]);
        }
        
        // Get fees and installments
        try {
          const feesResponse = await hybridApi.getFees(
            user?.schoolId,
            undefined,
            user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels : undefined
          );
          if (feesResponse?.success && feesResponse?.data) {
            let fetchedFees = feesResponse.data;
            // Filter by grade levels for grade managers
            if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
              // Get students for grade filtering
              const studentsForFilter = await hybridApi.getStudents(user.schoolId);
              if (studentsForFilter?.success && studentsForFilter?.data) {
                const gradeStudentIds = studentsForFilter.data
                  .filter(s => user.gradeLevels?.includes(s.grade))
                  .map(s => s.id);
                fetchedFees = fetchedFees.filter(fee => gradeStudentIds.includes(fee.studentId));
              }
            }
            // Normalize fees to avoid double counting when combined fee exists
            // If a student has 'transportation_and_tuition', exclude separate 'tuition' and 'transportation' lines
            const studentsWithCombined = new Set(
              (fetchedFees || [])
                .filter((fee: any) => fee.feeType === 'transportation_and_tuition')
                .map((fee: any) => fee.studentId)
            );
            const normalizedFees = (fetchedFees || []).filter((fee: any) => {
              if (studentsWithCombined.has(fee.studentId)) {
                return fee.feeType !== 'tuition' && fee.feeType !== 'transportation';
              }
              return true;
            });
            setFees(normalizedFees);
          } else {
            console.error('Failed to fetch fees:', feesResponse?.error);
            setFees([]);
          }
          
          const installmentsResponse = await hybridApi.getInstallments(
            user?.schoolId,
            undefined,
            undefined,
            user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels : undefined
          );
        if (installmentsResponse?.success && installmentsResponse?.data) {
          let fetchedInstallments = installmentsResponse.data;
            // Filter by grade levels for grade managers
            if (user?.role === 'gradeManager' && user?.gradeLevels && user.gradeLevels.length > 0) {
              // Get students for grade filtering
              const studentsForFilter = await hybridApi.getStudents(user.schoolId);
              if (studentsForFilter?.success && studentsForFilter?.data) {
                const gradeStudentIds = studentsForFilter.data
                  .filter(s => user.gradeLevels?.includes(s.grade))
                  .map(s => s.id);
                fetchedInstallments = fetchedInstallments.filter(inst => gradeStudentIds.includes(inst.studentId));
              }
            }
          setInstallments(fetchedInstallments);
        } else {
          console.error('Failed to fetch installments:', installmentsResponse?.error);
          setInstallments([]);
        }
        } catch (error) {
          console.error('Error fetching fees and installments:', error);
          setFees([]);
          setInstallments([]);
        }
        
        // Get custom templates
        try {
          setIsLoadingTemplates(true);
          const templatesResponse = await hybridApiMessages.getTemplates(user?.schoolId);
          if (templatesResponse?.success && templatesResponse?.data) {
            // Convert templates to message templates format
            const messageTemplates = templatesResponse.data.map((t: any) => ({
              id: t.id,
              name: t.name,
              message: convertTemplateToArabicDisplay(t.content)
            }));
            setCustomTemplates(messageTemplates);
          } else {
            console.error('Failed to fetch templates:', templatesResponse?.error);
            setCustomTemplates([]);
          }
        } catch (templateError) {
          console.error('Error loading templates:', templateError);
          setCustomTemplates([]);
        } finally {
          setIsLoadingTemplates(false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setIsLoading(false);
        // Initialize active tab after data load
        setActiveFinancialTab(prev => {
          if (prev) return prev;
          if (fees.length > 0) return 'fees';
          if (installments.length > 0) return 'installments';
          return null;
        });
      }
    };
    
    loadData();
    
    // Set up auto-refresh interval for messages
    let isMounted = true;
    const messageRefreshInterval = setInterval(async () => {
      try {
        if (isMounted) {
          const messagesResponse = await hybridApiMessages.getMessages(
            user?.schoolId || '',
            undefined,
            user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels : undefined
          );
          if (messagesResponse?.success && messagesResponse?.data) {
            if (messagesResponse.data.length !== messages.length) {
              setMessages(messagesResponse.data);
            }
          }
        }
      } catch (err) {
        console.error('Error in auto-refresh:', err);
      }
    }, 10000); // Refresh every 10 seconds
    
    // Note: Removed dataStore subscription as we're now using hybridApi for all operations
    
    return () => {
      isMounted = false;
      clearInterval(messageRefreshInterval);
    };
  }, [user]);
  
  // Apply grade filter
  useEffect(() => {
    if (selectedGrade === 'all') {
      setFilteredStudents(students);
    } else {
      setFilteredStudents(students.filter(student => student.grade === selectedGrade));
    }
  }, [selectedGrade, students]);
  
  // Handle selectAll changes
useEffect(() => {
  if (selectAll) {
    setSelectedStudents(visibleStudents.map(student => student.id));
  } else {
    setSelectedStudents([]);
  }
}, [selectAll, filteredStudents, studentSearch]);
  
  // Handle selecting a message template
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    if (templateId) {
      // Check both predefined and custom templates
      const predefinedTemplate = messageTemplates.find(t => t.id === templateId);
      const customTemplate = customTemplates.find(t => t.id === templateId);
      
      if (predefinedTemplate) {
        // Predefined templates now use Arabic variables directly, no conversion needed
        setMessageText(predefinedTemplate.message);
      } else if (customTemplate) {
        // Custom templates are already in Arabic format
        setMessageText(customTemplate.message);
      }
    } else {
      setMessageText('');
    }
  };
  
  // Convert English template syntax to Arabic variable text for display
  const convertTemplateToArabicDisplay = (text: string): string => {
    const templateToArabicMap: Record<string, string> = {
      '{{name}}': 'اسم الطالب',
      '{{amount}}': 'المبلغ',
      '{{date}}': 'التاريخ',
      '{{parent}}': 'ولي الأمر',
      '{{grade}}': 'الصف'
    };
    
    let convertedText = text;
    Object.entries(templateToArabicMap).forEach(([template, arabic]) => {
      convertedText = convertedText.replace(new RegExp(template.replace(/[{}]/g, '\\$&'), 'g'), arabic);
    });
    
    return convertedText;
  };

  // Convert Arabic variable text to English template syntax
  const convertArabicVariablesToTemplate = (text: string): string => {
    const arabicToTemplateMap: Record<string, string> = {
      'اسم الطالب': '{{name}}',
      'المبلغ': '{{amount}}',
      'التاريخ': '{{date}}',
      'ولي الأمر': '{{parent}}',
      'الصف': '{{grade}}'
    };
    
    let convertedText = text;
    Object.entries(arabicToTemplateMap).forEach(([arabic, template]) => {
      convertedText = convertedText.replace(new RegExp(arabic, 'g'), template);
    });
    
    return convertedText;
  };

  // Insert variable at cursor position in template message
  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[placeholder*="نص الرسالة"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newTemplateMessage;
    
    // Map variables to Arabic display text
    const variableMap: Record<string, string> = {
      '{{name}}': 'اسم الطالب',
      '{{amount}}': 'المبلغ',
      '{{date}}': 'التاريخ',
      '{{parent}}': 'ولي الأمر',
      '{{grade}}': 'الصف'
    };
    
    // Insert the Arabic text
    const arabicText = variableMap[variable] || variable;
    const newText = text.substring(0, start) + arabicText + text.substring(end);
    
    setNewTemplateMessage(newText);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + arabicText.length, start + arabicText.length);
    }, 0);
  };

  // Handle saving a custom template
  const handleSaveTemplate = async () => {
    if (!newTemplateName || !newTemplateMessage) {
      setError('الرجاء إدخال اسم ونص القالب');
      return;
    }
    
    try {
      setIsLoadingTemplates(true);
      
      // Convert Arabic variable text to English template syntax before saving
      const templateContent = convertArabicVariablesToTemplate(newTemplateMessage);
      
      // Create template object for dataStore
      const templateData = {
        id: editingTemplateId || uuidv4(),  // Use proper UUID format
        name: newTemplateName,
        content: templateContent,
        type: 'message',
        school_id: user?.schoolId  // Use snake_case for database compatibility
      };
      
      // Save template using hybridApi
      const saveResponse = await hybridApiMessages.createTemplate(templateData);
      if (!saveResponse?.success) {
        throw new Error(saveResponse?.error || 'Failed to save template');
      }
      
      // Create message template for UI - keep Arabic display for user interface
      const newTemplate: MessageTemplate = {
        id: templateData.id,
        name: templateData.name,
        message: newTemplateMessage // Keep the Arabic display version for UI
      };
      
      let updatedTemplates: MessageTemplate[];
      
      if (editingTemplateId) {
        // Update existing template
        updatedTemplates = customTemplates.map(t => 
          t.id === editingTemplateId ? newTemplate : t
        );
      } else {
        // Add new template
        updatedTemplates = [...customTemplates, newTemplate];
      }
      
      setCustomTemplates(updatedTemplates);
      
      // For backward compatibility, also save to localStorage
      localStorage.setItem(`customTemplates_${user?.schoolId}`, JSON.stringify(updatedTemplates));
      
      // Reset form
      setNewTemplateName('');
      setNewTemplateMessage('');
      setEditingTemplateId(null);
      setShowTemplateEditor(false);
      
      toast.success('تم حفظ القالب بنجاح');
      
    } catch (err) {
      console.error('Error saving template:', err);
      setError('حدث خطأ أثناء حفظ القالب');
    } finally {
      setIsLoadingTemplates(false);
    }
  };
  
  // Handle editing a custom template
  const handleEditTemplate = (template: MessageTemplate) => {
    setNewTemplateName(template.name);
    setNewTemplateMessage(template.message); // Custom templates already use Arabic variables
    setEditingTemplateId(template.id);
    setShowTemplateEditor(true);
  };
  
  // Handle deleting a custom template
  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      try {
        setIsLoadingTemplates(true);
        
        // Delete template using hybridApi
        const deleteResponse = await hybridApiMessages.deleteTemplate(templateId);
        const success = deleteResponse?.success;
        
        if (success) {
          // Update UI
          const updatedTemplates = customTemplates.filter(t => t.id !== templateId);
          setCustomTemplates(updatedTemplates);
          
          // For backward compatibility, also update localStorage
          localStorage.setItem(`customTemplates_${user?.schoolId}`, JSON.stringify(updatedTemplates));
          
          toast.success('تم حذف القالب بنجاح');
        } else {
          toast.error('فشل حذف القالب');
        }
      } catch (err) {
        console.error('Error deleting template:', err);
        toast.error('حدث خطأ أثناء حذف القالب');
      } finally {
        setIsLoadingTemplates(false);
      }
    }
  };
  
  // Handle student selection
  const handleStudentSelection = (id: string) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(studentId => studentId !== id));
      setSelectAll(false);
      
      // Clear selected student data if no students are selected or if this student is deselected
      if (selectedStudents.length <= 1 || selectedStudents.length === 1 && selectedStudents[0] === id) {
        setSelectedStudentFees([]);
        setSelectedStudentInstallments([]);
        setShowPreviewModal(false);
      }
    } else {
      // Add student to selected list
      setSelectedStudents([...selectedStudents, id]);
      
      // If we only have one student selected, show their unpaid fees and installments
      if (selectedStudents.length === 0) {
        const studentFees = fees.filter(fee => 
          fee.studentId === id && 
          (fee.status === 'unpaid' || fee.status === 'partial')
        );
        setSelectedStudentFees(studentFees);
        
        const studentInstallments = installments.filter(inst => 
          inst.studentId === id && 
          (inst.status === 'overdue' || inst.status === 'upcoming' || inst.status === 'partial')
        );
        setSelectedStudentInstallments(studentInstallments);
        
        // If we have fees or installments, set the preview amount to the first one
        if (studentFees.length > 0) {
          setPreviewAmount(studentFees.reduce((sum, fee) => sum + (fee.balance || 0), 0));
          setActiveFinancialTab('fees');
        } else if (studentInstallments.length > 0) {
          setPreviewAmount(studentInstallments[0].status === 'partial' 
            ? (studentInstallments[0].amount - (studentInstallments[0].paidAmount || 0)) 
            : studentInstallments[0].amount);
          setActiveFinancialTab('installments');
        }
        
        // Show the preview modal for single student selection
        setShowPreviewModal(true);
      } else {
        // Hide modal for multiple selections
        setShowPreviewModal(false);
      }
      
      if (selectedStudents.length + 1 === visibleStudents.length) {
        setSelectAll(true);
      }
    }
  };
  
  // Online/offline status management moved to main header
  
  // Handle sending messages
  const handleSendMessages = async () => {
    if (!messageText) {
      setError('يرجى إدخال نص الرسالة');
      return;
    }
    
    if (selectedStudents.length === 0) {
      setError('يرجى اختيار طالب واحد على الأقل');
      return;
    }
    
    setIsSending(true);
    setError(null);
    
    // Check if we're online - if not, show a warning but still allow localStorage save
    if (!navigator.onLine) {
      toast.error(
        'أنت حالياً غير متصل بالإنترنت. سيتم حفظ الرسائل محلياً وإرسالها عند استعادة الاتصال.',
        { duration: 5000, icon: '⚠️' }
      );
    }
    
    try {
      // Start toast notification
      const toastId = toast.loading(
        `جاري إرسال ${selectedStudents.length} رسالة...`, 
        { position: 'top-center' }
      );
      
      // Send messages to each selected student
      const promises = selectedStudents.map(async (studentId) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return null;
        
        // Replace template variables in the message
        // First convert Arabic variables to English template syntax
        const templateMessage = convertArabicVariablesToTemplate(messageText);
        
        let finalMessage = templateMessage
          .replace(/{studentName}/g, student.name)
          .replace(/{amount}/g, previewAmount.toString())
          .replace(/{date}/g, formatDate(new Date().toISOString()))
          .replace(/{grade}/g, student.grade || '')
          .replace(/{{name}}/g, student.name)
          .replace(/{{amount}}/g, previewAmount.toString())
          .replace(/{{date}}/g, formatDate(previewDate))
          .replace(/{{grade}}/g, student.grade || '')
          .replace(/{{parent}}/g, student.parentName || '');
        
        // Create message object with sender information
        const message = {
          studentId: student.id,
          studentName: student.name,
          grade: student.grade,
          parentName: student.parentName,
          phone: student.phone,
          recipient: student.phone, // Required field for database
          template: selectedTemplate,
          message: finalMessage,
          sentAt: new Date().toISOString(),
          status: 'pending' as 'pending',
          schoolId: user?.schoolId || '',
          // Add sender tracking information
          sentBy: user?.name || user?.email || 'Unknown',
          sentByRole: user?.role || 'unknown',
          sentByEmail: user?.email || '',
          sentByGradeLevels: user?.role === 'gradeManager' ? (user?.gradeLevels || []).join(', ') : '',
          sentById: user?.id || ''
        };
        
        // Debug logging
        console.log('📤 Sending message with sender info:', {
          sentBy: message.sentBy,
          sentByRole: message.sentByRole,
          sentByEmail: message.sentByEmail,
          sentByGradeLevels: message.sentByGradeLevels,
          currentUser: user
        });
        
        // Save message using hybridApi
        const saveMessageResponse = await hybridApiMessages.createMessage(message);
        const savedMessage = saveMessageResponse?.success ? saveMessageResponse.data : message;
        
        // Only proceed with WhatsApp sending if message was saved successfully
        if (!saveMessageResponse?.success) {
          console.error('Failed to save message:', saveMessageResponse);
          return { success: false, error: 'فشل في حفظ الرسالة' };
        }
        
        // Send WhatsApp message if online, otherwise mark as pending
        if (navigator.onLine) {
          try {
            const response = await whatsappService.sendWhatsAppMessage(student.phone, finalMessage);
            
            // Update message status based on response only if we have a valid ID
            if (savedMessage.id) {
              if (response && response.success) {
                await hybridApiMessages.updateMessage(savedMessage.id, {
                  ...savedMessage,
                  status: 'delivered' as 'delivered'
                });
              } else {
                await hybridApiMessages.updateMessage(savedMessage.id, {
                  ...savedMessage,
                  status: 'failed' as 'failed'
                });
              }
            }
            
            return response;
          } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            
            // Update message status to failed only if we have a valid ID
            if (savedMessage.id) {
              await hybridApiMessages.updateMessage(savedMessage.id, {
                ...savedMessage,
                status: 'failed' as 'failed'
              });
            }
            
            return { success: false, error: 'فشل في إرسال الرسالة' };
          }
        } else {
          // We're offline, just keep the pending status
          return { success: true, pendingOffline: true };
        }
      });
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r && r.success).length;
      const offlineCount = results.filter(r => r && (r as any).pendingOffline).length;
      
      // Refresh messages list
      try {
        const messagesResponse = await hybridApiMessages.getMessages(
          user?.schoolId || '',
          undefined,
          user?.role === 'gradeManager' && user?.gradeLevels?.length ? user.gradeLevels : undefined
        );
        if (messagesResponse?.success && messagesResponse?.data) {
          setMessages(messagesResponse.data);
        }
      } catch (error) {
        console.error('Error refreshing messages:', error);
      }
      
      // Update toast with success message
      if (offlineCount > 0) {
        toast.success(
          `تم حفظ ${offlineCount} رسالة لإرسالها عند استعادة الاتصال و ${successCount - offlineCount} رسالة تم إرسالها بنجاح`,
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.success(
          `تم إرسال ${successCount} من ${selectedStudents.length} رسالة بنجاح`,
          { id: toastId, duration: 3000 }
        );
      }
      
      // Reset form
      setSelectedStudents([]);
      if (!showTemplateEditor) {
        setMessageText('');
        setSelectedTemplate('');
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      setError('حدث خطأ أثناء إرسال الرسائل');
      toast.error('حدث خطأ أثناء إرسال الرسائل، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSending(false);
    }
  };
  
  // Generate message preview
  const getMessagePreview = () => {
    if (!messageText || selectedStudents.length === 0) return '';
    
    const studentId = selectedStudents[0];
    const student = students.find(s => s.id === studentId);
    
    if (!student) return messageText;
    
    // Convert Arabic variables to English template syntax first, then replace with actual values
    const templateText = convertArabicVariablesToTemplate(messageText);
    
    const preview = templateText
      .replace(/{{name}}/g, student.name)
      .replace(/{{amount}}/g, previewAmount.toString())
      .replace(/{{date}}/g, formatDate(previewDate))
      .replace(/{{grade}}/g, student.grade || '')
      .replace(/{{parent}}/g, student.parentName || '')
      .replace(/{studentName}/g, student.name)
      .replace(/{amount}/g, previewAmount.toString())
      .replace(/{date}/g, formatDate(previewDate))
      .replace(/{grade}/g, student.grade || '')
      .replace(/{parent}/g, student.parentName || '')
      .replace(/{{message}}/g, 'هذه معلومات هامة');
      
    return preview;
  };
  
  // Scroll to message preview
  const scrollToPreview = () => {
    if (messagePreviewRef.current) {
      messagePreviewRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to message composer
  const scrollToMessageComposer = () => {
    const composerElement = document.querySelector('[data-message-composer]');
    if (composerElement) {
      composerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Delete selected messages
  const handleDeleteMessages = async () => {
    if (selectedMessages.length === 0) {
      toast.error('يرجى اختيار رسائل للحذف');
      return;
    }
    
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedMessages.length} رسالة؟`)) {
      return;
    }
    
    try {
      const toastId = toast.loading(`جاري حذف ${selectedMessages.length} رسالة...`);
      
      // Delete each selected message
      for (const messageId of selectedMessages) {
        await hybridApiMessages.deleteMessage(messageId);
      }
      
      // Update local state
      setMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)));
      setSelectedMessages([]);
      setSelectAllMessages(false);
      
      toast.success(`تم حذف ${selectedMessages.length} رسالة بنجاح`, { id: toastId });
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast.error('حدث خطأ أثناء حذف الرسائل');
    }
  };
  
  // Toggle select all messages
  const handleSelectAllMessages = () => {
    if (selectAllMessages) {
      setSelectedMessages([]);
      setSelectAllMessages(false);
    } else {
      const visibleMessageIds = filteredBySearch.map(m => m.id);
      setSelectedMessages(visibleMessageIds);
      setSelectAllMessages(true);
    }
  };
  
  // Toggle individual message selection
  const handleToggleMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };
  
  // Export messages to CSV
  const handleExportMessages = () => {
    if (messages.length === 0) {
      toast.error('لا توجد رسائل للتصدير');
      return;
    }
    
    const headers = ['اسم الطالب', 'الصف', 'رقم الهاتف', 'نوع الرسالة', 'محتوى الرسالة', 'تاريخ الإرسال', 'الحالة'];
    
    const csvRows = [
      headers.join(','),
      ...messages.map(message => {
        // Escape and clean message content for CSV
        const cleanMessage = (message.message || '')
          .replace(/"/g, '""') // Escape double quotes
          .replace(/[\r\n]/g, ' ') // Replace line breaks with spaces
          .trim();
        
        return [
          `"${message.studentName || ''}",`,
          `"${message.grade || ''}",`,
          `"${message.phone || ''}",`,
          `"${message.template || ''}",`,
          `"${cleanMessage}",`,
          `"${formatDate(message.sentAt)}",`,
          `"${getStatusLabel(message.status)}"`
        ].join('');
      })
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Create BOM for UTF-8
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'سجل_المراسلات.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Format status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'تم التسليم';
      case 'failed':
        return 'فشل';
      case 'pending':
        return 'قيد الإرسال';
      default:
        return status;
    }
  };
  
  // Format status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceLabel = (message: Message) => {
    if (message.messageType === 'admin_notification') return 'الاشتراكات';
    const t = (message.template || '').trim();
    if (t.includes('اشتراك')) return 'الاشتراكات';
    if (t.includes('القسط')) return 'الأقساط';
    if (t.includes('الرسوم')) return 'الرسوم';
    return 'الاتصالات';
  };

  const filteredBySearch = messageSearch.trim()
    ? messages.filter(m => (m.studentName || '').toLowerCase().includes(messageSearch.trim().toLowerCase()))
    : messages;
  const filteredCount = filteredBySearch.length;
  
  // Get unique grades for filtering
  const grades = ['all', ...Array.from(new Set(students.map(student => student.grade)))];
  const visibleStudents = (studentSearch.trim()
    ? filteredStudents.filter(s => (s.name || '').toLowerCase().includes(studentSearch.trim().toLowerCase()))
    : filteredStudents);
  
  // Load custom templates from localStorage
  useEffect(() => {
    if (user?.schoolId) {
      const stored = localStorage.getItem(`customTemplates_${user.schoolId}`);
      if (stored) {
        setCustomTemplates(JSON.parse(stored));
      } else {
        setCustomTemplates([]); // or your default templates
      }
    }
  }, [user?.schoolId]);
  
  // Loading indicator
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        .pro-scrollbar{scrollbar-width:thin;scrollbar-color:#9CA3AF #F3F4F6}
        .pro-scrollbar::-webkit-scrollbar{width:8px;height:8px}
        .pro-scrollbar::-webkit-scrollbar-track{background:#F3F4F6;border-radius:8px}
        .pro-scrollbar::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#7a1a29,#a61b1b);border-radius:8px}
        .pro-scrollbar::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#8b1d2c,#b91c1c)}
      `}</style>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">المراسلات</h1>
          
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md"
            onClick={() => setShowTemplateEditor(true)}
          >
            <MessageSquare size={16} />
            <span>إدارة القوالب</span>
          </button>
          
          {/* Grade Filter and Select All moved to header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-blue-600" />
              <select
                className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all duration-300 bg-white hover:border-gray-300 font-medium shadow-sm text-sm"
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
            </div>
            
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-maroon transition-colors duration-300">
              <input
                type="checkbox"
                id="selectAll"
                checked={selectAll}
                onChange={() => setSelectAll(!selectAll)}
                className="h-4 w-4 text-maroon rounded focus:ring-maroon focus:ring-2 border-2 border-gray-300"
              />
              <label htmlFor="selectAll" className="text-sm font-medium text-gray-700 cursor-pointer">
                تحديد الكل
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          {/* WiFi indicator moved to main header */}
        </div>
      </div>
      
      {/* Template editor modal */}
      {showTemplateEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">إدارة قوالب الرسائل</h2>
            
            <div className="mb-6">
              <h3 className="font-bold text-gray-700 mb-2">إنشاء قالب جديد</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم القالب
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="اسم القالب"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نص الرسالة
                  </label>
                  <textarea
                    value={newTemplateMessage}
                    onChange={(e) => setNewTemplateMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={5}
                    placeholder="نص الرسالة... اضغط على المتغيرات أعلاه للإدراج تلقائياً"
                  />
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <p className="font-bold mb-3 text-blue-800">🔤 المتغيرات المتاحة (انقر للإدراج في النص):</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => insertVariable('{{name}}')}
                      className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      title="إدراج اسم الطالب"
                    >
                      👤 اسم الطالب
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('{{amount}}')}
                      className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      title="إدراج المبلغ"
                    >
                      💰 المبلغ
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('{{date}}')}
                      className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      title="إدراج التاريخ"
                    >
                      📅 التاريخ
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('{{parent}}')}
                      className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      title="إدراج اسم ولي الأمر"
                    >
                      👨‍👩‍👧‍👦 ولي الأمر
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('{{grade}}')}
                      className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      title="إدراج الصف"
                    >
                      🎓 الصف
                    </button>
                  </div>
                  <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                    <p className="font-medium">💡 تلميح: انقر على أي متغير لإدراجه تلقائياً في موقع المؤشر</p>
                    <p className="mt-1 text-blue-700">🔤 المتغيرات ستظهر باللغة العربية لكنها تعمل بالشكل الصحيح</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    onClick={() => {
                      setShowTemplateEditor(false);
                      setNewTemplateName('');
                      setNewTemplateMessage('');
                      setEditingTemplateId(null);
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center gap-2"
                    onClick={handleSaveTemplate}
                    disabled={isLoadingTemplates}
                  >
                    {isLoadingTemplates && <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>}
                    {editingTemplateId ? 'تحديث القالب' : 'حفظ القالب'}
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-700 mb-2">القوالب المخصصة</h3>
              {isLoadingTemplates && (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
                  <span className="mr-2 text-gray-600">جاري تحميل القوالب...</span>
                </div>
              )}
              {!isLoadingTemplates && customTemplates.length === 0 ? (
                <p className="text-gray-500 text-center py-4">لا توجد قوالب مخصصة</p>
              ) : !isLoadingTemplates && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customTemplates.map(template => (
                    <div key={template.id} className="border rounded-md p-3 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold">{template.name}</h4>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            onClick={() => handleEditTemplate(template)}
                            disabled={isLoadingTemplates}
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800 flex items-center gap-1"
                            onClick={() => handleDeleteTemplate(template.id)}
                            disabled={isLoadingTemplates}
                          >
                            {isLoadingTemplates && template.id === editingTemplateId && 
                              <div className="animate-spin h-3 w-3 border-2 border-red-600 rounded-full border-t-transparent"></div>
                            }
                            حذف
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{template.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <h3 className="font-bold text-gray-700 mb-2">القوالب المدمجة</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {messageTemplates.map(template => (
                  <div key={template.id} className="border rounded-md p-3 bg-gray-50">
                    <h4 className="font-bold mb-2">{template.name}</h4>
                    <p className="text-sm text-gray-600">{template.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Composer Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="p-4 bg-gradient-to-r from-maroon to-maroon-dark text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <Send size={16} />
                  </div>
                  إرسال رسالة جديدة
                </h2>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اختر قالب الرسالة
                </label>
                <div className="relative group">
                  {isLoadingTemplates && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
                      <div className="animate-spin h-5 w-5 border-2 border-maroon rounded-full border-t-transparent"></div>
                    </div>
                  )}
                  <select
                    value={selectedTemplate}
                    onChange={handleTemplateChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-maroon/20 focus:border-maroon transition-all duration-300 bg-gray-50 hover:bg-white hover:border-gray-300 text-base font-medium shadow-sm appearance-none cursor-pointer"
                    disabled={isLoadingTemplates}
                  >
                    <option value="" className="text-gray-500">-- اختر قالب --</option>
                    <optgroup label="القوالب المدمجة" className="font-bold text-maroon">
                      {messageTemplates.map(template => (
                        <option key={template.id} value={template.id} className="font-normal text-gray-700">
                          {template.name}
                        </option>
                      ))}
                    </optgroup>
                    {customTemplates.length > 0 && (
                      <optgroup label="القوالب المخصصة" className="font-bold text-maroon">
                        {customTemplates.map(template => (
                          <option key={template.id} value={template.id} className="font-normal text-gray-700">
                            {template.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-maroon transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-maroon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="message">
                  نص الرسالة
                </label>
                <div className="relative group" data-message-composer>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all duration-300 bg-gray-50 hover:bg-white hover:border-gray-300 text-sm font-medium shadow-sm resize-none"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="أدخل نص الرسالة..."
                  ></textarea>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-maroon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>

              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="previewAmount">
                    المبلغ (للمعاينة)
                  </label>
                  <div className="relative group">
                    <input
                      id="previewAmount"
                      type="number"
                      className="w-full pl-16 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all duration-300 bg-gray-50 hover:bg-white hover:border-gray-300 text-sm font-medium shadow-sm"
                      value={previewAmount}
                      onChange={(e) => setPreviewAmount(Number(e.target.value))}
                      min="0"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-maroon to-maroon-dark text-white px-3 rounded-r-lg border-2 border-maroon font-bold text-xs shadow-md">
                      {CURRENCY}
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-maroon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="previewDate">
                    التاريخ (للمعاينة)
                  </label>
                  <div className="relative group">
                    <input
                      id="previewDate"
                      type="date"
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all duration-300 bg-gray-50 hover:bg-white hover:border-gray-300 text-sm font-medium shadow-sm"
                      value={previewDate}
                      onChange={(e) => setPreviewDate(e.target.value)}
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-maroon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>
              </div>
              

              


              
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  اختيار الطلبة
                </label>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="outline-none text-sm flex-1"
                    placeholder="بحث عن طالب لإرسال الرسالة"
                  />
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">العدد: {visibleStudents.length}</span>
                </div>

                
                <div className="max-h-72 overflow-y-auto border-2 border-gray-200 rounded-xl bg-white shadow-sm pro-scrollbar">
                  {visibleStudents.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <p className="font-medium">لا يوجد طلبة</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {visibleStudents.map((student) => (
                        <li key={student.id} className="flex items-center p-4 hover:bg-gray-50 transition-colors duration-200 group">
                          <input
                            type="checkbox"
                            id={`student-${student.id}`}
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => {
                              handleStudentSelection(student.id);
                              setTimeout(scrollToPreview, 100);
                            }}
                            className="h-5 w-5 text-maroon rounded-md focus:ring-maroon focus:ring-2 border-2 border-gray-300 transition-colors duration-200"
                          />
                          <label htmlFor={`student-${student.id}`} className="mr-4 flex-1 cursor-pointer">
                            <div className="font-semibold text-gray-800 group-hover:text-maroon transition-colors duration-200">{student.name}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                {student.grade}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                {student.phone}
                              </span>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              
              <button
                type="button"
                className="w-full bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 shadow-md"
                disabled={isSending || selectedStudents.length === 0 || !messageText}
                onClick={handleSendMessages}
              >
                {isSending ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                ) : (
                  <Send size={20} className="drop-shadow-sm" />
                )}
                <span className="text-lg">
                  {isSending 
                    ? 'جاري الإرسال...' 
                    : `إرسال إلى ${selectedStudents.length} طالب`}
                </span>
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">إحصائيات سريعة</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                <span className="text-gray-600 font-medium">إجمالي الطلبة:</span>
                <span className="font-bold text-lg text-gray-800">{students.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors duration-200">
                <span className="text-orange-700 font-medium">إجمالي الرسوم المستحقة:</span>
                <span className="font-bold text-lg text-orange-800">
                  {fees.reduce((sum, fee) => sum + fee.balance, 0).toLocaleString()} {CURRENCY}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors duration-200">
                <span className="text-red-700 font-medium">الأقساط المتأخرة:</span>
                <span className="font-bold text-lg text-red-800">
                  {installments.filter(i => i.status === 'overdue').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors duration-200">
                <span className="text-green-700 font-medium">الرسائل المرسلة:</span>
                <span className="font-bold text-lg text-green-800">{messages.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Message History Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <MessageSquare size={20} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">سجل المراسلات</h2>
                </div>
                
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <input
                    type="text"
                    value={messageSearch}
                    onChange={(e) => { setMessageSearch(e.target.value); setCurrentPage(1); }}
                    className="outline-none text-sm"
                    placeholder="بحث باسم الطالب"
                  />
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">عدد الرسائل: {filteredCount}</span>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                  onClick={handleExportMessages}
                  title="تصدير السجل"
                >
                  <Download size={16} />
                  <span>تصدير</span>
                </button>
                
                <button
                  type="button"
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 transform shadow-md ${
                    selectedMessages.length > 0
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:scale-[1.02] hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={handleDeleteMessages}
                  disabled={selectedMessages.length === 0}
                  title="حذف الرسائل المحددة"
                >
                  <Trash2 size={16} />
                  <span>حذف ({selectedMessages.length})</span>
                </button>
                
                <button
                  type="button"
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-maroon to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                  onClick={async () => {
                    try {
                      const messagesResponse = await hybridApiMessages.getMessages(user?.schoolId || '');
                      if (messagesResponse?.success && messagesResponse?.data) {
                        setMessages(messagesResponse.data);
                      }
                    } catch (error) {
                      console.error('Error refreshing messages:', error);
                    }
                  }}
                  title="تحديث"
                >
                  <RefreshCw size={16} />
                  <span>تحديث</span>
                </button>
              </div>
              </div>
            
            {messages.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} className="text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-600">لا توجد رسائل مرسلة</p>
                <p className="text-sm text-gray-500 mt-2">ستظهر الرسائل المرسلة هنا</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[65vh] overflow-y-auto pro-scrollbar">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th scope="col" className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectAllMessages}
                          onChange={handleSelectAllMessages}
                          className="w-4 h-4 text-maroon bg-gray-100 border-gray-300 rounded focus:ring-maroon"
                          title="تحديد الكل"
                        />
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700 tracking-wide">
                        الطالب
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700 tracking-wide">
                        الصف
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700 tracking-wide">
                        رقم الهاتف
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700 tracking-wide">
                        القالب
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700 tracking-wide">
                        أرسلت بواسطة
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700 tracking-wide">
                        الدور
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700 tracking-wide">
                        تاريخ الإرسال
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700 tracking-wide">
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(() => {
                      const sorted = filteredBySearch.slice().reverse();
                      const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
                      const clampedPage = Math.min(currentPage, totalPages);
                      const start = (clampedPage - 1) * pageSize;
                      const visible = sorted.slice(start, start + pageSize);
                      return visible;
                    })().map((message, idx) => (
                      <React.Fragment key={message.id || String(idx)}>
                      <tr className="hover:bg-gray-50 transition-colors duration-200 group">
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMessages.includes(message.id)}
                            onChange={() => handleToggleMessage(message.id)}
                            className="w-4 h-4 text-maroon bg-gray-100 border-gray-300 rounded focus:ring-maroon"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => setExpandedMessageId(expandedMessageId === (message.id || String(idx)) ? null : (message.id || String(idx)))}>
                          <div className="font-semibold text-gray-900 group-hover:text-maroon transition-colors duration-200">{message.studentName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            {message.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600 font-mono">{message.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg font-medium">
                            <MessageSquare size={12} />
                            {message.template}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const sentBy = (message as any).sentBy || (message as any).sent_by;
                            const sentByEmail = (message as any).sentByEmail || (message as any).sent_by_email;
                            
                            // Debug log for first message
                            if (idx === 0) {
                              console.log('📨 Message display data:', {
                                messageId: message.id,
                                sentBy,
                                sentByEmail,
                                sentByRole: (message as any).sentByRole || (message as any).sent_by_role,
                                rawMessage: message
                              });
                            }
                            
                            return (
                              <>
                                <div className="text-gray-700 font-medium">
                                  {sentBy || 'غير محدد'}
                                </div>
                                {sentByEmail && (
                                  <div className="text-xs text-gray-500">
                                    {sentByEmail}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const role = (message as any).sentByRole || (message as any).sent_by_role;
                            if (!role) {
                              return <span className="text-gray-400 text-xs">غير محدد</span>;
                            }
                            let roleLabel = '';
                            if (role === 'schoolAdmin' || role === 'school_admin') roleLabel = 'مدير المدرسة';
                            else if (role === 'gradeManager' || role === 'grade_manager') roleLabel = 'مدير صف';
                            else if (role === 'admin') roleLabel = 'مدير النظام';
                            else roleLabel = role;
                            
                            return (
                              <>
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-medium text-xs">
                                  {roleLabel}
                                </span>
                                {((message as any).sentByGradeLevels || (message as any).sent_by_grade_levels) && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    الصفوف: {(message as any).sentByGradeLevels || (message as any).sent_by_grade_levels}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">
                            {formatDate(message.sentAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border ${getStatusColor(message.status)}`}>
                            <span className={`w-2 h-2 rounded-full ${
                              message.status === 'sent' ? 'bg-green-500' :
                              message.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}></span>
                            {getStatusLabel(message.status)}
                          </span>
                        </td>
                      </tr>
                      {expandedMessageId === (message.id || String(idx)) && (
                        <tr className="bg-gray-50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-3 bg-white rounded-lg border">
                                <div className="text-xs text-gray-500">القالب</div>
                                <div className="font-medium text-gray-800 mt-1">{message.template || '—'}</div>
                              </div>
                              <div className="p-3 bg-white rounded-lg border">
                                <div className="text-xs text-gray-500">المصدر</div>
                                <div className="font-medium text-gray-800 mt-1">{getSourceLabel(message)}</div>
                              </div>
                              <div className="p-3 bg-white rounded-lg border md:col-span-3">
                                <div className="text-xs text-gray-500">نص الرسالة</div>
                                <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto pro-scrollbar">{message.message}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {messages.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">عدد الصفوف:</span>
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 border rounded-md text-sm">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="px-3 py-1 bg-white border rounded-md text-sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>السابق</button>
                  <span className="text-sm text-gray-700">
                    {(() => {
                      const total = Math.max(1, Math.ceil(filteredBySearch.length / pageSize));
                      return `${currentPage} / ${total}`;
                    })()}
                  </span>
                  <button type="button" className="px-3 py-1 bg-white border rounded-md text-sm" onClick={() => setCurrentPage((p) => Math.min(Math.max(1, Math.ceil(filteredBySearch.length / pageSize)), p + 1))}>التالي</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Message Preview and Financial Information Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <Eye size={20} className="text-blue-600" />
              معاينة الرسالة والمعلومات المالية
            </DialogTitle>
            <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setTimeout(scrollToMessageComposer, 100);
                }}
                className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Message Preview Section */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-green-600" />
                <h4 className="font-semibold text-gray-800">معاينة الرسالة</h4>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm">
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {getMessagePreview()}
                </div>
              </div>
            </div>
            
            {/* Financial Information Section */}
            {selectedStudents.length === 1 && (selectedStudentFees.length > 0 || selectedStudentInstallments.length > 0) && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-blue-600" />
                    <h4 className="font-semibold text-gray-800">المعلومات المالية</h4>
                  </div>
                  
          {/* Compact Tabs */}
          <div className="flex bg-white rounded-lg border border-gray-200">
            <button 
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeFinancialTab === 'fees' 
                  ? 'bg-orange-500 text-white rounded-lg' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => {
                setActiveFinancialTab('fees');
                if (selectedStudentFees.length > 0) {
                  setPreviewAmount(selectedStudentFees.reduce((sum, fee) => sum + (fee.balance || 0), 0));
                  const reminderTemplate = messageTemplates.find(t => t.name === 'تذكير بالرسوم الدراسية');
                  if (reminderTemplate) {
                    setSelectedTemplate(reminderTemplate.id);
                    setMessageText(reminderTemplate.message);
                  }
                }
              }}
            >
              الرسوم ({selectedStudentFees.length})
            </button>
            <button 
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeFinancialTab === 'installments' 
                  ? 'bg-green-500 text-white rounded-lg' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => {
                setActiveFinancialTab('installments');
                if (selectedStudentInstallments.length > 0) {
                  const firstInstallment = selectedStudentInstallments[0];
                  setPreviewAmount(firstInstallment.status === 'partial' 
                    ? (firstInstallment.amount - (firstInstallment.paidAmount || 0)) 
                    : firstInstallment.amount);
                  if (firstInstallment.dueDate) {
                    setPreviewDate(firstInstallment.dueDate);
                  }
                  const reminderTemplate = messageTemplates.find(t => t.name === 'تذكير بموعد القسط');
                  if (reminderTemplate) {
                    setSelectedTemplate(reminderTemplate.id);
                    setMessageText(reminderTemplate.message);
                  }
                }
              }}
            >
              الأقساط ({selectedStudentInstallments.length})
            </button>
          </div>
                </div>
                
                {activeFinancialTab === 'fees' && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">الرسوم المستحقة</h5>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                      {selectedStudentFees.map(fee => (
                        <button
                          key={fee.id}
                          onClick={() => {
                            setPreviewAmount(fee.balance);
                            const reminderTemplate = messageTemplates.find(t => t.name === 'إشعار بتأخر سداد الرسوم الدراسية');
                            if (reminderTemplate) {
                              setSelectedTemplate(reminderTemplate.id);
                              setMessageText(reminderTemplate.message);
                            }
                          }}
                          className="flex justify-between items-center p-2 bg-orange-50 hover:bg-orange-100 rounded border border-orange-200 hover:border-orange-300 transition-colors cursor-pointer text-right"
                        >
                          <span className="text-sm font-medium text-gray-800">{getFeeTypeLabel(fee.feeType)}</span>
                          <span className="font-bold text-orange-600">{fee.balance.toLocaleString()} {CURRENCY}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 p-2 bg-orange-100 rounded border border-orange-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">الإجمالي:</span>
                        <span className="font-bold text-orange-700">
                          {selectedStudentFees.reduce((sum, fee) => sum + fee.balance, 0).toLocaleString()} {CURRENCY}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeFinancialTab === 'installments' && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">الأقساط المستحقة</h5>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                      {selectedStudentInstallments.map(inst => (
                        <button
                          key={inst.id}
                          onClick={() => {
                            const amount = inst.status === 'partial' 
                              ? (inst.amount - (inst.paidAmount || 0)) 
                              : inst.amount;
                            setPreviewAmount(amount);
                            if (inst.dueDate) {
                              setPreviewDate(inst.dueDate);
                            }
                            const reminderTemplate = messageTemplates.find(t => t.name === 'تذكير بموعد القسط');
                            if (reminderTemplate) {
                              setSelectedTemplate(reminderTemplate.id);
                              setMessageText(reminderTemplate.message);
                            }
                          }}
                          className="flex justify-between items-center p-2 bg-green-50 hover:bg-green-100 rounded border border-green-200 hover:border-green-300 transition-colors cursor-pointer text-right"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              inst.status === 'partial' ? 'bg-yellow-400' : 
                              inst.status === 'overdue' ? 'bg-red-400' : 'bg-green-400'
                            }`}></div>
                            <span className="text-sm font-medium text-gray-800">{getFeeTypeLabel(inst.feeType)}</span>
                          </div>
                          <span className="font-bold text-green-600">
                            {(inst.status === 'partial' 
                              ? (inst.amount - (inst.paidAmount || 0)) 
                              : inst.amount
                            ).toLocaleString()} {CURRENCY}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 p-2 bg-green-100 rounded border border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">الإجمالي:</span>
                        <span className="font-bold text-green-700">
                          {selectedStudentInstallments.reduce((sum, inst) => {
                            return sum + (inst.status === 'partial' 
                              ? (inst.amount - (inst.paidAmount || 0)) 
                              : inst.amount);
                          }, 0).toLocaleString()} {CURRENCY}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 flex flex-col md:flex-row gap-2">
                  <button 
                    className="flex-1 text-center text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                    onClick={() => {
                      let totalAmount = 0;
                      
                      if (selectedStudentFees.length > 0 && selectedStudentInstallments.length === 0) {
                        totalAmount = selectedStudentFees.reduce((sum, fee) => sum + fee.balance, 0);
                      }
                      else if (selectedStudentInstallments.length > 0 && selectedStudentFees.length === 0) {
                        totalAmount = selectedStudentInstallments.reduce((sum, inst) => {
                          return sum + (inst.status === 'partial' 
                            ? (inst.amount - (inst.paidAmount || 0)) 
                            : inst.amount);
                        }, 0);
                      }
                      else {
                        if (selectedStudentFees.length > 0) {
                          totalAmount = selectedStudentFees.reduce((sum, fee) => sum + fee.balance, 0);
                        } else {
                          totalAmount = 0;
                        }
                      }
                      
                      setPreviewAmount(totalAmount);
                      
                      let templateName = 'إشعار بتأخر سداد الرسوم الدراسية';
                      if (selectedStudentInstallments.length > 0 && selectedStudentFees.length === 0) {
                        templateName = 'تذكير بموعد القسط';
                      }
                      
                      const reminderTemplate = messageTemplates.find(t => t.name === templateName);
                      if (reminderTemplate) {
                        setSelectedTemplate(reminderTemplate.id);
                        setMessageText(reminderTemplate.message);
                      }
                    }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      استخدام المبلغ الإجمالي ({
                      (() => {
                        let total = 0;
                        
                        if (selectedStudentFees.length > 0 && selectedStudentInstallments.length === 0) {
                          total = selectedStudentFees.reduce((sum, fee) => sum + fee.balance, 0);
                        }
                        else if (selectedStudentInstallments.length > 0 && selectedStudentFees.length === 0) {
                          total = selectedStudentInstallments.reduce((sum, inst) => {
                            return sum + (inst.status === 'partial' 
                              ? (inst.amount - (inst.paidAmount || 0)) 
                              : inst.amount);
                          }, 0);
                        }
                        else {
                          if (selectedStudentFees.length > 0) {
                            total = selectedStudentFees.reduce((sum, fee) => sum + fee.balance, 0);
                          } else {
                            total = 0;
                          }
                        }
                        
                        return total.toLocaleString();
                      })()
                    } {CURRENCY})</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Modal Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setTimeout(scrollToMessageComposer, 100);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setTimeout(scrollToMessageComposer, 100);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                العودة للرسالة
              </button>
              <button
                onClick={async () => {
                  setShowPreviewModal(false);
                  await handleSendMessages();
                }}
                disabled={isSending || !messageText || selectedStudents.length === 0}
                className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${
                  isSending || !messageText || selectedStudents.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isSending ? 'جاري الإرسال...' : 'إرسال الرسالة'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Communications;
 