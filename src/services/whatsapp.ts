import { formatDate } from '../utils/formatters';

/**
 * WhatsApp messenger service using the web link approach
 * @param phone Phone number to send message to
 * @param message Message content
 * @param metadata Additional metadata like studentId, schoolId, etc.
 * @returns Promise resolving to true if WhatsApp web was opened successfully
 */
const sendWhatsAppMessage = async (phone: string, message: string, metadata?: any): Promise<{ success: boolean }> => {
  // Normalize phone (remove spaces and non-numeric except leading +)
  const normalizedPhone = (phone || '')
    .replace(/[^+\d]/g, '')
    .replace(/^00/, '+');

  // If running inside Electron and API is available, use it
  if (typeof window !== 'undefined' && (window as any)?.electronAPI?.sendWhatsAppMessage) {
    return await (window as any).electronAPI.sendWhatsAppMessage(normalizedPhone, message);
  }

  // Browser fallback: open WhatsApp Web with prefilled message
  const encodedText = encodeURIComponent(message || '');
  const waUrl = normalizedPhone
    ? `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  // Try opening in a new tab/window
  const win = window.open(waUrl, '_blank');
  if (!win) {
    return { success: false };
  }

  return { success: true };
};

// WhatsApp template messages for common use cases
export const getTemplateMessage = (
  templateName: 'payment_reminder' | 'payment_confirmation' | 'transportation_notice' | 'general',
  params: {
    studentName: string;
    amount?: number;
    dueDate?: string;
    schoolName?: string;
    customMessage?: string;
  }
): string => {
  const { studentName, amount, dueDate, schoolName, customMessage } = params;
  
  // Format due date if provided (using Georgian/Gregorian calendar format)
  const formattedDueDate = dueDate ? formatDate(dueDate) : '';
  
  switch (templateName) {
    case 'payment_reminder':
      return `الفاضل ولي الامر المحترم\n\nنود افادتكم بموعد سداد القسط المستحق على الطالب ${studentName} و البالغ قدره ${amount} ريال عماني بتاريخ ${formattedDueDate}. لذا نرجو منكم التكرم بسداد المبلغ.\n\nشاكرين لكم تعاونكم\n\n${schoolName || ''}`;
      
    case 'payment_confirmation':
      return `الفاضل ولي الامر المحترم\n\nنشكركم على دفع الرسوم للطالب ${studentName} بمبلغ ${amount} ريال عماني.\n\nشاكرين لكم تعاونكم\n\n${schoolName || ''}`;
      
    case 'transportation_notice':
      return `الفاضل ولي الامر المحترم\n\nإشعار بشأن خدمة النقل المدرسي للطالب ${studentName}. ${customMessage || ''}\n\nشاكرين لكم تعاونكم\n\n${schoolName || ''}`;
      
    case 'general':
    default:
      return customMessage || `الفاضل ولي الامر المحترم\n\nرسالة من ${schoolName || 'المدرسة'} بخصوص الطالب ${studentName}\n\nشاكرين لكم تعاونكم`;
  }
};

export default {
  sendWhatsAppMessage
};
 