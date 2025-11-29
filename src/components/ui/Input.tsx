import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    // Create a combined ref that works with both forwarded refs and local handling
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    // Merge the forwarded ref and our local ref
    React.useImperativeHandle(ref, () => inputRef.current!);
    
    // Add focus handler to ensure input works in packaged mode
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Make sure the element is properly focusable
      if (inputRef.current && !props.disabled && !props.readOnly) {
        inputRef.current.focus();
      }
      
      // Call any existing onFocus handler from props
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    return (
      <input
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent ${className}`}
        ref={inputRef}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export default Input; 