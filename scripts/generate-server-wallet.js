/**
 * Script to generate a server wallet for CoolSwap
 *
 * Usage:
 *   node scripts/generate-server-wallet.js
 *
 * This script:
 * 1. Generates a new Solana keypair
 * 2. Saves the secret key to server-wallet.json (NEVER commit this!)
 * 3. Displays the public key for .env configuration
 * 4. Displays the secret key array for Vercel environment variables
 *
 * SECURITY:
 * - server-wallet.json is gitignored - NEVER commit it
 * - Store secret key securely in Vercel environment variables
 * - Public key goes in frontend .env file
 */

import { Keypair } from '@solana/web3.js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔐 Generating server wallet for CoolSwap...\n');

// Generate new keypair
const keypair = Keypair.generate();

// Extract values
const publicKey = keypair.publicKey.toBase58();
const secretKeyArray = Array.from(keypair.secretKey);
const secretKeyJson = JSON.stringify(secretKeyArray);

// Save to file (gitignored)
const walletPath = join(__dirname, '..', 'server-wallet.json');
const walletData = {
  publicKey,
  secretKey: secretKeyArray,
  createdAt: new Date().toISOString(),
  warning: 'NEVER commit this file! Keep it secure and private.'
};

writeFileSync(walletPath, JSON.stringify(walletData, null, 2));

console.log('✅ Server wallet generated successfully!\n');
console.log('📁 Wallet saved to: server-wallet.json (gitignored)\n');

console.log('=' .repeat(70));
console.log('CONFIGURATION INSTRUCTIONS');
console.log('=' .repeat(70));

console.log('\n1️⃣  FRONTEND (.env file)');
console.log('-'.repeat(70));
console.log('Add this to your .env file:\n');
console.log(`VITE_SERVER_WALLET_PUBLIC_KEY=${publicKey}`);

console.log('\n2️⃣  VERCEL (Environment Variables)');
console.log('-'.repeat(70));
console.log('Add this secret key to Vercel environment variables:');
console.log('Name: SERVER_WALLET_SECRET_KEY');
console.log('Value:\n');
console.log(secretKeyJson);

console.log('\n3️⃣  FUND THE WALLET');
console.log('-'.repeat(70));
console.log('Send SOL to this address to cover transaction fees:');
console.log(publicKey);
console.log('\nRecommended amount: 0.1 SOL for testing, 1+ SOL for production');

console.log('\n4️⃣  SECURITY CHECKLIST');
console.log('-'.repeat(70));
console.log('✓ server-wallet.json is gitignored');
console.log('✓ Never commit or share the secret key');
console.log('✓ Store secret key only in Vercel environment variables');
console.log('✓ Public key is safe to commit in .env file');
console.log('✓ Fund wallet with enough SOL for fee payments');

console.log('\n' + '=' .repeat(70));
console.log('🎉 Setup complete! Follow the instructions above.');
console.log('=' .repeat(70) + '\n');
