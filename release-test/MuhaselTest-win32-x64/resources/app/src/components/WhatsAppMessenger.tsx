import React, { useState } from 'react';
import { Send, X } from 'lucide-react';

interface WhatsAppMessengerProps {
  phone: string;
  message: string;
  onClose: () => void;
  onSend: (phone: string, message: string) => Promise<void>;
}

const WhatsAppMessenger = ({ phone, message, onClose, onSend }: WhatsAppMessengerProps) => {
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [messageText, setMessageText] = useState(message);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      setError('رقم الهاتف مطلوب');
      return;
    }

    if (!messageText.trim()) {
      setError('نص الرسالة مطلوب');
      return;
    }

    setError(null);
    setIsSending(true);

    try {
      // Send message via proxy
      await onSend(phoneNumber, messageText);
      onClose();
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      setError('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            إرسال رسالة واتساب
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="phone">
              رقم الهاتف
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="input"
              placeholder="+968 XXXXXXXX"
            />
            <p className="text-xs text-gray-500 mt-1">تأكد من تضمين رمز البلد (+968)</p>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="message">
              نص الرسالة
            </label>
            <textarea
              id="message"
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="input"
              placeholder="اكتب رسالتك هنا..."
            />
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary ml-3"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="btn btn-primary flex items-center gap-2"
              disabled={isSending}
            >
              <Send size={18} />
              <span>{isSending ? 'جاري الإرسال...' : 'إرسال'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppMessenger;
 