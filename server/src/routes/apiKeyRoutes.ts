/**
 * API Key Routes
 * 
 * Defines routes for API key management
 */

import express from 'express';
import {
  createApiKeyHandler,
  getApiKeysHandler,
  getApiKeyHandler,
  revokeApiKeyHandler,
  updateApiKeyHandler
} from '../controllers/apiKeyController';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all API keys (for a school)
// GET /api/keys?school_id=xxx
router.get('/', getApiKeysHandler);

// Get a specific API key
// GET /api/keys/:id
router.get('/:id', getApiKeyHandler);

// Create a new API key
// POST /api/keys
router.post('/', createApiKeyHandler);

// Update an API key
// PUT /api/keys/:id
router.put('/:id', updateApiKeyHandler);

// Revoke (delete) an API key
// DELETE /api/keys/:id
router.delete('/:id', revokeApiKeyHandler);

export default router;