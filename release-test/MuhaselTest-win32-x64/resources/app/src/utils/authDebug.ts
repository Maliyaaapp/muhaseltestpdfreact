import { supabase } from '../services/supabase';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

/**
 * Debug utility to check authentication state and permissions
 */
export const debugAuthState = async () => {
  console.log('=== Authentication Debug Information ===');
  
  try {
    // Check Supabase session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Supabase Session:', {
      hasSession: !!sessionData.session,
      user: sessionData.session?.user ? {
        id: sessionData.session.user.id,
        email: sessionData.session.user.email,
        role: sessionData.session.user.role
      } : null,
      error: sessionError
    });
    
    if (sessionData.session?.user) {
      // Check account record
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .limit(1);
        
      console.log('Account Record:', {
        found: accountData && accountData.length > 0,
        account: accountData?.[0] || null,
        error: accountError
      });
      
      if (accountData && accountData.length > 0) {
        const account = accountData[0];
        
        // Test permissions by trying to read students table
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name, school_id')
          .limit(1);
          
        console.log('Students Table Access Test:', {
          canRead: !studentsError,
          sampleData: studentsData,
          error: studentsError
        });
        
        // If user has a school_id, test creating a student
        if (account.school_id) {
          const testStudent = {
            name: 'Test Student - DELETE ME',
            student_id: 'TEST-' + Date.now(),
            grade: 'Test Grade',
            school_id: account.school_id
          };
          
          // Use upsert to handle duplicate keys gracefully
          const { data: createData, error: createError } = await supabase
            .from('students')
            .upsert(testStudent, { onConflict: 'id' })
            .select()
            .limit(1);
            
          console.log('Student Creation Test:', {
            canCreate: !createError,
            createdStudent: createData?.[0],
            error: createError
          });
          
          // Clean up test student if created successfully
          if (createData && createData.length > 0) {
            await supabase
              .from('students')
              .delete()
              .eq('id', createData[0].id);
            console.log('Test student cleaned up');
          }
        }
      }
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.log('=== End Authentication Debug ===');
};

/**
 * Hook to get debug information in React components
 */
export const useAuthDebug = () => {
  const authContext = useSupabaseAuth();
  
  const runDebug = async () => {
    console.log('Auth Context State:', {
      isAuthenticated: authContext.isAuthenticated,
      user: authContext.user,
      isAuthLoading: authContext.isAuthLoading,
      authError: authContext.authError
    });
    
    await debugAuthState();
  };
  
  return { runDebug };
};