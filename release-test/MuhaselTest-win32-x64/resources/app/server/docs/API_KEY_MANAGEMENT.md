# API Key Management

This document provides comprehensive information about the API key management system implemented in the application.

## Overview

API keys provide a secure way for external applications and services to authenticate with the backend API without using browser-based authentication. This is particularly useful for:

- Integration with third-party services
- Automated scripts and batch processes
- Mobile applications
- School-specific integrations

## API Key Structure

API keys are structured as follows:

```
muhasel_<random_string>
```

The prefix `muhasel_` helps identify the keys as belonging to this application.

## Security Considerations

1. **Storage**: API keys are never stored in plain text. Only a secure hash of the key is stored in the database.
2. **Transmission**: API keys should only be transmitted over HTTPS connections.
3. **Exposure**: The full API key is only shown once when it's created. After that, only a masked version is displayed.
4. **Permissions**: API keys can have specific permissions assigned to limit their access.
5. **Expiration**: API keys can have an expiration date, after which they become invalid.

## Database Schema

API keys are stored in the `api_keys` table with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Descriptive name for the key |
| key_hash | TEXT | Secure hash of the API key |
| created_by | UUID | User ID who created the key |
| school_id | UUID | School ID if the key is school-specific |
| permissions | TEXT[] | Array of permission strings |
| last_used | TIMESTAMP | When the key was last used |
| expires_at | TIMESTAMP | When the key expires (null = never) |
| created_at | TIMESTAMP | When the key was created |
| updated_at | TIMESTAMP | When the key was last updated |

## API Endpoints

### Get All API Keys

```
GET /api/keys
```

Optional query parameter: `school_id`

Returns a list of API keys. For admin users, returns all keys if no school_id is provided. For school admins, returns only keys for their school.

### Get API Key

```
GET /api/keys/:id
```

Returns details for a specific API key.

### Create API Key

```
POST /api/keys
```

Request body:

```json
{
  "name": "Integration Key",
  "school_id": "uuid-of-school", // Optional
  "permissions": ["users:read", "users:write"], // Optional
  "expires_at": "2025-01-01T00:00:00Z" // Optional
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid-of-key",
    "name": "Integration Key",
    "key": "muhasel_abc123def456", // Full key, only shown once
    "created_by": "uuid-of-user",
    "school_id": "uuid-of-school",
    "permissions": ["users:read", "users:write"],
    "expires_at": "2025-01-01T00:00:00Z",
    "created_at": "2023-06-01T12:00:00Z"
  }
}
```

### Update API Key

```
PUT /api/keys/:id
```

Request body:

```json
{
  "name": "Updated Name",
  "permissions": ["users:read"],
  "expires_at": "2024-01-01T00:00:00Z"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid-of-key",
    "name": "Updated Name",
    "masked_key": "muhasel_abc1****",
    "created_by": "uuid-of-user",
    "school_id": "uuid-of-school",
    "permissions": ["users:read"],
    "expires_at": "2024-01-01T00:00:00Z",
    "created_at": "2023-06-01T12:00:00Z",
    "updated_at": "2023-06-02T12:00:00Z"
  }
}
```

### Revoke API Key

```
DELETE /api/keys/:id
```

Response:

```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

## Using API Keys

To use an API key with the API, include it in the request headers:

```
X-API-Key: muhasel_abc123def456
```

## Available Permissions

API keys can have the following permissions:

| Permission | Description |
|------------|-------------|
| users:read | View user information |
| users:write | Create, update, and delete users |
| schools:read | View school information |
| schools:write | Create, update, and delete schools |
| students:read | View student information |
| students:write | Create, update, and delete students |
| payments:read | View payment information |
| payments:write | Create, update, and delete payments |

## Best Practices

1. **Limit Permissions**: Only assign the permissions that are absolutely necessary for the integration.
2. **Use Expiration Dates**: Set expiration dates for API keys to ensure they are regularly rotated.
3. **Descriptive Names**: Use descriptive names for API keys to easily identify their purpose.
4. **Monitor Usage**: Regularly review the last_used timestamp to identify unused keys that can be revoked.
5. **Revoke Immediately**: If an API key is compromised, revoke it immediately and create a new one.

## Implementation Details

### API Key Generation

API keys are generated using a secure random string generator and prefixed with `muhasel_` for identification.

### API Key Verification

When a request is received with an API key, the system:

1. Extracts the key from the X-API-Key header
2. Looks up the key hash in the database
3. Verifies the key is not expired
4. Updates the last_used timestamp
5. Attaches the associated permissions to the request

### Row Level Security

The database uses Row Level Security (RLS) policies to ensure that:

- Admins can manage all API keys
- School admins can only manage API keys for their school
- Regular users cannot access API keys