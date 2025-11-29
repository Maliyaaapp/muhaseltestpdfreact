/**
 * Simple test script for the user creation API
 * 
 * Usage: node test-api.js
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api/users';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'Password123!',
  username: 'testuser',
  name: 'Test User',
  role: 'teacher',
  school_id: null,
  grade_levels: ['grade1', 'grade2']
};

async function testCreateUser() {
  console.log('Testing user creation API...');
  console.log('Sending request with data:', { ...testUser, password: '[REDACTED]' });
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Test passed: User created successfully');
    } else {
      console.log('❌ Test failed: Could not create user');
    }
  } catch (error) {
    console.error('Error during API test:', error);
    console.log('❌ Test failed: API request error');
  }
}

// Run the test
testCreateUser();