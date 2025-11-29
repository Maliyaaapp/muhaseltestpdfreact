import { GRADE_LEVELS, DEFAULT_SCHOOL_IMAGES } from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import { STORAGE_KEYS } from './api';
import { safeToISODateString } from './importExport';
import storage from '../utils/storage';

// Interfaces
export interface School {
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
  payment?: number;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId?: string;
  schoolName?: string;
  schoolLogo?: string;
  schoolStamp?: string;
  gradeLevels?: string[];
  password?: string;
  lastLogin?: string | null;
}

export interface Student {
  id: string;
  name: string;
  englishName?: string;
  studentId: string;
  grade: string;
  englishGrade?: string;
  division?: string;
  parentName: string;
  parentEmail?: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  transportation: 'none' | 'one-way' | 'two-way';
  transportationDirection?: 'to-school' | 'from-school';
  transportationFee?: number;
  customTransportationFee?: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Fee {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  division?: string;
  feeType: string;
  description?: string;
  amount: number;
  discount: number;
  paid: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
  transportationType?: 'one-way' | 'two-way';
  paymentDate?: string;
  paymentMethod?: 'cash' | 'visa' | 'check' | 'bank-transfer' | 'other';
  paymentNote?: string;
  checkNumber?: string;
  checkDate?: string;
  bankNameArabic?: string;
  bankNameEnglish?: string;
}

export interface Installment {
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
  checkDate?: string;
  bankNameArabic?: string;
  bankNameEnglish?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  parentName: string;
  phone: string;
  template: string;
  message: string;
  sentAt: string;
  status: 'delivered' | 'failed' | 'pending';
  schoolId: string;
}

export interface Settings {
  name: string;
  email: string;
  englishName?: string;
  phone: string;
  phoneWhatsapp?: string;
  phoneCall?: string;
  address: string;
  logo: string;

  defaultInstallments: number;
  tuitionFeeCategory: string;
  transportationFeeOneWay: number;
  transportationFeeTwoWay: number;
  receiptNumberFormat?: string;
  receiptNumberCounter?: number;
  receiptNumberPrefix?: string;
  showReceiptWatermark?: boolean;
  showStudentReportWatermark?: boolean;
  showLogoBackground?: boolean;
  // Footer settings
  showFooterInReceipts?: boolean;
  // Signature settings
  showSignatureOnReceipt?: boolean;
  showSignatureOnStudentReport?: boolean;
  showSignatureOnInstallmentReport?: boolean;
  showSignatureOnPartialPayment?: boolean;
  installmentReceiptNumberCounter?: number;
  // Installment receipt settings
  installmentReceiptNumberFormat?: string;
  installmentReceiptNumberPrefix?: string;
  receiptNumberYear?: number;
  installmentReceiptNumberYear?: number;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  type?: string;
  schoolId?: string;
}

// Type for event handlers
type Listener = () => void;

export class DataStore {
  private listeners: Listener[] = [];
  private initialized = false;

  // Initialize the store with default data if not already present in localStorage
  initialize(): void {
    if (this.initialized) return;

    try {
      // Helper functions for safely accessing storage
      const safeGetItem = <T>(key: string, defaultValue: T): T => {
        try {
          const item = storage.get(key);
          return item !== null ? item : defaultValue;
        } catch (error) {
          console.warn(`Error retrieving ${key} from storage:`, error);
          return defaultValue;
        }
      };

      const safeSetItem = (key: string, value: any): boolean => {
        try {
          storage.set(key, value);
          return true;
        } catch (error) {
          console.warn(`Error saving ${key} to storage:`, error);
          return false;
        }
      };

      // Check schools
      if (!localStorage.getItem('schools')) {
        safeSetItem('schools', this.getDefaultSchools());
      }

      // Check if accounts exist, if not add default accounts
      const savedAccounts = safeGetItem('accounts', []);
      if (!savedAccounts || savedAccounts.length === 0) {
        const defaultAccounts = this.getDefaultAccounts();
        safeSetItem('accounts', defaultAccounts);
      }

      // Initialize an empty students array if it doesn't exist
      if (!localStorage.getItem('students')) {
        safeSetItem('students', []);
      }

      // Initialize an empty fees array if it doesn't exist
      if (!localStorage.getItem('fees')) {
        safeSetItem('fees', []);
      }

      // Initialize an empty installments array if it doesn't exist
      if (!localStorage.getItem('installments')) {
        safeSetItem('installments', []);
      }

      // Initialize an empty messages array if it doesn't exist
      if (!localStorage.getItem('messages')) {
        safeSetItem('messages', []);
      }
    } catch (error) {
      console.error('Error initializing data store:', error);
      // Continue even if initialization fails
    }

    // Set initialized flag
    this.initialized = true;
  }

  // Default data generators
  private getDefaultSchools(): School[] {
    return [];
  }

  private getDefaultAccounts(): Account[] {
    return [];
  }

  // Event subscription
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all subscribers - make it public for direct triggering
  notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Helper method for batch operations
  performBatchOperation(operation: () => void): void {
    // Store the original notifyListeners function
    const originalNotifyListeners = this.notifyListeners;
    
    // Temporarily disable notifications
    this.notifyListeners = () => {};
    
    try {
      // Perform the operation
      operation();
    } catch (error) {
      // Log any errors but don't break the flow
      console.error('Error in batch operation:', error);
    } finally {
      // Restore the original notifyListeners function
      this.notifyListeners = originalNotifyListeners;
      
      // Trigger a single update
      try {
        this.notifyListeners();
      } catch (error) {
        console.error('Error notifying listeners after batch operation:', error);
      }
    }
  }

  // Schools
  getSchools(): School[] {
    try {
      const schools = storage.get('schools');
      return schools || [];
    } catch (error) {
      console.error('Error retrieving schools:', error);
      return [];
    }
  }

  getSchool(id: string): School | null {
    const schools = this.getSchools();
    return schools.find(s => s.id === id) || null;
  }

  saveSchool(school: School): School {
    try {
      // Make a defensive copy of the school before saving
      const newSchool = { ...school };
      
      // Ensure required fields
      if (!newSchool.id) {
        newSchool.id = uuidv4();
      }
      
      if (!newSchool.createdAt) {
        newSchool.createdAt = new Date().toISOString();
      }
      
      newSchool.updatedAt = new Date().toISOString();
      
      const schools = this.getSchools();
      const index = schools.findIndex(s => s.id === newSchool.id);
      
      if (index === -1) {
        // New school
        schools.push(newSchool);
      } else {
        // Update existing school
        schools[index] = {
          ...schools[index],
          ...newSchool
        };
      }
      
      // Save to storage
      storage.set('schools', schools);
      
      // Notify listeners
      this.notifyListeners();
      
      return newSchool;
    } catch (error) {
      console.error('Error saving school:', error);
      throw error;
    }
  }

  deleteSchool(id: string): void {
    try {
      const schools = this.getSchools();
      const updatedSchools = schools.filter(s => s.id !== id);
      
      if (schools.length !== updatedSchools.length) {
        storage.set('schools', updatedSchools);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error deleting school:', error);
      throw error;
    }
  }

  // Accounts
  getAccounts(schoolId?: string): Account[] {
    try {
      const accounts = storage.get(STORAGE_KEYS.ACCOUNTS) || [];
      if (schoolId) {
        return accounts.filter((account: Account) => account.schoolId === schoolId);
      }
      return accounts;
    } catch (error) {
      console.error('Error loading accounts:', error);
      return [];
    }
  }

  getAccount(id: string): Account | null {
    const accounts = this.getAccounts();
    return accounts.find(a => a.id === id) || null;
  }

  saveAccount(account: Account): Account {
    try {
      const accounts = this.getAccounts();
      const now = new Date().toISOString();
      
      // Create new account if no ID
      if (!account.id) {
        const newAccount = {
          ...account,
          id: uuidv4(),
          lastLogin: account.lastLogin || null
        };
        
        accounts.push(newAccount);
        storage.set(STORAGE_KEYS.ACCOUNTS, accounts);
        
        this.notifyListeners();
        return newAccount;
      }
      
      // Update existing account
      const index = accounts.findIndex(a => a.id === account.id);
      if (index >= 0) {
        const updatedAccount = {
          ...accounts[index],
          ...account
        };
        
        accounts[index] = updatedAccount;
        storage.set(STORAGE_KEYS.ACCOUNTS, accounts);
        
        this.notifyListeners();
        return updatedAccount;
      }
      
      throw new Error('Account not found');
    } catch (error) {
      console.error('Error saving account:', error);
      throw error;
    }
  }

  deleteAccount(id: string): void {
    const accounts = this.getAccounts();
    const updatedAccounts = accounts.filter(a => a.id !== id);
    
    storage.set(STORAGE_KEYS.ACCOUNTS, updatedAccounts);
    this.notifyListeners();
  }

  // Students
  getStudents(schoolId?: string, grades?: string | string[]): Student[] {
    try {
      const students = storage.get('students') || [];
      
      if (!schoolId && !grades) {
        return students;
      }
      
      return students.filter((s: Student) => {
        // Filter by schoolId if provided
        if (schoolId && s.schoolId !== schoolId) {
          return false;
        }
        
        // Filter by grade if provided
        if (grades) {
          const gradeArray = Array.isArray(grades) ? grades : [grades];
          if (gradeArray.length > 0 && !gradeArray.includes(s.grade)) {
            return false;
          }
        }
        
        return true;
      });
    } catch (error) {
      console.error('Error loading students:', error);
      return [];
    }
  }

  getStudent(id: string): Student | null {
    try {
      const students = this.getStudents();
      return students.find(s => s.id === id) || null;
    } catch (error) {
      console.error('Error getting student:', error);
      return null;
    }
  }

  saveStudent(student: Partial<Student>): Student {
    const students = this.getStudents();
    const now = new Date().toISOString();
    
    // New student
    if (!student.id) {
      const newStudent: Student = {
        ...student as Student,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        // Ensure required fields have defaults
        name: student.name || '',
        studentId: student.studentId || this.generateStudentId(student.schoolId || '', student.grade || ''),
        grade: student.grade || '',
        parentName: student.parentName || '',
        phone: student.phone || '',
        transportation: student.transportation || 'none',
        schoolId: student.schoolId || '',
        englishName: student.englishName || ''
      };
      
      students.push(newStudent);
      storage.set('students', students);
      this.notifyListeners();
      return newStudent;
    }
    
    // Update existing student
    const index = students.findIndex(s => s.id === student.id);
    if (index >= 0) {
      const updatedStudent = {
        ...students[index],
        ...student,
        updatedAt: now
      };
      
      students[index] = updatedStudent;
      storage.set('students', students);
      this.notifyListeners();
      return updatedStudent;
    }
    
    throw new Error('Student not found');
  }

  deleteStudent(id: string | string[]): void {
    if (Array.isArray(id)) {
      // Delete multiple students
      const idSet = new Set(id);
      const students = this.getStudents();
      const remainingStudents = students.filter(student => !idSet.has(student.id));
      
      if (students.length !== remainingStudents.length) {
        // Update fees and installments for all deleted students
        const updatedFees: Fee[] = this.getFees().filter(fee => !idSet.has(fee.studentId));
        const updatedInstallments: Installment[] = this.getInstallments().filter(
          installment => !idSet.has(installment.studentId)
        );
        
        storage.set('students', remainingStudents);
        storage.set('fees', updatedFees);
        storage.set('installments', updatedInstallments);
        this.notifyListeners();
      }
    } else {
      // Delete a single student
      this.deleteStudentInternal(id);
    }
  }

  // Internal method to delete a single student
  private deleteStudentInternal(id: string): void {
    try {
      // Get current data
      const students = this.getStudents();
      const fees = this.getFees();
      const installments = this.getInstallments();
      
      // Find the student to be deleted
      const studentIndex = students.findIndex(s => s.id === id);
      if (studentIndex === -1) return; // Student not found
      
      // Filter data to remove student and related records
      const updatedStudents = students.filter(s => s.id !== id);
      const updatedFees = fees.filter(f => f.studentId !== id);
      const updatedInstallments = installments.filter(i => i.studentId !== id);
      
      // Save all updates
      storage.set('students', updatedStudents);
      storage.set('fees', updatedFees);
      storage.set('installments', updatedInstallments);
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error in deleteStudentInternal:', error);
      throw error;
    }
  }

  // Generate a student ID based on grade and school
  generateStudentId(schoolId: string, grade: string): string {
    const gradeCode = grade ? grade.charAt(0) + grade.charAt(grade.length - 1) : "XX";
    const schoolCode = schoolId.substring(0, 2);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${schoolCode}${gradeCode}${randomNum}`;
  }

  // Fees
  getFees(schoolId?: string, studentId?: string, grades?: string | string[]): Fee[] {
    try {
      const fees = localStorage.getItem('fees');
      let parsed = fees ? JSON.parse(fees) : [];
      
      if (schoolId) {
        parsed = parsed.filter((f: Fee) => f.schoolId === schoolId);
      }
      
      if (studentId) {
        parsed = parsed.filter((f: Fee) => f.studentId === studentId);
      }
      
      if (grades && !studentId) {
        // Get students in the specified grades
        // console.log('Filtering fees by grades:', grades);
        const students = this.getStudents(schoolId, grades);
        const studentIds = students.map(s => s.id);
        // console.log(`Found ${studentIds.length} students for grades:`, grades);
        
        parsed = parsed.filter((f: Fee) => {
          const isAllowed = studentIds.includes(f.studentId);
          if (!isAllowed && process.env.NODE_ENV === 'development') {
            // console.log(`Fee for student ${f.studentId} not allowed for grades:`, grades);
          }
          return isAllowed;
        });
        // console.log(`Found ${parsed.length} fees for grades:`, grades);
      }
      
      return parsed;
    } catch (e) {
      console.error('Error loading fees:', e);
      return [];
    }
  }

  getFee(id: string): Fee | null {
    try {
      const fees = localStorage.getItem('fees');
      const parsed = fees ? JSON.parse(fees) : [];
      return parsed.find((f: Fee) => f.id === id) || null;
    } catch (e) {
      console.error('Error getting fee:', e);
      return null;
    }
  }

  saveFee(fee: Partial<Fee>): Fee {
    const fees = this.getFees();
    const now = new Date().toISOString();
    const isNew = !fee.id;
    
    // Ensure required fields
    const amount = fee.amount || 0;
    const discount = fee.discount || 0;
    const paid = fee.paid || 0;
    
    // CRITICAL FIX: Calculate balance and status for local storage (no database triggers available)
    const balance = Math.max(0, amount - discount - paid);
    
    // Determine status
    let status: 'paid' | 'partial' | 'unpaid';
    if (balance <= 0) {
      status = 'paid';
    } else if (paid > 0) {
      status = 'partial';
    } else {
      status = 'unpaid';
    }
    
    if (isNew) {
      // Get student details for the new fee
      const student = this.getStudent(fee.studentId!);
      if (!student) {
        throw new Error('Student not found');
      }
      
      // Create new fee
      const newFee = {
        ...fee,
        id: uuidv4(),
        studentName: student.name,
        grade: student.grade,
        amount,
        discount,
        paid: paid || 0,
        balance,
        status,
        createdAt: now,
        updatedAt: now
      } as Fee;
      fees.push(newFee);
    } else {
      // Update existing fee
      const index = fees.findIndex(f => f.id === fee.id);
      if (index >= 0) {
        fees[index] = {
          ...fees[index],
          ...fee,
          amount,
          discount,
          paid: fee.paid || fees[index].paid,
          balance,
          status,
          updatedAt: now
        };
      } else {
        throw new Error('Fee not found');
      }
    }
    
    localStorage.setItem('fees', JSON.stringify(fees));
    this.notifyListeners();
    return isNew ? fees[fees.length - 1] : fees.find(f => f.id === fee.id)!;
  }

  deleteFee(id: string): void {
    const fees = this.getFees();
    const updatedFees = fees.filter(f => f.id !== id);
    localStorage.setItem('fees', JSON.stringify(updatedFees));
    this.notifyListeners();
  }

  // Installments
  getInstallments(schoolId?: string, studentId?: string, feeId?: string, grades?: string | string[]): Installment[] {
    try {
      const installments = localStorage.getItem('installments');
      let parsed = installments ? JSON.parse(installments) : [];
      
      if (schoolId) {
        parsed = parsed.filter((i: Installment) => i.schoolId === schoolId);
      }
      
      if (studentId) {
        parsed = parsed.filter((i: Installment) => i.studentId === studentId);
      }
      
      if (feeId) {
        parsed = parsed.filter((i: Installment) => i.feeId === feeId);
      }
      
      if (grades && !studentId) {
        // Get students in the specified grades
        // console.log('Filtering installments by grades:', grades);
        const students = this.getStudents(schoolId, grades);
        const studentIds = students.map(s => s.id);
        // console.log(`Found ${studentIds.length} students for grades:`, grades);
        
        parsed = parsed.filter((i: Installment) => {
          const isAllowed = studentIds.includes(i.studentId);
          if (!isAllowed && process.env.NODE_ENV === 'development') {
            // console.log(`Installment for student ${i.studentId} not allowed for grades:`, grades);
          }
          return isAllowed;
        });
        // console.log(`Found ${parsed.length} installments for grades:`, grades);
      }
      
      return parsed;
    } catch (e) {
      console.error('Error loading installments:', e);
      return [];
    }
  }

  getInstallment(id: string): Installment | null {
    try {
      const installments = localStorage.getItem('installments');
      const parsed = installments ? JSON.parse(installments) : [];
      const installment = parsed.find((i: Installment) => i.id === id) || null;
      
      // Update status based on current date
      if (installment) {
        if (installment.paidDate) {
          installment.status = 'paid';
        } else {
          const dueDate = new Date(installment.dueDate);
          const today = new Date();
          
          if (dueDate < today) {
            installment.status = 'overdue';
          } else {
            installment.status = 'upcoming';
          }
        }
      }
      
      return installment;
    } catch (e) {
      console.error('Error getting installment:', e);
      return null;
    }
  }

  saveInstallment(installment: Partial<Installment>): Installment {
    const installments = this.getInstallments();
    const now = new Date().toISOString();
    const isNew = !installment.id;
    
    // Determine status
    let status: 'paid' | 'upcoming' | 'overdue' | 'partial';
    if (installment.paidDate) {
      // If paidAmount is less than amount and is defined, mark as partial
      if (installment.paidAmount !== undefined && 
          installment.amount !== undefined && 
          installment.paidAmount < installment.amount) {
        status = 'partial';
      } else {
        status = 'paid';
      }
    } else {
      const dueDate = new Date(installment.dueDate!);
      const today = new Date();
      
      if (dueDate < today) {
        status = 'overdue';
      } else {
        status = 'upcoming';
      }
    }
    
    // Ensure installmentMonth matches the due date month
    let installmentMonth = installment.installmentMonth;
    if (installment.dueDate) {
      try {
        const dueDate = new Date(installment.dueDate);
        const monthNames = [
          'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
          'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        installmentMonth = monthNames[dueDate.getMonth()];
      } catch (e) {
        console.error('Error getting month name from date:', e);
      }
    }
    
    if (isNew) {
      // Get student details if needed
      let studentName = installment.studentName;
      let grade = installment.grade;
      
      if (!studentName || !grade) {
        const student = this.getStudent(installment.studentId!);
        if (student) {
          studentName = student.name;
          grade = student.grade;
        }
      }
      
      // Create new installment
      const newInstallment = {
        ...installment,
        id: uuidv4(),
        studentName,
        grade,
        status,
        installmentMonth,
        createdAt: now,
        updatedAt: now
      } as Installment;
      installments.push(newInstallment);
    } else {
      // Update existing installment
      const index = installments.findIndex(i => i.id === installment.id);
      if (index >= 0) {
        installments[index] = {
          ...installments[index],
          ...installment,
          status,
          installmentMonth,
          updatedAt: now
        };
      } else {
        throw new Error('Installment not found');
      }
    }
    
    localStorage.setItem('installments', JSON.stringify(installments));
    this.notifyListeners();
    return isNew ? installments[installments.length - 1] : installments.find(i => i.id === installment.id)!;
  }

  deleteInstallment(id: string): void {
    const installments = this.getInstallments();
    const updatedInstallments = installments.filter(i => i.id !== id);
    localStorage.setItem('installments', JSON.stringify(updatedInstallments));
    this.notifyListeners();
  }

  // Create installment plan from a fee
  createInstallmentPlan(fee: Fee, count: number, interval: number = 1): Installment[] {
    if (count <= 0) return [];
    
    const installments: Installment[] = [];
    const amount = Math.floor((fee.amount - (fee.discount || 0)) / count);
    const remainder = (fee.amount - (fee.discount || 0)) % count;
    
    // Calculate first installment date
    const startDate = new Date(fee.dueDate);
    
    // Arabic month names
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    for (let i = 0; i < count; i++) {
      // Calculate installment amount (add remainder to first installment)
      const installmentAmount = i === 0 ? amount + remainder : amount;
      
      // Calculate due date (first installment is on fee due date, others are monthly)
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i * interval);
      
      // Get the month name for this installment
      const installmentMonth = monthNames[dueDate.getMonth()];
      
      // Create installment
      const installment: Installment = {
        id: '',
        studentId: fee.studentId,
        studentName: fee.studentName,
        grade: fee.grade,
        amount: installmentAmount,
        dueDate: safeToISODateString(dueDate),
        paidDate: null,
        status: 'upcoming',
        feeId: fee.id,
        feeType: fee.feeType,
        schoolId: fee.schoolId,
        installmentCount: count,
        installmentMonth: installmentMonth,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      installments.push(installment);
    }
    
    return installments;
  }

  // Messages
  getMessages(schoolId?: string, studentId?: string): Message[] {
    try {
      const messages = localStorage.getItem('messages');
      let parsed = messages ? JSON.parse(messages) : [];
      
      if (schoolId) {
        parsed = parsed.filter((m: Message) => m.schoolId === schoolId);
      }
      
      if (studentId) {
        parsed = parsed.filter((m: Message) => m.studentId === studentId);
      }
      
      return parsed;
    } catch (e) {
      console.error('Error loading messages:', e);
      return [];
    }
  }

  saveMessage(message: Partial<Message>): Message {
    const messages = this.getMessages();
    const isNew = !message.id;
    
    if (isNew) {
      // Create new message
      const newMessage = {
        ...message,
        id: uuidv4(),
        sentAt: message.sentAt || new Date().toISOString()
      } as Message;
      messages.push(newMessage);
    } else {
      // Update existing message
      const index = messages.findIndex(m => m.id === message.id);
      if (index >= 0) {
        messages[index] = {
          ...messages[index],
          ...message
        };
      } else {
        throw new Error('Message not found');
      }
    }
    
    localStorage.setItem('messages', JSON.stringify(messages));
    this.notifyListeners();
    return isNew ? messages[messages.length - 1] : messages.find(m => m.id === message.id)!;
  }

  deleteMessage(id: string): void {
    const messages = this.getMessages();
    const updatedMessages = messages.filter(m => m.id !== id);
    localStorage.setItem('messages', JSON.stringify(updatedMessages));
    this.notifyListeners();
  }

  // Settings
  getSettings(schoolId: string): Settings {
    try {
      const settingsKey = `settings-${schoolId}`;
      const storedSettings = localStorage.getItem(settingsKey);
      
      // Log the key being used to retrieve settings
      console.log(`DataStore.getSettings - Using key "${settingsKey}" to retrieve settings`);
      
      if (storedSettings) {
        try {
          const parsedSettings = JSON.parse(storedSettings);
          
          // Log the retrieved settings
          console.log('DataStore.getSettings - Retrieved installment receipt settings:', {
            installmentReceiptNumberFormat: parsedSettings.installmentReceiptNumberFormat,
            installmentReceiptNumberPrefix: parsedSettings.installmentReceiptNumberPrefix,
            installmentReceiptNumberCounter: parsedSettings.installmentReceiptNumberCounter
          });
          
          return parsedSettings;
        } catch (e) {
          console.error('Error parsing stored settings:', e);
        }
      }
      
      // Get school info for defaults
      const school = this.getSchool(schoolId);
      
      // Default settings
      const defaultSettings: Settings = {
        name: school?.name || 'المدرسة',
        email: school?.email || '',
        englishName: school?.englishName || '',
        phone: school?.phone || '',
        phoneWhatsapp: school?.phoneWhatsapp || '',
        phoneCall: school?.phoneCall || '',
        address: school?.address || '',
        logo: school?.logo || '',

        defaultInstallments: 4,
        tuitionFeeCategory: 'رسوم دراسية',
        transportationFeeOneWay: 150,
        transportationFeeTwoWay: 300,
        showReceiptWatermark: true,
        showStudentReportWatermark: true,
        showLogoBackground: true
      };
      
      if (storedSettings) {
        // Merge saved settings with defaults
        const parsedSettings = JSON.parse(storedSettings);
        const mergedSettings = {
          ...defaultSettings,
          ...parsedSettings,
          // Always keep the school name and contact info from school record for consistency
          name: school?.name || parsedSettings.name || defaultSettings.name,
          englishName: school?.englishName || parsedSettings.englishName || defaultSettings.englishName,
          email: school?.email || parsedSettings.email || defaultSettings.email,
          phone: school?.phone || parsedSettings.phone || defaultSettings.phone,
          phoneWhatsapp: school?.phoneWhatsapp || parsedSettings.phoneWhatsapp || defaultSettings.phoneWhatsapp,
          phoneCall: school?.phoneCall || parsedSettings.phoneCall || defaultSettings.phoneCall,
          address: school?.address || parsedSettings.address || defaultSettings.address,
          logo: school?.logo || parsedSettings.logo || defaultSettings.logo,

        };
        
        // Save merged settings
        localStorage.setItem(settingsKey, JSON.stringify(mergedSettings));
        
        return mergedSettings;
      }
      
      // Save default settings
      try {
        localStorage.setItem(settingsKey, JSON.stringify(defaultSettings));
      } catch (storageError) {
        console.warn('Unable to save settings to localStorage:', storageError);
      }
      
      return defaultSettings;
    } catch (e) {
      console.error('Error getting settings:', e);
      return {
        name: 'المدرسة',
        email: '',
        englishName: '',
        phone: '',
        phoneWhatsapp: '',
        phoneCall: '',
        address: '',
        logo: '',

        defaultInstallments: 4,
        tuitionFeeCategory: 'رسوم دراسية',
        transportationFeeOneWay: 150,
        transportationFeeTwoWay: 300,
        showReceiptWatermark: true,
        showStudentReportWatermark: true,
        showLogoBackground: true
      };
    }
  }

  saveSettings(schoolId: string, settings: Settings): Settings {
    try {
      console.log('DataStore.saveSettings - Saving with receipt settings:', {
        // Regular receipt settings
        receiptNumberFormat: settings.receiptNumberFormat,
        receiptNumberPrefix: settings.receiptNumberPrefix,
        receiptNumberCounter: settings.receiptNumberCounter,
        // Installment receipt settings
        installmentReceiptNumberFormat: settings.installmentReceiptNumberFormat,
        installmentReceiptNumberPrefix: settings.installmentReceiptNumberPrefix,
        installmentReceiptNumberCounter: settings.installmentReceiptNumberCounter
      });

      // Always back up prefix values separately to ensure they're never lost
      if (settings.receiptNumberPrefix !== undefined && settings.receiptNumberPrefix !== null) {
        localStorage.setItem('prefix-backup-receiptNumberPrefix', settings.receiptNumberPrefix);
        console.log('DataStore.saveSettings - Backed up receiptNumberPrefix:', settings.receiptNumberPrefix);
      }
      
      if (settings.installmentReceiptNumberPrefix !== undefined && settings.installmentReceiptNumberPrefix !== null) {
        localStorage.setItem('prefix-backup-installmentReceiptNumberPrefix', settings.installmentReceiptNumberPrefix);
        console.log('DataStore.saveSettings - Backed up installmentReceiptNumberPrefix:', settings.installmentReceiptNumberPrefix);
      }

      const settingsKey = `settings-${schoolId}`;
      
      // Get existing settings to preserve fields that might not be included in the update
      let existingSettings: Settings;
      try {
        const storedSettings = localStorage.getItem(settingsKey);
        existingSettings = storedSettings ? JSON.parse(storedSettings) : { ...settings };
      } catch (e) {
        console.error('Error parsing existing settings:', e);
        existingSettings = { ...settings };
      }

      // Get all schools
      const schools = JSON.parse(localStorage.getItem('schools') || '[]');
      const schoolIndex = schools.findIndex((s: School) => s.id === schoolId);

      if (schoolIndex !== -1) {
        // Update school info with settings
        schools[schoolIndex] = {
          ...schools[schoolIndex],
          name: settings.name,
          email: settings.email,
          englishName: settings.englishName,
          phone: settings.phone,
          phoneWhatsapp: settings.phoneWhatsapp || schools[schoolIndex].phoneWhatsapp,
          phoneCall: settings.phoneCall || schools[schoolIndex].phoneCall,
          address: settings.address,
          logo: settings.logo,

        };

        // Save updated schools
        localStorage.setItem('schools', JSON.stringify(schools));

        // Update accounts with new school info
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const updatedAccounts = accounts.map((account: Account) => {
          if (account.schoolId === schoolId) {
            return {
              ...account,
              schoolName: settings.name,
              schoolLogo: settings.logo,
              schoolStamp: '' // Stamp functionality removed
            };
          }
          return account;
        });

        // Save updated accounts
        localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
      }

      // Check for backup prefix values and formats (in case they were set separately)
      const backedUpReceiptPrefix = localStorage.getItem('prefix-backup-receiptNumberPrefix');
      const backedUpInstallmentPrefix = localStorage.getItem('prefix-backup-installmentReceiptNumberPrefix');
      
      // Use the provided format, don't force custom based on prefix
      const receiptFormat = settings.receiptNumberFormat || existingSettings.receiptNumberFormat || 'auto';
      const installmentFormat = settings.installmentReceiptNumberFormat || existingSettings.installmentReceiptNumberFormat || 'auto';

      // Ensure all receipt settings are explicitly preserved
      const updatedSettings = {
        ...existingSettings,
        ...settings,
        // Explicitly preserve receipt settings
        receiptNumberFormat: receiptFormat,
        receiptNumberPrefix: settings.receiptNumberPrefix !== undefined ? 
                           settings.receiptNumberPrefix : 
                           backedUpReceiptPrefix || existingSettings.receiptNumberPrefix || '',
        receiptNumberCounter: settings.receiptNumberCounter !== undefined ? 
                            settings.receiptNumberCounter : 
                            existingSettings.receiptNumberCounter || 1,
        installmentReceiptNumberFormat: installmentFormat,
        installmentReceiptNumberPrefix: settings.installmentReceiptNumberPrefix !== undefined ? 
                                     settings.installmentReceiptNumberPrefix : 
                                     backedUpInstallmentPrefix || existingSettings.installmentReceiptNumberPrefix || '',
        installmentReceiptNumberCounter: settings.installmentReceiptNumberCounter !== undefined ? 
                                      settings.installmentReceiptNumberCounter : 
                                      existingSettings.installmentReceiptNumberCounter || 1,

        showStudentReportWatermark: settings.showStudentReportWatermark !== false,
        showReceiptWatermark: settings.showReceiptWatermark !== false,
        showLogoBackground: settings.showLogoBackground !== false
      };

      // Save the updated settings
      localStorage.setItem(settingsKey, JSON.stringify(updatedSettings));
      
      // Log the final saved settings for debugging
      console.log('DataStore.saveSettings - Final saved receipt settings:', {
        receiptNumberFormat: updatedSettings.receiptNumberFormat,
        receiptNumberPrefix: updatedSettings.receiptNumberPrefix,
        receiptNumberCounter: updatedSettings.receiptNumberCounter,
        installmentReceiptNumberFormat: updatedSettings.installmentReceiptNumberFormat,
        installmentReceiptNumberPrefix: updatedSettings.installmentReceiptNumberPrefix,
        installmentReceiptNumberCounter: updatedSettings.installmentReceiptNumberCounter
      });

      // Notify listeners of the change
      this.notifyListeners();

      return updatedSettings;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  refreshSettingsCache(schoolId: string): void {
    try {
      // Get current school data
      const school = this.getSchool(schoolId);
      if (!school) {
        throw new Error('School not found');
      }
      
      // Use the correct key format for localStorage
      const settingsKey = `settings-${schoolId}`;
      console.log(`DataStore.refreshSettingsCache - Using key "${settingsKey}" to refresh settings`);
      
      // Also check for backed up formats and prefixes
      const backedUpReceiptFormat = localStorage.getItem('prefix-backup-receiptNumberFormat');
      const backedUpInstallmentFormat = localStorage.getItem('prefix-backup-installmentReceiptNumberFormat');
      const backedUpReceiptPrefix = localStorage.getItem('prefix-backup-receiptNumberPrefix');
      const backedUpInstallmentPrefix = localStorage.getItem('prefix-backup-installmentReceiptNumberPrefix');
      
      console.log('DataStore.refreshSettingsCache - Found backed up formats and prefixes:', {
        backedUpReceiptFormat,
        backedUpInstallmentFormat,
        backedUpReceiptPrefix,
        backedUpInstallmentPrefix
      });
      
      // Get existing settings to preserve fields that might not be included in the update
      let existingSettings: Settings;
      try {
        const storedSettings = localStorage.getItem(settingsKey);
        existingSettings = storedSettings ? JSON.parse(storedSettings) : {
          // Default empty Settings
          name: school.name,
          email: school.email,
          phone: school.phone,
          address: school.address,
          logo: school.logo || '',

          defaultInstallments: 4,
          tuitionFeeCategory: 'رسوم دراسية',
          transportationFeeOneWay: 150,
          transportationFeeTwoWay: 300,
          receiptNumberFormat: 'auto',
          receiptNumberPrefix: '',
          receiptNumberCounter: 1,
          installmentReceiptNumberFormat: 'auto',
          installmentReceiptNumberPrefix: '',
          installmentReceiptNumberCounter: 1
        };
      } catch (e) {
        console.error('Error parsing existing settings:', e);
        // Create default Settings object if parsing fails
        existingSettings = {
          name: school.name,
          email: school.email,
          phone: school.phone,
          address: school.address,
          logo: school.logo || '',

          defaultInstallments: 4,
          tuitionFeeCategory: 'رسوم دراسية',
          transportationFeeOneWay: 150,
          transportationFeeTwoWay: 300,
          receiptNumberFormat: 'auto',
          receiptNumberPrefix: '',
          receiptNumberCounter: 1,
          installmentReceiptNumberFormat: 'auto',
          installmentReceiptNumberPrefix: '',
          installmentReceiptNumberCounter: 1
        };
      }

      // Explicitly preserve receipt settings
      const receiptPrefix = backedUpReceiptPrefix || existingSettings.receiptNumberPrefix || '';
      const installmentPrefix = backedUpInstallmentPrefix || existingSettings.installmentReceiptNumberPrefix || '';
      
      // Use the backed up or existing format, don't force custom if we have a prefix
      const receiptFormat = backedUpReceiptFormat || existingSettings.receiptNumberFormat || 'auto';
      const installmentFormat = backedUpInstallmentFormat || existingSettings.installmentReceiptNumberFormat || 'auto';
      
      console.log('Preserving prefix settings during refresh:', {
        receiptPrefix,
        installmentPrefix,
        receiptFormat,
        installmentFormat
      });

      // Create new settings based on school data to ensure sync
      const updatedSettings: Settings = {
        ...existingSettings,
        // Basic info from school data should take precedence
        name: school.name,
        englishName: school.englishName || existingSettings.englishName || '',
        email: school.email,
        phone: school.phone,
        phoneWhatsapp: school.phoneWhatsapp,
        phoneCall: school.phoneCall,
        address: school.address,
        logo: school.logo,

        // Preserve receipt settings with explicit preference for existing values
        receiptNumberFormat: receiptFormat,
        receiptNumberPrefix: receiptPrefix, // Use preserved value
        receiptNumberCounter: existingSettings.receiptNumberCounter || 1,
        installmentReceiptNumberFormat: installmentFormat,
        installmentReceiptNumberPrefix: installmentPrefix, // Use preserved value
        installmentReceiptNumberCounter: existingSettings.installmentReceiptNumberCounter || 1
      };
      
      // Save the updated settings
      localStorage.setItem(settingsKey, JSON.stringify(updatedSettings));
      
      // Save backup copies of these critical values
      if (receiptPrefix) {
        localStorage.setItem('prefix-backup-receiptNumberPrefix', receiptPrefix);
      }
      
      if (installmentPrefix) {
        localStorage.setItem('prefix-backup-installmentReceiptNumberPrefix', installmentPrefix);
      }
      
      // Log the refreshed settings for debugging
      console.log('DataStore.refreshSettingsCache - Refreshed settings:', {
        receiptNumberFormat: updatedSettings.receiptNumberFormat,
        receiptNumberPrefix: updatedSettings.receiptNumberPrefix,
        receiptNumberCounter: updatedSettings.receiptNumberCounter,
        installmentReceiptNumberFormat: updatedSettings.installmentReceiptNumberFormat,
        installmentReceiptNumberPrefix: updatedSettings.installmentReceiptNumberPrefix,
        installmentReceiptNumberCounter: updatedSettings.installmentReceiptNumberCounter
      });
      
      // Update accounts to reflect the changes
      const accounts = this.getAccounts(schoolId);
      if (accounts.length > 0) {
        const updatedAccounts = accounts.map(account => ({
          ...account,
          schoolName: school.name,
          schoolEnglishName: school.englishName || '',
          schoolLogo: school.logo,
          schoolStamp: account.schoolStamp || '',
          // Add other school fields
          schoolEmail: school.email,
          schoolPhone: school.phone,
          schoolPhoneWhatsapp: school.phoneWhatsapp,
          schoolPhoneCall: school.phoneCall,
          schoolAddress: school.address
        }));
        
        localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error refreshing settings cache:', error);
    }
  }

  // Helper function to get fee type label
  getFeeTypeLabel(type: string): string {
    const feeTypes: Record<string, string> = {
      'tuition': 'رسوم دراسية',
      'transportation': 'نقل مدرسي',
      'activities': 'أنشطة',
      'uniform': 'زي مدرسي',
      'books': 'كتب',
      'other': 'رسوم أخرى'
    };
    
    return feeTypes[type] || type;
  }

  // Add a method to ensure school subscription
  ensureSchoolSubscription(school: School): void {
    // This is a stub method that will be called by importExport.ts
    console.log('Ensuring subscription for school:', school.name);
  }

  // Reset all data
  resetData(): void {
    try {
      // Clear all data
      storage.set('schools', []);
      storage.set('accounts', []);
      storage.set('students', []);
      storage.set('fees', []);
      storage.set('installments', []);
      storage.set('messages', []);
      
      // Clear school settings for each school
      const schools = this.getSchools();
      schools.forEach(school => {
        storage.remove(`school_settings_${school.id}`);
      });
      
      this.notifyListeners();
      console.log('All data has been reset');
    } catch (error) {
      console.error('Error resetting data:', error);
      throw error;
    }
  }

  incrementReceiptCounter(schoolId: string): number {
    try {
      const settings = this.getSettings(schoolId);
      if (!settings.receiptNumberCounter) {
        settings.receiptNumberCounter = 1;
      } else {
        settings.receiptNumberCounter++;
      }
      this.saveSettings(schoolId, settings);
      return settings.receiptNumberCounter;
    } catch (error) {
      console.error('Error incrementing receipt counter:', error);
      return Date.now(); // Fallback to timestamp if error
    }
  }

  incrementInstallmentReceiptCounter(schoolId: string): number {
    try {
      const settings = this.getSettings(schoolId);
      if (!settings.installmentReceiptNumberCounter) {
        settings.installmentReceiptNumberCounter = 1;
      } else {
        settings.installmentReceiptNumberCounter++;
      }
      this.saveSettings(schoolId, settings);
      return settings.installmentReceiptNumberCounter;
    } catch (error) {
      console.error('Error incrementing installment receipt counter:', error);
      return Date.now(); // Fallback to timestamp if error
    }
  }

  // Templates
  async getTemplates(schoolId?: string, type?: string): Promise<Template[]> {
    try {
      // Import hybridApi dynamically to avoid circular dependency
      const { default: hybridApi } = await import('./hybridApi');
      const { success, data, error } = await hybridApi.getTemplates(schoolId, type);
      
      if (success && data) {
        // Convert from snake_case to camelCase if needed
        return data.map((template: any) => ({
          id: template.id,
          name: template.name,
          content: template.content,
          type: template.type || 'general',
          schoolId: template.school_id
        }));
      } else {
        console.error('Error fetching templates:', error);
        return [];
      }
    } catch (e) {
      console.error('Error loading templates:', e);
      return [];
    }
  }
  


  async getTemplate(id: string): Promise<Template | null> {
    try {
      // Import hybridApi dynamically to avoid circular dependency
      const { default: hybridApi } = await import('./hybridApi');
      const { success, data, error } = await hybridApi.getTemplate(id);
      
      if (success && data) {
        // Convert from snake_case to camelCase if needed
        return {
          id: data.id,
          name: data.name,
          content: data.content,
          type: data.type || 'general',
          schoolId: data.school_id
        };
      } else {
        console.error('Error fetching template:', error);
        return null;
      }
    } catch (e) {
      console.error('Error loading template:', e);
      return null;
    }
  }
  


  async saveTemplate(template: Template): Promise<Template> {
    try {
      // Import hybridApi dynamically to avoid circular dependency
      const { default: hybridApi } = await import('./hybridApi');
      
      // Prepare data for API (convert camelCase to snake_case)
      const templateData = {
        id: template.id,
        name: template.name,
        content: template.content,
        type: template.type || 'general',
        school_id: template.schoolId
      };
      
      let result;
      if (template.id && await this.getTemplate(template.id)) {
        // Update existing template
        result = await hybridApi.updateTemplate(template.id, templateData);
      } else {
        // Create new template
        result = await hybridApi.createTemplate(templateData);
      }
      
      if (result.success && result.data) {
        // Convert from snake_case to camelCase
        const savedTemplate = {
          id: result.data.id,
          name: result.data.name,
          content: result.data.content,
          type: result.data.type || 'general',
          schoolId: result.data.school_id
        };
        
        this.notifyListeners();
        return savedTemplate;
      } else {
        console.error('Error saving template:', result.error);
        return template; // Return original as fallback
      }
    } catch (e) {
      console.error('Error in saveTemplate:', e);
      return template; // Return original as fallback
    }
  }
  


  async deleteTemplate(id: string): Promise<boolean> {
    try {
      // Import hybridApi dynamically to avoid circular dependency
      const { default: hybridApi } = await import('./hybridApi');
      
      const result = await hybridApi.deleteTemplate(id);
      
      if (result.success) {
        this.notifyListeners();
        return true;
      } else {
        console.error('Error deleting template:', result.error);
        return false;
      }
    } catch (e) {
      console.error('Error in deleteTemplate:', e);
      return false;
    }
  }
  


  createInstallment(data: Omit<Installment, 'id'>): Installment {
    const id = uuidv4();
    const now = new Date().toISOString();
    const installment: Installment = {
      id,
      studentId: data.studentId,
      studentName: data.studentName,
      grade: data.grade,
      amount: data.amount,
      dueDate: data.dueDate,
      paidDate: data.paidDate,
      status: data.status,
      feeId: data.feeId,
      feeType: data.feeType,
      note: data.note,
      schoolId: data.schoolId,
      installmentCount: data.installmentCount || 1,
      installmentMonth: data.installmentMonth,
      paidAmount: data.paidAmount,
      discount: data.discount,
      paymentMethod: data.paymentMethod,
      paymentNote: data.paymentNote,
      checkNumber: data.checkNumber,
      createdAt: now,
      updatedAt: now
    };
    
    const installments = this.getInstallments();
    installments.push(installment);
    localStorage.setItem('installments', JSON.stringify(installments));
    
    return installment;
  }
}

// Create and initialize singleton instance
const dataStore = new DataStore();
dataStore.initialize();

// Export the reset method
export const resetAllData = () => dataStore.resetData();

// Export the singleton instance as default
export default dataStore;
 