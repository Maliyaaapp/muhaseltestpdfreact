import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, Upload } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { CURRENCY, INSTALLMENT_PLANS, DEFAULT_SCHOOL_IMAGES } from '../../../utils/constants';

import toast from 'react-hot-toast';
import hybridApi from '../../../services/hybridApi';
import { generateReceiptNumber } from '../../../utils/helpers';
import { getNextReceiptNumber } from '../../../utils/receiptCounter';

// Helper function to generate unique IDs
const generateUniqueId = () => {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
};

export interface SchoolSettings {
  name: string;
  email: string;
  phone: string;
  phoneWhatsapp: string;
  phoneCall: string;
  address: string;
  logo: string;

  defaultInstallments: number;
  tuitionFeeCategory: string;
  transportationFeeOneWay: number;
  transportationFeeTwoWay: number;
  receiptNumberFormat: string;
  receiptNumberPrefix: string;
  receiptNumberCounter: number;
  installmentReceiptNumberCounter: number;
  showReceiptWatermark: boolean;
  showStudentReportWatermark: boolean;
  showInvoiceWatermark: boolean;
  showLogoBackground: boolean;
  // Watermark settings for different document types
  showLogoBackgroundOnReceipt: boolean;
  showLogoBackgroundOnStudentReport: boolean;
  showLogoBackgroundOnInstallmentReport: boolean;
  showLogoBackgroundOnInvoice: boolean;
  showLogoBackgroundOnFeeReport: boolean;
  // Footer settings - only keeping actively used fields
  showFooterInReceipts: boolean;
  footerContactInfo: boolean;
  footerAddress: boolean;
  englishName?: string;
  installmentReceiptNumberFormat: string;
  installmentReceiptNumberPrefix: string;
  receiptNumberYear?: number;
  installmentReceiptNumberYear?: number;
}

// Default settings with explicit initial values for all properties
const defaultSettings: SchoolSettings = {
  name: '',
  englishName: '',
  email: '',
  phone: '',
  phoneWhatsapp: '',
  phoneCall: '',
  address: '',
  logo: '',

  defaultInstallments: 4,
  tuitionFeeCategory: 'رسوم دراسية',
  transportationFeeOneWay: 150,
  transportationFeeTwoWay: 300,
  receiptNumberFormat: 'auto',
  receiptNumberPrefix: '',
  receiptNumberCounter: 1,
  installmentReceiptNumberCounter: 1,
  showReceiptWatermark: false,
  showStudentReportWatermark: false,
  showInvoiceWatermark: false,
  showLogoBackground: true,
  // Watermark settings for different document types
  showLogoBackgroundOnReceipt: true,
  showLogoBackgroundOnStudentReport: true,
  showLogoBackgroundOnInstallmentReport: true, 
  showLogoBackgroundOnInvoice: true,
  showLogoBackgroundOnFeeReport: true,
  // Footer settings defaults - only keeping actively used fields
  showFooterInReceipts: true,
  footerContactInfo: true,
  footerAddress: true,
  installmentReceiptNumberFormat: 'auto',
  installmentReceiptNumberPrefix: '',
  receiptNumberYear: new Date().getFullYear(),
  installmentReceiptNumberYear: new Date().getFullYear(),
};

  const Settings = () => {
  const { user, updateUserInfo } = useSupabaseAuth();
  // 1. On mount, try to load cached settings from localStorage
  const cachedSettings = (() => {
    try {
      const cache = localStorage.getItem('school-settings-cache');
      return cache ? JSON.parse(cache) : null;
    } catch {
      return null;
    }
  })();
  const [settings, setSettings] = useState<SchoolSettings>(cachedSettings || defaultSettings);
  
  const [tempSchoolId, setTempSchoolId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [availableLogos, setAvailableLogos] = useState<string[]>(DEFAULT_SCHOOL_IMAGES);
  const [showLogoSelector, setShowLogoSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add this function to ensure numeric values are properly handled
  const ensureNumber = (value: any, defaultValue = 0): number => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  useEffect(() => {
    // Fetch settings for the current user's school
    const fetchSettings = async () => {
      // If user doesn't have a schoolId, generate a temporary one
      if (!user?.schoolId) {
        const generatedId = generateUniqueId();
        setTempSchoolId(generatedId);
        console.log('No schoolId found, generated temporary ID:', generatedId);
        setLogoPreview(DEFAULT_SCHOOL_IMAGES[0]);
        setSettings({
          ...defaultSettings,
          logo: DEFAULT_SCHOOL_IMAGES[0]
        });
        return;
      }
      
      try {
        // Check for backup prefix values before API calls
        const savedReceiptPrefix = localStorage.getItem('prefix-backup-receiptNumberPrefix');
        const savedInstallmentPrefix = localStorage.getItem('prefix-backup-installmentReceiptNumberPrefix');
        
        console.log('Checking for backup prefix values before API call:', {
          savedReceiptPrefix,
          savedInstallmentPrefix
        });
        
        // Fetch both school data and its settings to ensure we have the latest info
        const schoolResponse = await hybridApi.getSchool(user.schoolId);
        const settingsResponse = await hybridApi.getSchoolSettings(user.schoolId);
        
        if (schoolResponse.success && settingsResponse.success) {
          const schoolData = schoolResponse.data;
          const settingsData = (settingsResponse.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : {};
          
          // Debug the retrieved settings
          console.log('Settings.tsx - Retrieved settings from API:', {
            // Regular receipt settings
            receiptNumberFormat: settingsData.receiptNumberFormat,
            receiptNumberPrefix: settingsData.receiptNumberPrefix, 
            receiptNumberCounter: settingsData.receiptNumberCounter,
            // Installment receipt settings
            installmentReceiptNumberFormat: settingsData.installmentReceiptNumberFormat,
            installmentReceiptNumberPrefix: settingsData.installmentReceiptNumberPrefix,
            installmentReceiptNumberCounter: settingsData.installmentReceiptNumberCounter
          });
          
          // Merge settings, prioritizing main school properties for contact info
          // NOTE: For prefixes, prioritize backup values over API values
          // NOTE: For formats, prioritize localStorage backup over API value
          const savedReceiptFormat = localStorage.getItem('prefix-backup-receiptNumberFormat');
          const savedInstallmentFormat = localStorage.getItem('prefix-backup-installmentReceiptNumberFormat');
          const savedReceiptYear = localStorage.getItem('backup-receiptNumberYear');
          const savedInstallmentYear = localStorage.getItem('backup-installmentReceiptNumberYear');
          const mergedData = {
            ...defaultSettings,
            ...settingsData,
            // Prioritize main school properties for contact info
            name: schoolData.name || settingsData.name || '',
            englishName: schoolData.englishName || settingsData.englishName || '',
            email: schoolData.email || settingsData.email || '',
            phone: schoolData.phone || settingsData.phone || '',
            phoneWhatsapp: schoolData.phoneWhatsapp || settingsData.phoneWhatsapp || '',
            phoneCall: schoolData.phoneCall || settingsData.phoneCall || '',
            address: schoolData.address || settingsData.address || '',
            logo: schoolData.logo || settingsData.logo || DEFAULT_SCHOOL_IMAGES[0],
            // Prioritize backup prefix values if they exist
            receiptNumberPrefix: savedReceiptPrefix || settingsData.receiptNumberPrefix || '',
            installmentReceiptNumberPrefix: savedInstallmentPrefix || settingsData.installmentReceiptNumberPrefix || '',
            // Correct merge order for format and year: backup, then API, then default
            receiptNumberFormat: savedReceiptFormat || settingsData.receiptNumberFormat || 'auto',
            installmentReceiptNumberFormat: savedInstallmentFormat || settingsData.installmentReceiptNumberFormat || 'auto',
            receiptNumberYear: savedReceiptYear ? parseInt(savedReceiptYear) : (settingsData.receiptNumberYear || new Date().getFullYear()),
            installmentReceiptNumberYear: savedInstallmentYear ? parseInt(savedInstallmentYear) : (settingsData.installmentReceiptNumberYear || new Date().getFullYear()),
            // Ensure numeric values are properly handled
            defaultInstallments: ensureNumber(settingsData.defaultInstallments, 4),
            transportationFeeOneWay: ensureNumber(settingsData.transportationFeeOneWay, 150),
            transportationFeeTwoWay: ensureNumber(settingsData.transportationFeeTwoWay, 300),
            receiptNumberCounter: ensureNumber(settingsData.receiptNumberCounter, 1),
            installmentReceiptNumberCounter: ensureNumber(settingsData.installmentReceiptNumberCounter, 1),
          };
          
          // Debug the merged settings
          console.log('Settings.tsx - Merged settings to be used:', {
            // Regular receipt settings
            receiptNumberFormat: mergedData.receiptNumberFormat,
            receiptNumberPrefix: mergedData.receiptNumberPrefix,
            receiptNumberCounter: mergedData.receiptNumberCounter,
            // Installment receipt settings
            installmentReceiptNumberFormat: mergedData.installmentReceiptNumberFormat,
            installmentReceiptNumberPrefix: mergedData.installmentReceiptNumberPrefix,
            installmentReceiptNumberCounter: mergedData.installmentReceiptNumberCounter
          });
          
          setSettings(mergedData);
          setLogoPreview(schoolData.logo || settingsData.logo || DEFAULT_SCHOOL_IMAGES[0]);
          
          // Cache the settings
          try { localStorage.setItem('school-settings-cache', JSON.stringify(mergedData)); } catch {}
          
          // Force refresh settings cache
          try {
            await hybridApi.getSettings(user.schoolId);
          } catch (error) {
            console.error('Error refreshing settings cache:', error);
          }
          
          // Double-check the settings from hybridApi for confirmation
          try {
            const hybridApiSettings = await hybridApi.getSettings(user.schoolId);
            if (hybridApiSettings?.success && hybridApiSettings.data && Array.isArray(hybridApiSettings.data) && hybridApiSettings.data.length > 0) {
              const hybridSettings = hybridApiSettings.data[0];
              console.log('Settings.tsx - Verified settings from hybridApi:', {
                receiptNumberFormat: hybridSettings.receiptNumberFormat,
                receiptNumberPrefix: hybridSettings.receiptNumberPrefix,
                receiptNumberCounter: hybridSettings.receiptNumberCounter,
                installmentReceiptNumberFormat: hybridSettings.installmentReceiptNumberFormat,
                installmentReceiptNumberPrefix: hybridSettings.installmentReceiptNumberPrefix,
                installmentReceiptNumberCounter: hybridSettings.installmentReceiptNumberCounter
              });
            }
          } catch (error) {
            console.error('Error verifying settings from hybridApi:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching school settings:', error);
        toast.error('حدث خطأ أثناء جلب إعدادات المدرسة');
      }
    };
    
    fetchSettings();
  }, [user]);

  // Live preview for next receipt numbers based on current settings (before saving)
  const [nextReceiptPreview, setNextReceiptPreview] = useState('');
  const [nextInstallmentReceiptPreview, setNextInstallmentReceiptPreview] = useState('');

  // Update preview when settings change
  useEffect(() => {
    // Generate preview directly from local settings state
    try {
      const feePreview = generateReceiptNumber(settings, 'PREVIEW-STUDENT');
      setNextReceiptPreview(feePreview);
    } catch (error) {
      console.error('Error generating fee receipt preview:', error);
      setNextReceiptPreview('');
    }
  }, [settings.receiptNumberFormat, settings.receiptNumberPrefix, settings.receiptNumberCounter, settings.receiptNumberYear]);

  useEffect(() => {
    // Generate preview directly from local settings state
    try {
      const installmentPreview = generateReceiptNumber(settings, 'PREVIEW-STUDENT', undefined, 'installment');
      setNextInstallmentReceiptPreview(installmentPreview);
    } catch (error) {
      console.error('Error generating installment receipt preview:', error);
      setNextInstallmentReceiptPreview('');
    }
  }, [settings.installmentReceiptNumberFormat, settings.installmentReceiptNumberPrefix, settings.installmentReceiptNumberCounter, settings.installmentReceiptNumberYear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Special logging for receipt prefix fields
    if (name === 'receiptNumberPrefix' || name === 'installmentReceiptNumberPrefix') {
      console.log(`Prefix change for ${name}:`, { 
        oldValue: settings[name as keyof typeof settings], 
        newValue: value 
      });
    }
    
    if (type === 'number') {
      setSettings({
        ...settings,
        [name]: value === '' ? 0 : parseFloat(value)
      });
    } else if (type === 'checkbox') {
      const checkboxTarget = e.target as HTMLInputElement;
      setSettings({
        ...settings,
        [name]: checkboxTarget.checked
      });
    } else if (name === 'phone' || name === 'phoneWhatsapp' || name === 'phoneCall') {
      // Accept phone number as entered without any formatting
      setSettings({
        ...settings,
        [name]: value
      });
    } else {
      setSettings({
        ...settings,
        [name]: value
      });
    }
    
    // After setting the new value, log the state update (will be visible on next render)
    if (name === 'receiptNumberPrefix' || name === 'installmentReceiptNumberPrefix') {
      console.log(`Prefix updated for ${name}, will be rendered as:`, value);
      
      // Add timeout to check state after update
      setTimeout(() => {
        console.log(`Checking state after update for ${name}:`, {
          fromSettings: settings[name as keyof typeof settings]
        });
      }, 100);
    }

    // When user changes format or year, update backup key in localStorage
    if (name === 'receiptNumberFormat') {
      localStorage.setItem('prefix-backup-receiptNumberFormat', value);
    }
    if (name === 'installmentReceiptNumberFormat') {
      localStorage.setItem('prefix-backup-installmentReceiptNumberFormat', value);
    }
    if (name === 'receiptNumberYear') {
      localStorage.setItem('backup-receiptNumberYear', value);
    }
    if (name === 'installmentReceiptNumberYear') {
      localStorage.setItem('backup-installmentReceiptNumberYear', value);
    }
  };

  const handleLogoUpload = () => {
    setShowLogoSelector(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.match('image.*')) {
        alert('يرجى اختيار ملف صورة صالح');
        return;
      }
      
      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoPreview(result);
        setSettings({
          ...settings,
          logo: result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const selectLogo = (logoUrl: string) => {
    setLogoPreview(logoUrl);
    setSettings({
      ...settings,
      logo: logoUrl
    });
    setShowLogoSelector(false);
  };

  // Add a special function specifically for handling prefix fields
  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    console.log(`handlePrefixChange called for ${name}:`, { oldValue: settings[name as keyof typeof settings], newValue: value });
    
    // Create a clone of the settings to avoid reference issues, properly typed
    const updatedSettings: SchoolSettings = { ...settings };
    
    // Type assertion to ensure TypeScript understands this is a valid property
    if (name === "receiptNumberPrefix" || name === "installmentReceiptNumberPrefix") {
      // Safely update the specific field
      (updatedSettings as any)[name] = value;
      
      // Force this value to be saved regardless of other settings
      localStorage.setItem(`prefix-backup-${name}`, value);
      
      // Update state
      setSettings(updatedSettings);
      
      console.log(`After prefix change for ${name}, state will be:`, value);
    }
  };
  
  // Add effect to restore prefixes from backup on load
  useEffect(() => {
    const savedReceiptPrefix = localStorage.getItem('prefix-backup-receiptNumberPrefix');
    const savedInstallmentPrefix = localStorage.getItem('prefix-backup-installmentReceiptNumberPrefix');
    
    // Only update if we have saved values
    if (savedReceiptPrefix || savedInstallmentPrefix) {
      console.log('Restoring prefixes from backup storage:', { 
        savedReceiptPrefix, 
        savedInstallmentPrefix 
      });
      
      setSettings(prev => ({
        ...prev,
        receiptNumberPrefix: savedReceiptPrefix || prev.receiptNumberPrefix || '',
        installmentReceiptNumberPrefix: savedInstallmentPrefix || prev.installmentReceiptNumberPrefix || ''
      }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Get the format directly from localStorage backups if they exist
      const backedUpReceiptFormat = localStorage.getItem('prefix-backup-receiptNumberFormat');
      const backedUpInstallmentFormat = localStorage.getItem('prefix-backup-installmentReceiptNumberFormat');
      
      // Preserve prefix settings explicitly, regardless of format
      const receiptPrefix = settings.receiptNumberPrefix || localStorage.getItem('prefix-backup-receiptNumberPrefix') || '';
      const installmentPrefix = settings.installmentReceiptNumberPrefix || localStorage.getItem('prefix-backup-installmentReceiptNumberPrefix') || '';
      
      // Use the selected format, don't force it to 'custom' if there's a prefix
      let receiptFormat = settings.receiptNumberFormat || backedUpReceiptFormat || 'auto';
      let installmentFormat = settings.installmentReceiptNumberFormat || backedUpInstallmentFormat || 'auto';
      
      // Convert string/numeric values to appropriate types
      const normalizedSettings = {
        ...settings,
        defaultInstallments: ensureNumber(settings.defaultInstallments, 4),
        transportationFeeOneWay: ensureNumber(settings.transportationFeeOneWay, 150),
        transportationFeeTwoWay: ensureNumber(settings.transportationFeeTwoWay, 300),
        // Explicitly normalize receipt settings
        receiptNumberCounter: ensureNumber(settings.receiptNumberCounter, 1),
        receiptNumberFormat: receiptFormat,
        receiptNumberPrefix: receiptPrefix,
        receiptNumberYear: ensureNumber(settings.receiptNumberYear, new Date().getFullYear()),
        // Explicitly normalize installment receipt settings
        installmentReceiptNumberCounter: ensureNumber(settings.installmentReceiptNumberCounter, 1),
        installmentReceiptNumberFormat: installmentFormat,
        installmentReceiptNumberPrefix: installmentPrefix,
        installmentReceiptNumberYear: ensureNumber(settings.installmentReceiptNumberYear, new Date().getFullYear()),
        // Always enable logo background watermarks regardless of UI settings
        showLogoBackground: true,
        showLogoBackgroundOnReceipt: true,
        showLogoBackgroundOnStudentReport: true,
        showLogoBackgroundOnInstallmentReport: true,
        showLogoBackgroundOnInvoice: true,
        showLogoBackgroundOnFeeReport: true,
      };
      
      // Save settings to hybridApi
      const saveResponse = await hybridApi.updateSettings(user?.schoolId || '', normalizedSettings);
      if (!saveResponse.success) {
        throw new Error('Failed to save settings to hybridApi');
      }
      
      // Show success message
      toast.success('تم حفظ الإعدادات بنجاح');
      
      // Update user context with new school info if user is schoolAdmin
      if (user && updateUserInfo) {
        try {
          await updateUserInfo({
            ...user,
            schoolId: user?.schoolId || '', // Add the school ID to user if it wasn't there
            schoolName: settings.name,
            schoolLogo: settings.logo || logoPreview,
            schoolEmail: settings.email,
            schoolPhone: settings.phone,
            schoolPhoneWhatsapp: settings.phoneWhatsapp,
            schoolPhoneCall: settings.phoneCall,
            schoolAddress: settings.address
          });
          
          // Force refresh settings cache but keep our state
          try {
            await hybridApi.getSettings(user?.schoolId || '');
          } catch (error) {
            console.error('Error refreshing settings cache:', error);
          }
          
          // If we were using a temporary ID, reload the page to reflect changes
          if (tempSchoolId) {
            toast.success('تم إنشاء مدرسة جديدة وحفظ الإعدادات بنجاح. سيتم تحديث الصفحة.');
            window.location.reload();
            return;
          }
        } catch (userUpdateError) {
          console.error('Error updating user info:', userUpdateError);
          toast.error('حدث خطأ أثناء تحديث معلومات المستخدم');
        }
      }
      
      // Update backup year fields
      localStorage.setItem('backup-receiptNumberYear', normalizedSettings.receiptNumberYear.toString());
      localStorage.setItem('backup-installmentReceiptNumberYear', normalizedSettings.installmentReceiptNumberYear.toString());
      
      // Update the localStorage cache
      try { localStorage.setItem('school-settings-cache', JSON.stringify(normalizedSettings)); } catch {}
      
      // Refresh settings from hybridApi to ensure consistency
      try {
        const refreshedSettingsResponse = await hybridApi.getSettings(user?.schoolId || '');
        if (refreshedSettingsResponse?.success && refreshedSettingsResponse.data && Array.isArray(refreshedSettingsResponse.data) && refreshedSettingsResponse.data.length > 0) {
          setSettings(refreshedSettingsResponse.data[0] as SchoolSettings);
        }
      } catch (error) {
        console.error('Error refreshing settings from hybridApi:', error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings({
      ...settings,
      [name]: checked
    });
  };

  // Add this function to log prefixes on component render
  useEffect(() => {
    console.log('Current receipt prefix values in state:', {
      receiptNumberPrefix: settings.receiptNumberPrefix,
      installmentReceiptNumberPrefix: settings.installmentReceiptNumberPrefix,
      // Include formats for context
      receiptNumberFormat: settings.receiptNumberFormat,
      installmentReceiptNumberFormat: settings.installmentReceiptNumberFormat,
    });
  }, [settings.receiptNumberPrefix, settings.installmentReceiptNumberPrefix]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 font-heading">إعدادات النظام</h1>
      
      {tempSchoolId && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">تنبيه: </strong>
          <span className="block sm:inline">يبدو أنك لم تقم بإعداد مدرسة بعد. سيتم إنشاء مدرسة جديدة عند حفظ الإعدادات.</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold text-gray-800 font-heading">معلومات المدرسة</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="name">
                  اسم المدرسة
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  value={settings.name}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="englishName">
                  اسم المدرسة بالإنجليزية
                </label>
                <input
                  id="englishName"
                  name="englishName"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  value={settings.englishName || ''}
                  onChange={handleChange}
                  dir="ltr"
                  placeholder="School Name in English"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="email">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  value={settings.email}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="phone">
                  رقم الهاتف
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  value={settings.phone}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="phoneWhatsapp">
                  رقم الواتساب
                </label>
                <input
                  id="phoneWhatsapp"
                  name="phoneWhatsapp"
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  value={settings.phoneWhatsapp}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="phoneCall">
                  رقم الاتصال
                </label>
                <input
                  id="phoneCall"
                  name="phoneCall"
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  value={settings.phoneCall}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  شعار المدرسة
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleLogoUpload}
                    className="px-4 py-2 bg-maroon text-white rounded-md hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon focus:ring-opacity-50 flex items-center gap-2"
                  >
                    <Upload size={16} />
                    <span>اختيار شعار</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {logoPreview && (
                    <div className="relative">
                      <img 
                        src={logoPreview} 
                        alt="معاينة شعار المدرسة" 
                        className="h-16 w-auto object-contain border rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_SCHOOL_IMAGES[0];
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="address">
                  العنوان
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  value={settings.address}
                  onChange={handleChange}
                />
              </div>
            </div>
            {/* Live preview for receipt number */}
            <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
              <div className="text-sm text-gray-600">معاينة رقم الإيصال القادم:</div>
              <div className="mt-1 font-bold text-gray-900">{nextReceiptPreview || '—'}</div>
              <div className="text-xs text-gray-500 mt-1">تتغير المعاينة فور تغيير الخيارات؛ يتم التطبيق النهائي بعد الضغط على "حفظ الإعدادات".</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold text-gray-800 font-heading">إعدادات الرسوم</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="defaultInstallments">
                  عدد الأقساط الافتراضي
                </label>
                <select
                  id="defaultInstallments"
                  name="defaultInstallments"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  value={settings.defaultInstallments}
                  onChange={handleChange}
                >
                  {INSTALLMENT_PLANS.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="tuitionFeeCategory">
                  اسم فئة الرسوم الدراسية
                </label>
                <input
                  id="tuitionFeeCategory"
                  name="tuitionFeeCategory"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  value={settings.tuitionFeeCategory}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="transportationFeeOneWay">
                  رسوم النقل (اتجاه واحد)
                </label>
                <div className="relative">
                  <input
                    id="transportationFeeOneWay"
                    name="transportationFeeOneWay"
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent pl-16"
                    value={settings.transportationFeeOneWay}
                    onChange={handleChange}
                    min="0"
                    step="1"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center bg-gray-100 border-l border-gray-300 px-3 rounded-l-md">
                    {CURRENCY}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="transportationFeeTwoWay">
                  رسوم النقل (اتجاهين)
                </label>
                <div className="relative">
                  <input
                    id="transportationFeeTwoWay"
                    name="transportationFeeTwoWay"
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent pl-16"
                    value={settings.transportationFeeTwoWay}
                    onChange={handleChange}
                    min="0"
                    step="1"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center bg-gray-100 border-l border-gray-300 px-3 rounded-l-md">
                    {CURRENCY}
                  </div>
                </div>
              </div>
            </div>
            {/* Live preview for installment receipt number */}
            <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
              <div className="text-sm text-gray-600">معاينة رقم إيصال القسط القادم:</div>
              <div className="mt-1 font-bold text-gray-900">{nextInstallmentReceiptPreview || '—'}</div>
              <div className="text-xs text-gray-500 mt-1">تتغير المعاينة فور تغيير الخيارات؛ يتم التطبيق النهائي بعد الضغط على "حفظ الإعدادات".</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold text-gray-800 font-heading">إعدادات الإيصالات</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="receipt-format-auto"
                  name="receiptNumberFormat"
                  value="auto"
                  checked={settings.receiptNumberFormat === 'auto'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="receipt-format-auto" className="text-gray-700">
                  تلقائي (مثال: R-12345678)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="receipt-format-sequential"
                  name="receiptNumberFormat"
                  value="sequential"
                  checked={settings.receiptNumberFormat === 'sequential'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="receipt-format-sequential" className="text-gray-700">
                  تسلسلي (مثال: 1, 2, 3...)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="receipt-format-year"
                  name="receiptNumberFormat"
                  value="year"
                  checked={settings.receiptNumberFormat === 'year'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="receipt-format-year" className="text-gray-700">
                  تسلسلي مع السنة (مثال: 1/2025)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="receipt-format-short-year"
                  name="receiptNumberFormat"
                  value="short-year"
                  checked={settings.receiptNumberFormat === 'short-year'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="receipt-format-short-year" className="text-gray-700">
                  تسلسلي مع السنة المختصرة (مثال: 1/25)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="receipt-format-custom"
                  name="receiptNumberFormat"
                  value="custom"
                  checked={settings.receiptNumberFormat === 'custom'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="receipt-format-custom" className="text-gray-700">
                  مخصص مع بادئة
                </label>
              </div>
            </div>
            {settings.receiptNumberFormat === 'custom' && (
              <div className="mt-2">
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="receiptNumberPrefix">
                  بادئة رقم الإيصال
                </label>
                <input
                  id="receiptNumberPrefix"
                  name="receiptNumberPrefix"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  placeholder="مثال: INV-"
                  value={settings.receiptNumberPrefix || ''}
                  onChange={handlePrefixChange}
                />
              </div>
            )}
            {/* Year field for receipt */}
            <div className="mt-2">
              <label className="block text-gray-700 mb-2 font-medium" htmlFor="receiptNumberYear">
                سنة الإيصال
              </label>
              <input
                id="receiptNumberYear"
                name="receiptNumberYear"
                type="number"
                min="2000"
                max="2100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                value={settings.receiptNumberYear || new Date().getFullYear()}
                onChange={handleChange}
              />
            </div>
            {/* Start number field for receipt */}
            <div className="mt-2">
              <label className="block text-gray-700 mb-2 font-medium" htmlFor="receiptNumberCounter">
                رقم البداية للإيصالات
              </label>
              <input
                id="receiptNumberCounter"
                name="receiptNumberCounter"
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                value={settings.receiptNumberCounter || 1}
                onChange={handleChange}
                placeholder="مثال: 1"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold text-gray-800 font-heading">إعدادات إيصالات الأقساط</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="installment-format-auto"
                  name="installmentReceiptNumberFormat"
                  value="auto"
                  checked={settings.installmentReceiptNumberFormat === 'auto'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="installment-format-auto" className="text-gray-700">
                  تلقائي (مثال: INST-12345678)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="installment-format-sequential"
                  name="installmentReceiptNumberFormat"
                  value="sequential"
                  checked={settings.installmentReceiptNumberFormat === 'sequential'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="installment-format-sequential" className="text-gray-700">
                  تسلسلي (مثال: 1, 2, 3...)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="installment-format-year"
                  name="installmentReceiptNumberFormat"
                  value="year"
                  checked={settings.installmentReceiptNumberFormat === 'year'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="installment-format-year" className="text-gray-700">
                  تسلسلي مع السنة (مثال: 1/2025)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="installment-format-short-year"
                  name="installmentReceiptNumberFormat"
                  value="short-year"
                  checked={settings.installmentReceiptNumberFormat === 'short-year'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="installment-format-short-year" className="text-gray-700">
                  تسلسلي مع السنة المختصرة (مثال: 1/25)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="installment-format-custom"
                  name="installmentReceiptNumberFormat"
                  value="custom"
                  checked={settings.installmentReceiptNumberFormat === 'custom'}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5 text-maroon focus:ring-maroon"
                />
                <label htmlFor="installment-format-custom" className="text-gray-700">
                  مخصص مع بادئة
                </label>
              </div>
            </div>
            {settings.installmentReceiptNumberFormat === 'custom' && (
              <div className="mt-2">
                <label className="block text-gray-700 mb-2 font-medium" htmlFor="installmentReceiptNumberPrefix">
                  بادئة رقم إيصال القسط
                </label>
                <input
                  id="installmentReceiptNumberPrefix"
                  name="installmentReceiptNumberPrefix"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                  placeholder="مثال: INST-"
                  value={settings.installmentReceiptNumberPrefix || ''}
                  onChange={handlePrefixChange}
                />
              </div>
            )}
            {/* Year field for installment receipt */}
            <div className="mt-2">
              <label className="block text-gray-700 mb-2 font-medium" htmlFor="installmentReceiptNumberYear">
                سنة إيصال القسط
              </label>
              <input
                id="installmentReceiptNumberYear"
                name="installmentReceiptNumberYear"
                type="number"
                min="2000"
                max="2100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                value={settings.installmentReceiptNumberYear || new Date().getFullYear()}
                onChange={handleChange}
              />
            </div>
            {/* Start number field for installment receipt */}
            <div className="mt-2">
              <label className="block text-gray-700 mb-2 font-medium" htmlFor="installmentReceiptNumberCounter">
                رقم البداية لإيصالات الأقساط
              </label>
              <input
                id="installmentReceiptNumberCounter"
                name="installmentReceiptNumberCounter"
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                value={settings.installmentReceiptNumberCounter || 1}
                onChange={handleChange}
                placeholder="مثال: 1"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-maroon text-white rounded-md hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon focus:ring-opacity-50 flex items-center gap-2"
            disabled={isSaving}
          >
            <Save size={18} />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
          </button>
        </div>
      </form>
      
      {/* Logo Selector Dialog */}
      {showLogoSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4 font-heading">اختيار شعار المدرسة</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {availableLogos.map((logo, index) => (
                <div 
                  key={index} 
                  className={`border rounded-lg p-2 cursor-pointer transition-all ${logoPreview === logo ? 'border-maroon shadow-md ring-2 ring-maroon ring-opacity-50' : 'hover:border-maroon'}`}
                  onClick={() => selectLogo(logo)}
                >
                  <img 
                    src={logo} 
                    alt={`شعار ${index + 1}`} 
                    className="w-full h-32 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_SCHOOL_IMAGES[1];
                    }}
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-3 flex justify-between items-center">
              <label className="block text-gray-700">
                أو قم برفع شعار مخصص:
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
                />
              </label>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                  onClick={() => setShowLogoSelector(false)}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-maroon text-white rounded-md hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon focus:ring-opacity-50"
                  onClick={() => setShowLogoSelector(false)}
                >
                  تأكيد الاختيار
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
 