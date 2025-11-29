import { MessageSquare } from 'lucide-react';
import whatsappService from '../services/whatsapp';

interface WhatsAppButtonProps {
  phone: string;
  message?: string;
  className?: string;
  buttonText?: string;
  metadata?: {
    studentId?: string;
    studentName?: string;
    grade?: string;
    parentName?: string;
    schoolId?: string;
    template?: string;
  };
}

/**
 * Button component to open WhatsApp chat with a contact
 */
const WhatsAppButton = ({ 
  phone, 
  message = '', 
  className = '',
  buttonText = 'إرسال واتساب',
  metadata = {}
}: WhatsAppButtonProps) => {
  
  const handleSendWhatsApp = async () => {
    await whatsappService.sendWhatsAppMessage(phone, message, metadata);
  };
  
  return (
    <button
      type="button"
      onClick={handleSendWhatsApp}
      className={`flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors ${className}`}
    >
      <MessageSquare size={18} />
      <span>{buttonText}</span>
    </button>
  );
};

export default WhatsAppButton; 