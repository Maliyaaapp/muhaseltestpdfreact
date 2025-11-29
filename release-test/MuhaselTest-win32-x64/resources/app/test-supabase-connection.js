const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...');
  
  // Frontend connection (anon key)
  const frontendUrl = process.env.VITE_SUPABASE_URL;
  const frontendKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('Frontend URL:', frontendUrl);
  console.log('Frontend Key:', frontendKey ? 'Present' : 'Missing');
  
  if (!frontendUrl || !frontendKey) {
    console.error('❌ Frontend Supabase credentials missing!');
    return;
  }
  
  const frontendClient = createClient(frontendUrl, frontendKey);
  
  try {
    // Test basic connection
    console.log('\n📡 Testing frontend connection...');
    const { data: tables, error } = await frontendClient
      .from('schools')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Frontend connection failed:', error.message);
    } else {
      console.log('✅ Frontend connection successful!');
      console.log('📊 Schools table accessible');
    }
  } catch (err) {
    console.error('❌ Frontend connection error:', err.message);
  }
  
  // Backend connection (service role)
  console.log('\n🔧 Testing backend connection...');
  const backendUrl = process.env.SUPABASE_URL;
  const backendKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Backend URL:', backendUrl);
  console.log('Backend Key:', backendKey ? 'Present' : 'Missing');
  
  if (!backendUrl || !backendKey) {
    console.error('❌ Backend Supabase credentials missing!');
    return;
  }
  
  const backendClient = createClient(backendUrl, backendKey);
  
  try {
    // Test admin operations
    const { data: users, error: usersError } = await backendClient.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Backend admin connection failed:', usersError.message);
    } else {
      console.log('✅ Backend admin connection successful!');
      console.log('👥 Current users count:', users.users.length);
    }
    
    // Test database access
    const { data: schools, error: schoolsError } = await backendClient
      .from('schools')
      .select('*')
      .limit(1);
    
    if (schoolsError) {
      console.error('❌ Database access failed:', schoolsError.message);
    } else {
      console.log('✅ Database access successful!');
      console.log('🏫 Schools table structure verified');
    }
    
  } catch (err) {
    console.error('❌ Backend connection error:', err.message);
  }
  
  console.log('\n🎯 Connection test completed!');
}

testSupabaseConnection().catch(console.error);