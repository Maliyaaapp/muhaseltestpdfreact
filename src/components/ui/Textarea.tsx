import * as React from "react"

import { cn } from "../../utils/cn"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    // Create a local ref for the textarea
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Merge the forwarded ref and our local ref
    React.useImperativeHandle(ref, () => textareaRef.current!);
    
    // Add focus handler to ensure textarea works in packaged mode
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Make sure the element is properly focusable
      if (textareaRef.current && !props.disabled && !props.readOnly) {
        textareaRef.current.focus();
      }
      
      // Call any existing onFocus handler from props
      if (props.onFocus) {
        props.onFocus(e);
      }
    };
    
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={textareaRef}
        onFocus={handleFocus}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea } 