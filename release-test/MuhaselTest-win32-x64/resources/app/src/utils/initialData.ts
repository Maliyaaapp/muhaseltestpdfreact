import { v4 as uuidv4 } from 'uuid';

// Generate sample fees for testing
export const generateSampleFees = (schoolId: string, studentId: string, studentName: string, grade: string) => {
  const now = new Date().toISOString();
  
  return [
    {
      id: uuidv4(),
      studentId,
      studentName,
      grade,
      feeType: 'tuition',
      description: 'رسوم دراسية للفصل الأول',
      amount: 2000,
      discount: 0,
      paid: 0,
      balance: 2000,
      status: 'unpaid',
      dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      schoolId,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      studentId,
      studentName,
      grade,
      feeType: 'transportation',
      transportationType: 'two-way',
      description: 'رسوم النقل المدرسي',
      amount: 500,
      discount: 0,
      paid: 200,
      balance: 300,
      status: 'partial',
      dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      schoolId,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      studentId,
      studentName,
      grade,
      feeType: 'uniform',
      description: 'رسوم الزي المدرسي',
      amount: 350,
      discount: 50,
      paid: 300,
      balance: 0,
      status: 'paid',
      dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      schoolId,
      createdAt: now,
      updatedAt: now
    }
  ];
};

// Generate sample students for testing
export const generateSampleStudents = (schoolId: string) => {
  const now = new Date().toISOString();
  
  return [
    {
      id: uuidv4(),
      name: 'احمد محمد سعيد',
      studentId: 'ST' + Math.floor(10000 + Math.random() * 90000),
      grade: 'الصف الأول',
      parentName: 'محمد سعيد',
      parentEmail: 'parent1@example.com',
      phone: '968123456789',
      whatsapp: '968123456789',
      address: 'مسقط، عمان',
      transportation: 'two-way',
      schoolId,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      name: 'فاطمة علي حسن',
      studentId: 'ST' + Math.floor(10000 + Math.random() * 90000),
      grade: 'الصف الثاني',
      parentName: 'علي حسن',
      parentEmail: 'parent2@example.com',
      phone: '968987654321',
      whatsapp: '968987654321',
      address: 'صلالة، عمان',
      transportation: 'one-way',
      transportationDirection: 'to-school',
      schoolId,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      name: 'خالد سالم الرشيدي',
      studentId: 'ST' + Math.floor(10000 + Math.random() * 90000),
      grade: 'الصف الثالث',
      parentName: 'سالم الرشيدي',
      parentEmail: 'parent3@example.com',
      phone: '968123498765',
      whatsapp: '968123498765',
      address: 'صحار، عمان',
      transportation: 'none',
      schoolId,
      createdAt: now,
      updatedAt: now
    }
  ];
};

// Generate sample accounts for testing
export const generateSampleAccounts = (schoolId: string, schoolName: string) => {
  return [
    {
      id: uuidv4(),
      name: 'مدير المدرسة',
      email: 'principal@example.com',
      username: 'principal',
      password: 'password123',
      role: 'schoolAdmin',
      schoolId: schoolId,
      schoolName: schoolName,
      lastLogin: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'مدير الصف الأول',
      email: 'grade1@example.com',
      username: 'grade1manager',
      password: 'password123',
      role: 'gradeManager',
      schoolId: schoolId,
      schoolName: schoolName,
      gradeLevels: ['الصف الأول'],
      lastLogin: null
    },
    {
      id: uuidv4(),
      name: 'مدير الصف الثاني والثالث',
      email: 'grade23@example.com',
      username: 'grade23manager',
      password: 'password123',
      role: 'gradeManager',
      schoolId: schoolId,
      schoolName: schoolName,
      gradeLevels: ['الصف الثاني', 'الصف الثالث'],
      lastLogin: null
    }
  ];
};

// Helper function to initialize sample data
export const initializeSampleData = (forceRefresh = false) => {
  try {
    // Check if we have any students
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    
    if (students.length === 0 || forceRefresh) {
      // Create a school if none exists
      const schools = JSON.parse(localStorage.getItem('schools') || '[]');
      let schoolId: string;
      
      if (schools.length === 0) {
        const newSchoolId = uuidv4();
        const newSchool = {
          id: newSchoolId,
          name: 'المدرسة النموذجية',
          email: 'school@example.com',
          phone: '96800000000',
          address: 'مسقط، عمان',
          location: 'مسقط',
          active: true,
          subscriptionStart: new Date().toISOString(),
          subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          logo: 'https://placehold.co/200x200/teal/white?text=School'
        };
        
        schools.push(newSchool);
        localStorage.setItem('schools', JSON.stringify(schools));
        schoolId = newSchoolId;
      } else {
        schoolId = schools[0].id;
      }
      
      // Generate and save sample data
      const sampleStudents = generateSampleStudents(schoolId);
      localStorage.setItem('students', JSON.stringify(sampleStudents));
      
      // Generate fees for each student
      const allFees = sampleStudents.flatMap(student => 
        generateSampleFees(schoolId, student.id, student.name, student.grade)
      );
      localStorage.setItem('fees', JSON.stringify(allFees));
      
      // Generate and save sample accounts
      const sampleAccounts = generateSampleAccounts(schoolId, schools[0].name);
      localStorage.setItem('accounts', JSON.stringify(sampleAccounts));
      
      console.log('Sample data initialized successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error initializing sample data:', error);
    return false;
  }
}; 