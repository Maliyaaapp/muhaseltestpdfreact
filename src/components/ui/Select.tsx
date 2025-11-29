"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "../../utils/cn"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  // Create a local ref
  const triggerRef = React.useRef<React.ElementRef<typeof SelectPrimitive.Trigger>>(null);
  
  // Combine with forwarded ref
  React.useImperativeHandle(ref, () => triggerRef.current!);
  
  // Handle focus explicitly to ensure it works in packaged mode
  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (triggerRef.current && !props.disabled) {
      triggerRef.current.focus();
    }
    
    // Call original handler if it exists
    if (props.onFocus) {
      props.onFocus(e);
    }
  };
  
  return (
    <SelectPrimitive.Trigger
      ref={triggerRef}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onFocus={handleFocus}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  // Create a local ref
  const contentRef = React.useRef<React.ElementRef<typeof SelectPrimitive.Content>>(null);
  
  // Combine with forwarded ref
  React.useImperativeHandle(ref, () => contentRef.current!);
  
  // Handle focus explicitly to ensure it works in packaged mode
  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (contentRef.current) {
      contentRef.current.focus();
    }
    
    // Call original handler if it exists
    if (props.onFocus) {
      props.onFocus(e);
    }
  };
  
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={contentRef}
        className={cn(
          "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        onFocus={handleFocus}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            "p-1 bg-white",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => {
  // Create a local ref
  const labelRef = React.useRef<React.ElementRef<typeof SelectPrimitive.Label>>(null);
  
  // Combine with forwarded ref
  React.useImperativeHandle(ref, () => labelRef.current!);
  
  // Handle focus explicitly to ensure it works in packaged mode
  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (labelRef.current) {
      labelRef.current.focus();
    }
    
    // Call original handler if it exists
    if (props.onFocus) {
      props.onFocus(e);
    }
  };
  
  return (
    <SelectPrimitive.Label
      ref={labelRef}
      className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
      onFocus={handleFocus}
      {...props}
    />
  );
})
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  // Create a local ref
  const itemRef = React.useRef<React.ElementRef<typeof SelectPrimitive.Item>>(null);
  
  // Combine with forwarded ref
  React.useImperativeHandle(ref, () => itemRef.current!);
  
  // Handle focus explicitly to ensure it works in packaged mode
  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (itemRef.current && !props.disabled) {
      itemRef.current.focus();
    }
    
    // Call original handler if it exists
    if (props.onFocus) {
      props.onFocus(e);
    }
  };
  
  return (
    <SelectPrimitive.Item
      ref={itemRef}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none text-gray-900 hover:bg-gray-100 focus:bg-primary-100 focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onFocus={handleFocus}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} 