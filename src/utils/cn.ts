import { ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// A simple utility to merge class names
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 