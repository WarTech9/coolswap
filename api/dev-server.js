/**
 * Local development server for API functions
 * Run this separately from Vite during local development
 *
 * Usage: node api/dev-server.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from parent directory's .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Configure CORS from environment variable
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : '*';

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());

// Import the sign-transaction handler
import signTransactionHandler from './sign-transaction.js';

// Mount the API endpoint
app.post('/api/sign-transaction', signTransactionHandler);

app.listen(PORT, () => {
  console.log(`\n✅ API Server running on http://localhost:${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/api/sign-transaction\n`);
});
