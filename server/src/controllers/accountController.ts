import { Request, Response } from 'express';
import { createUser, createAccountRecord, updateAccountRecord, deleteAccountRecord, getAccountById } from '../services/supabaseAdmin';

/**
 * Validate account fields
 */
const validateAccountFields = (req: Request, res: Response, requirePassword = false) => {
  const { email, password, username, name, role } = req.body;
  
  // Validate required fields
  const missingFields = [];
  if (!email) missingFields.push('email');
  if (requirePassword && !password) missingFields.push('password');
  if (!username) missingFields.push('username');
  if (!name) missingFields.push('name');
  if (!role) missingFields.push('role');
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      status: 400,
      message: `Missing required fields: ${missingFields.join(', ')}`
    };
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return {
      valid: false,
      status: 400,
      message: 'Invalid email format'
    };
  }
  
  // Validate password strength if required
  if (requirePassword && password && password.length < 6) {
    return {
      valid: false,
      status: 400,
      message: 'Password must be at least 6 characters long'
    };
  }
  
  return { valid: true };
};

/**
 * Create a new account with Auth user and account record
 */
export const createAccountHandler = async (req: Request, res: Response) => {
  const { email, password, username, name, role, school_id, grade_levels } = req.body;

  // Validate account input with password requirement
  const validation = validateAccountFields(req, res, true);
  if (!validation.valid) {
    return res.status(validation.status).json({
      success: false,
      message: validation.message
    });
  }

  try {
    // Step 1: Create user in Supabase Auth
    let authUser;
    try {
      authUser = await createUser(email, password, { name, username, role });
      console.log('Created user in Supabase Auth:', authUser.id);
    } catch (authError: any) {
      return res.status(400).json({
        success: false,
        message: `Failed to create authentication user: ${authError.message}`,
        error: authError.message
      });
    }

    // Step 2: Create account record using Auth user ID
    try {
      const accountData = {
        id: authUser.id, // Use Auth UUID as primary key
        name,
        email,
        username,
        role,
        school_id: school_id || null,
        grade_levels: grade_levels || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const account = await createAccountRecord(accountData);
      
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: account
      });
    } catch (accountError: any) {
      console.error('Error creating account record:', accountError);
      return res.status(500).json({
        success: false,
        message: `Failed to create account record: ${accountError.message}`,
        error: accountError.message
      });
    }
  } catch (error: any) {
    console.error('Error creating account:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to create account: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Get account by ID
 */
export const getAccountHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Account ID is required'
    });
  }
  
  try {
    const account = await getAccountById(id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: account
    });
  } catch (error: any) {
    console.error('Error fetching account:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update an existing account
 */
export const updateAccountHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, username, name, role, school_id, grade_levels } = req.body;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Account ID is required'
    });
  }
  
  // Validate account input
  const validation = validateAccountFields(req, res);
  if (!validation.valid) {
    return res.status(validation.status).json({
      success: false,
      message: validation.message
    });
  }
  
  try {
    const accountData = {
      name,
      email,
      username,
      role,
      school_id: school_id || null,
      grade_levels: grade_levels || [],
      updated_at: new Date().toISOString()
    };
    
    const account = await updateAccountRecord(id, accountData);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: account
    });
  } catch (error: any) {
    console.error('Error updating account:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to update account: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Delete an account
 */
export const deleteAccountHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Account ID is required'
    });
  }
  
  try {
    const success = await deleteAccountRecord(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to delete account: ${error.message}`,
      error: error.message
    });
  }
};