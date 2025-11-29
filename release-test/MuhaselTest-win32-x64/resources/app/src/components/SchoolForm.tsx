import React, { useState, useRef } from 'react';
import { createSchool, updateSchool, School } from '../services/schoolService';
import LogoUploader from './LogoUploader';
import { Upload } from 'lucide-react';

interface SchoolFormProps {
  initialData?: School;
  onSuccess: (school: School) => void;
  onCancel: () => void;
}

const SchoolForm: React.FC<SchoolFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const [school, setSchool] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    phoneWhatsapp: initialData?.phoneWhatsapp || '',
    phoneCall: initialData?.phoneCall || '',
    address: initialData?.address || '',
    location: initialData?.location || '',
    active: initialData?.active ?? true,
    subscriptionStart: initialData?.subscriptionStart || new Date().toISOString().split('T')[0],
    subscriptionEnd: initialData?.subscriptionEnd || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment: initialData?.payment || 0,

  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setSchool({
      ...school,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };
  
  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
  };
  


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let result;
      if (initialData) {
        // Update existing school
        result = await updateSchool(initialData.id, {
          ...school,
          logoFile: logoFile || undefined
        });
      } else {
        // Create new school
        result = await createSchool({
          ...school,
          logoFile: logoFile || undefined
        });
      }
      
      onSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Failed to save school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-md shadow-md">
      <h2 className="text-xl font-bold mb-4">
        {initialData ? 'Edit School' : 'Add New School'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2">
            <LogoUploader 
              initialLogo={initialData?.logo} 
              onFileChange={handleLogoChange} 
            />
          </div>
          

          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
            <input
              type="text"
              name="name"
              value={school.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={school.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={school.phone}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone</label>
            <input
              type="tel"
              name="phoneWhatsapp"
              value={school.phoneWhatsapp}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="+968 XXXXXXXX"
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">Call Phone</label>
            <input
              type="tel"
              name="phoneCall"
              value={school.phoneCall}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="+968 XXXXXXXX"
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
            <input
              type="number"
              name="payment"
              value={school.payment}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={school.location}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              name="address"
              value={school.address}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="active"
                checked={school.active}
                onChange={handleChange}
                className="mr-2"
              />
              <span>Active</span>
            </div>
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Start</label>
            <input
              type="date"
              name="subscriptionStart"
              value={school.subscriptionStart}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription End</label>
            <input
              type="date"
              name="subscriptionEnd"
              value={school.subscriptionEnd}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-6 space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded-md"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md"
            disabled={loading}
          >
            {loading ? 'Saving...' : initialData ? 'Update School' : 'Create School'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SchoolForm;