import express from 'express';
import { 
  createUserHandler, 
  getAllUsersHandler,
  getUserHandler, 
  updateUserHandler, 
  deleteUserHandler 
} from '../controllers/userController';
import { verifyToken, requireAdmin, verifyApiKey } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @route   POST /api/users
 * @desc    Create a new user with Supabase Auth and accounts table
 * @access  Private/Admin
 */
router.post('/', [verifyToken, requireAdmin], createUserHandler);

/**
 * @route   POST /api/users/register
 * @desc    Public user registration endpoint
 * @access  Public
 */
router.post('/register', createUserHandler);

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get('/', [verifyToken, requireAdmin], getAllUsersHandler);

/**
 * @route   GET /api/users/:id
 * @desc    Get a user by ID
 * @access  Private/Admin
 */
router.get('/:id', [verifyToken, requireAdmin], getUserHandler);

/**
 * @route   PUT /api/users/:id
 * @desc    Update an existing user
 * @access  Private/Admin
 */
router.put('/:id', [verifyToken, requireAdmin], updateUserHandler);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user
 * @access  Private/Admin
 */
router.delete('/:id', [verifyToken, requireAdmin], deleteUserHandler);

/**
 * API Key protected routes for non-browser clients
 */
router.post('/api-key', verifyApiKey, createUserHandler);
router.get('/api-key/:id', verifyApiKey, getUserHandler);
router.put('/api-key/:id', verifyApiKey, updateUserHandler);
router.delete('/api-key/:id', verifyApiKey, deleteUserHandler);

export default router;