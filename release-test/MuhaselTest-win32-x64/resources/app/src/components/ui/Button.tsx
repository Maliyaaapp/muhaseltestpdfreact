import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className = '',
  variant = 'primary',
  ...props
}, ref) => {
  // Create a local ref
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  
  // Combine with forwarded ref
  React.useImperativeHandle(ref, () => buttonRef.current!);
  
  // Handle focus explicitly to ensure it works in packaged mode
  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (buttonRef.current && !props.disabled) {
      buttonRef.current.focus();
    }
    
    // Call original handler if it exists
    if (props.onFocus) {
      props.onFocus(e);
    }
  };
  
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    outline: 'btn-outline'
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;
  
  return (
    <button className={classes} ref={buttonRef} onFocus={handleFocus} {...props}>
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button; 