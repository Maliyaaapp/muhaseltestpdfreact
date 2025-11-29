import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyApiKey as verifyApiKeyService } from '../services/apiKeyService';
import { logger } from '../services/loggerService';
import dotenv from 'dotenv';

dotenv.config();

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role: string;
        school_id?: string;
        permissions?: string[];
        via_api_key?: boolean;
      };
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Middleware to verify JWT token from Supabase Auth
 */
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: error?.message
      });
    }
    
    // Add the user to the request object
    (req as any).user = user;
    
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user has admin role
 * Must be used after verifyToken middleware
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Get user metadata to check role
    const { data, error } = await supabase
      .from('accounts')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error || !data) {
      return res.status(403).json({
        success: false,
        message: 'Could not verify user role',
        error: error?.message
      });
    }
    
    if (data.role !== 'admin' && data.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    next();
  } catch (error: any) {
    console.error('Admin check middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during role verification',
      error: error.message
    });
  }
};

/**
 * Middleware to verify API key for non-browser clients
 */
export const verifyApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }

  try {
    // Verify the API key using the service
    const result = await verifyApiKeyService(apiKey);

    if (!result.isValid) {
      logger.warn('Invalid API key attempt');
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Set user info from API key
    req.user = {
      id: result.accountId || 'api',
      role: 'api', // Special role for API access
      school_id: result.schoolId,
      permissions: result.permissions,
      via_api_key: true
    };

    logger.debug(`API key authenticated for account: ${result.accountId}`);
    next();
  } catch (error) {
    logger.error('Error verifying API key:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying API key'
    });
  }
};