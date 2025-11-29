import { supabase } from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuthService';

export const debugCurrentAuth = async () => {
  console.log('=== Authentication Debug ===');
  
  try {
    // Check Supabase session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Supabase Session:', {
      hasSession: !!sessionData.session,
      sessionError,
      user: sessionData.session?.user ? {
        id: sessionData.session.user.id,
        email: sessionData.session.user.email,
        role: sessionData.session.user.role
      } : null
    });
    
    // Check current user from service
    const currentUser = await getCurrentUser();
    console.log('Current User from Service:', currentUser);
    
    // Check accounts table directly
    if (sessionData.session?.user) {
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .limit(1);
        
      console.log('Account Data:', {
        accountData,
        accountError
      });
      
      // Check if user has school_id
      if (accountData && accountData.length > 0) {
        const account = accountData[0];
        console.log('User School Association:', {
          hasSchoolId: !!account.school_id,
          schoolId: account.school_id,
          role: account.role
        });
        
        // Test RLS policy by trying to query students
        const { data: studentsTest, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .limit(1);
          
        console.log('Students Query Test:', {
          canQueryStudents: !studentsError,
          studentsError,
          studentsCount: studentsTest?.length || 0
        });
      }
    }
    
  } catch (error) {
    console.error('Debug Auth Error:', error);
  }
  
  console.log('=== End Authentication Debug ===');
};

export const testStudentCreation = async (schoolId: string) => {
  console.log('=== Testing Student Creation ===');
  
  try {
    const testStudent = {
      id: 'test-' + Date.now(),
      name: 'Test Student',
      grade: 'الصف الأول',
      school_id: schoolId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Attempting to create test student:', testStudent);
    
    // Use upsert to handle duplicate keys gracefully
    const { data, error } = await supabase
      .from('students')
      .upsert([testStudent], { onConflict: 'id' })
      .select();
      
    console.log('Student Creation Result:', {
      success: !error,
      data,
      error
    });
    
    // Clean up test student if created successfully
    if (data && data.length > 0) {
      await supabase
        .from('students')
        .delete()
        .eq('id', testStudent.id);
      console.log('Test student cleaned up');
    }
    
  } catch (error) {
    console.error('Test Student Creation Error:', error);
  }
  
  console.log('=== End Student Creation Test ===');
};