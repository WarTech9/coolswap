# Gas Sponsorship Architecture

## Overview

This document describes the architecture for implementing gas sponsorship in CoolSwap, where a server-side sponsor wallet pays all Solana-side costs (network fees + transaction fees) and recoups those costs through an affiliate fee charged in the user's input token.

### Goals

- User pays only in the input token (no SOL required)
- Sponsor wallet covers all Solana network costs
- Sponsor recoups costs via affiliate fee (never has net loss)
- Transparent fee display to users

## Fee Structure

### Current (No Sponsorship)

```
User pays:
├── Input Token: 100 USDC + 1.29 USDC (operating expenses)
└── SOL: 0.015 SOL (network fee) + ~0.000005 SOL (tx fee)
```

### With Sponsorship

```
User pays (input token only):
└── Input Token: 100 USDC + 1.29 USDC (operating) + 0.30 USDC (sponsor fee)

Sponsor pays:
└── SOL: 0.015 SOL (network fee) + ~0.000005 SOL (tx fee)

Sponsor receives:
└── 0.30 USDC (affiliate fee) ≈ 0.015 SOL equivalent
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   Wallet    │    │   Quote     │    │   Swap      │                 │
│  │   Context   │    │   Display   │    │   Form      │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│         │                  │                  │                         │
│         └──────────────────┼──────────────────┘                         │
│                            │                                            │
│                    ┌───────▼───────┐                                    │
│                    │  useSponsored │                                    │
│                    │     Swap      │                                    │
│                    └───────┬───────┘                                    │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVICE                                  │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │  /api/quote     │    │  /api/prepare   │    │  /api/submit    │     │
│  │                 │    │                 │    │                 │     │
│  │ - Fetch deBridge│    │ - Modify tx     │    │ - Add sponsor   │     │
│  │ - Calculate     │    │ - Set sponsor   │    │   signature     │     │
│  │   sponsor fee   │    │   as fee payer  │    │ - Submit to     │     │
│  │ - Return quote  │    │ - Return partial│    │   Solana        │     │
│  │   + fee info    │    │   tx for user   │    │ - Return txHash │     │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘     │
│           │                      │                      │               │
│           └──────────────────────┼──────────────────────┘               │
│                                  │                                      │
│                          ┌───────▼───────┐                              │
│                          │    Sponsor    │                              │
│                          │    Wallet     │                              │
│                          │   Service     │                              │
│                          └───────┬───────┘                              │
│                                  │                                      │
│  ┌───────────────┐       ┌──────▼──────┐       ┌───────────────┐       │
│  │  Price Oracle │       │   Sponsor   │       │   Jupiter     │       │
│  │  (SOL/USD)    │       │   Keypair   │       │  Referral Key │       │
│  └───────────────┘       │   (HSM/KMS) │       └───────────────┘       │
│                          └─────────────┘                                │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ RPC
                                  ▼
                    ┌─────────────────────────┐
                    │      Solana Network     │
                    └─────────────────────────┘
```

## API Endpoints

### POST /api/quote

Fetches a quote with sponsor fee calculated.

**Request:**
```typescript
interface QuoteRequest {
  sourceToken: string;        // Token mint address
  destinationChain: string;   // e.g., "arbitrum"
  destinationToken: string;   // Destination token address
  amount: string;             // Human-readable amount (e.g., "100")
  senderAddress: string;      // User's Solana wallet
  recipientAddress: string;   // User's EVM address
  slippage?: number;          // Default 0.005 (0.5%)
}
```

**Response:**
```typescript
interface QuoteResponse {
  quote: {
    id: string;
    sourceAmount: string;           // Total from wallet (including all fees)
    destinationAmount: string;      // Amount user receives
    fees: {
      operatingExpenses: string;    // deBridge operating expenses
      sponsorFee: string;           // Fee to reimburse sponsor (in input token)
      sponsorFeeSol: string;        // Equivalent SOL amount sponsor pays
    };
    estimatedTimeSeconds: number;
    expiresAt: string;              // ISO timestamp
  };
  sponsorAddress: string;           // Sponsor's Solana address (for verification)
}
```

### POST /api/prepare

Prepares a transaction with sponsor as fee payer.

**Request:**
```typescript
interface PrepareRequest {
  quoteId: string;            // Quote ID from /api/quote
  senderAddress: string;      // User's Solana wallet
}
```

**Response:**
```typescript
interface PrepareResponse {
  transaction: string;        // Base64-encoded partially-signed transaction
  message: string;            // Message for user to sign
  blockhash: string;          // Recent blockhash used
  expiresAt: string;          // When this prepared tx expires
}
```

### POST /api/submit

Submits the fully-signed transaction.

**Request:**
```typescript
interface SubmitRequest {
  quoteId: string;
  transaction: string;        // Base64-encoded transaction with user signature
  userSignature: string;      // User's signature
}
```

**Response:**
```typescript
interface SubmitResponse {
  success: boolean;
  txHash?: string;            // Solana transaction signature
  orderId?: string;           // deBridge order ID
  error?: string;
}
```

## Transaction Flow

```
┌──────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│  User    │          │ Frontend │          │ Backend  │          │  Solana  │
└────┬─────┘          └────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │                     │
     │  1. Fill swap form  │                     │                     │
     │────────────────────>│                     │                     │
     │                     │                     │                     │
     │                     │  2. POST /api/quote │                     │
     │                     │────────────────────>│                     │
     │                     │                     │                     │
     │                     │                     │  3. Fetch deBridge  │
     │                     │                     │     quote + calc    │
     │                     │                     │     sponsor fee     │
     │                     │                     │                     │
     │                     │  4. Return quote    │                     │
     │                     │<────────────────────│                     │
     │                     │                     │                     │
     │  5. Display quote   │                     │                     │
     │<────────────────────│                     │                     │
     │                     │                     │                     │
     │  6. Click "Swap"    │                     │                     │
     │────────────────────>│                     │                     │
     │                     │                     │                     │
     │                     │  7. POST /api/prepare                     │
     │                     │────────────────────>│                     │
     │                     │                     │                     │
     │                     │                     │  8. Modify tx:      │
     │                     │                     │     - Set sponsor   │
     │                     │                     │       as fee payer  │
     │                     │                     │     - Add affiliate │
     │                     │                     │       fee params    │
     │                     │                     │                     │
     │                     │  9. Return partial  │                     │
     │                     │     signed tx       │                     │
     │                     │<────────────────────│                     │
     │                     │                     │                     │
     │  10. Request        │                     │                     │
     │      signature      │                     │                     │
     │<────────────────────│                     │                     │
     │                     │                     │                     │
     │  11. Sign tx        │                     │                     │
     │────────────────────>│                     │                     │
     │                     │                     │                     │
     │                     │  12. POST /api/submit                     │
     │                     │────────────────────>│                     │
     │                     │                     │                     │
     │                     │                     │  13. Add sponsor    │
     │                     │                     │      signature      │
     │                     │                     │                     │
     │                     │                     │  14. Submit tx      │
     │                     │                     │────────────────────>│
     │                     │                     │                     │
     │                     │                     │  15. Confirmation   │
     │                     │                     │<────────────────────│
     │                     │                     │                     │
     │                     │  16. Return txHash  │                     │
     │                     │<────────────────────│                     │
     │                     │                     │                     │
     │  17. Show success   │                     │                     │
     │<────────────────────│                     │                     │
     │                     │                     │                     │
```

## Sponsor Fee Calculation

### Formula

```typescript
// Constants
const NETWORK_FEE_SOL = 0.015;           // deBridge fixFee
const TX_FEE_SOL = 0.000005;             // Solana transaction fee
const BUFFER_PERCENT = 1.1;              // 10% buffer for price volatility

// Calculate sponsor fee in input token
function calculateSponsorFee(
  solPrice: number,           // Current SOL/USD price
  inputTokenPrice: number,    // Input token USD price
  inputTokenDecimals: number
): string {
  const totalSolCost = (NETWORK_FEE_SOL + TX_FEE_SOL) * BUFFER_PERCENT;
  const costInUsd = totalSolCost * solPrice;
  const feeInInputToken = costInUsd / inputTokenPrice;

  // Convert to smallest units
  const feeInSmallestUnits = Math.ceil(
    feeInInputToken * Math.pow(10, inputTokenDecimals)
  );

  return feeInSmallestUnits.toString();
}
```

### Example

```
SOL price: $150
USDC price: $1
Network fee: 0.015 SOL
Tx fee: 0.000005 SOL
Buffer: 10%

Total SOL cost: (0.015 + 0.000005) * 1.1 = 0.01650555 SOL
Cost in USD: 0.01650555 * $150 = $2.48
Sponsor fee: 2.48 USDC (rounded up: 2480000 in smallest units)
```

## Security Considerations

### Sponsor Wallet Protection

1. **Key Storage**: Store sponsor private key in HSM or cloud KMS (AWS KMS, GCP Cloud KMS)
2. **Rate Limiting**: Limit requests per IP/wallet to prevent abuse
3. **Balance Monitoring**: Alert when sponsor SOL balance falls below threshold
4. **Transaction Validation**: Verify transaction structure before signing

### Request Validation

```typescript
// Validate before signing
function validateTransaction(tx: Transaction, expectedParams: ExpectedParams): boolean {
  // 1. Verify fee payer is sponsor
  if (tx.feePayer !== sponsorPublicKey) return false;

  // 2. Verify deBridge program is called
  if (!hasDeBridgeInstruction(tx)) return false;

  // 3. Verify affiliate fee recipient is sponsor's Jupiter referral key
  if (!hasCorrectAffiliateRecipient(tx)) return false;

  // 4. Verify amounts match quote
  if (!amountsMatchQuote(tx, expectedParams)) return false;

  return true;
}
```

### Anti-Abuse Measures

| Measure | Implementation |
|---------|----------------|
| Rate limiting | Max 10 quotes/min, 5 swaps/min per wallet |
| Minimum amount | Require minimum swap amount ($10+) |
| Quote expiry | Quotes expire in 30 seconds |
| IP blocking | Block known VPN/proxy ranges for suspicious activity |
| Wallet reputation | Track wallet behavior, flag suspicious patterns |

## Jupiter Referral Setup

The sponsor needs a Jupiter referral key to receive affiliate fees on Solana.

### Registration

1. Go to [referral.jup.ag/dashboard](https://referral.jup.ag/dashboard)
2. Connect sponsor wallet
3. Create referral account
4. Copy the referral key (this is the `affiliateFeeRecipient`)

### API Parameters

```typescript
// Add to deBridge create-tx request
const params = {
  // ... existing params
  affiliateFeePercent: '0.25',  // 0.25% of input amount
  affiliateFeeRecipient: 'JUPITER_REFERRAL_PUBLIC_KEY',
};
```

## Backend Implementation

### Tech Stack Recommendations

| Component | Recommendation |
|-----------|----------------|
| Runtime | Node.js with TypeScript or Rust |
| Framework | Express.js, Fastify, or Actix-web |
| Key Management | AWS KMS, GCP Cloud KMS, or HashiCorp Vault |
| Price Oracle | Pyth Network, Chainlink, or CoinGecko API |
| Database | Redis for quote caching, PostgreSQL for audit logs |
| Monitoring | Datadog, Grafana, or CloudWatch |

### Environment Variables

```bash
# Sponsor wallet (use KMS in production)
SPONSOR_PRIVATE_KEY=           # Never commit! Use KMS
SPONSOR_PUBLIC_KEY=

# Jupiter referral
JUPITER_REFERRAL_KEY=

# Price oracle
PYTH_ENDPOINT=
COINGECKO_API_KEY=

# Solana
SOLANA_RPC_URL=
SOLANA_WS_URL=

# deBridge
DEBRIDGE_API_URL=https://dln.debridge.finance/v1.0

# Security
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_QUOTES=10
RATE_LIMIT_MAX_SWAPS=5
MIN_SWAP_AMOUNT_USD=10
```

### Sponsor Balance Management

```typescript
// Monitor sponsor balance
async function checkSponsorBalance(): Promise<void> {
  const balance = await connection.getBalance(sponsorPublicKey);
  const balanceSol = balance / LAMPORTS_PER_SOL;

  if (balanceSol < MIN_BALANCE_SOL) {
    await sendAlert(`Sponsor balance low: ${balanceSol} SOL`);
  }

  if (balanceSol < CRITICAL_BALANCE_SOL) {
    await pauseService();
    await sendCriticalAlert(`Sponsor balance critical: ${balanceSol} SOL`);
  }
}

// Run every 5 minutes
setInterval(checkSponsorBalance, 5 * 60 * 1000);
```

## Frontend Integration

### useSponsoredSwap Hook

```typescript
// src/hooks/useSponsoredSwap.ts
export function useSponsoredSwap() {
  const [status, setStatus] = useState<SwapStatus>('idle');

  const executeSwap = async (quoteId: string) => {
    setStatus('preparing');

    // 1. Get prepared transaction from backend
    const { transaction, message } = await api.prepare(quoteId);

    setStatus('awaiting-signature');

    // 2. Request user signature (wallet popup)
    const signedTx = await wallet.signTransaction(transaction);

    setStatus('submitting');

    // 3. Submit to backend for sponsor signature + broadcast
    const result = await api.submit(quoteId, signedTx);

    setStatus(result.success ? 'complete' : 'failed');

    return result;
  };

  return { executeSwap, status };
}
```

## Deployment Checklist

- [ ] Set up KMS for sponsor key management
- [ ] Register Jupiter referral account
- [ ] Deploy backend service with rate limiting
- [ ] Configure price oracle integration
- [ ] Set up balance monitoring and alerts
- [ ] Implement audit logging
- [ ] Load test the service
- [ ] Set up CI/CD pipeline
- [ ] Configure SSL/TLS for API endpoints
- [ ] Document API for frontend team

## Cost Analysis

### Per-Swap Costs (Sponsor)

| Item | Cost |
|------|------|
| Network fee (fixFee) | 0.015 SOL (~$2.25) |
| Transaction fee | ~0.000005 SOL (~$0.001) |
| **Total per swap** | **~$2.25** |

### Revenue (Affiliate Fee)

With 0.25% affiliate fee on a $100 swap: **$0.25**

### Break-Even Analysis

To break even at current SOL prices (~$150):
- Minimum affiliate fee needed: ~2.25% per swap
- Or: Accept loss as user acquisition cost (~$2 per swap)

### Recommendations

1. **Option A**: Set affiliate fee at 2.5% (covers costs + small profit)
2. **Option B**: Set affiliate fee at 0.5% (subsidize ~$2 per swap for growth)
3. **Option C**: Tiered fees based on swap size (higher % for smaller swaps)