/**
 * API Key Controller
 * 
 * Handles API endpoints for API key management
 */

import { Request, Response } from 'express';
import {
  createApiKey,
  getApiKeysBySchool,
  getApiKeyById,
  revokeApiKey,
  updateApiKey,
  ApiKeyCreateParams
} from '../services/apiKeyService';
import { logger } from '../services/loggerService';

/**
 * Create a new API key
 */
export async function createApiKeyHandler(req: Request, res: Response) {
  try {
    // Extract user info from JWT token (set by authMiddleware)
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate request body
    const { name, school_id, permissions, expires_at } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'API key name is required'
      });
    }

    // Only admins can create keys for any school
    // School admins can only create keys for their own school
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      if (school_id && school_id !== req.user?.school_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only create API keys for your own school'
        });
      }
    }

    // Create the API key
    const apiKeyParams: ApiKeyCreateParams = {
      name,
      created_by: userId,
      school_id: school_id || req.user?.school_id,
      permissions: permissions || [],
      expires_at: expires_at || null
    };

    const apiKey = await createApiKey(apiKeyParams);

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create API key'
      });
    }

    logger.info(`API key created: ${apiKey.id} by user ${userId}`);

    // Return the API key (including the actual key - only time it's available)
    return res.status(201).json({
      success: true,
      message: 'API key created successfully',
      apiKey
    });
  } catch (error) {
    logger.error('Error in createApiKeyHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get all API keys for a school
 */
export async function getApiKeysHandler(req: Request, res: Response) {
  try {
    // Extract user info from JWT token (set by authMiddleware)
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userSchoolId = req.user?.school_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get school_id from query params or use user's school_id
    const schoolId = req.query.school_id as string || userSchoolId;

    // Only admins can view keys for any school
    // School admins can only view keys for their own school
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      if (schoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view API keys for your own school'
        });
      }
    }

    // Get the API keys
    const apiKeys = await getApiKeysBySchool(schoolId);

    if (apiKeys === null) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve API keys'
      });
    }

    return res.status(200).json({
      success: true,
      apiKeys
    });
  } catch (error) {
    logger.error('Error in getApiKeysHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get a specific API key by ID
 */
export async function getApiKeyHandler(req: Request, res: Response) {
  try {
    // Extract user info from JWT token (set by authMiddleware)
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userSchoolId = req.user?.school_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const keyId = req.params.id;

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'API key ID is required'
      });
    }

    // Get the API key
    const apiKey = await getApiKeyById(keyId);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      if (apiKey.school_id !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view API keys for your own school'
        });
      }
    }

    return res.status(200).json({
      success: true,
      apiKey
    });
  } catch (error) {
    logger.error('Error in getApiKeyHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Revoke (delete) an API key
 */
export async function revokeApiKeyHandler(req: Request, res: Response) {
  try {
    // Extract user info from JWT token (set by authMiddleware)
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userSchoolId = req.user?.school_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const keyId = req.params.id;

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'API key ID is required'
      });
    }

    // Get the API key first to check permissions
    const apiKey = await getApiKeyById(keyId);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      if (apiKey.school_id !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: 'You can only revoke API keys for your own school'
        });
      }
    }

    // Revoke the API key
    const success = await revokeApiKey(keyId);

    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to revoke API key'
      });
    }

    logger.info(`API key revoked: ${keyId} by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    logger.error('Error in revokeApiKeyHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update an API key
 */
export async function updateApiKeyHandler(req: Request, res: Response) {
  try {
    // Extract user info from JWT token (set by authMiddleware)
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userSchoolId = req.user?.school_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const keyId = req.params.id;

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'API key ID is required'
      });
    }

    // Validate request body
    const { name, permissions, expires_at } = req.body;

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update parameters provided'
      });
    }

    // Get the API key first to check permissions
    const apiKey = await getApiKeyById(keyId);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      if (apiKey.school_id !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update API keys for your own school'
        });
      }
    }

    // Update the API key
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (permissions !== undefined) updates.permissions = permissions;
    if (expires_at !== undefined) updates.expires_at = expires_at;

    const updatedApiKey = await updateApiKey(keyId, updates);

    if (!updatedApiKey) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update API key'
      });
    }

    logger.info(`API key updated: ${keyId} by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'API key updated successfully',
      apiKey: updatedApiKey
    });
  } catch (error) {
    logger.error('Error in updateApiKeyHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}