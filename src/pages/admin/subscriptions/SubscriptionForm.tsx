import React, { useState, useEffect } from 'react';
import { ArrowRight, Save } from 'lucide-react';
import { CURRENCY } from '../../../utils/constants';

interface School {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Subscription {
  id: string;
  schoolId: string;
  schoolName: string;
  contactEmail: string;
  contactPhone: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  amount: number;
  paid: boolean;
  paymentDate?: string;
  status: 'active' | 'expired' | 'pending';
  createdAt: string;
}

interface SubscriptionFormProps {
  subscription: Subscription | null;
  schools: School[];
  onSave: (subscription: Subscription) => void;
  onCancel: () => void;
}

const SubscriptionForm = ({ subscription, schools, onSave, onCancel }: SubscriptionFormProps) => {
  const isEditMode = !!subscription;
  
  const [formData, setFormData] = useState<Omit<Subscription, 'id' | 'createdAt'>>({
    schoolId: '',
    schoolName: '',
    contactEmail: '',
    contactPhone: '',
    subscriptionStart: new Date().toISOString().split('T')[0],
    subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    amount: '',
    paid: false,
    status: 'pending'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (isEditMode && subscription) {
      setFormData({
        schoolId: subscription.schoolId,
        schoolName: subscription.schoolName,
        contactEmail: subscription.contactEmail,
        contactPhone: subscription.contactPhone,
        subscriptionStart: subscription.subscriptionStart,
        subscriptionEnd: subscription.subscriptionEnd,
        amount: subscription.amount,
        paid: subscription.paid,
        paymentDate: subscription.paymentDate,
        status: subscription.status
      });
    }
  }, [isEditMode, subscription]);
  
  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const schoolId = e.target.value;
    const selectedSchool = schools.find(school => school.id === schoolId);
    
    if (selectedSchool) {
      setFormData({
        ...formData,
        schoolId,
        schoolName: selectedSchool.name,
        contactEmail: selectedSchool.email,
        contactPhone: selectedSchool.phone
      });
    } else {
      setFormData({
        ...formData,
        schoolId: '',
        schoolName: '',
        contactEmail: '',
        contactPhone: ''
      });
    }
    
    // Clear school-related errors
    setErrors({
      ...errors,
      schoolId: ''
    });
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({
        ...formData,
        [name]: checked,
        // Update status based on payment and dates
        ...(name === 'paid' && {
          status: checked ? 
            (new Date(formData.subscriptionEnd) < new Date() ? 'expired' : 'active') : 
            'pending',
          paymentDate: checked ? new Date().toISOString().split('T')[0] : undefined
        })
      });
    } else if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    } else if (name === 'subscriptionStart' || name === 'subscriptionEnd') {
      const newFormData = {
        ...formData,
        [name]: value
      };
      
      // Update status based on the dates
      if (name === 'subscriptionEnd') {
        const endDate = new Date(value);
        const today = new Date();
        
        if (endDate < today) {
          newFormData.status = 'expired';
        } else if (formData.paid) {
          newFormData.status = 'active';
        } else {
          newFormData.status = 'pending';
        }
      }
      
      setFormData(newFormData);
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear errors for the field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.schoolId) {
      newErrors.schoolId = 'يرجى اختيار مدرسة';
    }
    
    if (!formData.subscriptionStart) {
      newErrors.subscriptionStart = 'تاريخ بداية الاشتراك مطلوب';
    }
    
    if (!formData.subscriptionEnd) {
      newErrors.subscriptionEnd = 'تاريخ نهاية الاشتراك مطلوب';
    }
    
    if (formData.subscriptionStart && formData.subscriptionEnd) {
      const startDate = new Date(formData.subscriptionStart);
      const endDate = new Date(formData.subscriptionEnd);
      
      if (startDate > endDate) {
        newErrors.subscriptionEnd = 'تاريخ نهاية الاشتراك يجب أن يكون بعد تاريخ البداية';
      }
    }
    
    if (formData.amount <= 0) {
      newErrors.amount = 'المبلغ يجب أن يكون أكبر من صفر';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Prepare subscription data for saving
    const subscriptionData: Subscription = {
      id: subscription?.id || '',
      ...formData,
      createdAt: subscription?.createdAt || new Date().toISOString()
    };
    
    onSave(subscriptionData);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowRight size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditMode ? 'تعديل اشتراك' : 'إضافة اشتراك جديد'}
        </h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-800">بيانات الاشتراك</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="schoolId">
                المدرسة <span className="text-red-500">*</span>
              </label>
              <select
                id="schoolId"
                name="schoolId"
                className={`input ${errors.schoolId ? 'border-red-500' : ''}`}
                value={formData.schoolId}
                onChange={handleSchoolChange}
                disabled={isEditMode} // Disable changing school in edit mode
              >
                <option value="">-- اختر المدرسة --</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
              {errors.schoolId && (
                <p className="text-red-500 text-sm mt-1">{errors.schoolId}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="amount">
                مبلغ الاشتراك <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  className={`input pl-16 ${errors.amount ? 'border-red-500' : ''}`}
                  value={formData.amount}
                  onChange={handleChange}
                  min="1"
                  step="1"
                />
                <div className="absolute inset-y-0 left-0 flex items-center bg-gray-100 border-l border-gray-300 px-3 rounded-l-md">
                  {CURRENCY}
                </div>
              </div>
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
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
                value={formData.subscriptionStart}
                onChange={handleChange}
              />
              {errors.subscriptionStart && (
                <p className="text-red-500 text-sm mt-1">{errors.subscriptionStart}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="subscriptionEnd">
                تاريخ نهاية الاشتراك <span className="text-red-500">*</span>
              </label>
              <input
                id="subscriptionEnd"
                name="subscriptionEnd"
                type="date"
                className={`input ${errors.subscriptionEnd ? 'border-red-500' : ''}`}
                value={formData.subscriptionEnd}
                onChange={handleChange}
              />
              {errors.subscriptionEnd && (
                <p className="text-red-500 text-sm mt-1">{errors.subscriptionEnd}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="contactEmail">
                البريد الإلكتروني للتواصل
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                className="input"
                value={formData.contactEmail}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="contactPhone">
                رقم الهاتف للتواصل
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                className="input"
                value={formData.contactPhone}
                onChange={handleChange}
              />
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="paid"
                  checked={formData.paid}
                  onChange={handleChange}
                  className="h-5 w-5 text-primary rounded"
                />
                <span className="mr-2 text-gray-700">تم الدفع</span>
              </label>
            </div>
            
            {formData.paid && (
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="paymentDate">
                  تاريخ الدفع
                </label>
                <input
                  id="paymentDate"
                  name="paymentDate"
                  type="date"
                  className="input"
                  value={formData.paymentDate || ''}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-bold text-gray-700 mb-2">حالة الاشتراك:</h3>
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              formData.status === 'active' ? 'bg-green-100 text-green-800' : 
              formData.status === 'expired' ? 'bg-red-100 text-red-800' : 
              'bg-yellow-100 text-yellow-800'
            }`}>
              {formData.status === 'active' ? 'نشط' : 
               formData.status === 'expired' ? 'منتهي' : 
               'قيد الانتظار'}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * تتحدد حالة الاشتراك تلقائياً بناءً على تواريخ الاشتراك وحالة الدفع
            </p>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary ml-3"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
            >
              <Save size={18} />
              <span>حفظ البيانات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionForm;
 