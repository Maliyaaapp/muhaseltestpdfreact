import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', ...props }, ref) => {
    // Create a local ref
    const labelRef = React.useRef<HTMLLabelElement>(null);
    
    // Combine with forwarded ref
    React.useImperativeHandle(ref, () => labelRef.current!);
    
    // Handle focus explicitly to ensure it works in packaged mode
    const handleFocus = (e: React.FocusEvent<HTMLLabelElement>) => {
      if (labelRef.current) {
        labelRef.current.focus();
      }
      
      // Call original handler if it exists
      if (props.onFocus) {
        props.onFocus(e);
      }
    };
    
    return (
      <label
        ref={labelRef}
        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';

export default Label; 