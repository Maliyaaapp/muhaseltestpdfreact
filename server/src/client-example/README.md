# User Management API Client Examples

This directory contains example client implementations for interacting with the User Management API. These examples demonstrate how to call the backend API endpoints instead of directly using the Supabase client in your frontend applications.

## Files

- `userApiClient.js` - JavaScript client for the User Management API
- `userApiClient.ts` - TypeScript client for the User Management API
- `UserManagementComponent.jsx` - Example React component using the API client

## Usage

### JavaScript Client

```javascript
import { 
  setAuthToken, 
  setApiKey, 
  createUser, 
  getUser, 
  updateUser, 
  deleteUser 
} from './userApiClient';

// Set authentication method
setAuthToken('your-jwt-token'); // For browser clients
// OR
setApiKey('your-api-key'); // For server-to-server communication

// Create a new user
const newUser = {
  email: 'user@example.com',
  password: 'securepassword',
  username: 'newuser',
  name: 'New User',
  role: 'user'
};

createUser(newUser)
  .then(response => console.log('User created:', response.user))
  .catch(error => console.error('Error:', error));

// Get a user
getUser('user-id')
  .then(response => console.log('User:', response.user))
  .catch(error => console.error('Error:', error));

// Update a user
updateUser('user-id', { name: 'Updated Name' })
  .then(response => console.log('User updated:', response.user))
  .catch(error => console.error('Error:', error));

// Delete a user
deleteUser('user-id')
  .then(response => console.log('User deleted:', response.message))
  .catch(error => console.error('Error:', error));
```

### TypeScript Client

```typescript
import { 
  setAuthToken, 
  setApiKey, 
  createUser, 
  getUser, 
  getAllUsers,
  updateUser, 
  deleteUser 
} from './userApiClient';

// Set authentication method
setAuthToken('your-jwt-token'); // For browser clients
// OR
setApiKey('your-api-key'); // For server-to-server communication

// Create a new user
const newUser = {
  email: 'user@example.com',
  password: 'securepassword',
  username: 'newuser',
  name: 'New User',
  role: 'user' as const
};

createUser(newUser)
  .then(response => console.log('User created:', response.user))
  .catch(error => console.error('Error:', error));

// Get all users
getAllUsers()
  .then(response => console.log('Users:', response.users))
  .catch(error => console.error('Error:', error));

// Get a user
getUser('user-id')
  .then(response => console.log('User:', response.user))
  .catch(error => console.error('Error:', error));

// Update a user
updateUser('user-id', { name: 'Updated Name' })
  .then(response => console.log('User updated:', response.user))
  .catch(error => console.error('Error:', error));

// Delete a user
deleteUser('user-id')
  .then(response => console.log('User deleted:', response.message))
  .catch(error => console.error('Error:', error));
```

### React Component

The `UserManagementComponent.jsx` file provides a complete React component that demonstrates how to use the API client for user management operations. It includes:

- User creation form
- User editing form
- User listing
- User deletion

To use the component:

```jsx
import React from 'react';
import UserManagementComponent from './UserManagementComponent';

function AdminPage() {
  // Get the auth token from your authentication system
  const authToken = 'your-jwt-token';
  
  return (
    <div className="admin-page">
      <h1>User Management</h1>
      <UserManagementComponent authToken={authToken} />
    </div>
  );
}

export default AdminPage;
```

## Configuration

Both client implementations use the following configuration:

```javascript
const API_BASE_URL = 'http://localhost:3000/api/users';
```

Update this URL to match your backend API endpoint in production.

## Authentication

The clients support two authentication methods:

1. **JWT Token Authentication** - For browser clients, using `setAuthToken()`
2. **API Key Authentication** - For server-to-server communication, using `setApiKey()`

Make sure to set one of these authentication methods before making API calls.

## Error Handling

All API methods return promises that resolve with the API response or reject with an error. The error will contain the error message from the API if available.

## Security Considerations

1. Never store API keys in client-side code
2. Use JWT tokens for browser clients
3. Implement proper token refresh mechanisms
4. Use HTTPS for all API calls in production