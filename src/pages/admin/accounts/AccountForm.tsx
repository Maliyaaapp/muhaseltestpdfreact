import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowRight, Plus, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { GRADE_LEVELS } from '../../../utils/constants';
import * as hybridApi from '../../../services/hybridApi';

interface School {
  id: string;
  name: string;
  logo?: string;
}

interface AccountFormData {
  name: string;
  email: string;
  username: string;
  password: string;
  role: string;
  schoolId: string;
  gradeLevels: string[];
}

const AccountForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'schoolAdmin',
    schoolId: '',
    gradeLevels: []
  });
  
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch schools for the dropdown
        const schoolsResponse = await hybridApi.getSchools();
        if (schoolsResponse.success) {
          setSchools(schoolsResponse.data);
        }
        
        if (isEditMode && id) {
          // Fetch account data
          const accountResponse = await hybridApi.getAccount(id);
          if (accountResponse.success) {
            const account = accountResponse.data;
            setFormData({
              name: account.name || '',
              email: account.email || '',
              username: account.username || account.email || '',
              password: '',
              role: account.role || 'schoolAdmin',
              schoolId: account.schoolId || '',
              gradeLevels: account.gradeLevels || []
            });
          } else {
            navigate('/admin/accounts');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, isEditMode, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Clear errors when field is modified
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleGradeLevelChange = (gradeLevel: string) => {
    const isSelected = formData.gradeLevels.includes(gradeLevel);
    
    if (isSelected) {
      // Remove grade level
      setFormData({
        ...formData,
        gradeLevels: formData.gradeLevels.filter(gl => gl !== gradeLevel)
      });
    } else {
      // Add grade level
      setFormData({
        ...formData,
        gradeLevels: [...formData.gradeLevels, gradeLevel]
      });
    }
  };

  const validateForm = (): Record<string, string> | null => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) {
      newErrors.name = 'الاسم مطلوب';
    }
    
    if (!formData.email) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }
    
    if (!formData.username) {
      newErrors.username = 'اسم المستخدم مطلوب';
    }
    
    if (!isEditMode && !formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    
    if (formData.role === 'gradeManager' && (!formData.schoolId || formData.gradeLevels.length === 0)) {
      newErrors.gradeLevels = 'يجب اختيار المدرسة والصفوف للمدير الصف';
    }
    
    // If there are errors, return them, otherwise return null
    return Object.keys(newErrors).length > 0 ? newErrors : null;
  };



  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      if (isEditMode && id) {
        // Handle edit mode
        const response = await hybridApi.updateAccount(id, formData);
        if (response.success) {
          navigate('/admin/accounts', {
            state: { successMessage: 'تم تحديث الحساب بنجاح' }
          });
        } else {
          setError(response.error || 'حدث خطأ أثناء تحديث الحساب');
        }
      } else {
        // Handle create mode
        let response;
        
        // Use hybridApi for account creation
        try {
          const accountData = {
            name: formData.name,
            email: formData.email,
            username: formData.username || formData.email,
            password: formData.password,
            role: formData.role,
            school_id: formData.schoolId || null,
            grade_levels: formData.gradeLevels || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: null
          };
          
          const response = await hybridApi.createAccount(accountData);
          
          if (response.success) {
            navigate('/admin/accounts', {
              state: { successMessage: 'تم إنشاء الحساب بنجاح' }
            });
          } else {
            setError(response.error || 'حدث خطأ أثناء إنشاء الحساب');
            setAttemptCount(prev => prev + 1);
          }
        } catch (error: any) {
          console.error('Error creating account via hybridApi:', error);
          setError('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
          setAttemptCount(prev => prev + 1);
        }
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setError(error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      setAttemptCount(prev => prev + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isEditMode ? 'تعديل حساب' : 'إنشاء حساب جديد'}
        </h1>
        <button
          onClick={() => navigate('/admin/accounts')}
          className="btn btn-outline flex items-center gap-1"
        >
          <ArrowRight size={16} />
          العودة
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertTriangle size={20} className="mr-2" />
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="name">
              الاسم
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
              placeholder="أدخل الاسم"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          
          {/* Email */}
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="email">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
              placeholder="example@example.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
          
          {/* Username */}
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="username">
              اسم المستخدم
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`input input-bordered w-full ${errors.username ? 'input-error' : ''}`}
              placeholder="أدخل اسم المستخدم"
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
          </div>
          
          {/* Password */}
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="password">
              كلمة المرور {isEditMode && <span className="text-gray-400 text-sm">(اتركها فارغة للاحتفاظ بنفس كلمة المرور)</span>}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`input input-bordered w-full ${errors.password ? 'input-error' : ''}`}
              placeholder={isEditMode ? '••••••' : 'أدخل كلمة المرور'}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>
          
          {/* Role */}
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="role">
              الدور
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              <option value="schoolAdmin">مدير مدرسة</option>
              <option value="gradeManager">مدير صف</option>
            </select>
          </div>
          
          {/* School */}
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="schoolId">
              المدرسة
            </label>
            <select
              id="schoolId"
              name="schoolId"
              value={formData.schoolId}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              <option value="">اختر المدرسة</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Grade Levels (only show for grade managers) */}
        {formData.role === 'gradeManager' && (
          <div className="mt-6">
            <label className="block text-gray-700 mb-2">
              الصفوف المسموح بها
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {GRADE_LEVELS.map(grade => (
                <div
                  key={grade}
                  onClick={() => handleGradeLevelChange(grade)}
                  className={`cursor-pointer px-3 py-2 rounded-md text-center transition-colors ${
                    formData.gradeLevels.includes(grade)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {grade}
                </div>
              ))}
            </div>
            {errors.gradeLevels && (
              <p className="text-red-500 text-sm mt-1">{errors.gradeLevels}</p>
            )}
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-1"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEditMode ? 'تحديث الحساب' : 'إنشاء الحساب'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountForm;
 