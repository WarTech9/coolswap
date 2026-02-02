# CoolSwap Serverless API

Vercel serverless functions for CoolSwap backend operations.

## Overview

This directory contains Vercel serverless functions that handle backend operations requiring secure key management, specifically transaction signing for Relay swaps with gas sponsorship.

## Architecture

```
Frontend (Browser)
    ↓
    | 1. Build transaction with payment instruction
    ↓
API: /api/sign-transaction (Vercel Serverless)
    ↓
    | 2. Validate transaction
    | 3. Partially sign with server wallet
    ↓
Frontend (Browser)
    ↓
    | 4. User signs transaction
    | 5. Submit to Solana RPC
    ↓
Solana Network
```

## Endpoints

### POST /api/sign-transaction

Partially signs a transaction with the server wallet.

**Request**:
```json
{
  "transaction": "base64-encoded-transaction"
}
```

**Response** (Success):
```json
{
  "signed_transaction": "base64-encoded-partially-signed-transaction"
}
```

**Response** (Error):
```json
{
  "error": "Error message",
  "message": "Detailed error message"
}
```

**Validation Checks**:
1. Fee payer is server wallet
2. Instruction 0 involves server wallet (payment instruction)
3. Reasonable instruction count (< 10)
4. Valid transaction format

## Environment Variables

| Variable | Purpose | Where to Set |
|----------|---------|--------------|
| `SERVER_WALLET_SECRET_KEY` | Server wallet private key (JSON array) | Vercel Dashboard |

**Security**: NEVER commit or expose `SERVER_WALLET_SECRET_KEY`.

## Deployment

Vercel automatically deploys functions in the `api/` directory as serverless endpoints.

### Local Development

```bash
# Run Vercel dev server
vercel dev

# API available at:
# http://localhost:3000/api/sign-transaction
```

### Production Deployment

```bash
# Deploy to production
vercel --prod

# API available at:
# https://your-app.vercel.app/api/sign-transaction
```

## Security Model

### Instruction 0 Rule

The server validates that **Instruction 0** is a payment instruction to the server wallet. This ensures:

1. **Payment First**: User pays gas sponsorship fee before Relay executes
2. **No State Conflicts**: Payment executes before Relay modifies account state
3. **Atomic Guarantee**: Both instructions succeed or both fail

### Transaction Validation

Before signing, the server checks:
- ✅ Server wallet is the fee payer
- ✅ Instruction 0 involves server wallet (payment)
- ✅ Instruction count is reasonable (< 10)
- ✅ Transaction is well-formed

### Signing Flow

1. **Server signs FIRST**: Adds partial signature
2. **User signs SECOND**: Completes transaction
3. **Submit to Solana**: Fully signed transaction

This prevents the server from executing transactions without user approval.

## Error Handling

| Error Code | Reason | User Action |
|------------|--------|-------------|
| 400 | Invalid transaction format | Refresh quote and retry |
| 400 | Invalid fee payer | Check configuration |
| 400 | Invalid payment instruction | Contact support |
| 500 | Server configuration error | Verify environment variables |
| 500 | Transaction signing failed | Retry or contact support |

## Monitoring

### Vercel Dashboard

View function logs, invocations, and errors:
1. Go to Vercel Dashboard
2. Select your project
3. Navigate to **Deployments** → **Functions**
4. Click on `sign-transaction` to view logs

### Key Metrics

Monitor these metrics:
- **Invocation count**: Total requests
- **Error rate**: Failed validations/signings
- **Execution time**: Function duration (should be < 1s)
- **Server wallet balance**: Ensure sufficient SOL

## Rate Limiting

**Current**: No rate limiting (MVP)

**Recommended for Production**:
- Implement rate limiting per IP address
- Add request authentication/signatures
- Monitor for abuse patterns

Example with Vercel Edge Middleware:
```javascript
// middleware.js
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request) {
  const { success } = await ratelimit.limit(request.ip);
  if (!success) return new Response('Too Many Requests', { status: 429 });
  return next();
}
```

## Troubleshooting

### "Server configuration error"

**Cause**: `SERVER_WALLET_SECRET_KEY` not set or invalid

**Fix**:
1. Generate wallet: `node scripts/generate-server-wallet.js`
2. Copy secret key array to Vercel environment variables
3. Redeploy

### "Invalid fee payer"

**Cause**: Transaction fee payer doesn't match server wallet

**Fix**:
1. Verify `VITE_SERVER_WALLET_PUBLIC_KEY` in frontend .env
2. Ensure it matches wallet generated in step 1
3. Rebuild and redeploy frontend

### "Transaction signing failed"

**Cause**: Server wallet has insufficient SOL

**Fix**:
1. Check wallet balance: `solana balance <public-key>`
2. Fund wallet with SOL
3. Retry transaction


## Resources

- [Gas Sponsorship Architecture](../docs/coolswap-gas-sponsor-server.md) - Comprehensive documentation of server wallet implementation
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Relay API Documentation](https://docs.relay.link/)
