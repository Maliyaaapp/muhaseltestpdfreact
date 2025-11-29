import React from 'react';

interface ContentCardProps {
  children: React.ReactNode;
  title?: string | React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

/**
 * ContentCard component for displaying content with consistent styling
 * 
 * @param children - Card content
 * @param title - Card title or header content
 * @param actions - Optional actions to display in the header
 * @param footer - Optional footer content
 * @param className - Additional CSS classes
 * @param noPadding - Whether to remove default padding
 */
const ContentCard: React.FC<ContentCardProps> = ({
  children,
  title,
  actions,
  footer,
  className = '',
  noPadding = false,
}) => {
  return (
    <div className={`content-card max-h-full overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="content-card-header">
          {typeof title === 'string' ? (
            <h3 className="content-card-title">{title}</h3>
          ) : (
            title
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      
      <div className={`content-card-body max-h-full overflow-y-auto ${noPadding ? 'p-0' : ''}`}>
        {children}
      </div>
      
      {footer && <div className="content-card-footer">{footer}</div>}
    </div>
  );
};

export default ContentCard;