# CoolSwap Backend Integration & Gas Sponsorship

**Last Updated:** 2026-02-01
**Status:** In Development
**Purpose:** Server-side transaction signing for Relay swaps with gas sponsorship

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Architecture](#architecture)
4. [The Instruction 0 Rule](#the-instruction-0-rule)
5. [Backend Setup](#backend-setup)
6. [Security Model](#security-model)
7. [Deployment Guide](#deployment-guide)
8. [Testing & Verification](#testing--verification)
9. [Troubleshooting](#troubleshooting)
10. [Future Improvements](#future-improvements)

---

## Overview

CoolSwap enables zero-SOL Solana → EVM cross-chain swaps via Relay API. Users pay transaction fees in **source tokens** (e.g., USDC) instead of SOL, making the UX seamless for users who don't hold SOL.

### Key Components

- **Frontend**: Vite + React (existing)
- **Backend**: Vercel Serverless Functions (new)
- **Bridge**: Relay API
- **Price Oracle**: Pyth Network (free Hermes API)
- **Fee Payer**: Server wallet (replaces Kora)

### Transaction Flow

```
User initiates swap (1 USDC)
    ↓
Calculate gas payment (~0.123 USDC via Pyth)
    ↓
Build transaction:
  - Instruction 0: Transfer 0.123 USDC (user → server) ← PAYMENT FIRST
  - Instruction 1+: Relay swap (1 USDC user → bridge)
    ↓
Server signs (partial signature)
    ↓
User signs (adds second signature)
    ↓
Submit to Solana
    ↓
Both instructions execute atomically:
  - Server receives 0.123 USDC ✅
  - User's swap completes ✅
```

---

## Problem Statement

### Original Issue: Kora Simulation Failure

When attempting to use Kora's gas sponsorship service with Relay transactions, we encountered:

```
Error: Transaction simulation failed: Error processing Instruction 2: Program failed to complete
```

**Root Cause:** Account state conflict

1. **Relay's swap instructions** (Instruction 0+): Withdraw 1.00 USDC from user's ATA
2. **Payment instruction** (Instruction N): Try to withdraw 0.123 USDC from same ATA
3. **Conflict**: Relay modifies account state, payment instruction sees unexpected state
4. **Result**: Kora's simulation detects conflict and rejects transaction

### Why Instruction Order Matters

Solana transactions execute instructions **sequentially**:

```
BAD ORDER (FAILED):
[Relay Instruction 0, Relay Instruction 1, ..., Payment Instruction N]
                                                  ↑ FAILS HERE

GOOD ORDER (SUCCEEDS):
[Payment Instruction 0, Relay Instruction 1, Relay Instruction 2, ...]
 ↑ Executes first, before Relay touches account
```

When Relay's instructions execute first:
- They may close/modify user's ATA
- Change account delegation
- Update account metadata
- **Result**: Payment instruction fails due to unexpected account state

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  (Vite + React)                                             │
│  - Quote fetching (Relay API)                               │
│  - Transaction building                                     │
│  - User wallet integration                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─→ Pyth Hermes API (price conversion)
                       │   https://hermes.pyth.network
                       │
                       ├─→ Backend API (transaction signing)
                       │   POST /api/sign-transaction
                       │
                       └─→ Solana RPC (submit transaction)
                           https://solana-rpc.publicnode.com

┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│  (Vercel Serverless Functions)                              │
│  - Transaction validation                                   │
│  - Partial signing (server wallet)                          │
│  - Security checks                                          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**1. Quote Phase**
```
User selects: 1 USDC (Solana) → USDC (Arbitrum)
    ↓
Frontend → Relay API
    ↓
Relay returns quote:
  - sourceAmount: 1.00 USDC
  - destinationAmount: 0.972181 USDC (after Relay fee)
  - gasSolLamports: 5000 lamports (~0.000005 SOL)
```

**2. Gas Calculation**
```
Frontend → Pyth API
Request: Convert 5000 lamports → USDC
    ↓
Pyth returns prices:
  - SOL/USD: $180
  - USDC/USD: $1.00
    ↓
Calculate: (5000 lamports / 1e9) * ($180 / $1.00) * 1.1 buffer
Result: 0.123418 USDC payment needed
```

**3. Transaction Building**
```
Frontend builds transaction:
  Instruction 0: Transfer 0.123418 USDC (user → server)
  Instruction 1+: Relay swap instructions
  Fee Payer: Server wallet
    ↓
Encode to base64
```

**4. Signing Flow**
```
Frontend → POST /api/sign-transaction
    ↓
Backend validates:
  - Instruction 0 is payment to server
  - Amount is reasonable
  - No malicious instructions
    ↓
Backend signs with server wallet (partial signature)
    ↓
Returns signed transaction to frontend
    ↓
Frontend prompts user to sign (adds second signature)
    ↓
Frontend submits to Solana RPC
```

---

## The Instruction 0 Rule

### Core Principle

**Payment instruction MUST be Instruction 0** (executes first).

This ensures:
1. Server receives token payment BEFORE Relay modifies account
2. No account state conflicts
3. Atomic execution (both succeed or both fail)
4. Zero loss for server (payment received before SOL fees paid)

### Implementation

**Frontend** (`src/hooks/useRelaySwapExecution.ts`):

```typescript
// Build payment instruction (user → server)
const paymentInstruction = getTransferInstruction({
  source: userATA,
  destination: serverATA,
  authority: createNoopSigner(userAddress),
  amount: tokenAmount, // 0.123418 USDC
});

// Convert Relay instructions
const relayInstructions = txData.instructions.map(convertRelayInstruction);

// CRITICAL: Payment FIRST
const allInstructions = [paymentInstruction, ...relayInstructions];
//                       ↑ Instruction 0   ↑ Instruction 1+

// Set server as fee payer
const transaction = buildTransaction({
  instructions: allInstructions,
  feePayer: serverWallet,
});
```

### Why This Works

| Aspect | Old Approach (Failed) | New Approach (Succeeds) |
|--------|----------------------|------------------------|
| **Order** | Relay → Payment | Payment → Relay |
| **Account State** | Modified by Relay first | Clean when payment executes |
| **Simulation** | Fails at Instruction 2 | Succeeds |
| **Atomicity** | Single tx ✅ | Single tx ✅ |
| **Server Loss Risk** | High (pays SOL, no payment) | Zero (payment first) |

---

## Vercel Serverless Function Implementation Plan

### Phase 0: Pre-Implementation Checklist

**Status:** ✅ Complete

Files created:
- [x] `api/sign-transaction.ts` - Serverless signing endpoint
- [x] `api/package.json` - API dependencies (@solana/web3-compat)
- [x] `api/tsconfig.json` - TypeScript configuration
- [x] `vercel.json` - Deployment configuration
- [x] `.vercelignore` - Deployment exclusions
- [x] `.gitignore` - Updated with server wallet exclusions
- [x] `scripts/generate-server-wallet.ts` - Wallet generation script
- [x] `VERCEL_DEPLOYMENT.md` - Complete deployment guide
- [x] `api/README.md` - API documentation
- [x] `.env.example` - Updated with new variables

### Phase 1: Local Setup & Testing

**Objective:** Set up development environment and test locally before deploying

#### Step 1.1: Generate Server Wallet

```bash
# Navigate to scripts directory
cd scripts

# Initialize npm (if not already done)
npm init -y

# Install Solana web3.js
npm install @solana/web3.js

# Return to project root
cd ..

# Generate wallet
tsx scripts/generate-server-wallet.ts
```

**Expected Output:**
- Creates `server-wallet.json` (gitignored)
- Displays public key for `.env`
- Displays secret key array for Vercel

**Save the output** - you'll need both keys for configuration.

#### Step 1.2: Configure Local Environment

Edit `.env` file (create if doesn't exist):

```bash
# Copy from .env.example
cp .env.example .env

# Edit .env and add the public key from Step 1.1
VITE_SERVER_WALLET_PUBLIC_KEY=<public-key-from-generation>

# Other required variables
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_RELAY_API_URL=https://api.relay.link
VITE_RELAY_API_KEY=<your-relay-api-key>
VITE_KORA_URL=http://localhost:8080
```

#### Step 1.3: Fund Server Wallet (Devnet)

For initial testing, use devnet:

```bash
# Switch to devnet in .env
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# Fund wallet (devnet only - free SOL)
solana airdrop 2 <server-public-key> --url devnet
```

**Verify balance:**
```bash
solana balance <server-public-key> --url devnet
```

Expected: ~2 SOL

#### Step 1.4: Install Vercel CLI

```bash
# Install globally
npm install -g vercel

# Or use pnpm
pnpm add -g vercel
```

**Verify installation:**
```bash
vercel --version
```

#### Step 1.5: Set Up Local Serverless Environment

Create local environment file for serverless functions:

```bash
# Create .env.local for Vercel dev server
cat > .env.local << EOF
SERVER_WALLET_SECRET_KEY=<paste-secret-key-array-from-step-1.1>
EOF
```

**CRITICAL:** Ensure `.env.local` is gitignored (already configured).

#### Step 1.6: Test Locally with Vercel Dev

```bash
# Start Vercel dev server (runs both frontend + serverless functions)
vercel dev

# Expected output:
# > Ready! Available at http://localhost:3000
# > Serverless Functions: /api/sign-transaction
```

**Manual API Test:**

Open new terminal and test the endpoint:

```bash
# Test with invalid transaction (should fail gracefully)
curl -X POST http://localhost:3000/api/sign-transaction \
  -H "Content-Type: application/json" \
  -d '{"transaction": "invalid"}'

# Expected: Error response with 400/500 status
```

#### Step 1.7: Test Integration with Frontend

1. With `vercel dev` running, open browser: `http://localhost:3000`
2. Connect wallet
3. Select Solana → EVM swap (use devnet tokens)
4. Enter amount (0.1 USDC for testing)
5. Click "Swap"

**Expected Flow:**
- Quote loads successfully
- Gas sponsorship shows correct amount
- Total displays: source amount + gas payment
- User wallet prompts for signature
- Transaction submits (may fail on devnet if Relay doesn't support it)

**Debugging:**
- Check browser console for errors
- Check terminal running `vercel dev` for backend logs
- Verify server wallet has sufficient SOL

### Phase 2: Vercel Project Setup

**Objective:** Configure Vercel project and environment variables

#### Step 2.1: Login to Vercel

```bash
vercel login
```

Follow browser prompts to authenticate.

#### Step 2.2: Create Vercel Project (First-Time Deploy)

```bash
# From project root
vercel

# Answer prompts:
# ? Set up and deploy "~/coolswap"? [Y/n] y
# ? Which scope? <your-account>
# ? Link to existing project? [y/N] n
# ? What's your project's name? coolswap
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] n
```

This creates a **preview deployment** (not production yet).

**Save the deployment URL** - it will look like: `https://coolswap-abc123.vercel.app`

#### Step 2.3: Configure Environment Variables

**Option A - Vercel Dashboard** (Recommended):

1. Go to https://vercel.com/dashboard
2. Select your project (`coolswap`)
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable below:

| Variable Name | Value | Environment | Notes |
|--------------|-------|-------------|-------|
| `VITE_SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Production, Preview | Use premium RPC for production |
| `VITE_RELAY_API_URL` | `https://api.relay.link` | Production, Preview | Relay API endpoint |
| `VITE_RELAY_API_KEY` | `<your-relay-key>` | Production, Preview | Get from Relay dashboard |
| `VITE_SERVER_WALLET_PUBLIC_KEY` | `<public-key>` | Production, Preview | From Phase 1 Step 1.1 |
| `SERVER_WALLET_SECRET_KEY` | `<secret-array>` | Production, Preview | **CRITICAL: Backend only** |

**For `SERVER_WALLET_SECRET_KEY`:**
- Paste the JSON array from Step 1.1
- Example: `[123,45,67,...]` (64 numbers)
- This is used ONLY by serverless functions, not frontend

**Option B - Vercel CLI:**

```bash
# Add variables one by one
vercel env add VITE_SOLANA_RPC_URL production
# Paste value when prompted

vercel env add VITE_RELAY_API_URL production
vercel env add VITE_RELAY_API_KEY production
vercel env add VITE_SERVER_WALLET_PUBLIC_KEY production

# Backend variable (most critical)
vercel env add SERVER_WALLET_SECRET_KEY production
# Paste the JSON array: [123,45,67,...]
```

#### Step 2.4: Verify Environment Variables

Check all variables are set:

```bash
# List all environment variables
vercel env ls
```

Expected output shows all 5 variables for Production and Preview environments.

### Phase 3: Production Deployment

**Objective:** Deploy to production with full testing

#### Step 3.1: Fund Production Wallet (Mainnet)

**CRITICAL:** Use the SAME wallet keypair from Phase 1.

```bash
# Send SOL to production wallet
# Address: <server-public-key-from-phase-1>
# Amount: 1-5 SOL (conservative for testing)
```

**Verify balance:**
```bash
solana balance <server-public-key>
```

#### Step 3.2: Deploy to Production

```bash
# Deploy to production
vercel --prod

# Expected output:
# ✔ Production: https://coolswap.vercel.app [1m 23s]
```

**Save the production URL.**

#### Step 3.3: Verify Backend Deployment

Test the serverless function is live:

```bash
# Test endpoint (should fail gracefully with invalid input)
curl -X POST https://coolswap.vercel.app/api/sign-transaction \
  -H "Content-Type: application/json" \
  -d '{"transaction": "test"}'

# Expected: JSON error response (400 or 500)
# This confirms the endpoint is reachable
```

#### Step 3.4: Check Deployment Logs

```bash
# Stream logs in real-time
vercel logs --follow

# Or view specific deployment logs
vercel logs <deployment-url>
```

Look for:
- No startup errors
- Environment variables loaded correctly
- Function cold start time (< 3 seconds)

### Phase 4: End-to-End Testing

**Objective:** Verify complete transaction flow on production

#### Step 4.1: Small Amount Test (Mainnet)

**Test Case:** 0.1 USDC swap

1. Visit production URL: `https://coolswap.vercel.app`
2. Connect wallet (ensure it has SOL + USDC)
3. Select: 0.1 USDC (Solana) → USDC (Arbitrum)
4. Verify quote display:
   - Source amount: 0.1 USDC
   - Gas payment: ~0.012 USDC
   - Total from wallet: ~0.112 USDC
5. Click "Swap"
6. Check wallet prompt shows correct total
7. Approve transaction

**Expected Result:**
- Transaction succeeds
- User balance decreases by total amount
- Server wallet receives gas payment
- Destination tokens arrive on target chain

**Verify on Solana Explorer:**
- Search transaction signature
- Check Instruction 0: Token transfer (user → server)
- Check Instruction 1+: Relay swap instructions
- Both instructions: ✅ Success

#### Step 4.2: Check Server Wallet Balance

After test transaction:

```bash
solana balance <server-public-key>
```

**Expected:**
- Initial: 1 SOL
- After 1 tx: ~0.99999 SOL (paid ~0.00001 SOL fee)
- Server wallet should have received ~0.012 USDC (gas payment in tokens)

**Check token balance:**
```bash
spl-token balance <USDC-mint-address> --owner <server-public-key>
```

Expected: ~0.012 USDC (from gas payment)

#### Step 4.3: Monitor Function Metrics

In Vercel Dashboard:
1. Go to project → **Analytics** → **Functions**
2. Check `/api/sign-transaction`:
   - Invocation count: 1
   - Success rate: 100%
   - Avg duration: < 1s
   - Errors: 0

#### Step 4.4: Error Scenario Testing

**Test A - Insufficient Balance:**
1. Try swap with more than wallet balance
2. Expected: Error before transaction submission

**Test B - User Rejection:**
1. Initiate swap
2. Reject wallet prompt
3. Expected: "Transaction was rejected" error

**Test C - Expired Quote:**
1. Get quote
2. Wait 60+ seconds
3. Try to swap
4. Expected: Blockhash error or quote refresh

### Phase 5: Monitoring & Maintenance

**Objective:** Set up ongoing monitoring

#### Step 5.1: Set Up Alerts

**Vercel Alerts** (Dashboard → Settings → Notifications):
- Function errors > 5%
- Function duration > 5s
- Deployment failures

**Server Wallet Balance Alert:**

Create a simple monitoring script:

```bash
# scripts/check-wallet-balance.sh
#!/bin/bash
WALLET="<server-public-key>"
THRESHOLD=0.1  # Alert if < 0.1 SOL

BALANCE=$(solana balance $WALLET --url mainnet-beta | awk '{print $1}')

if (( $(echo "$BALANCE < $THRESHOLD" | bc -l) )); then
  echo "⚠️  WARNING: Server wallet balance low: $BALANCE SOL"
  # Send alert (email, Slack, etc.)
fi
```

Run daily via cron or GitHub Actions.

#### Step 5.2: Review Logs Regularly

```bash
# Check for errors daily
vercel logs --prod | grep ERROR

# Monitor invocation count
vercel logs --prod | grep "sign-transaction" | wc -l
```

#### Step 5.3: Refill Server Wallet

When balance < 0.5 SOL:
1. Send 1-2 SOL to server wallet
2. Continue monitoring

**Token accumulation:**
Server wallet will accumulate gas payment tokens (USDC, etc.). Periodically:
1. Withdraw accumulated tokens to treasury wallet
2. Keep server wallet with minimal funds (security)

### Phase 6: Production Hardening (Optional)

**Objective:** Enhance security and reliability

#### Step 6.1: Implement Rate Limiting

Add to `api/sign-transaction.ts`:

```javascript
// Track requests by IP
const requestCounts = new Map();
const RATE_LIMIT = 10; // requests per minute
const WINDOW = 60000; // 1 minute

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Check rate limit
  const now = Date.now();
  const requests = requestCounts.get(ip) || [];
  const recentRequests = requests.filter(t => now - t < WINDOW);

  if (recentRequests.length >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);

  // ... rest of handler
}
```

#### Step 6.2: Enhanced Transaction Validation

Add stricter validation in `api/sign-transaction.ts`:

```javascript
// Validate payment amount is reasonable
const MAX_GAS_PAYMENT_LAMPORTS = 100000; // ~0.0001 SOL
// Extract payment amount from Instruction 0
// Verify amount < MAX_GAS_PAYMENT_LAMPORTS * token_price

// Validate instruction types
// Ensure only expected program IDs (Token Program, Relay)
```

#### Step 6.3: Implement Request Signing (Future)

Add HMAC signature verification:
- Frontend signs requests with shared secret
- Backend verifies signature before processing
- Prevents unauthorized API usage

### Implementation Checklist

Use this checklist to track progress:

**Phase 1: Local Setup**
- [ ] Generate server wallet
- [ ] Configure `.env` file
- [ ] Fund devnet wallet
- [ ] Install Vercel CLI
- [ ] Create `.env.local`
- [ ] Test with `vercel dev`
- [ ] Verify frontend integration

**Phase 2: Vercel Setup**
- [ ] Login to Vercel
- [ ] Create project (first deploy)
- [ ] Configure environment variables (frontend)
- [ ] Configure environment variables (backend)
- [ ] Verify variables with `vercel env ls`

**Phase 3: Production Deploy**
- [ ] Fund mainnet wallet (1-5 SOL)
- [ ] Deploy with `vercel --prod`
- [ ] Verify backend endpoint
- [ ] Check deployment logs

**Phase 4: Testing**
- [ ] Small amount test (0.1 USDC)
- [ ] Verify transaction on explorer
- [ ] Check server wallet received tokens
- [ ] Monitor function metrics
- [ ] Test error scenarios

**Phase 5: Monitoring**
- [ ] Set up Vercel alerts
- [ ] Create balance monitoring script
- [ ] Schedule regular log reviews
- [ ] Plan token withdrawal process

**Phase 6: Hardening** (Optional)
- [ ] Implement rate limiting
- [ ] Add enhanced validation
- [ ] Consider request signing

### Troubleshooting Guide

Common issues during implementation:

| Issue | Cause | Solution |
|-------|-------|----------|
| "Server configuration error" | Missing `SERVER_WALLET_SECRET_KEY` | Add to Vercel environment variables |
| "Invalid fee payer" | Public key mismatch | Verify `VITE_SERVER_WALLET_PUBLIC_KEY` matches wallet |
| Function timeout | RPC slowness | Use premium RPC provider (Helius, QuickNode) |
| Transaction fails | Low server wallet SOL | Fund wallet with more SOL |
| CORS errors | Missing headers | Verify `vercel.json` has CORS headers |
| Build fails | Missing dependencies | Check `api/package.json` is deployed |

### Success Criteria

Implementation is complete when:
- ✅ Server wallet generated and funded
- ✅ Environment variables configured in Vercel
- ✅ Production deployment successful
- ✅ Backend endpoint responds correctly
- ✅ End-to-end swap completes successfully
- ✅ Transaction visible on Solana explorer
- ✅ Server wallet receives gas payment tokens
- ✅ Monitoring and alerts configured

---

## Backend Setup

### File Structure

```
coolswap/
├── api/                          # ← NEW: Serverless functions
│   ├── sign-transaction.ts       # Transaction signing endpoint
│   ├── package.json              # API dependencies
│   └── tsconfig.json             # TypeScript configuration
├── src/                          # Existing frontend
├── vercel.json                   # ← NEW: Vercel config
├── .vercelignore                 # ← NEW: Deployment exclusions
└── .env                          # Server wallet public key
```

### API Endpoint: `/api/sign-transaction`

**Purpose:** Partially sign transactions with server wallet

**Method:** POST

**Request:**
```json
{
  "transaction": "base64-encoded-transaction"
}
```

**Response:**
```json
{
  "signed_transaction": "base64-encoded-partially-signed-transaction"
}
```

**Implementation** (`api/sign-transaction.ts`):

```javascript
import { Keypair, VersionedTransaction } from '@solana/web3.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transaction } = req.body;

    // 1. Load server wallet from environment
    const secretKeyString = process.env.SERVER_WALLET_SECRET_KEY;
    if (!secretKeyString) {
      throw new Error('Server wallet not configured');
    }

    const secretKey = Uint8Array.from(Buffer.from(secretKeyString, 'base64'));
    const serverKeypair = Keypair.fromSecretKey(secretKey);

    // 2. Decode transaction
    const txBuffer = Buffer.from(transaction, 'base64');
    const tx = VersionedTransaction.deserialize(txBuffer);

    // 3. SECURITY: Validate transaction
    // TODO: Verify instruction 0 is payment to server
    // TODO: Check payment amount is reasonable
    // TODO: Ensure no malicious instructions

    // 4. Partially sign (server signs as fee payer)
    tx.sign([serverKeypair]);

    // 5. Return signed transaction
    const signedTx = tx.serialize();
    const signedBase64 = Buffer.from(signedTx).toString('base64');

    res.json({ signed_transaction: signedBase64 });
  } catch (error) {
    console.error('Signing error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### Dependencies (`api/package.json`):

```json
{
  "dependencies": {
    "@solana/web3.js": "^1.95.8"
  }
}
```

### Vercel Configuration (`vercel.json`):

```json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "@vercel/node@3.0.0"
    }
  }
}
```

---

## Security Model

### Threat Model

**Primary Risk:** Server wallet private key exposure

**Mitigation:**
1. Private key stored in Vercel environment variables (encrypted at rest)
2. Never exposed to frontend
3. Signing happens server-side only
4. Rate limiting on API endpoint

**Secondary Risk:** Malicious transaction modification

**Mitigation:**
1. Validate Instruction 0 is payment to server's wallet
2. Check payment amount matches expected gas cost (within buffer)
3. Verify no suspicious instructions (e.g., closeAccount, setAuthority)
4. Reject if fee payer is not server wallet

### Validation Checklist

Before signing, verify:

- [ ] Transaction has at least 2 instructions
- [ ] Instruction 0 is SPL token transfer
- [ ] Transfer destination is server's ATA
- [ ] Transfer amount is within expected range (0.0001 - 1.0 source token)
- [ ] Fee payer is server wallet address
- [ ] No closeAccount or setAuthority instructions
- [ ] Transaction size is reasonable (< 1232 bytes)

### Environment Variables

**Frontend** (`.env`):
```bash
VITE_SERVER_WALLET_PUBLIC_KEY=<server-public-key>
```

**Backend** (Vercel Dashboard):
```bash
SERVER_WALLET_SECRET_KEY=<base64-encoded-secret-key>
```

**Generate secret key**:
```bash
# Create wallet
solana-keygen new --outfile server-wallet.json --no-bip39-passphrase

# Get public key (for .env)
solana-keygen pubkey server-wallet.json

# Get base64 secret (for Vercel env vars)
node -e "console.log(Buffer.from(JSON.parse(require('fs').readFileSync('server-wallet.json'))).toString('base64'))"
```

### Rate Limiting

Recommended limits:
- **Per IP**: 10 requests/minute
- **Global**: 1000 requests/minute
- **Burst**: 20 requests

Implement via Vercel Edge Config or external service (e.g., Upstash Redis).

---

## Deployment Guide

### Prerequisites

1. Node.js 18+
2. Vercel CLI (`npm i -g vercel`)
3. Server wallet generated
4. Vercel account

### Step-by-Step Deployment

**1. Generate Server Wallet**
```bash
# Generate keypair
solana-keygen new --outfile server-wallet.json --no-bip39-passphrase

# Get public key
PUBLIC_KEY=$(solana-keygen pubkey server-wallet.json)
echo "Public key: $PUBLIC_KEY"

# Get base64 secret key
SECRET_KEY_B64=$(node -e "console.log(Buffer.from(JSON.parse(require('fs').readFileSync('server-wallet.json'))).toString('base64'))")
echo "Secret key (base64): $SECRET_KEY_B64"

# IMPORTANT: Add server-wallet.json to .gitignore!
echo "server-wallet.json" >> .gitignore
```

**2. Fund Server Wallet**
```bash
# For devnet (testing)
solana airdrop 2 $PUBLIC_KEY --url devnet

# For mainnet (production)
# Send SOL manually to server wallet address
```

**3. Update Frontend Environment**
```bash
# Edit .env
echo "VITE_SERVER_WALLET_PUBLIC_KEY=$PUBLIC_KEY" >> .env
```

**4. Deploy to Vercel**
```bash
# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Follow prompts:
# - Project name: coolswap
# - Framework: Vite
# - Root directory: ./
```

**5. Set Backend Environment Variables**

In Vercel Dashboard:
1. Go to Project → Settings → Environment Variables
2. Add variable:
   - Name: `SERVER_WALLET_SECRET_KEY`
   - Value: `<paste-base64-secret-key>`
   - Environments: Production, Preview, Development
3. Save

**6. Redeploy**
```bash
# Trigger redeploy to pick up env vars
vercel --prod
```

**7. Verify Deployment**
```bash
# Test API endpoint
curl -X POST https://your-app.vercel.app/api/sign-transaction \
  -H "Content-Type: application/json" \
  -d '{"transaction":"invalid-for-testing"}'

# Should return error (but proves endpoint is live)
```

### Production Checklist

Before going live:

- [ ] Server wallet funded with sufficient SOL (0.1+ SOL)
- [ ] Environment variables set in Vercel
- [ ] Rate limiting configured
- [ ] Transaction validation implemented
- [ ] Error monitoring set up (Sentry, LogRocket, etc.)
- [ ] Tested on devnet with real swaps
- [ ] Security audit completed
- [ ] Backup of server wallet (encrypted, offline storage)

---

## Testing & Verification

### Local Development

**1. Start Local Serverless**
```bash
# Install Vercel CLI
npm i -g vercel

# Run dev server (includes API functions)
vercel dev
```

**2. Test Frontend → Backend**
```bash
# Frontend runs at http://localhost:3000
# API available at http://localhost:3000/api/sign-transaction
```

### Devnet Testing

**1. Switch to Devnet**
```bash
# Update .env
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

**2. Get Devnet USDC**
```bash
# Airdrop SOL
solana airdrop 2 <your-wallet> --url devnet

# Get devnet USDC (use faucet or DEX)
```

**3. Test Complete Flow**
1. Load app in browser
2. Connect wallet (devnet mode)
3. Select USDC → Arbitrum swap
4. Verify quote shows correct total (swap + gas)
5. Click "Swap"
6. Sign transaction in wallet
7. Verify transaction succeeds on Solana Explorer
8. Check both instructions executed:
   - Instruction 0: Token transfer (user → server)
   - Instruction 1+: Relay swap

### Verification Checklist

After each swap:

- [ ] Transaction appears on Solana Explorer
- [ ] Instruction 0 is token transfer to server
- [ ] Server wallet received payment
- [ ] Relay swap completed successfully
- [ ] User received destination tokens
- [ ] UI shows correct total withdrawal amount
- [ ] No errors in browser console
- [ ] Server logs show successful signing

---

## Troubleshooting

### Common Issues

**Issue:** "Invalid value for base 58" error

**Cause:** Placeholder value still in `.env`

**Fix:**
```bash
# Replace placeholder with actual public key
VITE_SERVER_WALLET_PUBLIC_KEY=<actual-key-here>
```

---

**Issue:** "Server wallet not configured" error

**Cause:** Backend environment variable not set

**Fix:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add `SERVER_WALLET_SECRET_KEY` with base64 secret
3. Redeploy: `vercel --prod`

---

**Issue:** "Insufficient funds for transaction" error

**Cause:** Server wallet has no SOL

**Fix:**
```bash
# Check balance
solana balance <server-public-key>

# Fund wallet
solana transfer <server-public-key> 0.1 --url mainnet-beta
```

---

**Issue:** Transaction fails with "blockhash not found"

**Cause:** Quote expired (> 30 seconds old)

**Fix:** Request new quote, transaction building happens too slowly

---

**Issue:** "Account state conflict" error still occurs

**Cause:** Payment instruction is not Instruction 0

**Fix:** Verify in code that `allInstructions = [paymentInstruction, ...relayInstructions]`

---

### Debug Mode

Enable verbose logging:

**Frontend** (`src/hooks/useRelaySwapExecution.ts`):
```typescript
console.log('Transaction built:', {
  instructionCount: allInstructions.length,
  instruction0Type: 'payment',
  feePayer: serverAddress,
  totalAmount: tokenAmount,
});
```

**Backend** (`api/sign-transaction.ts`):
```typescript
console.log('Signing request received:', {
  txSize: txBuffer.length,
  timestamp: new Date().toISOString(),
});
```

View logs:
```bash
# Vercel logs (live tail)
vercel logs --follow

# Or in Vercel Dashboard → Deployments → Logs
```

---

## Future Improvements

### Phase 1 (Current)
- ✅ Basic transaction signing
- ✅ Instruction 0 Rule implementation
- ✅ Pyth price integration
- ✅ Vercel deployment

### Phase 2 (Next)
- [ ] Transaction validation (security checks)
- [ ] Rate limiting implementation
- [ ] Error monitoring (Sentry integration)
- [ ] Analytics (successful swap tracking)

### Phase 3 (Future)
- [ ] Multi-token support expansion (35+ tokens)
- [ ] Optimize gas calculation (reduce buffer to 5%)
- [ ] Implement payment retry logic
- [ ] Add webhook for payment failures
- [ ] Server wallet auto-replenishment

### Phase 4 (Advanced)
- [ ] Multi-server wallet rotation (load balancing)
- [ ] MEV protection via Jito bundles
- [ ] Priority fee optimization
- [ ] Cross-region deployment (latency reduction)

---

## References

### Documentation
- **Relay API**: https://docs.relay.link/
- **Pyth Network**: https://docs.pyth.network/
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
- **Vercel Functions**: https://vercel.com/docs/functions

### Code References
- **Frontend Hook**: `src/hooks/useRelaySwapExecution.ts`
- **Price Service**: `src/services/price/PriceService.ts`
- **Transaction Builder**: `src/services/solana/buildRelayTransaction.ts`
- **Backend Endpoint**: `api/sign-transaction.ts`

### Architecture Decisions
- **ADR-001**: Instruction 0 Rule (payment first)
- **ADR-002**: Pyth over Jupiter for price oracle (no auth required)
- **ADR-003**: Vercel Serverless over standalone Express (simpler, cheaper)
- **ADR-004**: Server wallet over Kora (direct control, no simulation issues)

---

## Changelog

### 2026-02-01
- Initial document created
- Instruction 0 Rule documented
- Vercel deployment guide added
- Security model defined

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [Implementation Plan](/Users/johnwarmann/.claude/plans/gleaming-soaring-eich.md)
3. Open issue in repository
