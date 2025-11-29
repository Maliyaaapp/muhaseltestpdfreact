import React from 'react';

interface FormContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  actions?: React.ReactNode;
}

/**
 * FormContainer provides consistent form sizing and styling
 * 
 * @param children - Form content
 * @param title - Form title
 * @param subtitle - Optional subtitle or description
 * @param size - Form size (sm: 500px, md: 800px, lg: 1000px)
 * @param onSubmit - Form submission handler
 * @param className - Additional CSS classes
 * @param actions - Form action buttons
 */
const FormContainer: React.FC<FormContainerProps> = ({
  children,
  title,
  subtitle,
  size = 'md',
  onSubmit,
  className = '',
  actions,
}) => {
  const sizeClass = {
    sm: 'form-container-sm',
    md: 'form-container',
    lg: 'form-container-lg',
  }[size];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <div className={`${sizeClass} ${className}`}>
      {title && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {children}
        
        {actions && <div className="form-actions">{actions}</div>}
      </form>
    </div>
  );
};

export default FormContainer; 