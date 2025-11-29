import React from 'react';

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * FormSection component for grouping related form fields
 * 
 * @param children - Section content
 * @param title - Section title
 * @param description - Optional description
 * @param className - Additional CSS classes
 */
const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  description,
  className = '',
}) => {
  return (
    <div className={`form-section ${className}`}>
      {title && <h3 className="form-section-title">{title}</h3>}
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {children}
    </div>
  );
};

export default FormSection; 