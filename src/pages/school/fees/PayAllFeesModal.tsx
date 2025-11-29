import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { CURRENCY } from '../../../utils/constants';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';

interface PayAllFeesModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string, paymentNote: string, checkNumber?: string, checkDate?: string, bankNameArabic?: string, bankNameEnglish?: string, paymentDate?: string) => void;
  studentName: string;
  totalAmount: number;
}

const PayAllFeesModal: React.FC<PayAllFeesModalProps> = ({ 
  open, 
  onClose, 
  onConfirm, 
  studentName,
  totalAmount
}) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [checkDate, setCheckDate] = useState<string>('');
  const [bankNameArabic, setBankNameArabic] = useState<string>('');
  const [bankNameEnglish, setBankNameEnglish] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Reset when the modal opens
  useEffect(() => {
    if (open) {
      setPaymentMethod('cash');
      setPaymentNote('');
      setCheckNumber('');
      setCheckDate('');
      setBankNameArabic('');
      setBankNameEnglish('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  const handleSubmit = () => {
    onConfirm(
      paymentMethod, 
      paymentNote, 
      paymentMethod === 'check' ? checkNumber : undefined,
      paymentMethod === 'check' ? checkDate : undefined,
      paymentMethod === 'check' ? bankNameArabic : undefined,
      paymentMethod === 'check' ? bankNameEnglish : undefined,
      paymentDate
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent dir="rtl" className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">دفع جميع الرسوم</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="px-4 py-2 bg-gray-50 rounded-md">
            <p className="text-gray-600 mb-1">اسم الطالب: {studentName}</p>
            <p className="text-gray-700 font-bold">المبلغ الإجمالي: {totalAmount} {CURRENCY}</p>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-method" className="text-left col-span-1">
              طريقة الدفع
            </Label>
            <div className="col-span-3">
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-white border-gray-300 hover:border-gray-400">
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent className="bg-white shadow-lg">
                  <SelectItem value="cash" className="bg-white hover:bg-gray-100">نقداً</SelectItem>
                  <SelectItem value="visa" className="bg-white hover:bg-gray-100">بطاقة ائتمان</SelectItem>
                  <SelectItem value="check" className="bg-white hover:bg-gray-100">شيك</SelectItem>
                  <SelectItem value="bank-transfer" className="bg-white hover:bg-gray-100">تحويل بنكي</SelectItem>
                  <SelectItem value="other" className="bg-white hover:bg-gray-100">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-date" className="text-left col-span-1">
              تاريخ الدفع
            </Label>
            <div className="col-span-3">
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          {paymentMethod === 'check' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="check-number" className="text-left col-span-1">
                  رقم الشيك
                </Label>
                <div className="col-span-3">
                  <Input
                    id="check-number"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    placeholder="أدخل رقم الشيك"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="check-date" className="text-left col-span-1">
                  تاريخ الشيك
                </Label>
                <div className="col-span-3">
                  <Input
                    id="check-date"
                    type="date"
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bank-name-arabic" className="text-left col-span-1">
                  اسم البنك (بالعربية)
                </Label>
                <div className="col-span-3">
                  <Input
                    id="bank-name-arabic"
                    value={bankNameArabic}
                    onChange={(e) => setBankNameArabic(e.target.value)}
                    placeholder="أدخل اسم البنك بالعربية"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bank-name-english" className="text-left col-span-1">
                  Bank Name (English)
                </Label>
                <div className="col-span-3">
                  <Input
                    id="bank-name-english"
                    value={bankNameEnglish}
                    onChange={(e) => setBankNameEnglish(e.target.value)}
                    placeholder="Enter bank name in English"
                  />
                </div>
              </div>
            </>
          )}
          
          {paymentMethod === 'bank-transfer' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bank-name" className="text-left col-span-1">
                اسم البنك
              </Label>
              <div className="col-span-3">
                <Input
                  id="bank-name"
                  value={bankNameArabic}
                  onChange={(e) => setBankNameArabic(e.target.value)}
                  placeholder="أدخل اسم البنك بالعربية"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-note" className="text-left col-span-1">
              ملاحظات
            </Label>
            <div className="col-span-3">
              <Textarea
                id="payment-note"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="ملاحظات إضافية عن الدفع"
                className="resize-none"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit}>
            تأكيد الدفع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayAllFeesModal; 