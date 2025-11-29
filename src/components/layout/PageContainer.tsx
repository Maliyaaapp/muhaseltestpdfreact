import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
  className?: string;
}

/**
 * PageContainer component provides consistent page dimensions and layout
 * 
 * @param children - Content to render inside the container
 * @param title - Optional page title
 * @param maxWidth - Maximum width of the container (sm: 640px, md: 768px, lg: 1024px, xl: 1280px, full: 100%)
 * @param padding - Whether to apply default padding
 * @param className - Additional CSS classes
 */
const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  maxWidth = 'lg',
  padding = true,
  className = '',
}) => {
  const maxWidthClass = {
    sm: 'max-w-screen-sm', // 640px
    md: 'max-w-screen-md', // 768px
    lg: 'max-w-screen-lg', // 1024px
    xl: 'max-w-screen-xl', // 1280px
    full: 'max-w-full',    // 100%
  }[maxWidth];

  return (
    <div className={`w-full max-h-full overflow-hidden ${padding ? 'px-4 py-6 md:px-6' : ''}`}>
      {title && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        </div>
      )}
      
      <div className={`mx-auto ${maxWidthClass} max-h-full overflow-y-auto ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;