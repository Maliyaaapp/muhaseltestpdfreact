import React from 'react';

interface FormFieldProps {
  children: React.ReactNode;
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  width?: 'full' | 'half' | 'third' | 'quarter';
}

/**
 * FormField component for consistent form field styling
 * 
 * @param children - Field input element
 * @param label - Field label
 * @param htmlFor - ID of the input element (for accessibility)
 * @param error - Error message
 * @param hint - Helper text
 * @param required - Whether the field is required
 * @param className - Additional CSS classes
 * @param width - Field width (full, half, third, quarter)
 */
const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className = '',
  width = 'full',
}) => {
  const widthClass = {
    full: 'form-col-full',
    half: 'form-col-half',
    third: 'form-col-third',
    quarter: 'form-col-quarter',
  }[width];

  return (
    <div className={`form-col ${widthClass} ${className}`}>
      <div className="form-group">
        {label && (
          <label htmlFor={htmlFor} className="form-label">
            {label}
            {required && <span className="text-red-600 mr-1">*</span>}
          </label>
        )}
        
        {children}
        
        {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
};

export default FormField; 