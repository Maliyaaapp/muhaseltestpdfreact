import React from 'react';

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * FormRow component for organizing form fields horizontally
 * 
 * @param children - Form fields
 * @param className - Additional CSS classes
 */
const FormRow: React.FC<FormRowProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`form-row ${className}`}>
      {children}
    </div>
  );
};

export default FormRow; 