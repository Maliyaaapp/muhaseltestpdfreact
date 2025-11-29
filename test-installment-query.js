// Test script to diagnose installment query issues
// Run this in the browser console to test the query

const testInstallmentQuery = async () => {
  console.log('🔍 Testing installment query...');
  
  // Test student ID from your data
  const testStudentId = '4db56485-e0f5-42bb-8522-d63d629a5155'; // سيسيسينةيسبنىيب
  
  console.log('📋 Test 1: Get all installments');
  const allResponse = await hybridApi.getInstallments();
  console.log('All installments:', allResponse);
  
  console.log('\n📋 Test 2: Get installments by student_id');
  const studentResponse = await hybridApi.getInstallments(undefined, testStudentId);
  console.log('Student installments:', studentResponse);
  
  console.log('\n📋 Test 3: Check localStorage directly');
  const localInstallments = JSON.parse(localStorage.getItem('installments') || '[]');
  console.log('LocalStorage installments count:', localInstallments.length);
  const studentInstallments = localInstallments.filter(i => i.student_id === testStudentId);
  console.log('Student installments in localStorage:', studentInstallments.length);
  console.log('Sample:', studentInstallments[0]);
  
  console.log('\n📋 Test 4: Check cache');
  const cacheKey = `installments_{"student_id":"${testStudentId}"}`;
  const cached = localStorage.getItem(cacheKey + '_cache');
  console.log('Cached data exists:', !!cached);
  if (cached) {
    const parsedCache = JSON.parse(cached);
    console.log('Cached installments:', parsedCache.data?.length || 0);
  }
  
  console.log('\n✅ Test complete');
};

// Export for use
window.testInstallmentQuery = testInstallmentQuery;

console.log('💡 Run testInstallmentQuery() in console to test');
