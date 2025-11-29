import express from 'express';
import { 
  createSubscriptionHandler, 
  getSubscriptionsHandler,
  getSubscriptionHandler, 
  updateSubscriptionHandler, 
  deleteSubscriptionHandler,
  markSubscriptionAsPaidHandler,
  pauseSubscriptionHandler,
  resumeSubscriptionHandler
} from '../controllers/subscriptionController';
import { verifyToken, requireAdmin, verifyApiKey } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @route   GET /api/subscriptions
 * @desc    Get all subscriptions (admin) or school's subscriptions
 * @access  Private
 */
router.get('/', verifyToken, getSubscriptionsHandler);

/**
 * @route   GET /api/subscriptions/:id
 * @desc    Get a subscription by ID
 * @access  Private
 */
router.get('/:id', verifyToken, getSubscriptionHandler);

/**
 * @route   POST /api/subscriptions
 * @desc    Create a new subscription
 * @access  Private/Admin
 */
router.post('/', [verifyToken, requireAdmin], createSubscriptionHandler);

/**
 * @route   PUT /api/subscriptions/:id
 * @desc    Update an existing subscription
 * @access  Private/Admin
 */
router.put('/:id', [verifyToken, requireAdmin], updateSubscriptionHandler);

/**
 * @route   DELETE /api/subscriptions/:id
 * @desc    Delete a subscription
 * @access  Private/Admin
 */
router.delete('/:id', [verifyToken, requireAdmin], deleteSubscriptionHandler);

/**
 * @route   PATCH /api/subscriptions/:id/mark-paid
 * @desc    Mark subscription as paid
 * @access  Private/Admin
 */
router.patch('/:id/mark-paid', [verifyToken, requireAdmin], markSubscriptionAsPaidHandler);

/**
 * @route   PATCH /api/subscriptions/:id/pause
 * @desc    Pause a subscription
 * @access  Private/Admin
 */
router.patch('/:id/pause', [verifyToken, requireAdmin], pauseSubscriptionHandler);

/**
 * @route   PATCH /api/subscriptions/:id/resume
 * @desc    Resume a paused subscription
 * @access  Private/Admin
 */
router.patch('/:id/resume', [verifyToken, requireAdmin], resumeSubscriptionHandler);

/**
 * API Key protected routes for non-browser clients
 */
router.get('/api-key', verifyApiKey, getSubscriptionsHandler);
router.get('/api-key/:id', verifyApiKey, getSubscriptionHandler);
router.post('/api-key', verifyApiKey, createSubscriptionHandler);
router.put('/api-key/:id', verifyApiKey, updateSubscriptionHandler);
router.delete('/api-key/:id', verifyApiKey, deleteSubscriptionHandler);
router.patch('/api-key/:id/mark-paid', verifyApiKey, markSubscriptionAsPaidHandler);
router.patch('/api-key/:id/pause', verifyApiKey, pauseSubscriptionHandler);
router.patch('/api-key/:id/resume', verifyApiKey, resumeSubscriptionHandler);

export default router;