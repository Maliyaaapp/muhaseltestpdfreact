import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { CURRENCY } from '../../../utils/constants';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { toast } from 'react-hot-toast';
import hybridApi from '../../../services/hybridApi';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import pdfPrinter from '../../../services/pdfPrinter';
import { generateReceiptNumber } from '../../../utils/helpers';
import { reserveReceiptNumbers } from '../../../utils/receiptCounter';

interface PartialPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number, paymentMethod: string, paymentNote: string, checkNumber?: string, checkDate?: string, bankNameArabic?: string, bankNameEnglish?: string, paymentDate?: string) => void;
  fee: {
    id: string;
    amount: number;
    discount: number;
    paid: number;
    balance: number;
    studentId: string;
    receiptNumber?: string;
    type: string;
  } | null;
}

const PartialPaymentModal: React.FC<PartialPaymentModalProps> = ({ 
  open, 
  onClose, 
  onConfirm, 
  fee 
}) => {
  const { user } = useSupabaseAuth();
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [checkDate, setCheckDate] = useState<string>('');
  const [bankNameArabic, setBankNameArabic] = useState<string>('');
  const [bankNameEnglish, setBankNameEnglish] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string>('');

  // Reset payment amount when the modal opens or fee changes
  useEffect(() => {
    if (fee && open) {
      // Default to the remaining balance
      setPaymentAmount(fee.balance);
      setPaymentMethod('cash');
      setPaymentNote('');
      setCheckNumber('');
      setCheckDate('');
      setBankNameArabic('');
      setBankNameEnglish('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [fee, open]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPaymentAmount(value);
    
    // Validate amount
    if (isNaN(value) || value <= 0) {
      setError('مبلغ الدفع يجب أن يكون أكبر من صفر');
    } else if (fee && value > fee.balance) {
      setError(`المبلغ أكبر من المتبقي (${fee.balance} ${CURRENCY})`);
    } else {
      setError('');
    }
  };

  const handleSubmit = () => {
    if (!fee) return;
    
    if (paymentAmount <= 0) {
      setError('مبلغ الدفع يجب أن يكون أكبر من صفر');
      return;
    }
    
    if (paymentAmount > fee.balance) {
      setError(`المبلغ أكبر من المتبقي (${fee.balance} ${CURRENCY})`);
      return;
    }
    
    onConfirm(
      paymentAmount,
      paymentMethod,
      paymentNote,
      paymentMethod === 'check' || paymentMethod === 'bank-transfer' ? checkNumber : undefined,
      paymentMethod === 'check' ? checkDate : undefined,
      paymentMethod === 'check' || paymentMethod === 'bank-transfer' ? bankNameArabic : undefined,
      paymentMethod === 'check' || paymentMethod === 'bank-transfer' ? bankNameEnglish : undefined,
      paymentDate
    );
  };

  const handlePrintReceipt = async () => {
    try {
      if (!fee) {
        toast.error('بيانات الرسوم غير متوفرة');
        return;
      }
      
      // Get student data
      const studentResponse = await hybridApi.getStudent(fee.studentId);
      if (!studentResponse.success || !studentResponse.data) {
        console.error('Student not found');
        toast.error('عذراً، لم يتم العثور على بيانات الطالب');
        return;
      }
      const student = studentResponse.data;
      
      // Get school settings
      const settingsResponse = await hybridApi.getSettings(user?.schoolId || '');
      let schoolSettings = (settingsResponse.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : null;
      
      // If no settings exist, create default settings
      if (!schoolSettings) {
        const defaultSettings = {
          schoolId: user?.schoolId || '',
          schoolName: '',
          schoolEmail: '',
          schoolPhone: '',
          schoolAddress: '',
          schoolLogo: '',
          defaultInstallments: 4,
          feeCategories: ['رسوم دراسية', 'رسوم كتب', 'رسوم نشاطات', 'رسوم أخرى'],
          receiptNumberFormat: 'REC-{YYYY}-{MM}-{COUNTER}',
          installmentReceiptFormat: 'INST-{YYYY}-{MM}-{COUNTER}',
          receiptCounter: 1,
          installmentReceiptCounter: 1,
          showWatermark: true,
          showFooter: schoolSettings?.showFooterInReceipts
        };
        
        try {
          await hybridApi.updateSettings(user?.schoolId || '', defaultSettings);
          schoolSettings = defaultSettings;
        } catch (error) {
          console.error('Error creating default settings:', error);
          schoolSettings = defaultSettings;
        }
      }
      
      // Get tuition fee amount if available
      let tuitionFees = 0;
      if ((student as any).tuitionFee) {
        tuitionFees = (student as any).tuitionFee;
      } else {
        // Try to find a tuition fee record
        const feesResponse = await hybridApi.getFees(user?.schoolId || '', student.id);
        const allFees = feesResponse.success ? feesResponse.data || [] : [];
        const tuitionFee = allFees.find(f => f.feeType === 'tuition');
        if (tuitionFee) {
          tuitionFees = tuitionFee.amount;
        }
      }
      
      // Always generate a new unique receipt number for each partial payment using atomic reservation
      let receiptNumber: string;
      try {
        const reservedNumbers = await reserveReceiptNumbers(user?.schoolId || '', 'fee', 1);
        receiptNumber = reservedNumbers[0];
      } catch (error) {
        console.error('Error reserving receipt number for partial payment, falling back to direct generation:', error);
        // Fallback to direct generation if reservation fails
        receiptNumber = generateReceiptNumber(schoolSettings, student.studentId);
      }
      const format = schoolSettings?.receiptNumberFormat || 'auto';
      const configuredYear = schoolSettings?.receiptNumberYear || new Date().getFullYear();
      const academicYearDisplay = format === 'year' ? String(configuredYear) : (format === 'short-year' ? String(configuredYear).slice(-2) : undefined);

      // Create receipt data
      const receiptData = {
        receiptNumber: receiptNumber,
        date: new Date().toISOString(),
        studentName: student.name,
        englishName: student.englishName || '',
        englishGrade: student.englishGrade || '',
        studentId: student.id,
        grade: student.grade,
        student: student,
        tuitionFees: tuitionFees,
        feeType: fee.type,
        amount: paymentAmount,
        originalAmount: fee.amount,
        discount: fee.discount,
        totalAmount: paymentAmount,
        schoolName: schoolSettings?.name || user?.schoolName || '',
        englishSchoolName: schoolSettings?.englishName || '',
        schoolLogo: schoolSettings?.logo || user?.schoolLogo || '',
        schoolPhone: schoolSettings?.phone || user?.schoolPhone || '',
        schoolPhoneWhatsapp: schoolSettings?.phoneWhatsapp || user?.schoolPhoneWhatsapp || '',
        schoolPhoneCall: schoolSettings?.phoneCall || user?.schoolPhoneCall || '',
        schoolEmail: schoolSettings?.email || user?.schoolEmail || '',
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        isPartialPayment: true,
        academicYear: academicYearDisplay,
        showStamp: schoolSettings?.showStampOnPartialPayment,
        showSignature: schoolSettings?.showSignatureOnPartialPayment,
        showStampOnPartialPayment: schoolSettings?.showStampOnPartialPayment,
        showSignatureOnPartialPayment: schoolSettings?.showSignatureOnPartialPayment,
        showWatermark: schoolSettings?.showReceiptWatermark,
        showLogoBackgroundOnReceipt: (schoolSettings as any)?.showLogoBackgroundOnReceipt ?? (schoolSettings as any)?.showLogoBackground,
        showFooter: schoolSettings?.showFooterInReceipts,
        paymentNote: paymentNote,
        checkNumber: checkNumber,
        checkDate: checkDate,
        bankNameArabic: bankNameArabic,
        bankNameEnglish: bankNameEnglish,
        schoolId: user?.schoolId
      };
      
      // Increment receipt counter for each partial payment receipt
      try {
        const settingsResp = await hybridApi.getSettings(user?.schoolId || '');
        if (settingsResp?.success && settingsResp?.data && settingsResp.data.length > 0) {
          const currentSettings = settingsResp.data[0];
          const updatedSettings = {
            ...currentSettings,
            receiptNumberCounter: (currentSettings.receiptNumberCounter || 0) + 1
          };
          await hybridApi.updateSettings(user?.schoolId || '', updatedSettings);
        }
      } catch (error) {
        console.error('Error incrementing receipt counter:', error);
      }

      // Print receipt
      await pdfPrinter.printReceipt(receiptData);
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('حدث خطأ أثناء طباعة الإيصال');
    }
  };

  if (!fee) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent dir="rtl" className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">دفع جزئي للرسوم</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="px-4 py-2 bg-gray-50 rounded-md">
            <p className="text-gray-600 mb-1">إجمالي الرسوم: {fee.amount} {CURRENCY}</p>
            <p className="text-gray-600 mb-1">الخصم: {fee.discount} {CURRENCY}</p>
            <p className="text-gray-600 mb-1">المدفوع سابقاً: {fee.paid} {CURRENCY}</p>
            <p className="text-gray-700 font-bold">المتبقي: {fee.balance} {CURRENCY}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-left col-span-1">
              مبلغ الدفع
            </Label>
            <div className="col-span-3">
              <Input
                id="amount"
                type="number"
                value={paymentAmount || ''}
                onChange={handleAmountChange}
                min={0}
                max={fee.balance}
                step={0.01}
                className="text-left"
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
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
                  اسم البنك (عربي)
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
                  اسم البنك (إنجليزي)
                </Label>
                <div className="col-span-3">
                  <Input
                    id="bank-name-english"
                    value={bankNameEnglish}
                    onChange={(e) => setBankNameEnglish(e.target.value)}
                    placeholder="أدخل اسم البنك بالإنجليزية"
                  />
                </div>
              </div>
            </>
          )}
          
          {paymentMethod === 'bank-transfer' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bank-name-arabic-transfer" className="text-left col-span-1">
                  اسم البنك (عربي)
                </Label>
                <div className="col-span-3">
                  <Input
                    id="bank-name-arabic-transfer"
                    value={bankNameArabic}
                    onChange={(e) => setBankNameArabic(e.target.value)}
                    placeholder="أدخل اسم البنك بالعربية"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bank-name-english-transfer" className="text-left col-span-1">
                  اسم البنك (إنجليزي)
                </Label>
                <div className="col-span-3">
                  <Input
                    id="bank-name-english-transfer"
                    value={bankNameEnglish}
                    onChange={(e) => setBankNameEnglish(e.target.value)}
                    placeholder="أدخل اسم البنك بالإنجليزية"
                  />
                </div>
              </div>
            </>
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
          <Button 
            onClick={handleSubmit}
            disabled={!!error || paymentAmount <= 0 || paymentAmount > fee.balance}
          >
            تأكيد الدفع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PartialPaymentModal;