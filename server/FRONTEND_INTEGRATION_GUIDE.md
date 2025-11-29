# Frontend Integration Guide

## Migrating from Direct Supabase Client to Backend API

This guide provides step-by-step instructions for updating your frontend application to use the new secure backend API for user management instead of directly using the Supabase client.

## Why Use the Backend API?

1. **Security**: The backend API securely manages the Supabase service role key, which should never be exposed to the client.
2. **Consistency**: The backend ensures transactional consistency between Supabase Auth and your database tables.
3. **Validation**: Centralized validation logic in the backend prevents inconsistent data.
4. **Error Handling**: Comprehensive error handling with proper rollback mechanisms.
5. **Logging**: All operations are properly logged for auditing and debugging.

## Integration Steps

### 1. Install the API Client

Copy the appropriate client file from the `src/client-example` directory to your frontend project:

- For JavaScript projects: `userApiClient.js`
- For TypeScript projects: `userApiClient.ts`

### 2. Configure the API Client

Update the `API_BASE_URL` in the client file to point to your backend API:

```javascript
// For development
const API_BASE_URL = 'http://localhost:3000/api/users';

// For production
// const API_BASE_URL = 'https://your-api-domain.com/api/users';
```

### 3. Set Up Authentication

The API client supports two authentication methods:

#### JWT Token Authentication (for browser clients)

```javascript
import { setAuthToken } from './userApiClient';

// After user login, set the JWT token
const handleLogin = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (data?.session?.access_token) {
    // Set the token for API calls
    setAuthToken(data.session.access_token);
  }
};
```

#### API Key Authentication (for server-to-server communication)

```javascript
import { setApiKey } from './userApiClient';

// Set the API key (only use this in server-side code, never in the browser)
setApiKey(process.env.API_KEY);
```

### 4. Replace Direct Supabase Calls

#### Before: Creating a user with direct Supabase client

```javascript
const createUserWithSupabase = async (userData) => {
  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true
  });
  
  if (authError) throw authError;
  
  // Create user in accounts table
  const { data: accountData, error: accountError } = await supabase
    .from('accounts')
    .insert({
      id: authData.user.id,
      email: userData.email,
      username: userData.username,
      name: userData.name,
      role: userData.role
    });
  
  if (accountError) {
    // Attempt to delete the auth user if account creation failed
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw accountError;
  }
  
  return { user: authData.user };
};
```

#### After: Creating a user with the API client

```javascript
import { createUser } from './userApiClient';

const createUserWithApi = async (userData) => {
  try {
    const response = await createUser(userData);
    return response;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};
```

### 5. Update User Management Components

Replace all Supabase user management operations with API client calls:

| Operation | Supabase Direct | API Client |
|-----------|----------------|------------|
| Create User | `supabase.auth.admin.createUser()` | `createUser()` |
| Get User | `supabase.from('accounts').select().eq('id', userId)` | `getUser(userId)` |
| Update User | `supabase.auth.admin.updateUserById()` + `supabase.from('accounts').update()` | `updateUser(userId, userData)` |
| Delete User | `supabase.auth.admin.deleteUser()` + `supabase.from('accounts').delete()` | `deleteUser(userId)` |

### 6. Example: Updating AccountForm.tsx

Here's an example of how to update the `AccountForm.tsx` component to use the API client:

```tsx
import React, { useState } from 'react';
import { createUser } from './userApiClient';

const AccountForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    name: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await createUser(formData);
      console.log('User created:', response.user);
      // Reset form or redirect
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };
  
  // Rest of the component...
};
```

## Error Handling

The API client throws errors with descriptive messages from the backend. Make sure to properly catch and handle these errors in your UI:

```javascript
try {
  await createUser(userData);
  // Success handling
} catch (error) {
  // Error handling
  if (error.message.includes('already exists')) {
    // Handle duplicate user error
  } else if (error.message.includes('validation')) {
    // Handle validation error
  } else {
    // Handle other errors
  }
}
```

## Testing the Integration

1. Start the backend server: `cd server && npm run dev`
2. Update your frontend to use the API client
3. Test user creation, retrieval, updating, and deletion
4. Verify that operations are properly logged in the backend

## Troubleshooting

### CORS Issues

If you encounter CORS issues, make sure your backend server is configured to allow requests from your frontend domain:

```javascript
// In server/index.ts
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:3000', 'http://localhost:5173']
}));
```

### Authentication Issues

If you receive 401 Unauthorized errors:

1. Check that you're setting the auth token or API key correctly
2. Verify that the token hasn't expired
3. Ensure the user has the required permissions

### API Endpoint Issues

If you receive 404 Not Found errors:

1. Verify the API_BASE_URL is correct
2. Check that the backend server is running
3. Confirm the API routes are correctly configured

## Next Steps

1. Implement token refresh logic to handle expired JWT tokens
2. Add error boundary components to gracefully handle API errors
3. Create loading states and feedback for user operations
4. Implement client-side validation before making API calls