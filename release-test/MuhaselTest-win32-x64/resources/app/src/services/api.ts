// Mock API service using localStorage for school finance management system
import { WHATSAPP_API_URL, DEFAULT_SCHOOL_IMAGE } from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import storage from '../utils/storage';

// Local storage keys
export const STORAGE_KEYS = {
  USERS: 'users',
  SCHOOLS: 'schools',
  STUDENTS: 'students',
  FEES: 'fees',
  INSTALLMENTS: 'installments',
  MESSAGES: 'messages',
  ACCOUNTS: 'accounts',
  TEMPLATES: 'templates'
} as const;

// Types for our data models
interface School {
  id: string;
  name: string;
  englishName?: string;
  email: string;
  phone: string;
  phoneWhatsapp: string;
  phoneCall: string;
  address: string;
  location: string;
  active: boolean;
  subscriptionStart: string;
  subscriptionEnd: string;
  logo: string;

  createdAt: string;
  updatedAt: string;
  settings?: Record<string, any>;
}

interface Student {
  id: string;
  schoolId: string;
  name: string;
  grade: string;
  parentName: string;
  phone: string;
  transportation?: string;
}

interface Fee {
  id: string;
  schoolId: string;
  studentId: string;
  type: string;
  amount: number;
  discount?: number;
  dueDate: string;
  paymentMethod?: string;
  checkNumber?: string;
  checkDate?: string;
  bankNameArabic?: string;
  bankNameEnglish?: string;
}

interface Installment {
  id: string;
  schoolId: string;
  studentId: string;
  amount: number;
  dueDate: string;
  status: string;
  checkNumber?: string;
  checkDate?: string;
  bankNameArabic?: string;
  bankNameEnglish?: string;
}

interface Message {
  id: string;
  schoolId: string;
  studentId?: string;
  phone: string;
  message: string;
  sentAt: string;
  status: string;
}

interface Account {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId?: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

// Helper function to get data from storage
const getFromStorage = <T>(key: string): T[] => {
  try {
    const data = storage.get(key);
    return data || [];
  } catch (e) {
    console.error(`Error reading from storage (${key}):`, e);
    return [];
  }
};

// Helper function to save data to storage
const saveToStorage = <T>(key: string, data: T[]): void => {
  try {
    // Save data to storage
    storage.set(key, data);
  } catch (error: unknown) {
    // If quota exceeded, try to save only essential data
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      const essentialData = data.map((item: any) => {
        // Keep only essential fields
        const { id, name, email, role, schoolId, password, createdAt, updatedAt } = item;
        return { id, name, email, role, schoolId, password, createdAt, updatedAt };
      });
      
      try {
        storage.set(key, essentialData);
      } catch (e2) {
        throw new Error('لا يمكن حفظ البيانات. يرجى حذف بعض البيانات القديمة أولاً.');
      }
    } else {
      throw error;
    }
  }
};

// Initialize storage if needed
export const initializeStorage = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    if (!storage.get(key)) {
      storage.set(key, []);
    }
  });
};

// API response type
export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

// Helper function to simulate network delay in development
const simulateDelay = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 500));
  }
};

// Schools API
export const getSchools = async (): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getFromStorage<School>('schools');
    return { success: true, data: schools };
  } catch (error: unknown) {
    console.error('Error getting schools:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const getSchool = async (id: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getFromStorage<School>('schools');
    const school = schools.find(s => s.id === id);
    
    if (!school) {
      return { success: false, error: 'School not found' };
    }
    
    return { success: true, data: school };
  } catch (error: unknown) {
    console.error('Error getting school:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const createSchool = async (schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getFromStorage<School>('schools');
    
    // Create new school with ID
    const newSchool: School = {
      id: uuidv4(),
      ...schoolData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    schools.push(newSchool);
    saveToStorage('schools', schools);
    
    return { success: true, data: newSchool };
  } catch (error: unknown) {
    console.error('Error creating school:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const updateSchool = async (id: string, schoolData: any): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getFromStorage<School>('schools');
    const schoolIndex = schools.findIndex(s => s.id === id);
    
    if (schoolIndex === -1) {
      return { success: false, error: 'مدرسة غير موجودة' };
    }
    
    // Update the school
    schools[schoolIndex] = {
      ...schools[schoolIndex],
      ...schoolData,
      updatedAt: new Date().toISOString()
    };

    // Update the school settings as well with the new information
    if (!schools[schoolIndex].settings) {
      schools[schoolIndex].settings = {};
    }

    // Sync essential fields to settings
    schools[schoolIndex].settings = {
      ...schools[schoolIndex].settings,
      name: schoolData.name || schools[schoolIndex].name,
      email: schoolData.email || schools[schoolIndex].email,
      phone: schoolData.phone || schools[schoolIndex].phone,
      phoneWhatsapp: schoolData.phoneWhatsapp || schools[schoolIndex].phoneWhatsapp,
      phoneCall: schoolData.phoneCall || schools[schoolIndex].phoneCall,
      address: schoolData.address || schools[schoolIndex].address,
      logo: schoolData.logo || schools[schoolIndex].logo,
  
    };
    
    saveToStorage('schools', schools);
    
    // Update all accounts associated with this school
    const accounts = getFromStorage<Account>('accounts');
    const schoolAccounts = accounts.filter(account => account.schoolId === id);
    
    if (schoolAccounts.length > 0) {
      const updatedAccounts = accounts.map(account => {
        if (account.schoolId === id) {
          return {
            ...account,
            schoolName: schools[schoolIndex].name,
            schoolLogo: schools[schoolIndex].logo,
            schoolStamp: '',
            schoolEmail: schools[schoolIndex].email,
            schoolPhone: schools[schoolIndex].phone,
            schoolPhoneWhatsapp: schools[schoolIndex].phoneWhatsapp || schools[schoolIndex].phone,
            schoolPhoneCall: schools[schoolIndex].phoneCall || schools[schoolIndex].phone,
            schoolAddress: schools[schoolIndex].address
          };
        }
        return account;
      });
      
      saveToStorage('accounts', updatedAccounts);
    }
    
    return { success: true, data: schools[schoolIndex] };
  } catch (error: unknown) {
    console.error('Error updating school:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const deleteSchool = async (id: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getFromStorage<School>('schools');
    const filteredSchools = schools.filter(s => s.id !== id);
    
    if (filteredSchools.length === schools.length) {
      return { success: false, error: 'مدرسة غير موجودة' };
    }
    
    saveToStorage('schools', filteredSchools);
    
    return { success: true, message: 'تم حذف المدرسة بنجاح' };
  } catch (error: unknown) {
    console.error('Error deleting school:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Students API
export const getStudents = async (schoolId?: string, gradeLevel?: string | string[]): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    let students = getFromStorage<Student>('students');
    
    // Filter by schoolId if provided
    if (schoolId) {
      students = students.filter(s => s.schoolId === schoolId);
    }
    
    // Filter by grade level if provided
    if (gradeLevel) {
      if (Array.isArray(gradeLevel)) {
        students = students.filter(s => gradeLevel.includes(s.grade));
      } else {
        students = students.filter(s => s.grade === gradeLevel);
      }
    }
    
    return { success: true, data: students };
  } catch (error: unknown) {
    console.error('Error getting students:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const createStudent = async (studentData: any): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const students = getFromStorage<Student>('students');
    
    // Create new student with ID
    const newStudent: Student = {
      id: uuidv4(),
      ...studentData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    students.push(newStudent);
    saveToStorage('students', students);
    
    return { success: true, data: newStudent };
  } catch (error: unknown) {
    console.error('Error creating student:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const importStudents = async (studentsData: any[]): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const students = getFromStorage<Student>('students');
    
    // Create new students with IDs
    const newStudents = studentsData.map(student => ({
      id: uuidv4(),
      ...student,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    students.push(...newStudents);
    saveToStorage('students', students);
    
    return { success: true, data: newStudents };
  } catch (error: unknown) {
    console.error('Error importing students:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const exportStudentsTemplate = (): Blob => {
  const headers = 'الاسم,الصف,اسم ولي الأمر,رقم الهاتف,وسيلة النقل';
  return new Blob([headers], { type: 'text/csv;charset=utf-8;' });
};

// Fees API
export const getFees = async (schoolId?: string, studentId?: string, gradeLevel?: string | string[]): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    let fees = getFromStorage<Fee>('fees');
    
    // Filter by schoolId if provided
    if (schoolId) {
      fees = fees.filter(f => f.schoolId === schoolId);
    }
    
    // Filter by studentId if provided
    if (studentId) {
      fees = fees.filter(f => f.studentId === studentId);
    }
    
    // Filter by grade level
    if (gradeLevel && !studentId) {
      // Get students in the specified grade level
      const students = getFromStorage<Student>('students');
      let studentsInGrade;
      
      if (Array.isArray(gradeLevel)) {
        studentsInGrade = students.filter(s => gradeLevel.includes(s.grade));
      } else {
        studentsInGrade = students.filter(s => s.grade === gradeLevel);
      }
      
      const studentIds = studentsInGrade.map(s => s.id);
      fees = fees.filter(f => studentIds.includes(f.studentId));
    }
    
    return { success: true, data: fees };
  } catch (error: unknown) {
    console.error('Error getting fees:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const createFee = async (feeData: any): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const fees = getFromStorage<Fee>('fees');
    
    // Create new fee with ID
    const newFee: Fee = {
      id: uuidv4(),
      ...feeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    fees.push(newFee);
    saveToStorage('fees', fees);
    
    return { success: true, data: newFee };
  } catch (error: unknown) {
    console.error('Error creating fee:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const importFees = async (feesData: any[]): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const fees = getFromStorage<Fee>('fees');
    
    // Create new fees with IDs
    const newFees = feesData.map(fee => ({
      id: uuidv4(),
      ...fee,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    fees.push(...newFees);
    saveToStorage('fees', fees);
    
    return { success: true, data: newFees };
  } catch (error: unknown) {
    console.error('Error importing fees:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const exportFeesTemplate = (): Blob => {
  const headers = 'معرف الطالب,النوع,المبلغ,الخصم,تاريخ الاستحقاق';
  return new Blob([headers], { type: 'text/csv;charset=utf-8;' });
};

// Installments API
export const getInstallments = async (schoolId?: string, studentId?: string, gradeLevel?: string | string[]): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    let installments = getFromStorage<Installment>('installments');
    
    // Filter by schoolId if provided
    if (schoolId) {
      installments = installments.filter(i => i.schoolId === schoolId);
    }
    
    // Filter by studentId if provided
    if (studentId) {
      installments = installments.filter(i => i.studentId === studentId);
    }
    
    // Filter by grade level
    if (gradeLevel && !studentId) {
      // Get students in the specified grade level
      const students = getFromStorage<Student>('students');
      let studentsInGrade;
      
      if (Array.isArray(gradeLevel)) {
        studentsInGrade = students.filter(s => gradeLevel.includes(s.grade));
      } else {
        studentsInGrade = students.filter(s => s.grade === gradeLevel);
      }
      
      const studentIds = studentsInGrade.map(s => s.id);
      installments = installments.filter(i => studentIds.includes(i.studentId));
    }
    
    return { success: true, data: installments };
  } catch (error: unknown) {
    console.error('Error getting installments:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const saveInstallment = async (installmentData: any): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const installments = getFromStorage<Installment>('installments');
    
    // Check if this is an update or create
    const existingIndex = installments.findIndex(i => i.id === installmentData.id);
    
    if (existingIndex !== -1) {
      // Update existing installment
      installments[existingIndex] = {
        ...installments[existingIndex],
        ...installmentData,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Create new installment with ID
      const newInstallment: Installment = {
        id: uuidv4(),
        ...installmentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      installments.push(newInstallment);
    }
    
    saveToStorage('installments', installments);
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Error saving installment:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Messages API
export const createMessage = async (
  schoolId: string,
  phone: string,
  message: string,
  studentId?: string
): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const messages = getFromStorage<Message>('messages');
    
    // Create new message
    const newMessage: Message = {
      id: uuidv4(),
      schoolId,
      phone,
      message,
      studentId,
      sentAt: new Date().toISOString(),
      status: 'pending'
    };
    
    messages.push(newMessage);
    saveToStorage('messages', messages);
    
    return { success: true, data: newMessage };
  } catch (error: unknown) {
    console.error('Error creating message:', error);
    return { success: false, error: (error as Error).message };
  }
};

// School Settings API
export const getSchoolSettings = async (schoolId: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getFromStorage<School>('schools');
    const school = schools.find(s => s.id === schoolId);
    
    if (!school) {
      return { success: false, error: 'مدرسة غير موجودة' };
    }
    
    const settings = school.settings || {};
    
    return { success: true, data: settings };
  } catch (error: unknown) {
    console.error('Error getting school settings:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const updateSchoolSettings = async (schoolId: string, settings: any): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getFromStorage<School>('schools');
    const schoolIndex = schools.findIndex(s => s.id === schoolId);
    
    if (schoolIndex === -1) {
      return { success: false, error: 'مدرسة غير موجودة' };
    }
    
    // Get current school data
    const currentSchool = schools[schoolIndex];

    // Update main school properties if they're included in the settings
    if (settings.name || settings.email || settings.phone || settings.phoneWhatsapp || 
        settings.phoneCall || settings.address || settings.logo || settings.englishName) {
      
      // Update the main school object properties
      currentSchool.name = settings.name || currentSchool.name;
      currentSchool.email = settings.email || currentSchool.email;
      currentSchool.englishName = settings.englishName || currentSchool.englishName;
      currentSchool.phone = settings.phone || currentSchool.phone;
      currentSchool.phoneWhatsapp = settings.phoneWhatsapp || currentSchool.phoneWhatsapp;
      currentSchool.phoneCall = settings.phoneCall || currentSchool.phoneCall;
      currentSchool.address = settings.address || currentSchool.address;
      currentSchool.logo = settings.logo || currentSchool.logo;
  
    }
    
    // Update settings
    schools[schoolIndex] = {
      ...currentSchool,
      settings: {
        ...currentSchool.settings,
        ...settings,
        // Ensure footer settings are properly saved
        showFooterInReceipts: settings.showFooterInReceipts !== undefined ? settings.showFooterInReceipts : true,
        footerContactInfo: settings.footerContactInfo !== undefined ? settings.footerContactInfo : true,
        footerAddress: settings.footerAddress !== undefined ? settings.footerAddress : true
      },
      updatedAt: new Date().toISOString()
    };
    
    saveToStorage('schools', schools);
    
    // Update accounts associated with this school to reflect the changes
    const accounts = getFromStorage<Account>('accounts');
    const schoolAccounts = accounts.filter(account => account.schoolId === schoolId);
    
    if (schoolAccounts.length > 0) {
      const updatedAccounts = accounts.map(account => {
        if (account.schoolId === schoolId) {
          return {
            ...account,
            schoolName: schools[schoolIndex].name,
            schoolLogo: schools[schoolIndex].logo,
            schoolStamp: '',
            schoolEmail: schools[schoolIndex].email,
            schoolPhone: schools[schoolIndex].phone,
            schoolPhoneWhatsapp: schools[schoolIndex].phoneWhatsapp || schools[schoolIndex].phone,
            schoolPhoneCall: schools[schoolIndex].phoneCall || schools[schoolIndex].phone,
            schoolAddress: schools[schoolIndex].address,
            schoolEnglishName: schools[schoolIndex].englishName
          };
        }
        return account;
      });
      
      saveToStorage('accounts', updatedAccounts);
    }
    
    return { success: true, data: schools[schoolIndex].settings };
  } catch (error: unknown) {
    console.error('Error updating school settings:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Accounts API
export const getAccounts = async (schoolId?: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    let accounts = getFromStorage<Account>(STORAGE_KEYS.ACCOUNTS);
    
    // Filter by schoolId if provided but still include admin accounts
    if (schoolId) {
      accounts = accounts.filter(a => a.schoolId === schoolId || a.role === 'admin');
    }
    
    // Make sure all account data is returned without filtering fields
    const completeAccounts = accounts.map(account => {
      return { ...account }; // Create a copy to ensure all fields are included
    });
    
    return { success: true, data: completeAccounts };
  } catch (error: unknown) {
    console.error('Error getting accounts:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const createAccount = async (accountData: any): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const accounts = getFromStorage<Account>(STORAGE_KEYS.ACCOUNTS);
    
    // Check if email is already in use
    const emailExists = accounts.some(a => a.email === accountData.email);
    if (emailExists) {
      return { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' };
    }
    
    // Get school info if schoolId is provided
    let schoolInfo = {};
    if (accountData.schoolId) {
      const schools = getFromStorage<School>(STORAGE_KEYS.SCHOOLS);
      const school = schools.find(s => s.id === accountData.schoolId);
      if (school) {
        schoolInfo = {
          schoolName: school.name,
          schoolLogo: school.logo,
          schoolStamp: ''
        };
      }
    }
    
    // Create new account
    const newAccount = {
      id: uuidv4(),
      ...accountData,
      ...schoolInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null
    };
    
    accounts.push(newAccount);
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    
    return { success: true, data: newAccount };
  } catch (error: unknown) {
    console.error('Error creating account:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const getAccount = async (id: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const accounts = getFromStorage<Account>(STORAGE_KEYS.ACCOUNTS);
    const account = accounts.find(a => a.id === id);
    
    if (account) {
      return { success: true, data: account };
    } else {
      return { success: false, error: 'حساب غير موجود' };
    }
  } catch (error: unknown) {
    console.error('Error getting account:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const updateAccount = async (id: string, accountData: any): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const accounts = getFromStorage<Account>(STORAGE_KEYS.ACCOUNTS);
    const index = accounts.findIndex(a => a.id === id);
    
    if (index === -1) {
      return { success: false, error: 'الحساب غير موجود' };
    }
    
    // Check if email is already in use by another account
    const emailExists = accounts.some(a => a.email === accountData.email && a.id !== id);
    if (emailExists) {
      return { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' };
    }
    
    // Get school info if schoolId is provided
    let schoolInfo = {};
    if (accountData.schoolId) {
      const schools = getFromStorage<School>(STORAGE_KEYS.SCHOOLS);
      const school = schools.find(s => s.id === accountData.schoolId);
      if (school) {
        schoolInfo = {
          schoolName: school.name,
          schoolLogo: school.logo,
          schoolStamp: ''
        };
      }
    }
    
    // Update account
    const updatedAccount = {
      ...accounts[index],
      ...accountData,
      ...schoolInfo,
      updatedAt: new Date().toISOString()
    };
    
    // Keep existing password if not provided
    if (!accountData.password) {
      updatedAccount.password = accounts[index].password;
    }
    
    accounts[index] = updatedAccount;
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    
    return { success: true, data: updatedAccount };
  } catch (error: unknown) {
    console.error('Error updating account:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const deleteAccount = async (accountId: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const accounts = getFromStorage<Account>(STORAGE_KEYS.ACCOUNTS);
    const accountIndex = accounts.findIndex(a => a.id === accountId);
    
    if (accountIndex === -1) {
      return { success: false, error: 'حساب غير موجود' };
    }
    
    // Remove the account
    accounts.splice(accountIndex, 1);
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    
    return { success: true, message: 'تم حذف الحساب بنجاح' };
  } catch (error: unknown) {
    console.error('Error deleting account:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Messages API
export const getMessages = async (schoolId?: string, includeAdminMessages: boolean = false): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    let messages = getFromStorage<Message>('messages');
    
    // Filter by schoolId if provided
    if (schoolId) {
      messages = messages.filter(m => m.schoolId === schoolId);
    }
    
    // Include or exclude admin messages
    if (!includeAdminMessages) {
      messages = messages.filter(m => m.schoolId);
    }
    
    return { success: true, data: messages };
  } catch (error: unknown) {
    console.error('Error getting messages:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Password reset
export const sendPasswordReset = async (email: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const accounts = getFromStorage<Account>(STORAGE_KEYS.ACCOUNTS);
    const account = accounts.find(a => a.email === email);
    
    if (!account) {
      return { success: false, error: 'البريد الإلكتروني غير مسجل' };
    }
    
    // In a real app, this would send an email
    console.log(`Password reset requested for ${email}`);
    
    return { success: true, message: 'تم إرسال رابط إعادة تعيين كلمة المرور' };
  } catch (error: unknown) {
    console.error('Error sending password reset:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Update last login
export const updateLastLogin = async (userId: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const accounts = getFromStorage<Account>(STORAGE_KEYS.ACCOUNTS);
    const accountIndex = accounts.findIndex(a => a.id === userId);
    
    if (accountIndex === -1) {
      return { success: false, error: 'حساب غير موجود' };
    }
    
    // Update last login
    accounts[accountIndex] = {
      ...accounts[accountIndex],
      lastLogin: new Date().toISOString()
    };
    
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating last login:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Check if email is in use
export const isEmailInUse = async (email: string): Promise<boolean> => {
  try {
    await simulateDelay();
    const accounts = getFromStorage<Account>(STORAGE_KEYS.ACCOUNTS);
    return accounts.some(a => a.email === email);
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};

// Clean up deleted records that need special handling
export const cleanupDatabase = async (): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    console.log('Database cleanup completed');
    return { success: true, message: 'تم تنظيف قاعدة البيانات بنجاح' };
  } catch (error: unknown) {
    console.error('Error cleaning up database:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Data sync
export const syncData = async (): Promise<ApiResponse> => {
  try {
    // Using local storage only
    return {
      success: true,
      message: 'Data synced successfully'
    };
  } catch (error) {
    console.error('Error syncing data:', error);
    return {
      success: false,
      message: 'Error syncing data'
    };
  }
};

/**
 * Ensure data consistency across storage keys.
 * This function ensures all data is stored under the correct keys.
 */
export const ensureStorageConsistency = () => {
  try {
    console.log('Ensuring storage consistency...');
    
    // Check and fix accounts
    const oldAccounts = localStorage.getItem('accounts');
    if (oldAccounts) {
      const accounts = JSON.parse(oldAccounts);
      if (Array.isArray(accounts) && accounts.length > 0) {
        const targetAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
        const targetParsed = targetAccounts ? JSON.parse(targetAccounts) : [];
        
        if (targetParsed.length === 0) {
          // Move accounts to the correct key
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, oldAccounts);
          localStorage.removeItem('accounts');
          console.log(`Moved ${accounts.length} accounts to correct storage key`);
        }
      }
    }
    
    // Check and fix schools
    const oldSchools = localStorage.getItem('schools');
    if (oldSchools) {
      const schools = JSON.parse(oldSchools);
      if (Array.isArray(schools) && schools.length > 0) {
        const targetSchools = localStorage.getItem(STORAGE_KEYS.SCHOOLS);
        const targetParsed = targetSchools ? JSON.parse(targetSchools) : [];
        
        if (targetParsed.length === 0) {
          // Move schools to the correct key
          localStorage.setItem(STORAGE_KEYS.SCHOOLS, oldSchools);
          localStorage.removeItem('schools');
          console.log(`Moved ${schools.length} schools to correct storage key`);
        }
      }
    }
    
    // Check and fix students
    const oldStudents = localStorage.getItem('students');
    if (oldStudents) {
      const students = JSON.parse(oldStudents);
      if (Array.isArray(students) && students.length > 0) {
        const targetStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        const targetParsed = targetStudents ? JSON.parse(targetStudents) : [];
        
        if (targetParsed.length === 0) {
          // Move students to the correct key
          localStorage.setItem(STORAGE_KEYS.STUDENTS, oldStudents);
          console.log(`Moved ${students.length} students to correct storage key`);
        }
      }
    }
    
    console.log('Storage consistency check completed');
  } catch (error) {
    console.error('Error ensuring storage consistency:', error);
  }
};

// Export all API functions as default
const api = {
  getSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  getStudents,
  createStudent,
  importStudents,
  exportStudentsTemplate,
  getFees,
  createFee,
  importFees,
  exportFeesTemplate,
  getInstallments,
  saveInstallment,
  createMessage,
  getSchoolSettings,
  updateSchoolSettings,
  getAccounts,
  createAccount,
  getAccount,
  updateAccount,
  deleteAccount,
  getMessages,
  sendPasswordReset,
  updateLastLogin,
  isEmailInUse,
  cleanupDatabase,
  syncData,
  ensureStorageConsistency,
  // Add WhatsApp integration that uses the whatsapp.ts service
  sendWhatsAppMessage: async (phone: string, message: string) => {
    const whatsappService = await import('./whatsapp').then(module => module.default);
    return whatsappService.sendWhatsAppMessage(phone, message);
  }
};

export default api;