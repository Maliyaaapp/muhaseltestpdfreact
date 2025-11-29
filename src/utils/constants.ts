//   Constants for the School Finance Management System 

//  Grade Levels for Oman education system
export const GRADE_LEVELS = [
  'الروضة KG1',
  'التمهيدي KG2',
  'الصف الأول',
  'الصف الثاني',
  'الصف الثالث',
  'الصف الرابع',
  'الصف الخامس',
  'الصف السادس',
  'الصف السابع',
  'الصف الثامن',
  'الصف التاسع',
  'الصف العاشر',
  'الصف الحادي عشر',
  'الصف الثاني عشر'
];

// Fee Types - changed from object to array format to match usage in components
export const FEE_TYPES = [
  { id: 'tuition', name: 'رسوم دراسية' },
  { id: 'transportation', name: 'نقل مدرسي' },
  { id: 'activities', name: 'أنشطة' },
  { id: 'uniform', name: 'زي مدرسي' },
  { id: 'books', name: 'كتب' },
  { id: 'other', name: 'رسوم أخرى' },
  { id: 'transportation_and_tuition', name: 'رسوم مدمجة' }
];

// Installment Plans
export const INSTALLMENT_PLANS = [
  { id: 1, name: 'دفعة واحدة' },
  { id: 2, name: 'دفعتين' },
  { id: 3, name: 'ثلاث دفعات' },
  { id: 4, name: 'أربع دفعات' },
  { id: 6, name: 'ست دفعات' },
  { id: 12, name: 'اثنا عشر دفعة' }
];

// Transportation Types
export const TRANSPORTATION_TYPES = [
  { id: 'none', name: 'لا يوجد' },
  { id: 'one-way', name: 'اتجاه واحد' },
  { id: 'two-way', name: 'اتجاهين' }
];

// Transportation Directions
export const TRANSPORTATION_DIRECTIONS = [
  { id: 'to-school', name: 'من المنزل إلى المدرسة' },
  { id: 'from-school', name: 'من المدرسة إلى المنزل' }
];

// Payment Methods
export const PAYMENT_METHODS = [
  { id: 'cash', name: 'نقداً' },
  { id: 'visa', name: 'بطاقة ائتمان' },
  { id: 'check', name: 'شيك' },
  { id: 'bank-transfer', name: 'تحويل بنكي' },
  { id: 'other', name: 'طريقة أخرى' }
];

// Currency for Oman
export const CURRENCY = 'ريال';
export const CURRENCY_NAME = 'ريال عماني';
export const CURRENCY_EN = 'OMR';
export const CURRENCY_NAME_EN = 'Omani Rial';

// Validation
export const PHONE_REGEX = /^\+?\d{6,15}$/;
export const PHONE_FORMAT = 'Example: +123456789';

// Locations in Oman
export const LOCATIONS = [
  'مسقط',
  'صلالة',
  'صحار',
  'صور',
  'نزوى',
  'البريمي',
  'الرستاق',
  'إبراء',
  'بهلاء',
  'عبري',
  'الخابورة',
  'السويق',
  'بركاء',
  'ينقل',
  'مصيرة',
  'الدقم',
  'مدحاء',
  'الخوض',
  'العامرات',
  'بوشر',
  'مطرح',
  'السيب',
  'قريات'
];

// WhatsApp Integration
export const WHATSAPP_API_URL = 'https://api.whatsapp.com/send';

// Date formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATE_FORMAT_DISPLAY = 'dd/MM/yyyy';

//   Default School Images
export const DEFAULT_SCHOOL_IMAGES = [];

// Default School Image (placeholder)
export const DEFAULT_SCHOOL_IMAGE = 'https://placehold.co/600x400/cccccc/333333?text=School+Logo';

// Module access permissions
export const MODULE_PERMISSIONS = {
  DASHBOARD: 'dashboard',
  STUDENTS: 'students',
  FEES: 'fees',
  INSTALLMENTS: 'installments',
  COMMUNICATIONS: 'communications',
  SETTINGS: 'settings'
};

// Account roles
export const ACCOUNT_ROLES = {
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'schoolAdmin',
  GRADE_MANAGER: 'gradeManager'
};

// Font families
export const ARABIC_FONTS = [
  'Tajawal',
  'Cairo',
  'Noto Kufi Arabic',
  'Amiri',
  'El Messiri',
  'Reem Kufi',
  'Scheherazade New',
  'Lateef'
];

// PDF themes
export const PDF_THEMES = [
  { id: 'default', name: 'الافتراضي', primaryColor: '#800000', textColor: '#333333' },
  { id: 'blue', name: 'أزرق', primaryColor: '#003366', textColor: '#333333' },
  { id: 'green', name: 'أخضر', primaryColor: '#006633', textColor: '#333333' },
  { id: 'purple', name: 'بنفسجي', primaryColor: '#330066', textColor: '#333333' },
  { id: 'orange', name: 'برتقالي', primaryColor: '#CC6600', textColor: '#333333' },
];

// Default number of installments for fee payment
export const DEFAULT_INSTALLMENTS = 4;

// App version
export const APP_VERSION = '1.0.0';
 