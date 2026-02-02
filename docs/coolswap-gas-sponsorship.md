# CoolSwap Gas Sponsorship: Server Wallet Implementation

## Overview

CoolSwap enables gasless cross-chain swaps where users can swap SPL tokens from Solana to EVM chains **without holding SOL**. A server-controlled wallet pays the Solana transaction fees and receives token-based reimbursement from the user in a single atomic transaction.

**Key Benefits:**
- Users don't need SOL in their wallet
- Swap any supported SPL token cross-chain immediately
- Server is economically protected (never loses money)
- Simple, auditable architecture

**Tech Stack:**
- Relay API for cross-chain swaps
- Pyth Network for real-time price conversion
- Vercel serverless backend for transaction signing
- @solana/web3.js for transaction construction

---

## Architecture

```
┌─────────────────┐
│   User Wallet   │
│  (SPL tokens,   │
│    no SOL)      │
└────────┬────────┘
         │ 1. Signs transaction
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                        │
│  • Gets Relay quote (includes gasSolLamports)               │
│  • Converts gas cost to token amount (Pyth API)             │
│  • Builds payment instruction: user → server                │
│  • Constructs transaction: [ComputeBudget, Payment, Relay]  │
└────────┬────────────────────────────────────────────────────┘
         │ 2. POST transaction
         ▼
┌─────────────────────────────────────────────────────────────┐
│          Backend: /api/sign-transaction (Vercel)            │
│  • Validates fee payer is server wallet                     │
│  • Validates instruction count < 10                         │
│  • Partially signs with server wallet (first signature)     │
└────────┬────────────────────────────────────────────────────┘
         │ 3. Returns partially-signed tx
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                        │
│  • User signs partially-signed tx (second signature)        │
│  • Submits fully-signed tx to Solana RPC                    │
└────────┬────────────────────────────────────────────────────┘
         │ 4. Transaction
         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Solana Network                           │
│  Instruction 0: User pays server in tokens (gas payment)    │
│  Instruction 1+: Relay executes cross-chain swap            │
│  Result: Atomic success or atomic failure                   │
└──────────────────────────────────────────────────────────────┘
```

**Components:**
- **Frontend**: React app with @solana/web3-compat
- **Backend**: Vercel serverless function (`api/sign-transaction.ts`)
- **Server Wallet**: Keypair stored securely in Vercel environment
- **Pyth API**: Real-time SOL/token price feeds (public, no auth)
- **Relay API**: Cross-chain swap quotes and transaction building

---

## Transaction Flow

### Step-by-Step Execution

**File: [src/hooks/useRelaySwapExecution.ts](../src/hooks/useRelaySwapExecution.ts)**

#### 1. Extract Gas Cost from Relay Quote
```typescript
// Line 168-175
if (!quote.fees?.gasSolLamports) {
  throw new Error('Gas cost not available in Relay quote');
}
const gasLamports = BigInt(quote.fees.gasSolLamports);
```
Relay provides the estimated Solana transaction fee in lamports.

#### 2. Convert Lamports to Token Amount
```typescript
// Line 184-188
const tokenAmount = await convertLamportsToToken(
  gasLamports,
  sourceTokenAddress,
  sourceTokenDecimals
);
```
Uses Pyth API to convert SOL → USD → token with 10% buffer (see Gas Payment Economics).

#### 3. Build Payment Instruction
```typescript
// Line 222-227
const paymentInstruction = getTransferInstruction({
  source: sourceTokenAccount,        // User's ATA
  destination: destinationTokenAccount, // Server's ATA
  authority: createNoopSigner(userAddress),
  amount: tokenAmount,
});
```
Creates a token transfer from user to server for gas reimbursement.

#### 4. Construct Transaction with Payment First
```typescript
// Line 257-262
const computeBudgetIx = getSetComputeUnitLimitInstruction({ units: 60_000 });
const allInstructions = [computeBudgetIx, paymentInstruction, ...otherRelayIx];
```
**Critical: Payment is Instruction 0** (after ComputeBudget). This ensures payment executes before Relay modifies account state.

#### 5. Set Server Wallet as Fee Payer
```typescript
// Line 272-275
const messageWithFeePayer = setTransactionMessageFeePayer(
  serverAddress,  // Server pays SOL fees
  baseMessage
);
```

#### 6. Server Signs First (Partial Signature)
```typescript
// Line 356-367
const response = await fetch('/api/sign-transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transaction: txBase64 }),
});
const { signed_transaction: serverSignedBase64 } = await response.json();
```
Backend validates and adds server wallet's signature.

#### 7. User Signs Second (Completes Transaction)
```typescript
// Line 380-382
const userSignedTx = await wallet.signTransaction(serverSignedTx);
```
User authorizes the payment and swap.

#### 8. Submit to Solana RPC
```typescript
// Line 398
const signature = await solanaClient.sendTransaction(signedBytesArray);
```
Fully-signed transaction is broadcast to Solana network.

---

## Gas Payment Economics

### How Server Gets Reimbursed

**File: [src/services/price/PriceService.ts](../src/services/price/PriceService.ts)**

#### Price Conversion Formula

```typescript
// Line 100-115
const solAmount = Number(lamports) / 1e9;
const usdValue = solAmount * solPrice;        // SOL → USD
const tokenAmount = usdValue / tokenPrice;    // USD → Token
const rawAmount = Math.ceil(tokenAmount * 1.1 * Math.pow(10, tokenDecimals));
```

**Steps:**
1. Convert lamports to SOL (divide by 1e9)
2. Get real-time prices from Pyth:
   - SOL/USD price
   - Token/USD price
3. Convert: SOL → USD → Token
4. **Add 10% buffer** to account for price fluctuations
5. Convert to raw token units (multiply by 10^decimals)

#### 10% Buffer Rationale

The 10% buffer protects against:
- Price volatility between quote time and execution time
- Pyth oracle update delays
- Slippage in price feeds

**Result**: Server receives slightly more token value than gas cost, ensuring profitability.

#### Example Calculation

**Scenario**: User swaps USDC to Arbitrum, server pays Solana gas fees

```
Gas cost:         50,000 lamports (from Relay quote)
                  = 0.00005 SOL

Pyth Prices:
  SOL/USD:        $180
  USDC/USD:       $1.00

Conversion:
  SOL amount:     0.00005 SOL
  USD value:      0.00005 * $180 = $0.009
  Token amount:   $0.009 / $1.00 = 0.009 USDC

10% Buffer:
  Final amount:   0.009 * 1.1 = 0.0099 USDC

Raw units (6 decimals):
  Payment:        9,900 (0.0099 USDC)

Outcome:
  User pays:      0.0099 USDC
  Server receives: 0.0099 USDC
  Server pays:     $0.009 SOL
  Server profit:   $0.0009 (~10% margin)
```

### Economic Invariants

| Invariant | Enforcement |
|-----------|-------------|
| **Server never loses money** | 10% buffer guarantees profit margin |
| **Payment executes first** | Instruction 0 Rule (payment before Relay) |
| **Atomic transaction** | All instructions succeed or all fail |
| **No partial execution** | If payment fails, swap doesn't execute |
| **Price accuracy** | Pyth provides real-time prices (updated every 400ms) |

---

## Security Model

### Instruction 0 Rule: Payment Executes First

**Why this matters:**

Solana executes instructions sequentially. By placing the payment instruction first, we ensure:

1. **Payment completes before Relay swap** - Server receives tokens before Relay modifies user's account state
2. **No state conflicts** - Payment reads user's token balance before Relay reduces it
3. **Atomic guarantee** - If payment fails (insufficient balance), entire transaction fails

**Transaction structure:**
```
Instruction 0: SetComputeUnitLimit (60k units)
Instruction 1: Transfer (user → server, gas payment)   ← PAYMENT FIRST
Instruction 2+: Relay swap instructions
```

### Backend Validation

**File: [api/sign-transaction.ts](../api/sign-transaction.ts)**

Before signing, the backend validates:

```javascript
// Line 85-95: Fee payer validation
const feePayer = txObj.message.staticAccountKeys[0];
if (!feePayer.equals(serverAddress)) {
  return res.status(400).json({ error: 'Invalid fee payer' });
}

// Line 98-107: Instruction count validation
if (instructions.length > 10) {
  return res.status(400).json({ error: 'Transaction has too many instructions' });
}
```

**Validations:**
- Fee payer is server wallet (prevents unauthorized fee usage)
- Instruction count < 10 (prevents compute budget abuse)
- Transaction is well-formed (deserializes correctly)

### Two-Signature Flow

**Server signs first** → **User signs second**

This order prevents:
- ❌ **User frontrunning**: User can't modify transaction after server signs
- ❌ **Server abuse**: Server can't execute without user approval
- ✅ **Mutual consent**: Both parties must sign for transaction to execute

**Why not reverse order?**
If user signed first, server could theoretically modify the transaction before signing. Current order ensures server commits to exact transaction user will approve.

---

## Setup & Configuration

### Environment Variables

**Frontend (.env):**
```bash
# Server wallet public key (fee payer)
VITE_SERVER_WALLET_PUBLIC_KEY=7yEwitQFvHh7BcMw1LADAAxWQbnSuq23fipxogzzSQoo

# Relay API
VITE_RELAY_API_URL=https://api.relay.link
VITE_RELAY_API_KEY=your-relay-api-key

# Solana RPC
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Backend URL (optional, defaults to relative path)
VITE_BACKEND_URL=http://localhost:3001  # Local dev only
```

**Backend (Vercel Environment Variables):**
```bash
# Server wallet private key (JSON array format)
SERVER_WALLET_SECRET_KEY=[123,45,67,...]  # NEVER commit this

# CORS allowed origins (comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://coolswap.vercel.app
```

### Server Wallet Setup

#### 1. Generate Wallet
```bash
solana-keygen new --outfile server-wallet.json
```

#### 2. Extract Keys
```bash
# Public key
solana-keygen pubkey server-wallet.json

# Secret key (for Vercel env)
cat server-wallet.json
```

#### 3. Fund Wallet
```bash
solana transfer <public-key> 1.0  # 1 SOL = ~100k transactions
```

#### 4. Create ATAs for Common Tokens

Server wallet needs Associated Token Accounts (ATAs) for tokens it will receive as payment.

**File: [api/create-server-ata.ts](../api/create-server-ata.ts)**

```bash
# Create ATA for USDC
tsx api/create-server-ata.ts EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Create ATA for USDT
tsx api/create-server-ata.ts Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB

# Create ATA for SOL
tsx api/create-server-ata.ts So11111111111111111111111111111111111111112
```

**Important**: ATAs must exist before first transaction using that token. Run this for all tokens you support.

### Deployment

#### Local Development
```bash
# Terminal 1: Run backend
cd api && pnpm dev

# Terminal 2: Run frontend
pnpm dev

# Backend available at: http://localhost:3001/api/sign-transaction
# Frontend available at: http://localhost:3000
```

#### Production (Vercel)
```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel Dashboard:
# 1. Go to Project Settings → Environment Variables
# 2. Add SERVER_WALLET_SECRET_KEY (paste JSON array)
# 3. Add CORS_ALLOWED_ORIGINS (your frontend URL)

# API automatically available at:
# https://your-app.vercel.app/api/sign-transaction
```

---

## Code References

### Critical Files

| File | Purpose | Key Lines |
|------|---------|-----------|
| [src/hooks/useRelaySwapExecution.ts](../src/hooks/useRelaySwapExecution.ts) | Frontend transaction execution | 168-175 (gas cost)<br>184-188 (price conversion)<br>222-227 (payment instruction)<br>262 (instruction order)<br>356-367 (server signing)<br>380-382 (user signing) |
| [api/sign-transaction.ts](../api/sign-transaction.ts) | Backend transaction validation and signing | 85-95 (fee payer validation)<br>98-107 (instruction count validation)<br>110-111 (partial signing) |
| [src/services/price/PriceService.ts](../src/services/price/PriceService.ts) | Pyth price conversion | 61-117 (conversion logic)<br>115 (10% buffer)<br>13-41 (supported tokens) |
| [api/create-server-ata.ts](../api/create-server-ata.ts) | Server wallet ATA setup | 27-83 (ATA creation) |
| [src/config/env.ts](../src/config/env.ts) | Environment configuration | 58 (SERVER_WALLET_PUBLIC_KEY) |

### Key Functions

**convertLamportsToToken** ([PriceService.ts:61-117](../src/services/price/PriceService.ts))
- Fetches SOL and token prices from Pyth
- Converts lamports → SOL → USD → token
- Adds 10% buffer
- Returns raw token amount

**getTransferInstruction** ([useRelaySwapExecution.ts:222](../src/hooks/useRelaySwapExecution.ts))
- Creates SPL token transfer instruction
- Source: User's ATA
- Destination: Server's ATA
- Amount: Gas cost in tokens (with buffer)

**handler** ([sign-transaction.ts:16-133](../api/sign-transaction.ts))
- Validates transaction structure
- Checks fee payer is server wallet
- Partially signs with server keypair
- Returns signed transaction

---

## Verification & Testing

### Local Testing

1. **Start Backend**:
```bash
cd api && pnpm dev
```
Expected output:
```
✅ API Server running on http://localhost:3001
📍 Endpoint: http://localhost:3001/api/sign-transaction
```

2. **Start Frontend**:
```bash
pnpm dev
```

3. **Test Transaction**:
- Connect wallet with SPL tokens (e.g., USDC) but minimal/no SOL
- Select source token → destination chain
- Enter amount and get quote
- Click "Swap"
- Wallet prompts for signature (user doesn't pay SOL fees)
- Check console for transaction flow

### Expected Console Output

```
=== GAS PAYMENT CALCULATION ===
Gas cost (lamports): 50000
Gas cost (SOL): 0.00005
Source token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
Token decimals: 6
Payment amount (raw): 9900
Payment amount (token): 0.0099
===============================

=== TRANSACTION DEBUG ===
Total instructions: 4
- Payment instruction (amount: 9900)
- Relay instructions: 2
Fee payer: 7yEwitQFvHh7BcMw1LADAAxWQbnSuq23fipxogzzSQoo
========================

=== SIMULATING TRANSACTION ===
✓ Simulation succeeded
==============================

=== BACKEND: Received Transaction ===
Instructions: 4
Fee payer: 7yEwitQFvHh7BcMw1LADAAxWQbnSuq23fipxogzzSQoo
=====================================

Transaction confirmed: <signature>
```

### Verification Checklist

- [ ] User has SPL tokens but no/minimal SOL
- [ ] Quote displays estimated gas cost in USD
- [ ] User signs transaction (no SOL fee prompt)
- [ ] Transaction includes payment instruction first
- [ ] Server wallet balance decreases by ~0.00005 SOL
- [ ] Server wallet receives token payment
- [ ] User receives tokens on destination chain
- [ ] Solscan shows all instructions executed successfully

---

## Supported Tokens

**Tokens with Pyth price feeds** ([PriceService.ts:13-41](../src/services/price/PriceService.ts)):

**Stablecoins:**
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- EURC: `HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr`

**Liquid Staking Tokens:**
- JitoSOL: `J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn`
- mSOL: `mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So`
- JupSOL: `jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v`

**Wrapped BTC/ETH:**
- cbBTC: `cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij`
- WBTC: `3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh`
- WETH: `7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs`

**DeFi Tokens:**
- JUP: `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`
- RAY: `4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R`

**Note**: Only tokens with Pyth price feeds can be used for gas payment. To add support for new tokens, add their price feed ID to `PRICE_FEED_IDS` in PriceService.ts.

---

## Troubleshooting

### "Price feed not available for token"

**Cause**: Token doesn't have a Pyth price feed configured.

**Fix**: Add the token's Pyth price feed ID to `PRICE_FEED_IDS` in [PriceService.ts](../src/services/price/PriceService.ts).

### "Server signing failed"

**Cause**: Backend can't access `SERVER_WALLET_SECRET_KEY`.

**Fix**:
1. Verify environment variable is set in Vercel dashboard
2. Ensure it's a valid JSON array format
3. Redeploy backend

### "Invalid fee payer"

**Cause**: Frontend has wrong `VITE_SERVER_WALLET_PUBLIC_KEY`.

**Fix**:
1. Verify public key matches server wallet
2. Update `.env` file
3. Rebuild frontend

### Transaction simulation fails

**Cause**: Server wallet's ATA doesn't exist for payment token.

**Fix**: Run `tsx api/create-server-ata.ts <token-mint>` to create ATA.

---

## Future Enhancements

**Out of scope for current implementation:**

1. **Rate Limiting**: Add per-IP rate limiting to prevent abuse
2. **Request Authentication**: Implement signed requests from frontend
3. **Dynamic Margin**: Adjust buffer based on token volatility
4. **Monitoring Dashboard**: Track server wallet balance, payment volumes
5. **Automatic ATA Creation**: Create server ATAs on-demand
6. **Multi-Server Setup**: Load balance across multiple server wallets
7. **Gas Price Oracle**: Use multiple price sources (Pyth + Jupiter)

---

## Resources

- [Relay API Documentation](https://docs.relay.link/)
- [Pyth Network Price Feeds](https://pyth.network/developers/price-feed-ids)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [CoolSwap API Backend README](../api/README.md)
