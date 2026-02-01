# CoolSwap Phase 6: Gas Sponsorship via Kora

## Overview

Implement complete gas sponsorship so users can swap SPL tokens without holding SOL. The sponsor pays Solana transaction fees and gets reimbursed from the user's input token.

**Research Summary:**
- **Octane**: ❌ Last updated Dec 2021, unmaintained
- **Jito Bundles**: ❌ Wrong tool - designed for MEV, not fee sponsorship
- **Kora**: ✅ **RECOMMENDED** - Official Solana Foundation solution (Dec 2024)

---

## Kora: Why It's the Right Choice

| Factor | Details |
|--------|---------|
| **Maintainer** | Solana Foundation (official) |
| **Released** | December 2024 |
| **Security** | Audited by Runtime Verification |
| **Integration** | JSON-RPC API + TypeScript SDK |
| **Token Support** | Users can pay fees in ANY SPL token (USDC, etc.) |
| **Deployment** | Docker, self-hosted, or Railway |

**How Kora Works:**
```
User wallet signs tx → Frontend sends to Kora → Kora signs as fee payer → Kora submits to network
                                                        ↓
                                              Sponsor wallet pays SOL
```

---

## Architecture

### Current Flow (Requires User SOL)
```
User signs tx → Frontend submits to RPC → User pays SOL fees
```

### New Flow (Kora Gas Sponsorship)
```
1. User signs transaction (no fee payer)
2. Frontend sends to Kora API
3. Kora validates tx (allowed programs, limits)
4. Kora signs as fee payer
5. Kora submits to Solana network
6. Sponsor wallet pays SOL fees
7. User's input token covers sponsor cost (via prependOperatingExpenses)
```

### Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CoolSwap UI   │────▶│   Kora Server   │────▶│  Solana Network │
│   (Frontend)    │     │  (Fee Relayer)  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                        ┌──────┴──────┐
                        │ Sponsor     │
                        │ Wallet      │
                        │ (SOL funds) │
                        └─────────────┘
```

---

## Sponsor Payment Economics

**Hard Requirement:** The sponsor must NEVER lose money. Users bear all conversion risk.

### How the Sponsor Gets Paid

deBridge's `prependOperatingExpenses` only covers deBridge fees, NOT Solana gas. We use Kora's `getPaymentInstruction()` to add an explicit token payment from user to sponsor.

### Payment Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. Get deBridge transaction                                                │
│    └─ Returns: swap instructions (user's token → deBridge → EVM)          │
├────────────────────────────────────────────────────────────────────────────┤
│ 2. Call Kora getPaymentInstruction(tx, fee_token, user_wallet)            │
│    └─ Kora does:                                                           │
│       a) Estimate gas cost in lamports                                     │
│       b) Convert SOL → token using price oracle (Jupiter)                  │
│       c) Apply margin: token_fee = gas_cost_in_token * (1 + margin)       │
│       d) Return payment instruction: user_ATA → sponsor_ATA               │
├────────────────────────────────────────────────────────────────────────────┤
│ 3. Build final transaction                                                 │
│    └─ Original deBridge tx + payment instruction appended                  │
│    └─ Set fee payer = Kora's signer address                               │
├────────────────────────────────────────────────────────────────────────────┤
│ 4. User signs transaction                                                  │
│    └─ Authorizes both: swap + payment to sponsor                          │
├────────────────────────────────────────────────────────────────────────────┤
│ 5. Send to Kora signAndSendTransaction()                                   │
│    └─ Kora adds fee payer signature                                        │
│    └─ Kora submits to Solana                                              │
├────────────────────────────────────────────────────────────────────────────┤
│ 6. Transaction executes atomically                                         │
│    └─ User pays sponsor in tokens (gas cost + margin)                     │
│    └─ Sponsor pays Solana gas in SOL                                       │
│    └─ Swap executes via deBridge                                          │
│    └─ SPONSOR PROFIT = margin (configurable, e.g., 10%)                   │
└────────────────────────────────────────────────────────────────────────────┘
```

### Kora Pricing Configuration

```toml
# In kora.toml
[validation]
price_source = "Jupiter"  # Use real-time SOL/token prices (NOT "Mock" for production)

[validation.price]
type = "margin"           # Options: free / margin / fixed
margin = 0.1              # 10% margin = sponsor gets 110% of gas cost
```

**Pricing modes:**
| Mode | How it works | Sponsor risk |
|------|--------------|--------------|
| `free` | Sponsor pays gas, no reimbursement | High (loses money) |
| `margin` | User pays `gas_cost * (1 + margin)` in tokens | **None (always profits)** |
| `fixed` | User pays fixed amount per tx | Medium (gas spikes) |

### Guarantees

| Guarantee | How it's enforced |
|-----------|-------------------|
| **Price accuracy** | `price_source = "Jupiter"` fetches real-time SOL/token price |
| **Profit margin** | `margin = 0.1` means sponsor receives 110% of gas cost in tokens |
| **Atomicity** | Payment instruction is in same tx as swap - both execute or neither |
| **No partial execution** | If user can't pay, entire tx fails (sponsor pays nothing) |

### Example Calculation

If gas costs **5000 lamports** (~$0.001 at $200/SOL) and user pays in USDC:

```
SOL gas cost:     5000 lamports = 0.000005 SOL
SOL price:        $200
Gas cost in USD:  $0.001
Margin (10%):     $0.0001
─────────────────────────────
User pays:        $0.0011 USDC (0.001100 USDC)
Sponsor receives: $0.0011 USDC
Sponsor pays:     $0.001 SOL
Sponsor profit:   $0.0001 (10% margin)
```

### Implementation in CoolSwap

```typescript
// In useSwapExecution.ts

// 1. Get Kora's fee payer address and payment instruction
const { payment_instruction, payment_amount } = await koraClient.getPaymentInstruction({
  transaction: deBridgeTxBase64,
  fee_token: sourceToken.address,  // e.g., USDC mint
  source_wallet: userWallet.address,
});

// 2. Append payment instruction to deBridge transaction
const finalTx = appendInstruction(deBridgeTx, payment_instruction);

// 3. Set Kora as fee payer
const txWithFeePayer = setFeePayer(finalTx, koraSignerAddress);

// 4. User signs (authorizes swap + payment)
const userSignedTx = await wallet.signTransaction(txWithFeePayer);

// 5. Kora adds fee payer signature and submits
const signature = await koraClient.signAndSendTransaction({
  transaction: encode(userSignedTx),
});
```

---

## Decision: Kora vs Custom Backend

### Detailed Comparison (Demo App Focus)

| Factor | Kora | Simple Custom Backend |
|--------|------|----------------------|
| **Dev Time** | 2-4 hours | 4-8 hours |
| **Setup** | Clone repo, configure TOML, docker-compose up | Build Express/serverless endpoint from scratch |
| **Code to Write** | ~50 lines (frontend integration only) | ~200-300 lines (full backend + frontend) |
| **Validation Logic** | Built-in (20+ controls, program allowlists) | Must implement ourselves |
| **Security** | Audited by Runtime Verification | Unaudited, potential vulnerabilities |
| **Key Management** | Supports AWS KMS, Turnkey, Privy, local keys | Manual keypair management |
| **Dependencies** | Docker, Rust binary | Node.js, Express or serverless |
| **Maintenance** | Solana Foundation updates | We maintain everything |
| **Production Ready** | Yes | Needs hardening |

### Speed of Execution Analysis

**Kora (Faster for Demo):**
```
1. git clone kora repo           (1 min)
2. Create kora.toml config       (15 min - copy example, edit)
3. Generate fee payer keypair    (5 min)
4. docker-compose up             (5 min)
5. Update frontend integration   (1-2 hours)
─────────────────────────────────────────
Total: ~2-3 hours
```

**Custom Backend (More Work):**
```
1. Create new backend project    (10 min)
2. Implement tx validation       (1-2 hours)
3. Implement fee payer signing   (1-2 hours)
4. Implement RPC submission      (30 min)
5. Deploy somewhere              (30 min - 1 hour)
6. Update frontend integration   (1-2 hours)
─────────────────────────────────────────
Total: ~5-8 hours
```

### Recommendation for Demo

**Use Kora** - It's actually faster because:
1. All the hard work (validation, signing, rate limiting) is done
2. Configuration is just editing TOML files
3. Docker deployment is one command
4. Audited = safer even for demo
5. If demo goes well, same setup works for production

### Minimal Kora Setup for Demo

**Important:** Kora is deployed as a **separate service**, NOT inside the CoolSwap repo.

```bash
# Clone Kora to a SEPARATE location (sibling directory or separate project)
cd ~/Dev  # or wherever you keep projects
git clone https://github.com/solana-foundation/kora
cd kora

# Follow the official quickstart guide:
# https://launch.solana.com/docs/kora/getting-started/quick-start

# Basic steps:
# 1. Copy example config
cp config/example.toml kora.toml

# 2. Edit kora.toml with your RPC endpoint and fee payer key

# 3. Run with Docker
docker-compose up -d

# Kora is now running at http://localhost:8080
```

**Deployment options:**
- **Local dev**: Sibling directory (`~/Dev/kora/`)
- **Production**: Separate service on Railway, Render, or your cloud provider

The CoolSwap frontend just needs the Kora URL configured in `.env`.

**Decision: Use Kora** ✅

---

## Step 1: Deploy Kora Server

### Prerequisites
- Docker or Docker Compose
- Sponsor wallet keypair (funded with SOL)
- Environment for deployment (local dev, Railway, etc.)

### Setup
```bash
# Clone Kora
git clone https://github.com/solana-foundation/kora
cd kora

# Configure (create kora.toml)
# Set RPC endpoint, fee payer, allowed programs

# Run with Docker Compose
docker-compose up -d
```

### Configuration (`kora.toml`)
```toml
[rpc]
endpoint = "https://api.mainnet-beta.solana.com"  # Or Helius

[signer]
type = "solana_private_key"
private_key_path = "/keys/fee-payer.json"

[validation]
# Allow deBridge program
allowed_programs = [
  "src5qyZHqTqecJV4aY6Cb6zDZLMDzrDKKezs22MPHr4",  # deBridge
]

# Allow USDC, SOL, and other tokens we support
allowed_tokens = [
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
  "So11111111111111111111111111111111111111112",     # Wrapped SOL
]

[limits]
max_fee_lamports = 10000000  # 0.01 SOL max per tx
```

---

## Step 2: Create GasSponsorService

**File:** `src/services/gas/GasSponsorService.ts`

### Interface
```typescript
interface GasSponsorService {
  /**
   * Submit a user-signed transaction through the fee relayer
   * @param signedTx - Transaction signed by user (without fee payer signature)
   * @returns Transaction signature
   */
  submitTransaction(signedTx: Uint8Array): Promise<string>;

  /**
   * Check if the sponsor service is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get estimated sponsorship cost in lamports
   */
  getEstimatedCost(): Promise<number>;
}
```

### Implementation
```typescript
export class KoraGasSponsorService implements GasSponsorService {
  private koraUrl: string;

  constructor(koraUrl: string) {
    this.koraUrl = koraUrl;
  }

  async submitTransaction(signedTx: Uint8Array): Promise<string> {
    const response = await fetch(`${this.koraUrl}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'signAndSendTransaction',
        params: {
          transaction: Buffer.from(signedTx).toString('base64'),
        },
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.result.signature;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.koraUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getEstimatedCost(): Promise<number> {
    // Typical Solana tx fee: 5000 lamports base + priority
    // Return conservative estimate
    return 50000; // 0.00005 SOL
  }
}
```

---

## Step 3: Update useSwapExecution Hook

**File:** `src/hooks/useSwapExecution.ts`

### Changes

1. **Remove direct RPC submission** - Replace with Kora submission
2. **Modify transaction preparation** - Don't set fee payer (Kora does this)
3. **User signs without fee payer** - Partial signature only

```typescript
// Before: Direct RPC submission
const txSig = await solanaClient.sendTransaction(signedTxBytes);

// After: Submit through Kora
const gasSponsor = useGasSponsorService();
const txSig = await gasSponsor.submitTransaction(signedTxBytes);
```

### Updated Flow
```typescript
const execute = useCallback(async () => {
  // ... validation ...

  try {
    setStatus('signing');

    // 1. Decode transaction from deBridge
    const txBytes = hexToBytes(txData.data);
    const decoder = getTransactionDecoder();
    const transaction = decoder.decode(txBytes);

    // 2. User signs (partial - no fee payer yet)
    const userSignedTx = await wallet.signTransaction(transaction);

    // 3. Encode for Kora
    const encoder = getTransactionEncoder();
    const signedBytes = encoder.encode(userSignedTx);

    // 4. Submit through Kora (handles fee payer signing)
    setStatus('confirming');
    const txSig = await gasSponsor.submitTransaction(signedBytes);

    setTxSignature(txSig);
    setStatus('completed');
  } catch (err) {
    // ... error handling ...
  }
}, [/* deps */]);
```

---

## Step 4: Add GasSponsorContext

**File:** `src/context/GasSponsorContext.tsx`

Provide gas sponsor service throughout the app:

```typescript
const GasSponsorContext = createContext<GasSponsorService | null>(null);

export function GasSponsorProvider({ children }: { children: React.ReactNode }) {
  const gasSponsor = useMemo(() => {
    return new KoraGasSponsorService(env.KORA_URL);
  }, []);

  return (
    <GasSponsorContext.Provider value={gasSponsor}>
      {children}
    </GasSponsorContext.Provider>
  );
}

export function useGasSponsorService(): GasSponsorService {
  const context = useContext(GasSponsorContext);
  if (!context) {
    throw new Error('useGasSponsorService must be used within GasSponsorProvider');
  }
  return context;
}
```

---

## Step 5: Update QuoteDisplay for Gas Fee

**File:** `src/components/swap/QuoteDisplay.tsx`

Add gas sponsorship fee to the fee breakdown:

```typescript
// Add to fee display
<div className="flex items-center justify-between text-sm">
  <span className="text-slate-400">Gas sponsorship</span>
  <span className="text-slate-300">
    ~{formatSolAmount(estimatedGasCost)} SOL
    <span className="text-slate-500 text-xs ml-1">
      (${gasCostUsd.toFixed(4)})
    </span>
  </span>
</div>
```

---

## Step 6: Environment Configuration

**File:** `.env`

```bash
# Kora fee relayer URL
VITE_KORA_URL=http://localhost:8080  # Dev
# VITE_KORA_URL=https://kora.coolswap.io  # Prod
```

**File:** `src/config/env.ts`

```typescript
export const env = {
  // ... existing
  KORA_URL: import.meta.env.VITE_KORA_URL || 'http://localhost:8080',
};
```

---

## Files Summary

### New Files
| File | Description |
|------|-------------|
| `src/services/gas/GasSponsorService.ts` | Interface for gas sponsorship |
| `src/services/gas/KoraGasSponsorService.ts` | Kora implementation |
| `src/services/gas/index.ts` | Exports |
| `src/context/GasSponsorContext.tsx` | Context provider |
| `kora/` | Kora deployment configuration |

### Modified Files
| File | Change |
|------|--------|
| `src/hooks/useSwapExecution.ts` | Use Kora instead of direct RPC |
| `src/components/swap/QuoteDisplay.tsx` | Show gas sponsorship fee |
| `src/App.tsx` | Add GasSponsorProvider |
| `src/config/env.ts` | Add KORA_URL |
| `.env` | Add VITE_KORA_URL |

---

## Verification

```bash
# 1. Start Kora locally
cd kora && docker-compose up -d

# 2. Run app
pnpm dev

# 3. Test scenarios:
#    - Connect wallet with USDC but 0 SOL
#    - Select USDC → Arbitrum USDC
#    - Enter amount, get quote
#    - Verify "Gas sponsorship" shows in fee breakdown
#    - Click Swap
#    - Wallet prompts for signature (NO SOL needed)
#    - Transaction submits via Kora
#    - Success modal shows

# 4. Verify sponsor wallet
#    - Check sponsor wallet SOL decreased by ~0.00005 SOL
#    - User's USDC decreased by swap amount + fees
```

---

## Fallback: Direct Fee Payer (Simpler Alternative)

If Kora proves too complex for MVP, we can implement a simpler custom fee payer:

```typescript
// Simple fee payer backend endpoint
POST /api/sponsor-transaction
Body: { signedTx: base64 }

// Backend:
1. Verify tx calls allowed programs (deBridge only)
2. Verify tx amount within limits
3. Fee payer keypair signs the transaction
4. Submit to Solana RPC
5. Return signature
```

This is essentially a minimal Kora without all the configuration options.

---

## Open Questions

1. **Kora deployment target** - Local Docker for dev, Railway/Render for prod?
2. **Sponsor wallet funding** - How much SOL to start? Auto-replenishment?
3. **Rate limiting** - Per-wallet limits to prevent abuse?
4. **Fallback** - What if Kora is unavailable? Block swaps or require user SOL?

---

## Future Enhancement: Sponsor Receives SOL Directly

**Status:** Not in MVP scope

Currently, the sponsor receives payment in the user's input token (e.g., USDC). A future enhancement could swap the payment to SOL so the sponsor receives SOL directly, simplifying accounting.

### Approach

Add a Jupiter swap instruction to convert user's token payment → SOL:

```typescript
// Instead of simple token transfer to sponsor...
// Add Jupiter swap: USDC → SOL → sponsor's SOL account

// 1. Get Jupiter quote for token → SOL
const jupiterQuote = await jupiter.getQuote({
  inputMint: sourceToken.address,  // e.g., USDC
  outputMint: NATIVE_SOL,
  amount: paymentAmountInToken,
  slippageBps: 50,  // 0.5%
});

// 2. Get swap instruction with sponsor as recipient
const swapIx = await jupiter.getSwapInstruction(jupiterQuote, {
  destinationTokenAccount: sponsorSolAccount,
});

// 3. Replace payment instruction with Jupiter swap
finalTx = appendInstruction(deBridgeTx, swapIx);
```

### Trade-offs

| Factor | Token Payment (Current) | Jupiter Swap to SOL |
|--------|------------------------|---------------------|
| Complexity | Low | Medium-High |
| Gas cost | ~5,000 lamports | ~15,000+ lamports |
| Slippage risk | None | Yes |
| Sponsor accounting | Accumulates tokens | Gets SOL directly |
| Compute budget | Plenty of headroom | May be tight with deBridge |

### Why Not Now

1. **Complexity** - Jupiter integration adds significant code
2. **Gas overhead** - Users pay more for the additional swap
3. **Compute limits** - deBridge + Jupiter may exceed budget
4. **Small amounts** - Tiny payments may have poor swap rates

### Alternative for MVP

Sponsor accumulates tokens and runs a periodic batch conversion script:

```bash
# Cron job: Convert accumulated USDC to SOL weekly
jupiter swap --input USDC --output SOL --amount all --wallet sponsor.json
```

---

## Sources

- [Kora Quick Start Guide](https://launch.solana.com/docs/kora/getting-started/quick-start) - **Start here**
- [Kora GitHub Repository](https://github.com/solana-foundation/kora)
- [Solana Foundation Introduces Kora](https://www.altcoinbuzz.io/cryptocurrency-news/solana-foundation-introduces-kora-for-fee-free-transactions/)
- [Kora Fee Relayer Enables Solana App Onboarding](https://en.cryptonomist.ch/2025/12/24/kora-fee-relayer-solana-onboarding/)
- [Solana Fee Sponsorship Cookbook](https://solana.com/developers/cookbook/transactions/fee-sponsorship)