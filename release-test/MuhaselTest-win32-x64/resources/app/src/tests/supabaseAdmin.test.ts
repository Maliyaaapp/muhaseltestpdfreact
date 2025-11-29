import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as supabaseAdmin from '../services/supabaseAdmin';

// Mock the Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockCreateClient = vi.fn().mockReturnValue({
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn()
      }
    }
  });
  
  return {
    createClient: mockCreateClient
  };
});

// Mock environment variables
vi.stubGlobal('import.meta', {
  env: {
    VITE_SUPABASE_URL: 'https://test-url.supabase.co',
    VITE_SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  }
});

describe('Supabase Admin Service', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should check if Supabase Admin is configured', () => {
    expect(supabaseAdmin.isSupabaseAdminConfigured()).toBe(true);
  });

  it('should create a user successfully', async () => {
    // Mock successful user creation
    const mockUser = { id: 'test-uuid', email: 'test@example.com' };
    supabaseAdmin.supabaseAdmin.auth.admin.createUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const result = await supabaseAdmin.createUser('test@example.com', 'password123', { name: 'Test User' });
    
    expect(result).toEqual(mockUser);
    expect(supabaseAdmin.supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { name: 'Test User' }
    });
  });

  it('should handle errors when creating a user', async () => {
    // Mock error response
    supabaseAdmin.supabaseAdmin.auth.admin.createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already exists' }
    });

    await expect(supabaseAdmin.createUser('test@example.com', 'password123'))
      .rejects
      .toThrow('Email already exists');
  });

  it('should delete a user successfully', async () => {
    // Mock successful user deletion
    supabaseAdmin.supabaseAdmin.auth.admin.deleteUser = vi.fn().mockResolvedValue({
      error: null
    });

    const result = await supabaseAdmin.deleteUser('test-uuid');
    
    expect(result).toEqual({ success: true });
    expect(supabaseAdmin.supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('test-uuid');
  });

  it('should handle errors when deleting a user', async () => {
    // Mock error response
    supabaseAdmin.supabaseAdmin.auth.admin.deleteUser = vi.fn().mockResolvedValue({
      error: { message: 'User not found' }
    });

    await expect(supabaseAdmin.deleteUser('invalid-uuid'))
      .rejects
      .toThrow('User not found');
  });
});