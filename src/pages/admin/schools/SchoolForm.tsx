import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowRight, Upload, X } from 'lucide-react';
import { LOCATIONS } from '../../../utils/constants';
import { createSchool, updateSchool, getSchool, SchoolWithLogo } from '../../../services/schoolService';

interface SchoolFormData {
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
  logoFile?: File;
  payment?: number;
}

const defaultFormData: SchoolFormData = {
  name: '',
  englishName: '',
  email: '',
  phone: '',
  phoneWhatsapp: '',
  phoneCall: '',
  address: '',
  location: 'مسقط',
  active: true,
  subscriptionStart: new Date().toISOString().split('T')[0],
  subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  logo: '',
  payment: 0
};

const SchoolForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<SchoolFormData>(defaultFormData);
  
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLogoProcessing, setIsLogoProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isEditMode) {
        try {
          // Fetch school data
          const schoolData = await getSchool(id!);
          if (schoolData) {
            // Ensure all fields have proper default values to prevent controlled/uncontrolled input issues
            setFormData({
              name: schoolData.name || '',
              englishName: schoolData.englishName || '',
              email: schoolData.email || '',
              phone: schoolData.phone || '',
              phoneWhatsapp: schoolData.phoneWhatsapp || '',
              phoneCall: schoolData.phoneCall || '',
              address: schoolData.address || '',
              location: schoolData.location || 'مسقط',
              active: schoolData.active !== undefined ? schoolData.active : true,
              subscriptionStart: schoolData.subscriptionStart || new Date().toISOString().split('T')[0],
              subscriptionEnd: schoolData.subscriptionEnd || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
              logo: schoolData.logo || '',
              logoFile: schoolData.logoFile,
              payment: schoolData.payment || 0
            });
            if (schoolData.logo) {
              setLogoPreview(schoolData.logo);
            }
          } else {
            alert('المدرسة غير موجودة');
            navigate('/admin/schools');
          }
        } catch (error) {
          console.error('Error fetching school:', error);
          alert('حدث خطأ أثناء جلب بيانات المدرسة');
          navigate('/admin/schools');
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, isEditMode, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Clear errors when field is modified
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    if (type === 'checkbox') {
      const checkboxTarget = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkboxTarget.checked
      });
    } else if (name === 'phone' || name === 'phoneWhatsapp' || name === 'phoneCall') {
      // Accept phone number as entered without automatically adding prefix
      setFormData({
        ...formData,
        [name]: value
      });
    } else if (name === 'payment') {
      // Handle payment as a number
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : Number(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleLogoChange = async (file: File | null) => {
    if (file) {
      setIsLogoProcessing(true);
      try {
        // Convert file to data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setLogoPreview(dataUrl);
          setFormData(prev => ({
            ...prev,
            logo: dataUrl,
            logoFile: file
          }));
          setIsLogoProcessing(false);
        };
        reader.onerror = () => {
          console.error('Error reading file');
          setIsLogoProcessing(false);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error processing logo:', error);
        setIsLogoProcessing(false);
      }
    } else {
      // Clear logo
      setLogoPreview('');
      setFormData(prev => ({
        ...prev,
        logo: '',
        logoFile: undefined
      }));
    }
  };

  const handleLogoUpload = () => {
    fileInputRef.current?.click();
  };

  // Add this function to compress images
  const compressImage = (file: File, maxSizeMB: number = 1): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate the new dimensions while maintaining aspect ratio
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to Blob with reduced quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas to Blob conversion failed'));
                return;
              }
              
              // Create new file from the blob
              const newFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              resolve(newFile);
            },
            'image/jpeg',
            0.7 // Quality (0.7 = 70%)
          );
        };
        
        img.onerror = () => {
          reject(new Error('Image loading error'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('FileReader error'));
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
      setErrors({
        ...errors,
        logo: 'يرجى اختيار ملف صورة صالح'
      });
      return;
    }
    
    // Check file size (1MB = 1048576 bytes)
    const MAX_SIZE_MB = 1;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1048576;
    
    let fileToUse = file;
    
    if (file.size > MAX_SIZE_BYTES) {
      // Ask the user if they want to compress the image
      const shouldCompress = window.confirm(
        `حجم الملف (${(file.size / 1048576).toFixed(2)} ميجابايت) أكبر من الحد المسموح به (${MAX_SIZE_MB} ميجابايت). هل ترغب في ضغط الصورة تلقائيًا؟`
      );
      
      if (shouldCompress) {
        try {
          // Show loading state
          setIsLogoProcessing(true);
          
          // Compress the image
          fileToUse = await compressImage(file);
          console.log(`Compressed image from ${file.size} to ${fileToUse.size} bytes`);
        } catch (error) {
          console.error('Error compressing image:', error);
          alert('حدث خطأ أثناء ضغط الصورة. يرجى تجربة صورة أخرى أو تقليل حجمها يدويًا.');
          setIsLogoProcessing(false);
          return;
        }
      }
    }
    
    // Store the actual file for upload
    setFormData({
      ...formData,
      logoFile: fileToUse
    });
    
    // Read file as data URL for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoPreview(result);
      setIsLogoProcessing(false);
    };
    reader.readAsDataURL(fileToUse);
  };



  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'اسم المدرسة مطلوب';
      isValid = false;
    }
    
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
      isValid = false;
    }
    
    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
      isValid = false;
    }
    
    if (!formData.phoneWhatsapp || !formData.phoneWhatsapp.trim()) {
      newErrors.phoneWhatsapp = 'رقم الواتساب مطلوب';
      isValid = false;
    }
    
    if (!formData.phoneCall || !formData.phoneCall.trim()) {
      newErrors.phoneCall = 'رقم الاتصال مطلوب';
      isValid = false;
    }
    
    if (!formData.address || !formData.address.trim()) {
      newErrors.address = 'العنوان مطلوب';
      isValid = false;
    }
    
    if (!formData.location) {
      newErrors.location = 'المحافظة/الولاية مطلوبة';
      isValid = false;
    }
    
    if (!formData.subscriptionStart) {
      newErrors.subscriptionStart = 'تاريخ بداية الاشتراك مطلوب';
      isValid = false;
    }

    
    if (!formData.subscriptionEnd) {
      newErrors.subscriptionEnd = 'تاريخ انتهاء الاشتراك مطلوب';
      isValid = false;
    }
    
    // Check subscription dates
    if (formData.subscriptionStart && formData.subscriptionEnd) {
      const startDate = new Date(formData.subscriptionStart);
      const endDate = new Date(formData.subscriptionEnd);
      
      if (endDate < startDate) {
        newErrors.subscriptionEnd = 'تاريخ انتهاء الاشتراك يجب أن يكون بعد تاريخ البداية';
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      let result;
      if (isEditMode && id) {
        // Update existing school
        result = await updateSchool(id, formData);
        // Navigate back with success message
        navigate('/admin/schools', { 
          state: { 
            successMessage: `تم تحديث بيانات المدرسة "${formData.name}" بنجاح` 
          } 
        });
      } else {
        // Create new school
        result = await createSchool(formData as SchoolWithLogo);
        // Navigate back with success message
        navigate('/admin/schools', { 
          state: { 
            successMessage: `تم إضافة المدرسة "${formData.name}" بنجاح` 
          } 
        });
      }
    } catch (error) {
      console.error('Error saving school:', error);
      alert('حدث خطأ أثناء حفظ البيانات');
      setIsSaving(false);
    }
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
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/schools')}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowRight size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditMode ? 'تعديل بيانات المدرسة' : 'إضافة مدرسة جديدة'}
        </h1>
      </div>
      
      {/* Warning about logo uploads */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
        <h3 className="text-amber-800 font-semibold mb-1">ملاحظة هامة حول رفع الشعار والختم:</h3>
        <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside rtl">
          <li>للحصول على أفضل النتائج، استخدم ملف صورة بحجم أقل من 1 ميجابايت</li>
          <li>يفضل استخدام صيغة PNG بخلفية شفافة</li>
          <li>في حال واجهت مشكلة في رفع الشعار أو الختم، يمكنك تحميل صورة بحجم أصغر أو المتابعة بدون</li>
        </ul>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-800">بيانات المدرسة</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="name">
                اسم المدرسة <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                value={formData.name ?? ''}
                onChange={handleChange}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="englishName">
                اسم المدرسة باللغة الإنجليزية
              </label>
              <input
                id="englishName"
                name="englishName"
                type="text"
                className={`input ${errors.englishName ? 'border-red-500' : ''}`}
                value={formData.englishName ?? ''}
                onChange={handleChange}
              />
              {errors.englishName && (
                <p className="text-red-500 text-sm mt-1">{errors.englishName}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="email">
                البريد الإلكتروني <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`input ${errors.email ? 'border-red-500' : ''}`}
                value={formData.email ?? ''}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="phone">
                رقم الهاتف العام <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="input"
                value={formData.phone ?? ''}
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
              <label className="block text-gray-700 mb-2" htmlFor="phoneWhatsapp">
                رقم الواتساب <span className="text-red-500">*</span>
              </label>
              <input
                id="phoneWhatsapp"
                name="phoneWhatsapp"
                type="tel"
                className="input"
                value={formData.phoneWhatsapp ?? ''}
                onChange={handleChange}
                placeholder="أدخل رقم الواتساب مع رمز البلد"
              />
              {errors.phoneWhatsapp ? (
                <p className="text-red-500 text-sm mt-1">{errors.phoneWhatsapp}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">أدخل رقم الواتساب مع رمز البلد (مثال: +123456789)</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="phoneCall">
                رقم للاتصال المباشر <span className="text-red-500">*</span>
              </label>
              <input
                id="phoneCall"
                name="phoneCall"
                type="tel"
                className="input"
                value={formData.phoneCall ?? ''}
                onChange={handleChange}
                placeholder="أدخل رقم الهاتف للاتصال مع رمز البلد"
              />
              {errors.phoneCall ? (
                <p className="text-red-500 text-sm mt-1">{errors.phoneCall}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">أدخل رقم الهاتف مع رمز البلد (مثال: +123456789)</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="location">
                المحافظة/الولاية <span className="text-red-500">*</span>
              </label>
              <select
                id="location"
                name="location"
                className={`input ${errors.location ? 'border-red-500' : ''}`}
                value={formData.location ?? ''}
                onChange={handleChange}
              >
                <option value="">-- اختر المحافظة/الولاية --</option>
                {LOCATIONS.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="payment">
                قيمة الدفع
              </label>
              <input
                id="payment"
                name="payment"
                type="number"
                className={`input ${errors.payment ? 'border-red-500' : ''}`}
                value={formData.payment ?? 0}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
              {errors.payment ? (
                <p className="text-red-500 text-sm mt-1">{errors.payment}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">قيمة الدفع للمدرسة</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="subscriptionStart">
                تاريخ بداية الاشتراك <span className="text-red-500">*</span>
              </label>
              <input
                id="subscriptionStart"
                name="subscriptionStart"
                type="date"
                className={`input ${errors.subscriptionStart ? 'border-red-500' : ''}`}
                value={formData.subscriptionStart ?? ''}
                onChange={handleChange}
              />
              {errors.subscriptionStart && (
                <p className="text-red-500 text-sm mt-1">{errors.subscriptionStart}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="subscriptionEnd">
                تاريخ انتهاء الاشتراك <span className="text-red-500">*</span>
              </label>
              <input
                id="subscriptionEnd"
                name="subscriptionEnd"
                type="date"
                className={`input ${errors.subscriptionEnd ? 'border-red-500' : ''}`}
                value={formData.subscriptionEnd ?? ''}
                onChange={handleChange}
              />
              {errors.subscriptionEnd && (
                <p className="text-red-500 text-sm mt-1">{errors.subscriptionEnd}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">
                شعار المدرسة
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleLogoUpload}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Upload size={16} />
                  <span>رفع شعار</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleLogoChange(file);
                  }}
                  className="hidden"
                />
                {isLogoProcessing ? (
                  <div className="h-16 w-16 flex items-center justify-center border rounded bg-gray-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : logoPreview && (
                  <div className="relative">
                    <img 
                      src={logoPreview} 
                      alt="معاينة شعار المدرسة" 
                      className="h-16 w-auto object-contain border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview('');
                        setFormData({
                          ...formData,
                          logo: ''
                        });
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      title="حذف الشعار"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              {errors.logo && (
                <p className="text-red-500 text-sm mt-1">{errors.logo}</p>
              )}
            </div>
            

            
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2" htmlFor="address">
                العنوان <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                className={`input ${errors.address ? 'border-red-500' : ''}`}
                value={formData.address ?? ''}
                onChange={handleChange}
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address}</p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="flex items-center space-x-3 space-x-reverse">
                <input
                  name="active"
                  type="checkbox"
                  className="h-5 w-5 text-primary rounded focus:ring-primary"
                  checked={formData.active}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      active: e.target.checked
                    });
                  }}
                />
                <span className="text-gray-700">المدرسة نشطة</span>
              </label>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/admin/schools')}
              className="btn btn-secondary ml-3"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={isSaving}
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

export default SchoolForm;
 