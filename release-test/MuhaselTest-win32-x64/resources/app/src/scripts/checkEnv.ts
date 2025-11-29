import dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

console.log('===== Environment Variables Check =====');

// Check if .env file exists
const envPath = resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`✅ .env file found at: ${envPath}`);
  // Read .env file content
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
  console.log(`ℹ️ Found ${envLines.length} environment variables defined in .env file.`);
} else {
  console.log(`❌ .env file not found at: ${envPath}`);
}

// Check required environment variables
const requiredEnvVars = {
  NODE_ENV: process.env.NODE_ENV,
  VITE_APP_NAME: process.env.VITE_APP_NAME,
  VITE_APP_VERSION: process.env.VITE_APP_VERSION,
  VITE_APP_DESCRIPTION: process.env.VITE_APP_DESCRIPTION
};

// Required in production only
const productionOnlyVars = [
  'VITE_APP_NAME',
  'VITE_APP_VERSION',
  'VITE_APP_DESCRIPTION'
];

// Check if all required variables are present
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => {
    if (process.env.NODE_ENV === 'production') {
      return !value;
    }
    return !value && !productionOnlyVars.includes(key);
  })
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('All required environment variables are present.');
process.exit(0); 