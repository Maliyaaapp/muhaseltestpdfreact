import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import userRoutes from './src/routes/userRoutes';
import accountRoutes from './src/routes/accountRoutes';
import apiKeyRoutes from './src/routes/apiKeyRoutes';
import subscriptionRoutes from './src/routes/subscriptionRoutes';
// import { logger, requestLogger } from './src/services/loggerService';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3001;

// Simple console logger
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.log(`[WARN] ${msg}`),
  error: (msg: string, err?: any) => console.log(`[ERROR] ${msg}`, err)
};

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});



// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// User management endpoints
app.use('/api/users', userRoutes);

// Account management endpoints
app.use('/api/accounts', accountRoutes);

// API key management endpoints
app.use('/api/keys', apiKeyRoutes);

// Subscription management endpoints
app.use('/api/subscriptions', subscriptionRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Give logger time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason, promise });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`PDF Export service available at: http://localhost:${port}/api/export-pdf/student-installments`);
  logger.info(`All Installments Report service available at: http://localhost:${port}/api/export-pdf/all-installments`);
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn('Supabase credentials not configured. Some features may not work.');
  } else {
    logger.info('Supabase admin client configured successfully');
  }
});