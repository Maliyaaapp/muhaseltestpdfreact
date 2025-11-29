# Muhasel Admin Backend Service

This is a minimal backend service for the Muhasel admin portal, specifically designed to handle secure user creation with Supabase Authentication.

## Features

- Secure user management with Supabase Auth using service role key
  - Create, read, update, and delete users
  - Transactional process ensuring data consistency between Auth and accounts table
- API Key management for secure non-browser authentication
  - Create, list, update, and revoke API keys
  - Permission-based access control
  - School-specific API keys
- Authentication middleware
  - JWT token verification for browser clients
  - API key verification for non-browser clients
  - Role-based access control
- Comprehensive logging system
  - Multiple log levels (ERROR, WARN, INFO, DEBUG)
  - Console and file logging
  - Log rotation and cleanup
- RESTful API endpoints with proper documentation
- Robust error handling and security measures

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase project with service role key
- PostgreSQL database (provided by Supabase)
- Supabase migrations applied (see `supabase/migrations` directory)

## Setup

1. Clone the repository
2. Navigate to the server directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file based on `.env.example` and add your configuration:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Key Configuration
API_KEY_PREFIX=muhasel_
API_KEY_LENGTH=32

# Logging Configuration
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE_DIR=logs
LOG_MAX_SIZE=10m
LOG_MAX_FILES=7
```

> **IMPORTANT**: The service role key has admin privileges. Never expose it to the client side or in public repositories.

5. Start the server:

```bash
npm run dev  # For development with auto-reload
# or
npm start     # For production
```

## API Endpoints

### User Management

#### Create User

**Endpoint**: `POST /api/users`

**Description**: Creates a new user in Supabase Auth and inserts a corresponding record in the accounts table.

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "username",
  "name": "User Name",
  "role": "admin",
  "school_id": "uuid-of-school",
  "grade_levels": ["grade1", "grade2"]
}
```

**Required fields**: `email`, `password`, `username`, `name`, `role`

**Response (Success - 201 Created)**:

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "auth-user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin"
  }
}
```

**Response (Error - 400 Bad Request)**:

```json
{
  "success": false,
  "message": "Failed to create authentication user: Email already in use",
  "error": { /* Error details */ }
}
```

#### Get User

**Endpoint**: `GET /api/users/:id`

**Description**: Retrieves a user by ID.

**Response (Success - 200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "auth-user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin",
    "school_id": "uuid-of-school",
    "grade_levels": ["grade1", "grade2"]
  }
}
```

#### Update User

**Endpoint**: `PUT /api/users/:id`

**Description**: Updates a user's information.

**Request Body**:

```json
{
  "name": "Updated Name",
  "role": "school_admin",
  "grade_levels": ["grade1", "grade2", "grade3"]
}
```

**Response (Success - 200 OK)**:

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "auth-user-uuid",
    "email": "user@example.com",
    "name": "Updated Name",
    "role": "school_admin"
  }
}
```

#### Delete User

**Endpoint**: `DELETE /api/users/:id`

**Description**: Deletes a user.

**Response (Success - 200 OK)**:

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### API Key Management

#### Create API Key

**Endpoint**: `POST /api/keys`

**Description**: Creates a new API key.

**Request Body**:

```json
{
  "name": "Integration Key",
  "school_id": "uuid-of-school",
  "permissions": ["users:read", "users:write"],
  "expires_at": "2025-01-01T00:00:00Z"
}
```

**Response (Success - 201 Created)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid-of-key",
    "name": "Integration Key",
    "key": "muhasel_abc123def456",
    "created_by": "uuid-of-user",
    "school_id": "uuid-of-school",
    "permissions": ["users:read", "users:write"],
    "expires_at": "2025-01-01T00:00:00Z",
    "created_at": "2023-06-01T12:00:00Z"
  }
}
```

> **Note**: The full API key is only shown once when it's created. Store it securely.

#### Get API Keys

**Endpoint**: `GET /api/keys`

**Description**: Retrieves all API keys (filtered by school_id for school admins).

**Response (Success - 200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-of-key",
      "name": "Integration Key",
      "masked_key": "muhasel_abc1****",
      "created_by": "uuid-of-user",
      "school_id": "uuid-of-school",
      "permissions": ["users:read", "users:write"],
      "expires_at": "2025-01-01T00:00:00Z",
      "created_at": "2023-06-01T12:00:00Z",
      "last_used": "2023-06-01T13:00:00Z"
    }
  ]
}
```

#### Revoke API Key

**Endpoint**: `DELETE /api/keys/:id`

**Description**: Revokes (deletes) an API key.

**Response (Success - 200 OK)**:

```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

For more detailed information about API key management, see [API_KEY_MANAGEMENT.md](./docs/API_KEY_MANAGEMENT.md).

## Security Considerations

- The service role key is only stored on the server and never exposed to clients
- API keys are securely hashed before storage and never returned in full after creation
- JWT tokens are verified for all authenticated routes
- Role-based access control is enforced for all protected endpoints
- Input validation is performed on all API requests
- Helmet middleware is used to set security headers
- Error messages are sanitized in production mode
- Comprehensive logging for security events and audit trail

## Error Handling

The service implements proper error handling to ensure data consistency:

1. If creating the Auth user fails, no row is inserted in accounts
2. If inserting into accounts fails, the created Auth user is deleted to avoid orphaned users
3. If updating the Auth user fails, the account table update is rolled back
4. All errors are properly logged with the logging service and appropriate error responses are returned

## Logging

The application uses a comprehensive logging system:

- Multiple log levels (ERROR, WARN, INFO, DEBUG) controlled via environment variables
- Console logging for development and file logging for production
- Log rotation to prevent excessive disk usage
- Automatic cleanup of old log files
- Request logging middleware for API request tracking
- Global uncaught exception and unhandled rejection handlers

## Authentication

The application supports two authentication methods:

### JWT Token Authentication

For browser-based clients, JWT token authentication is used. The token should be included in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

The JWT token is verified using the Supabase Auth service. The user's ID, email, and role are extracted from the token and attached to the request object.

### API Key Authentication

For non-browser clients, API key authentication is supported. The API key should be included in the X-API-Key header:

```
X-API-Key: muhasel_<api_key>
```

API keys can be created, managed, and revoked through the API key management endpoints. Each API key can have specific permissions and can be associated with a specific school.

## Development

For development, you can use the following command to start the server with auto-reload:

```bash
npm run dev
```

The server will be available at `http://localhost:3000` (or the port specified in your .env file).

## Documentation

Additional documentation is available in the `docs` directory:

- [API Key Management](./docs/API_KEY_MANAGEMENT.md): Detailed information about the API key management system