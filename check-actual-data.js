// Run this in browser console to check actual data
console.log('=== CHECKING ACTUAL DATA IN BROWSER ===');

// 1. Check localStorage installments
const installments = localStorage.getItem('installments');
if (installments) {
    const parsed = JSON.parse(installments);
    console.log('📦 Total installments in localStorage:', parsed.length);
    
    // Check for specific student
    const studentId = '4db56485-e0f5-42bb-8522-d63d629a5155';
    const studentInstallments = parsed.filter(i => i.student_id === studentId);
    console.log(`📦 Installments for student ${studentId}:`, studentInstallments.length);
    if (studentInstallments.length > 0) {
        console.log('Sample:', studentInstallments[0]);
    }
} else {
    console.log('❌ No installments in localStorage');
}

// 2. Check cache
const cacheKeys = Object.keys(localStorage).filter(k => k.includes('installments') && k.includes('cache'));
console.log('📦 Cache keys:', cacheKeys);
cacheKeys.forEach(key => {
    const cache = JSON.parse(localStorage.getItem(key));
    console.log(`Cache ${key}:`, cache.data?.length || 0, 'items');
});

// 3. Test the actual API call
console.log('\n=== TESTING ACTUAL API CALL ===');
if (typeof hybridApi !== 'undefined') {
    hybridApi.getInstallments(undefined, '4db56485-e0f5-42bb-8522-d63d629a5155')
        .then(response => {
            console.log('✅ API Response:', response);
            console.log('Data count:', response.data?.length || 0);
            if (response.data && response.data.length > 0) {
                console.log('Sample:', response.data[0]);
            }
        })
        .catch(err => console.error('❌ API Error:', err));
} else {
    console.log('⚠️ hybridApi not available - run this in the app');
}

console.log('\n=== DONE ===');
