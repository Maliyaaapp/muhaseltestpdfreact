import { Request, Response } from 'express';
import { createUser, deleteUser, createAccountRecord, updateUser, getUserById, getAllUsers } from '../services/supabaseAdmin';

/**
 * Create a new user with Supabase Auth and accounts table
 * @param req Express request object
 * @param res Express response object
 */
/**
 * Validate common user fields
 */
const validateUserFields = (req: Request, res: Response, requirePassword = true) => {
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
  
  // Validate password strength if provided
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
 * Create a new user with Supabase Auth and accounts table
 */
export const createUserHandler = async (req: Request, res: Response) => {
  const { email, password, username, name, role, school_id, grade_levels } = req.body;

  // Validate user input
  const validation = validateUserFields(req, res);
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
        error: authError
      });
    }

    // Step 2: Create user in accounts table
    try {
      if (authUser && authUser.id) {
        const accountData = {
          id: authUser.id, // Use Auth UUID as primary key
          name,
          email,
          username,
          role,
          school_id: school_id || null,
          grade_levels: grade_levels || []
        };

        const account = await createAccountRecord(accountData);
        
        return res.status(201).json({
          success: true,
          message: 'User created successfully',
          data: {
            id: authUser.id,
            email: authUser.email,
            name: account.name,
            role: account.role
          }
        });
      } else {
        throw new Error('Auth user creation succeeded but returned invalid user data');
      }
    } catch (accountError: any) {
      // If account creation fails, delete the Auth user to maintain consistency
      if (authUser && authUser.id) {
        try {
          await deleteUser(authUser.id);
          console.log(`Deleted auth user ${authUser.id} due to account creation failure`);
        } catch (deleteError) {
          console.error('Failed to delete auth user after account creation failure:', deleteError);
        }
      }

      return res.status(500).json({
        success: false,
        message: `Failed to create account record: ${accountError.message}`,
        error: accountError
      });
    }
  } catch (error: any) {
    console.error('Error in user creation process:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during user creation',
      error: error.message
    });
  }
};

/**
 * Get all users
 * @param req Express request object
 * @param res Express response object
 */
export const getAllUsersHandler = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    
    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error: any) {
    console.error('Error getting all users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

/**
 * Get a user by ID
 * @param req Express request object
 * @param res Express response object
 */
export const getUserHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }
  
  try {
    const user = await getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Remove sensitive fields
    const { password, ...safeUserData } = user;
    
    return res.status(200).json({
      success: true,
      data: safeUserData
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update an existing user
 * @param req Express request object
 * @param res Express response object
 */
export const updateUserHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, password, username, name, role, school_id, grade_levels } = req.body;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }
  
  // Validate user input (password not required for updates)
  const validation = validateUserFields(req, res, false);
  if (!validation.valid) {
    return res.status(validation.status).json({
      success: false,
      message: validation.message
    });
  }
  
  try {
    // Step 1: Update user in Supabase Auth if email or password changed
    if (email || password) {
      try {
        await updateUser(id, { email, password });
        console.log(`Updated auth user ${id}`);
      } catch (authError: any) {
        return res.status(400).json({
          success: false,
          message: `Failed to update authentication user: ${authError.message}`,
          error: authError
        });
      }
    }
    
    // Step 2: Update user in accounts table
    try {
      const accountData: any = {};
      if (name) accountData.name = name;
      if (email) accountData.email = email;
      if (username) accountData.username = username;
      if (role) accountData.role = role;
      if (school_id !== undefined) accountData.school_id = school_id;
      if (grade_levels) accountData.grade_levels = grade_levels;
      
      const { data: account, error } = await updateAccountRecord(id, accountData);
      
      if (error) {
        throw error;
      }
      
      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: account
      });
    } catch (accountError: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to update account record: ${accountError.message}`,
        error: accountError
      });
    }
  } catch (error: any) {
    console.error('Error in user update process:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during user update',
      error: error.message
    });
  }
};

/**
 * Delete a user
 * @param req Express request object
 * @param res Express response object
 */
export const deleteUserHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }
  
  try {
    // First check if user exists
    const user = await getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete user from Supabase Auth
    try {
      await deleteUser(id);
      console.log(`Deleted auth user ${id}`);
      
      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return res.status(500).json({
        success: false,
        message: `Failed to delete user: ${error.message}`,
        error: error
      });
    }
  } catch (error: any) {
    console.error('Error in user deletion process:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during user deletion',
      error: error.message
    });
  }
};