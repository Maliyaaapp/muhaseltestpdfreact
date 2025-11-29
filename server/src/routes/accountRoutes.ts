import express from 'express';
import { 
  createAccountHandler, 
  getAccountHandler, 
  updateAccountHandler, 
  deleteAccountHandler 
} from '../controllers/accountController';
import { verifyToken, requireAdmin, verifyApiKey } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @route   POST /api/accounts
 * @desc    Create a new account record (without Auth user)
 * @access  Private (temporarily removed admin requirement for testing)
 */
router.post('/', verifyToken, createAccountHandler);

/**
 * @route   POST /api/accounts/create
 * @desc    Create a new account record (specific endpoint as requested)
 * @access  Private
 */
router.post('/create', verifyToken, createAccountHandler);

/**
 * @route   GET /api/accounts/:id
 * @desc    Get an account by ID
 * @access  Private/Admin
 */
router.get('/:id', [verifyToken, requireAdmin], getAccountHandler);

/**
 * @route   PUT /api/accounts/:id
 * @desc    Update an existing account
 * @access  Private/Admin
 */
router.put('/:id', [verifyToken, requireAdmin], updateAccountHandler);

/**
 * @route   DELETE /api/accounts/:id
 * @desc    Delete an account
 * @access  Private/Admin
 */
router.delete('/:id', [verifyToken, requireAdmin], deleteAccountHandler);

/**
 * API Key protected routes for non-browser clients
 */
router.post('/api-key', verifyApiKey, createAccountHandler);
router.get('/api-key/:id', verifyApiKey, getAccountHandler);
router.put('/api-key/:id', verifyApiKey, updateAccountHandler);
router.delete('/api-key/:id', verifyApiKey, deleteAccountHandler);

export default router;