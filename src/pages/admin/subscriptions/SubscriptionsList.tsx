import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, Printer, Download, Edit, MessageSquare, Calendar, AlertCircle, Trash, Pause, Play, Save, RefreshCw } from 'lucide-react';
import { useSupabaseAuth } from '../../../contexts/SupabaseAuthContext';
import { CURRENCY } from '../../../utils/constants';
import hybridApi from '../../../services/hybridApi';
import dataStore, { School as DataStoreSchool } from '../../../services/dataStore';
import pdfPrinter from '../../../services/pdfPrinter';
import whatsappService from '../../../services/whatsapp';

// Update School interface to match dataStore.School
interface School extends DataStoreSchool {
  // Additional fields can be added here if needed
}

interface Subscription {
  id: string;
  schoolId: string;
  schoolName: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneWhatsapp?: string;
  contactPhoneCall?: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  amount: number;
  paid: boolean;
  paymentDate?: string;
  status: 'active' | 'expired' | 'pending' | 'paused';
  createdAt: string;
  pausedAt?: string;
}

const SubscriptionsList = () => {
  const { user } = useSupabaseAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  
  // For WhatsApp notifications
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [notifySchoolId, setNotifySchoolId] = useState('');
  const [notifySchoolName, setNotifySchoolName] = useState('');
  const [notifyPhone, setNotifyPhone] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  
  // For subscription form
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    // Load schools data which contains subscription information
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Get schools from hybridApi
        const schoolsResponse = await hybridApi.getSchools();
        if (schoolsResponse.success && schoolsResponse.data) {
          const schoolsList = schoolsResponse.data;
          console.log('Loaded schools from hybridApi:', schoolsList);
          
          setSchools(schoolsList);
          
          // Convert schools to subscription format for display
          const subscriptionsFromSchools = schoolsList.map((school: School) => ({
            id: `sub_${school.id}`,
            schoolId: school.id,
            schoolName: school.name,
            contactEmail: school.email,
            contactPhone: school.phone,
            subscriptionStart: school.subscriptionStart || new Date().toISOString().split('T')[0],
            subscriptionEnd: school.subscriptionEnd || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            amount: school.payment || 360, // Default subscription amount
            paid: school.active || false,
            paymentDate: school.active ? school.subscriptionStart : undefined,
            status: school.active ? 'active' as const : 'expired' as const,
            createdAt: school.created_at || new Date().toISOString()
          }));
          
          setSubscriptions(subscriptionsFromSchools);
        } else {
          console.error('Failed to load schools:', schoolsResponse.error);
          setSchools([]);
          setSubscriptions([]);
        }
      } catch (error) {
        console.error('Error loading schools:', error);
        setSchools([]);
        setSubscriptions([]);
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  useEffect(() => {
    // Update isPaid when selectedSubscription changes
    setIsPaid(selectedSubscription?.paid || false);
  }, [selectedSubscription]);

  // Generate sample subscriptions for demo purposes
  const generateSampleSubscriptions = (schools: School[]): Subscription[] => {
    return schools.map((school) => {
      // Always use school's actual subscription dates if available
      const startDate = school.subscriptionStart || new Date().toISOString().split('T')[0];
      
      // Set end date to one year from start if not provided in school data
      let endDate = school.subscriptionEnd;
      if (!endDate) {
        const endDateObj = new Date(startDate);
        endDateObj.setFullYear(endDateObj.getFullYear() + 1);
        endDate = endDateObj.toISOString().split('T')[0];
      }
      
      console.log(`Generating subscription for school ${school.name} with dates: ${startDate} to ${endDate}`);
      
      // Fixed subscription amount
      const amount = 360;
      
      // 70% chance of being paid
      const paid = Math.random() > 0.3;
      
      // Payment date (if paid)
      let paymentDate = undefined;
      if (paid) {
        const paymentDateObj = new Date(startDate);
        paymentDateObj.setDate(paymentDateObj.getDate() + Math.floor(Math.random() * 14)); // Paid within 14 days
        paymentDate = paymentDateObj.toISOString().split('T')[0];
      }
      
      // Status - use active if school is active, expired otherwise
      const status: 'active' | 'expired' | 'pending' | 'paused' = school.active ? 'active' : 'expired';
      
      return {
        id: `sub_${school.id}`,
        schoolId: school.id,
        schoolName: school.name,
        contactEmail: school.email,
        contactPhone: school.phone,
        subscriptionStart: startDate,
        subscriptionEnd: endDate,
        amount,
        paid,
        paymentDate,
        status,
        createdAt: new Date().toISOString()
      };
    });
  };

  const handleAddSubscription = () => {
    setSelectedSubscription(null);
    setShowAddForm(true);
  };
  
  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowAddForm(true);
  };

  const handleMarkAsPaid = async (id: string) => {
    const subscription = subscriptions.find(sub => sub.id === id);
    if (!subscription) return;
    
    try {
      // Update the school's active status and payment info
      const schoolUpdateData = {
        active: true,
        payment: subscription.amount,
        subscriptionStart: subscription.subscriptionStart,
        subscriptionEnd: subscription.subscriptionEnd
      };
      
      const updateResponse = await hybridApi.updateSchool(subscription.schoolId, schoolUpdateData);
      
      if (updateResponse.success) {
        // Update local state
        const updatedSubscriptions = subscriptions.map(sub => {
          if (sub.id === id) {
            return {
              ...sub,
              paid: true,
              paymentDate: new Date().toISOString().split('T')[0],
              status: 'active' as const
            };
          }
          return sub;
        });
        
        setSubscriptions(updatedSubscriptions);
        alert(`تم تحديث حالة الدفع لاشتراك ${subscription.schoolName} بنجاح`);
      } else {
        console.error('Failed to update school:', updateResponse.error);
        alert('حدث خطأ أثناء تحديث حالة الدفع');
      }
    } catch (error) {
      console.error('Error updating subscription payment:', error);
      alert('حدث خطأ أثناء تحديث حالة الدفع');
    }
  };
  
  const handlePauseSubscription = async (id: string) => {
    const subscription = subscriptions.find(sub => sub.id === id);
    if (!subscription) return;
    
    try {
      if (subscription.status === 'paused') {
        // Resume subscription - activate the school
        const schoolUpdateData = {
          active: true
        };
        
        const updateResponse = await hybridApi.updateSchool(subscription.schoolId, schoolUpdateData);
        
        if (updateResponse.success) {
          // Update local state
          const updatedSubscriptions = subscriptions.map(sub => {
            if (sub.id === id) {
              return {
                ...sub,
                status: 'active' as const,
                pausedAt: undefined
              };
            }
            return sub;
          });
          
          setSubscriptions(updatedSubscriptions);
          alert(`تم استئناف اشتراك ${subscription.schoolName} بنجاح`);
        } else {
          console.error('Failed to resume subscription:', updateResponse.error);
          alert('حدث خطأ أثناء استئناف الاشتراك');
        }
      } else {
        // Pause subscription - deactivate the school
        if (window.confirm(`هل أنت متأكد من إيقاف اشتراك ${subscription.schoolName} مؤقتاً؟`)) {
          const schoolUpdateData = {
            active: false
          };
          
          const updateResponse = await hybridApi.updateSchool(subscription.schoolId, schoolUpdateData);
          
          if (updateResponse.success) {
            // Update local state
            const updatedSubscriptions = subscriptions.map(sub => {
              if (sub.id === id) {
                return {
                  ...sub,
                  status: 'paused' as const,
                  pausedAt: new Date().toISOString()
                };
              }
              return sub;
            });
            
            setSubscriptions(updatedSubscriptions);
            alert(`تم إيقاف اشتراك ${subscription.schoolName} مؤقتاً`);
          } else {
            console.error('Failed to pause subscription:', updateResponse.error);
            alert('حدث خطأ أثناء إيقاف الاشتراك');
          }
        }
      }
    } catch (error) {
      console.error('Error updating subscription status:', error);
      alert('حدث خطأ أثناء تحديث حالة الاشتراك');
    }
  };

  const handleGenerateInvoice = async (subscription: Subscription) => {
    try {
      // Get settings for watermark preferences
      const settingsResponse = await hybridApi.getSettings(subscription.schoolId);
      const schoolSettings = (settingsResponse.success && settingsResponse?.data && Array.isArray(settingsResponse.data) && settingsResponse.data.length > 0) ? settingsResponse.data[0] : {
        logo: '',
        phone: '',
        phoneWhatsapp: '',
        phoneCall: '',
        email: '',
        showInvoiceWatermark: true,
        showLogoBackground: true
      };
      
      // Generate invoice using HTML/CSS for better Arabic support
      const invoiceData = {
        invoiceNumber: `INV-${subscription.id.slice(-6)}`,
        date: new Date().toLocaleDateString('en-GB'), // Georgian date
        schoolName: subscription.schoolName,
        schoolId: subscription.schoolId,
        subscriptionStart: subscription.subscriptionStart,
        subscriptionEnd: subscription.subscriptionEnd,
        amount: subscription.amount,
        paid: subscription.paid,
        paymentDate: subscription.paymentDate,
        status: subscription.status,
        schoolLogo: schoolSettings.logo || '',
        schoolPhone: subscription.contactPhone || schoolSettings.phone || '',
        schoolPhoneWhatsapp: subscription.contactPhoneWhatsapp || schoolSettings.phoneWhatsapp || '',
        schoolPhoneCall: subscription.contactPhoneCall || schoolSettings.phoneCall || '',
        schoolEmail: subscription.contactEmail || schoolSettings.email || '',
        showWatermark: schoolSettings.showInvoiceWatermark,
        showLogoBackground: schoolSettings.showLogoBackground
      };
      
      // Use the same printer service as fee receipts
      pdfPrinter.printSubscriptionInvoice(invoiceData);
      
    } catch (error) {
      console.error('Error generating subscription invoice:', error);
      alert('حدث خطأ أثناء إنشاء فاتورة الاشتراك. يرجى المحاولة مرة أخرى.');
    }
  };
  
  const openSendReminderDialog = (subscription: Subscription) => {
    // Prepare for WhatsApp notification
    setNotifySchoolId(subscription.schoolId);
    setNotifySchoolName(subscription.schoolName);
    setNotifyPhone(subscription.contactPhone);
    
    // Subscription expiry notification template
    const daysLeft = getDaysLeft(subscription.subscriptionEnd);
    let message = '';
    
    if (daysLeft < 0) {
      message = `عزيزي مدير مدرسة ${subscription.schoolName}، نود إعلامكم بأن اشتراك مدرستكم في نظام إدارة المالية قد انتهى منذ ${Math.abs(daysLeft)} يوم. الرجاء التواصل معنا لتجديد الاشتراك.`;
    } else if (daysLeft <= 30) {
      message = `عزيزي مدير مدرسة ${subscription.schoolName}، نود إعلامكم بأن اشتراك مدرستكم في نظام إدارة المالية سينتهي بعد ${daysLeft} يوم. الرجاء تجديد الاشتراك قبل انتهاء الفترة الحالية.`;
    } else {
      message = `عزيزي مدير مدرسة ${subscription.schoolName}، نود إعلامكم بأن اشتراك مدرستكم في نظام إدارة المالية ساري حتى تاريخ ${new Date(subscription.subscriptionEnd).toLocaleDateString('en-GB')}. لديكم ${daysLeft} يوم متبقية على الاشتراك الحالي.`;
    }
    
    if (!subscription.paid) {
      message += `\n\nكما نود تذكيركم بأن فاتورة الاشتراك بمبلغ ${subscription.amount.toLocaleString()} ${CURRENCY} غير مدفوعة. الرجاء سداد الفاتورة في أقرب وقت.`;
    }
    
    if (subscription.status === 'paused') {
      message += `\n\nنود إعلامكم بأن اشتراككم حاليًا في وضع الإيقاف المؤقت منذ ${new Date(subscription.pausedAt || '').toLocaleDateString('en-GB')}. للاستفادة من الخدمات الرجاء التواصل معنا.`;
    }
    
    setNotifyMessage(message);
    setShowNotifyDialog(true);
  };
  
  // Calculate days left until subscription expires
  const getDaysLeft = (endDate: string): number => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // Add a function to reload subscriptions from localStorage
  const reloadSubscriptionsFromStorage = () => {
    try {
      const savedSubscriptions = localStorage.getItem('subscriptions');
      if (savedSubscriptions) {
        const parsedSubscriptions = JSON.parse(savedSubscriptions);
        setSubscriptions(parsedSubscriptions);
      }
    } catch (e) {
      console.error('Error reloading subscriptions from localStorage:', e);
    }
  };

  // Function to safely close the notification dialog
  const closeNotifyDialog = () => {
    setShowNotifyDialog(false);
    // Reload subscriptions to ensure consistency
    reloadSubscriptionsFromStorage();
  };

  // Send WhatsApp notification
  const sendWhatsAppNotification = async () => {
    if (!notifyPhone || !notifyMessage) return;
    
    setIsSendingNotification(true);
    
    try {
      await whatsappService.sendWhatsAppMessage(notifyPhone, notifyMessage);
      
      // Record the notification without modifying the subscription
      const subscription = subscriptions.find(sub => sub.schoolId === notifySchoolId);
      if (subscription) {
        // Save notification to messages collection
        await hybridApi.createMessage({
          studentId: 'admin',
          studentName: 'إدارة النظام',
          grade: 'مدير المدرسة',
          parentName: notifySchoolName,
          phone: notifyPhone,
          template: 'إشعار اشتراك',
          message: notifyMessage,
          sentAt: new Date().toISOString(),
          status: 'delivered',
          schoolId: notifySchoolId,
          messageType: 'admin_notification'
        });
      }
      
      // Reload subscriptions from localStorage to ensure consistency
      reloadSubscriptionsFromStorage();
      
      alert(`تم إرسال إشعار إلى المدرسة ${notifySchoolName}`);
      closeNotifyDialog();
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('حدث خطأ أثناء إرسال الإشعار');
    } finally {
      setIsSendingNotification(false);
    }
  };
  
  // Save new or edited subscription
  const saveSubscription = async (subscription: Subscription) => {
    try {
      if (selectedSubscription) {
        // Update existing subscription - update BOTH school AND subscriptions table
        
        // 1. Update the school
        const schoolUpdateData = {
          name: subscription.schoolName,
          subscription_start: subscription.subscriptionStart,
          subscription_end: subscription.subscriptionEnd,
          active: subscription.status === 'active',
          email: subscription.contactEmail,
          phone: subscription.contactPhone,
          updated_at: new Date().toISOString()
        };
        
        const updateResponse = await hybridApi.updateSchool(subscription.schoolId, schoolUpdateData);
        
        if (!updateResponse.success) {
          console.error('Failed to update school:', updateResponse.error);
          alert('حدث خطأ أثناء تحديث بيانات المدرسة');
          return;
        }
        
        // 2. Update or create subscription in subscriptions table
        const subscriptionData = {
          school_id: subscription.schoolId,
          contact_email: subscription.contactEmail,
          subscription_start: subscription.subscriptionStart,
          subscription_end: subscription.subscriptionEnd,
          amount: subscription.amount,
          currency: 'USD',
          status: subscription.status,
          payment_status: subscription.paid ? 'paid' : 'pending',
          notes: subscription.paymentDate ? `Paid on ${subscription.paymentDate}` : ''
        };
        
        // Check if subscription exists in subscriptions table
        const existingSubResponse = await hybridApi.getSubscriptions(subscription.schoolId);
        let subscriptionResponse;
        
        if (existingSubResponse.success && existingSubResponse.data && existingSubResponse.data.length > 0) {
          // Update existing subscription
          const existingSubId = existingSubResponse.data[0].id;
          console.log('Updating subscription in subscriptions table:', existingSubId, subscriptionData);
          subscriptionResponse = await hybridApi.updateSubscription(existingSubId, subscriptionData);
        } else {
          // Create new subscription
          console.log('Creating subscription in subscriptions table:', subscriptionData);
          subscriptionResponse = await hybridApi.createSubscription(subscriptionData);
        }
        
        console.log('Subscription save response:', subscriptionResponse);
        
        // Update local state
        const updatedSubscriptions = subscriptions.map(sub => 
          sub.id === subscription.id ? subscription : sub
        );
        setSubscriptions(updatedSubscriptions);
        
        if (subscriptionResponse.success) {
          alert(`تم تحديث اشتراك ${subscription.schoolName} بنجاح في كلا الجدولين`);
        } else {
          console.warn('School updated but subscription table update failed:', subscriptionResponse.error);
          alert(`تم تحديث المدرسة ولكن فشل حفظ الاشتراك في جدول الاشتراكات: ${subscriptionResponse.error}`);
        }
      } else {
        // Add new subscription - save to BOTH schools table AND subscriptions table
        
        // 1. Update the school's subscription info
        const schoolUpdateData = {
          subscription_start: subscription.subscriptionStart,
          subscription_end: subscription.subscriptionEnd,
          active: subscription.status === 'active',
          payment: subscription.amount,
          updated_at: new Date().toISOString()
        };
        
        const updateResponse = await hybridApi.updateSchool(subscription.schoolId, schoolUpdateData);
        
        if (!updateResponse.success) {
          console.error('Failed to update school:', updateResponse.error);
          alert('حدث خطأ أثناء تحديث بيانات المدرسة');
          return;
        }
        
        // 2. Create a record in the subscriptions table
        const subscriptionData = {
          school_id: subscription.schoolId,
          contact_email: subscription.contactEmail,
          subscription_start: subscription.subscriptionStart,
          subscription_end: subscription.subscriptionEnd,
          amount: subscription.amount,
          currency: 'USD',
          status: subscription.status,
          payment_status: subscription.paid ? 'paid' : 'pending',
          notes: subscription.paymentDate ? `Paid on ${subscription.paymentDate}` : ''
        };
        
        console.log('Creating subscription in subscriptions table:', subscriptionData);
        const subscriptionResponse = await hybridApi.createSubscription(subscriptionData);
        console.log('Subscription creation response:', subscriptionResponse);
        
        if (subscriptionResponse.success) {
          // Create subscription object for local state
          const newId = subscriptionResponse.data?.id || `sub_${subscription.schoolId}`;
          const newSubscription = {
            ...subscription,
            id: newId,
            createdAt: new Date().toISOString()
          };
          
          const updatedSubscriptions = [...subscriptions, newSubscription];
          setSubscriptions(updatedSubscriptions);
          alert(`تم إضافة اشتراك ${subscription.schoolName} بنجاح في كلا الجدولين`);
        } else {
          console.warn('School updated but subscription table insert failed:', subscriptionResponse.error);
          alert(`تم تحديث المدرسة ولكن فشل حفظ الاشتراك في جدول الاشتراكات: ${subscriptionResponse.error}`);
        }
      }
      
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving subscription:', error);
      alert('حدث خطأ أثناء حفظ الاشتراك');
    }
  };
  
  // Delete subscription
  const deleteSubscription = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) {
      try {
        // Get the subscription to find the associated school
        const subscription = subscriptions.find(sub => sub.id === id);
        if (!subscription) return;
        
        // Delete the school from the database
        const deleteResponse = await hybridApi.deleteSchool(subscription.schoolId);
        
        if (deleteResponse.success) {
          // Update local state
          const updatedSubscriptions = subscriptions.filter(sub => sub.id !== id);
          setSubscriptions(updatedSubscriptions);
          alert(`تم حذف اشتراك ${subscription.schoolName} بنجاح`);
        } else {
          console.error('Failed to delete subscription:', deleteResponse.error);
          alert('حدث خطأ أثناء حذف الاشتراك');
        }
      } catch (error) {
        console.error('Error deleting subscription:', error);
        alert('حدث خطأ أثناء حذف الاشتراك. يرجى المحاولة مرة أخرى.');
      }
    }
  };
  
  // Clean up duplicate subscriptions in localStorage
  const cleanupDuplicateSubscriptions = async () => {
    try {
      console.log('Checking for duplicate subscriptions in localStorage...');
      
      // Get all subscriptions from localStorage
      const subscriptions = JSON.parse(localStorage.getItem('subscriptions') || '[]');
      
      // Group subscriptions by schoolId
      const subscriptionsBySchool = new Map();
      
      subscriptions.forEach((sub: Subscription) => {
        if (sub.schoolId) {
          if (!subscriptionsBySchool.has(sub.schoolId)) {
            subscriptionsBySchool.set(sub.schoolId, []);
          }
          subscriptionsBySchool.get(sub.schoolId).push(sub);
        }
      });
      
      // Find schools with multiple subscriptions
      let deletedCount = 0;
      for (const [schoolId, subscriptions] of subscriptionsBySchool.entries()) {
        if (subscriptions.length > 1) {
          console.log(`Found ${subscriptions.length} subscriptions for school ${schoolId}`);
          
          // Sort by createdAt (keep the newest one)
          subscriptions.sort((a: any, b: any) => {
            const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return bDate.getTime() - aDate.getTime();
          });
          
          // Keep the first one (newest), delete the rest
          for (let i = 1; i < subscriptions.length; i++) {
            console.log(`Deleting duplicate subscription ${subscriptions[i].id} for school ${schoolId}`);
            await deleteSubscription(subscriptions[i].id);
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} duplicate subscriptions`);
        // Reload the subscriptions in the UI
        reloadSubscriptionsFromStorage();
      } else {
        console.log('No duplicate subscriptions found');
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up duplicate subscriptions:', error);
      return 0;
    }
  };
  
  // Sync subscriptions with localStorage and ensure they match school status
  const syncSubscriptionsWithLocalStorage = async () => {
    console.log('Syncing subscriptions with localStorage...');
    
    try {
      // Get schools from hybridApi
      const schoolsResponse = await hybridApi.getSchools();
      const schoolsList = schoolsResponse.success ? schoolsResponse.data || [] : [];
      
      if (!schoolsList || schoolsList.length === 0) {
        console.log('No schools to sync subscriptions with');
        return;
      }
      
      // Generate subscriptions from schools if needed
      let subsFromStorage = localStorage.getItem('subscriptions');
      let storedSubscriptions: Subscription[] = [];
      
      if (subsFromStorage) {
        storedSubscriptions = JSON.parse(subsFromStorage);
      }
      
      // If no subscriptions in storage, generate them
      if (!storedSubscriptions || storedSubscriptions.length === 0) {
        console.log('No subscriptions found in localStorage, generating sample data...');
        storedSubscriptions = generateSampleSubscriptions(schoolsList);
        localStorage.setItem('subscriptions', JSON.stringify(storedSubscriptions));
      }
      
      // Ensure all schools have a subscription
      const schoolsWithoutSubs = schoolsList.filter(
        school => !storedSubscriptions.some(sub => sub.schoolId === school.id)
      );
      
      if (schoolsWithoutSubs.length > 0) {
        console.log(`Found ${schoolsWithoutSubs.length} schools without subscriptions, creating...`);
        const newSubs = generateSampleSubscriptions(schoolsWithoutSubs);
        storedSubscriptions = [...storedSubscriptions, ...newSubs];
        localStorage.setItem('subscriptions', JSON.stringify(storedSubscriptions));
      }
      
      // Update subscription status based on school status
      const updatedSubscriptions = storedSubscriptions.map(sub => {
        const school = schoolsList.find(s => s.id === sub.schoolId);
        if (school) {
          // Update school info in subscription
          return {
            ...sub,
            schoolName: school.name,
            contactEmail: school.email,
            contactPhone: school.phone,
            // If school is not active, status should be expired or paused
            status: school.active ? sub.status : (sub.status === 'paused' ? 'paused' : 'expired')
          };
        }
        return sub;
      });
      
      // Save updated subscriptions
      localStorage.setItem('subscriptions', JSON.stringify(updatedSubscriptions));
      
      // Update state
      setSubscriptions(updatedSubscriptions);
      console.log('Subscriptions synced successfully:', updatedSubscriptions);
    } catch (error) {
      console.error('Error syncing subscriptions with localStorage:', error);
    }
  };
  
  // Export subscriptions to CSV
  const exportSubscriptions = () => {
    const headers = ['المدرسة', 'البريد الإلكتروني', 'رقم الهاتف', 'تاريخ البداية', 'تاريخ الانتهاء', 'المبلغ', 'الحالة'];
    
    const csvRows = [
      headers.join(','),
      ...subscriptions.map(subscription => {
        return [
          subscription.schoolName,
          subscription.contactEmail,
          subscription.contactPhone,
          subscription.subscriptionStart,
          subscription.subscriptionEnd,
          subscription.amount,
          getStatusLabel(subscription.status)
        ].join(',');
      })
    ];
    
    // Create BOM for UTF-8
    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'اشتراكات_المدارس.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get status label in Arabic
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'expired':
        return 'منتهي';
      case 'pending':
        return 'قيد الانتظار';
      case 'paused':
        return 'متوقف مؤقتاً';
      default:
        return status;
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paused':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Show subscription form if adding or editing
  if (showAddForm) {
    console.log('Rendering subscription form with schools:', schools);
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {selectedSubscription ? 'تعديل اشتراك' : 'إضافة اشتراك جديد'}
          </h1>
          <button
            className="btn btn-secondary"
            onClick={() => setShowAddForm(false)}
          >
            عودة للقائمة
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold text-gray-800">
              {selectedSubscription ? `تعديل اشتراك ${selectedSubscription.schoolName}` : 'اشتراك جديد'}
            </h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={(e) => {
              e.preventDefault();
              
              // Get form values
              const form = e.target as HTMLFormElement;
              const schoolId = (form.elements.namedItem('schoolId') as HTMLSelectElement).value;
              const school = schools.find(s => s.id === schoolId);
              
              if (!school) {
                alert('الرجاء اختيار مدرسة');
                return;
              }
              
              const subscriptionStart = (form.elements.namedItem('subscriptionStart') as HTMLInputElement).value;
              const subscriptionEnd = (form.elements.namedItem('subscriptionEnd') as HTMLInputElement).value;
              const amount = parseInt((form.elements.namedItem('amount') as HTMLInputElement).value, 10);
              const paymentDate = isPaid ? (form.elements.namedItem('paymentDate') as HTMLInputElement).value : undefined;
              const status = (form.elements.namedItem('status') as HTMLSelectElement).value as 'active' | 'expired' | 'pending' | 'paused';
              
              // Create subscription object
              const subscription: Subscription = {
                id: selectedSubscription?.id || '',
                schoolId,
                schoolName: school.name,
                contactEmail: school.email,
                contactPhone: school.phone,
                subscriptionStart,
                subscriptionEnd,
                amount,
                paid: isPaid,
                paymentDate,
                status,
                createdAt: selectedSubscription?.createdAt || new Date().toISOString(),
                pausedAt: status === 'paused' ? (selectedSubscription?.pausedAt || new Date().toISOString()) : undefined
              };
              
              // Save subscription
              saveSubscription(subscription);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2">المدرسة</label>
                  <select 
                    name="schoolId"
                    className="input"
                    defaultValue={selectedSubscription?.schoolId || ''}
                    required
                  >
                    <option value="">-- اختر مدرسة --</option>
                    {schools.length > 0 ? (
                      schools.map(school => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>لا توجد مدارس متاحة</option>
                    )}
                  </select>
                  {schools.length === 0 && (
                    <p className="text-red-500 text-sm mt-1">
                      لم يتم العثور على أي مدارس. يرجى إضافة مدارس أولاً.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">المبلغ</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="amount"
                      className="input pl-16"
                      defaultValue={selectedSubscription?.amount || 500}
                      min="1"
                      required
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center bg-gray-100 border-l border-gray-300 px-3 rounded-l-md">
                      {CURRENCY}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">تاريخ بداية الاشتراك</label>
                  <input
                    type="date"
                    name="subscriptionStart"
                    className="input"
                    defaultValue={selectedSubscription?.subscriptionStart || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">تاريخ نهاية الاشتراك</label>
                  <input
                    type="date"
                    name="subscriptionEnd"
                    className="input"
                    defaultValue={selectedSubscription?.subscriptionEnd || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="paid"
                      name="paid"
                      className="h-4 w-4 text-primary rounded focus:ring-primary"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                    />
                    <label htmlFor="paid" className="mr-2">
                      مدفوع
                    </label>
                  </div>
                  
                  {isPaid && (
                    <div id="paymentDate" className="mb-4">
                      <label className="block text-gray-700 mb-2">تاريخ الدفع</label>
                      <input
                        type="date"
                        name="paymentDate"
                        className="input"
                        defaultValue={selectedSubscription?.paymentDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-gray-700 mb-2">حالة الاشتراك</label>
                    <select 
                      name="status"
                      className="input"
                      defaultValue={selectedSubscription?.status || 'active'}
                    >
                      <option value="active">نشط</option>
                      <option value="pending">قيد الانتظار</option>
                      <option value="paused">متوقف مؤقتاً</option>
                      <option value="expired">منتهي</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>حفظ الاشتراك</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">إدارة اشتراكات المدارس</h1>
        <div className="flex gap-2">
          <button
            onClick={cleanupDuplicateSubscriptions}
            className="btn btn-secondary flex items-center gap-2"
            title="إزالة الاشتراكات المكررة"
          >
            <Trash size={18} />
            <span>إزالة المكررات</span>
          </button>
          <button
            onClick={() => syncSubscriptionsWithLocalStorage()}
            className="btn btn-secondary flex items-center gap-2"
            title="مزامنة الاشتراكات مع حالة المدارس"
          >
            <RefreshCw size={18} />
            <span>مزامنة</span>
          </button>
          <button
            onClick={exportSubscriptions}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download size={18} />
            <span>تصدير البيانات</span>
          </button>
          <button
            onClick={handleAddSubscription}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>إضافة اشتراك</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">إجمالي الاشتراكات</h3>
            <p className="text-2xl font-bold text-primary">
              {subscriptions.reduce((sum, sub) => sum + sub.amount, 0).toLocaleString()} {CURRENCY}
            </p>
          </div>
          <div className="bg-primary text-white p-3 rounded-full">
            <CreditCard size={24} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">المبالغ المحصلة</h3>
            <p className="text-2xl font-bold text-green-600">
              {subscriptions.filter(sub => sub.paid).reduce((sum, sub) => sum + sub.amount, 0).toLocaleString()} {CURRENCY}
            </p>
          </div>
          <div className="bg-green-500 text-white p-3 rounded-full">
            <CreditCard size={24} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">المبالغ المستحقة</h3>
            <p className="text-2xl font-bold text-red-600">
              {subscriptions.filter(sub => !sub.paid).reduce((sum, sub) => sum + sub.amount, 0).toLocaleString()} {CURRENCY}
            </p>
          </div>
          <div className="bg-red-500 text-white p-3 rounded-full">
            <CreditCard size={24} />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
          <CreditCard size={20} className="text-primary" />
          <h2 className="text-xl font-bold text-gray-800">قائمة الاشتراكات</h2>
        </div>
        
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا توجد اشتراكات مسجلة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المدرسة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    فترة الاشتراك
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    حالة الدفع
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    حالة الاشتراك
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscriptions.map((subscription) => {
                  const daysLeft = getDaysLeft(subscription.subscriptionEnd);
                  return (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{subscription.schoolName}</div>
                        <div className="text-sm text-gray-500">{subscription.contactEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-500">
                          {subscription.subscriptionStart} إلى {subscription.subscriptionEnd}
                        </div>
                        {subscription.status !== 'paused' && daysLeft > 0 && daysLeft <= 30 && (
                          <div className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                            <Calendar size={12} />
                            <span>متبقي {daysLeft} يوم</span>
                          </div>
                        )}
                        {subscription.status !== 'paused' && daysLeft <= 0 && (
                          <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
                            <AlertCircle size={12} />
                            <span>منتهي منذ {Math.abs(daysLeft)} يوم</span>
                          </div>
                        )}
                        {subscription.status === 'paused' && (
                          <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                            <Pause size={12} />
                            <span>متوقف مؤقتاً {subscription.pausedAt ? `منذ ${new Date(subscription.pausedAt).toLocaleDateString('en-GB')}` : ''}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900 font-medium">{subscription.amount.toLocaleString()} {CURRENCY}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          subscription.paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {subscription.paid ? 'مدفوع' : 'غير مدفوع'}
                        </span>
                        {subscription.paymentDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            تاريخ الدفع: {subscription.paymentDate}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(subscription.status)}`}>
                          {getStatusLabel(subscription.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium flex items-center space-x-2 space-x-reverse">
                        <button
                          type="button"
                          onClick={() => handleGenerateInvoice(subscription)}
                          className="text-gray-600 hover:text-gray-800"
                          title="تنزيل الفاتورة"
                        >
                          <Download size={18} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleEditSubscription(subscription)}
                          className="text-primary hover:text-primary-dark"
                          title="تعديل الاشتراك"
                        >
                          <Edit size={18} />
                        </button>
                        
                        {!subscription.paid && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsPaid(subscription.id)}
                            className="text-green-600 hover:text-green-800"
                            title="تحديد كمدفوع"
                          >
                            <CreditCard size={18} />
                          </button>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => handlePauseSubscription(subscription.id)}
                          className={`${subscription.status === 'paused' ? 'text-green-600 hover:text-green-800' : 'text-blue-600 hover:text-blue-800'}`}
                          title={subscription.status === 'paused' ? 'استئناف الاشتراك' : 'إيقاف مؤقت للاشتراك'}
                        >
                          {subscription.status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => openSendReminderDialog(subscription)}
                          className="text-blue-600 hover:text-blue-800"
                          title="إرسال إشعار واتساب"
                        >
                          <MessageSquare size={18} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => deleteSubscription(subscription.id)}
                          className="text-red-600 hover:text-red-800"
                          title="حذف"
                        >
                          <Trash size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Expiry Alert Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-yellow-50 border-b flex items-center gap-2">
          <AlertCircle size={20} className="text-yellow-600" />
          <h2 className="text-xl font-bold text-gray-800">تنبيهات انتهاء الاشتراكات</h2>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            {subscriptions
              .filter(sub => {
                const daysLeft = getDaysLeft(sub.subscriptionEnd);
                return (sub.status !== 'paused') && (daysLeft <= 30); // Show subscriptions expiring within 30 days or already expired
              })
              .map(subscription => {
                const daysLeft = getDaysLeft(subscription.subscriptionEnd);
                return (
                  <div key={`alert-${subscription.id}`} className={`p-4 rounded-lg ${daysLeft <= 0 ? 'bg-red-50' : 'bg-yellow-50'}`}>
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-bold text-gray-800">{subscription.schoolName}</h3>
                        <p className={`text-sm ${daysLeft <= 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {daysLeft <= 0 
                            ? `منتهي منذ ${Math.abs(daysLeft)} يوم (${subscription.subscriptionEnd})` 
                            : `ينتهي خلال ${daysLeft} يوم (${subscription.subscriptionEnd})`}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary py-1 px-3 flex items-center gap-1"
                        onClick={() => openSendReminderDialog(subscription)}
                      >
                        <MessageSquare size={16} />
                        <span>إرسال تذكير</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              
            {!subscriptions.some(sub => (sub.status !== 'paused') && getDaysLeft(sub.subscriptionEnd) <= 30) && (
              <div className="p-6 text-center text-gray-500">
                لا توجد اشتراكات على وشك الانتهاء في الثلاثين يوماً القادمة
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Paused Subscriptions Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-blue-50 border-b flex items-center gap-2">
          <Pause size={20} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">الاشتراكات المتوقفة مؤقتاً</h2>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            {subscriptions
              .filter(sub => sub.status === 'paused')
              .map(subscription => {
                return (
                  <div key={`paused-${subscription.id}`} className="p-4 rounded-lg bg-blue-50">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-bold text-gray-800">{subscription.schoolName}</h3>
                        <p className="text-sm text-blue-600">
                          متوقف مؤقتاً {subscription.pausedAt ? `منذ ${new Date(subscription.pausedAt).toLocaleDateString('en-GB')}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary py-1 px-3 flex items-center gap-1"
                          onClick={() => handlePauseSubscription(subscription.id)}
                        >
                          <Play size={16} />
                          <span>استئناف</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary py-1 px-3 flex items-center gap-1"
                          onClick={() => openSendReminderDialog(subscription)}
                        >
                          <MessageSquare size={16} />
                          <span>إشعار</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
            {!subscriptions.some(sub => sub.status === 'paused') && (
              <div className="p-6 text-center text-gray-500">
                لا توجد اشتراكات متوقفة مؤقتاً
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* WhatsApp Notification Dialog */}
      {showNotifyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">إرسال إشعار لمدرسة {notifySchoolName}</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">رقم الهاتف</label>
              <input
                type="text"
                className="input"
                value={notifyPhone}
                onChange={(e) => setNotifyPhone(e.target.value)}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">نص الرسالة</label>
              <textarea
                rows={6}
                className="input"
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeNotifyDialog}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn-primary flex items-center gap-2"
                onClick={sendWhatsAppNotification}
                disabled={isSendingNotification}
              >
                <MessageSquare size={16} />
                <span>
                  {isSendingNotification ? 'جاري الإرسال...' : 'إرسال عبر الواتساب'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsList;
 