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

import express, { Express } from 'express';
import cors from 'cors';

const app: Express = express();
const PORT = 3001;

// Configure CORS from environment variable
const corsOrigin: string | string[] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : '*';

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());

// Import the sign-transaction handler
import signTransactionHandler from './sign-transaction';
import type { Request, Response } from 'express';

// Mount the API endpoint - Wrap Vercel handler for Express compatibility
app.post('/api/sign-transaction', async (req: Request, res: Response) => {
  // Adapt Express req/res to match Vercel's interface
  const vercelReq = req as any;
  const vercelRes = res as any;
  await signTransactionHandler(vercelReq, vercelRes);
});

app.listen(PORT, () => {
  console.log(`\n✅ API Server running on http://localhost:${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/api/sign-transaction\n`);
});
