# Token-2022 Implementation Guide

## Overview

CoolSwap supports **Token-2022 (Token Extensions Program)** tokens with transfer fees. This document explains how the system handles Token-2022 tokens to ensure the server wallet remains profitable when users reimburse gas costs.

## What is Token-2022?

Token-2022 (also called Token Extensions Program) is an enhanced version of the SPL Token program that supports additional features:

- **Transfer Fees**: Tokens can have a percentage fee deducted on every transfer
- **Memo Requirements**: Accounts can require a memo instruction for transfers
- **Transfer Hooks**: Custom logic executed on transfers
- **Interest-Bearing Tokens**: Tokens that accrue interest over time

**Program ID**: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

CoolSwap currently handles **Transfer Fees** and **Memo Requirements**.

---

## The Problem: Transfer Fees Create Losses

### Example Scenario

Without proper handling, transfer fees can cause the server to lose money:

```
User wants to swap, gas cost = $10 worth of tokens
Token has 1% transfer fee

WITHOUT gross-up:
  User sends: 1000 tokens ($10)
  Protocol deducts: 10 tokens (1% fee)
  Server receives: 990 tokens ($9.90)
  SERVER LOSS: $0.10 ❌

WITH gross-up:
  User sends: 1010 tokens ($10.10)
  Protocol deducts: 10 tokens (1% fee)
  Server receives: 1000 tokens ($10.00)
  SERVER PROFIT: $0 ✓
```

The **gross-up calculation** ensures the server receives the exact amount needed after fees are deducted.

---

## Implementation Architecture

### Components

```
Frontend (React)
├── Token2022Service.ts       - Detects Token-2022 and extracts fee config
├── Token2022Utils.ts          - Pure calculation functions (gross-up math)
├── useRelaySwapExecution.ts   - Integrates Token-2022 handling into swap flow
└── TokenContext.tsx           - Provides services via React Context

Backend (Vercel Serverless)
└── sign-transaction.ts        - Validates Token-2022 payments and logs fees
```

### Data Flow

```
1. User selects token
   ↓
2. Token2022Service.detectToken2022(mintAddress)
   ↓ Returns: { isToken2022, transferFeeBasisPoints, maximumFee, requiresMemoTransfers }
   ↓
3. If Token-2022 with fees:
   ↓ calculateGrossAmount(targetAmount, feeConfig)
   ↓ Returns: Grossed-up amount (includes fee + buffer)
   ↓
4. Build payment instruction with grossed-up amount
   ↓
5. Add memo instruction (if required by token)
   ↓
6. Transaction sent to backend for signing
   ↓
7. Backend validates Token-2022 detection
   ↓ Logs: Token-2022 payment with fee details
   ↓
8. Transaction signed and submitted
   ↓
9. Server receives exact reimbursement amount ✓
```

---

## Transfer Fee Calculation Math

### The Gross-Up Formula

To calculate how much the user must send so the server receives the target amount:

```typescript
gross = (target * 10000) / (10000 - feeBasisPoints)
```

**Variables:**
- `target` = Amount server must receive (in smallest units)
- `feeBasisPoints` = Fee percentage in basis points (100 = 1%)
- `10000` = 100% in basis points

### Maximum Fee Cap

Token-2022 fees have a maximum cap to prevent excessive fees on large transfers:

```typescript
calculatedFee = gross - target

if (calculatedFee > maximumFee) {
  gross = target + maximumFee
}
```

### Buffer for Price Volatility

A 10% buffer is added in `PriceService.convertLamportsToToken()` to account for price fluctuations between quote and execution:

```typescript
// Applied in PriceService, NOT in calculateGrossAmount
finalAmount = tokenAmount * 1.1
```

### Complete Examples

#### Example 1: Normal Fee (1%)

```
Target (server must receive): 1000 tokens
Transfer fee: 100 basis points (1%)
Maximum fee: 10000 tokens (not reached)

Calculation:
  gross = (1000 * 10000) / (10000 - 100)
        = 10000000 / 9900
        = 1010.10 tokens

Result:
  User sends: 1010.10 tokens
  Protocol deducts: 10.10 tokens (1%)
  Server receives: 1000 tokens ✓
```

#### Example 2: Capped Fee

```
Target (server must receive): 1,000,000 tokens
Transfer fee: 100 basis points (1%)
Maximum fee: 5000 tokens

Calculation:
  gross = (1000000 * 10000) / (10000 - 100) = 1010101.01 tokens
  calculatedFee = 1010101.01 - 1000000 = 10101.01 tokens

  Since 10101.01 > 5000 (max), use capped fee:
  gross = 1000000 + 5000 = 1005000 tokens

Result:
  User sends: 1,005,000 tokens
  Protocol deducts: 5,000 tokens (capped)
  Server receives: 1,000,000 tokens ✓
```

---

## Code Implementation Details

### 1. Token Detection (Token2022Service.ts)

```typescript
async detectToken2022(mintAddress: string): Promise<Token2022Info> {
  // 1. Check if mint owner is Token-2022 program
  const accountInfo = await connection.getAccountInfo(mintPubkey);
  if (!accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return { isToken2022: false, ... };
  }

  // 2. Fetch mint account data
  const mintInfo = await getMint(
    connection,
    mintPubkey,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );

  // 3. Extract transfer fee config
  const transferFeeConfig = getTransferFeeConfig(mintInfo);
  if (transferFeeConfig) {
    const { newerTransferFee } = transferFeeConfig;
    return {
      isToken2022: true,
      transferFeeBasisPoints: Number(newerTransferFee.transferFeeBasisPoints),
      maximumFee: newerTransferFee.maximumFee,
      requiresMemoTransfers: /* detected from extensions */
    };
  }
}
```

### 2. Gross-Up Calculation (Token2022Utils.ts)

```typescript
export function calculateGrossAmount(
  targetNet: bigint,
  feeConfig: TransferFeeConfig
): bigint {
  const { transferFeeBasisPoints, maximumFee } = feeConfig;

  // Validate fee is not >= 100%
  if (transferFeeBasisPoints >= 10000) {
    throw new Error('Invalid transfer fee >= 100%');
  }

  // Calculate gross using bigint math (no precision loss)
  const gross = (targetNet * 10000n) / (10000n - BigInt(transferFeeBasisPoints));
  const calculatedFee = gross - targetNet;

  // Apply maximum fee cap
  const actualGross = calculatedFee > maximumFee
    ? targetNet + maximumFee
    : gross;

  return actualGross;
}
```

### 3. Integration in Swap Flow (useRelaySwapExecution.ts)

```typescript
// Detect Token-2022 before building payment instruction
const token2022Service = new Token2022Service(solanaClient, env.SOLANA_RPC_URL);
const tokenInfo = await token2022Service.detectToken2022(sourceTokenAddress);

console.log('Token-2022 detection:', {
  isToken2022: tokenInfo.isToken2022,
  transferFeeBps: tokenInfo.transferFeeBasisPoints,
  requiresMemo: tokenInfo.requiresMemoTransfers,
});

// Apply gross-up if Token-2022 with transfer fees
let tokenAmount = baseTokenAmount;
if (tokenInfo.isToken2022 &&
    tokenInfo.transferFeeBasisPoints !== null &&
    tokenInfo.maximumFee !== null) {

  const grossAmount = calculateGrossAmount(baseTokenAmount, {
    transferFeeBasisPoints: tokenInfo.transferFeeBasisPoints,
    maximumFee: tokenInfo.maximumFee,
  });

  console.log('Token-2022 gross-up applied:', {
    baseAmount: baseTokenAmount.toString(),
    grossAmount: grossAmount.toString(),
    difference: (grossAmount - baseTokenAmount).toString(),
  });

  tokenAmount = grossAmount;
}

// Select correct token program (Token-2022 uses different program ID)
const tokenProgramAddress = tokenInfo.isToken2022
  ? TOKEN_2022_PROGRAM_ADDRESS
  : TOKEN_PROGRAM_ADDRESS;

// Build payment instruction with correct program and grossed-up amount
const paymentInstruction = getTransferInstruction({
  source: sourceTokenAccount,
  destination: destinationTokenAccount,
  authority: createNoopSigner(userAddress),
  amount: tokenAmount, // Grossed-up amount for Token-2022
}, {
  programAddress: tokenProgramAddress,
});

// Conditionally add memo instruction (only if token requires it)
const memoInstruction = tokenInfo.requiresMemoTransfers
  ? getAddMemoInstruction({ memo: 'CoolSwap gas reimbursement' })
  : null;

// Build transaction with correct instruction order
const allInstructions = memoInstruction
  ? [computeBudgetIx, memoInstruction, paymentInstruction, ...relayInstructions]
  : [computeBudgetIx, paymentInstruction, ...relayInstructions];
```

### 4. Backend Validation (api/sign-transaction.ts)

```typescript
// Find first token transfer instruction dynamically
const paymentInstruction = instructions.find((ix) => {
  const programId = txObj.message.staticAccountKeys[ix.programIdIndex];
  return programId?.equals(TOKEN_PROGRAM_ID) || programId?.equals(TOKEN_2022_PROGRAM_ID);
});

// For Token-2022, fetch mint and log fee details
if (programId.equals(TOKEN_2022_PROGRAM_ID)) {
  const mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  const transferFeeConfig = getTransferFeeConfig(mintInfo);

  if (transferFeeConfig) {
    console.warn('Token-2022 payment detected:', {
      mint: mintPubkey.toBase58(),
      feeBps: Number(transferFeeConfig.newerTransferFee.transferFeeBasisPoints),
      maxFee: transferFeeConfig.newerTransferFee.maximumFee.toString(),
    });
  }
}

// For MVP: Log detection but don't block (Relay handles validation)
// Future: Decode instruction amount and validate gross-up math
```

---

## Memo Instruction Handling

### Why Memo Instructions Are Needed

Some Token-2022 accounts enable the **MemoTransfer extension**, which requires all transfers to include a memo instruction. Without it, the transaction fails with:

```
Error: Account requires memo instruction
```

### Implementation

CoolSwap conditionally adds a memo instruction when the token requires it:

```typescript
// Check if token requires memo
const tokenInfo = await token2022Service.detectToken2022(mintAddress);

if (tokenInfo.requiresMemoTransfers) {
  const memoInstruction = getAddMemoInstruction({
    memo: 'CoolSwap gas reimbursement'
  });

  // Insert memo BEFORE payment instruction
  instructions = [computeBudget, memo, payment, ...relay];
}
```

**Instruction Order:**
```
1. ComputeBudget (set CU limit)
2. Memo (if required)
3. Payment (user → server transfer)
4. Relay (swap instructions)
```

**Compute Unit Cost:** ~700 CU (negligible)

---

## Testing & Verification

### Unit Tests

Test the gross-up calculation with known values:

```typescript
import { calculateGrossAmount } from '@/services/token/Token2022Utils';

test('gross-up calculation with 1% fee', () => {
  const feeConfig = {
    transferFeeBasisPoints: 100, // 1%
    maximumFee: 10000n,
  };

  const target = 1000n;
  const gross = calculateGrossAmount(target, feeConfig);

  // Expected: 1010 tokens (1000 + 10 for 1% fee)
  expect(gross).toBe(1010n);
});

test('gross-up calculation with capped fee', () => {
  const feeConfig = {
    transferFeeBasisPoints: 100, // 1%
    maximumFee: 5000n,
  };

  const target = 1000000n;
  const gross = calculateGrossAmount(target, feeConfig);

  // Expected: 1005000 (1000000 + 5000 capped fee)
  expect(gross).toBe(1005000n);
});
```

### Integration Testing (Devnet)

1. **Find Token-2022 Test Token:**
   ```bash
   # Use a devnet Token-2022 mint with transfer fees
   # Example: Look for tokens on Solana devnet explorer
   ```

2. **Test Detection:**
   ```typescript
   const tokenInfo = await token2022Service.detectToken2022(testMintAddress);
   console.log('Detection result:', tokenInfo);

   // Verify:
   // - isToken2022 = true
   // - transferFeeBasisPoints = expected value
   // - maximumFee = expected value
   ```

3. **Test Full Swap:**
   - Execute a test swap on devnet
   - Check console logs for "Token-2022 gross-up applied"
   - Verify server wallet receives correct amount after fees
   - Check transaction on explorer for memo instruction (if required)

### Production Monitoring

**Server Logs to Monitor:**

```bash
# Token-2022 payment detection
Token-2022 payment detected: {
  mint: "TokenMintAddress...",
  feeBps: 100,
  maxFee: "5000"
}

# Gross-up calculation
Token-2022 gross-up applied: {
  baseAmount: "1000",
  grossAmount: "1010",
  difference: "10"
}
```

**Metrics to Track:**
- Number of Token-2022 swaps per day
- Average transfer fee percentage
- Server wallet balance trends (should never lose money)

---

## Known Token-2022 Tokens

### Mainnet Tokens with Transfer Fees

| Token | Mint Address | Transfer Fee | Max Fee | Notes |
|-------|--------------|--------------|---------|-------|
| *To be documented* | *after testing* | *%* | *tokens* | *Update after mainnet testing* |

**Note:** Token-2022 adoption is still early. Most tokens currently use the standard SPL Token program.

---

## Troubleshooting

### Issue: "Account requires memo instruction"

**Cause:** Token has MemoTransfer extension enabled but memo instruction not included.

**Solution:** Ensure `requiresMemoTransfers` is correctly detected:
```typescript
// Check detection
const tokenInfo = await token2022Service.detectToken2022(mintAddress);
console.log('Requires memo:', tokenInfo.requiresMemoTransfers);

// Verify extension detection in Token2022Service.ts
const extensions = getExtensionTypes(mintInfo.tlvData);
const requiresMemoTransfers = extensions.includes(ExtensionType.MemoTransfer);
```

### Issue: "Insufficient funds" despite correct amount

**Cause:** Transfer fee not accounted for, or wrong token program used for ATAs.

**Solutions:**
1. **Verify gross-up is applied:**
   ```typescript
   // Check console logs
   console.log('Token-2022 gross-up applied:', {
     baseAmount, grossAmount, difference
   });
   ```

2. **Verify correct token program:**
   ```typescript
   // Should use TOKEN_2022_PROGRAM_ADDRESS for Token-2022
   const tokenProgramAddress = tokenInfo.isToken2022
     ? TOKEN_2022_PROGRAM_ADDRESS  // ✓ Correct
     : TOKEN_PROGRAM_ADDRESS;
   ```

3. **Check ATA derivation:**
   ```typescript
   const [ata] = await findAssociatedTokenPda({
     owner: userAddress,
     tokenProgram: tokenProgramAddress, // Must match token type
     mint: mintAddress,
   });
   ```

### Issue: Backend validation failing

**Cause:** RPC connection timeout or mint account not found.

**Solution:** Check RPC URL and connection:
```typescript
// In api/sign-transaction.ts
const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(rpcUrl, 'confirmed');

// Add timeout handling
const timeout = setTimeout(() => {
  console.warn('Token-2022 validation timeout, allowing transaction');
  return { valid: true };
}, 5000); // 5 second timeout
```

### Issue: Division by zero error

**Cause:** Token has invalid transfer fee >= 100%.

**Solution:** Validation is already in place:
```typescript
// In Token2022Utils.ts
if (transferFeeBasisPoints >= 10000) {
  throw new Error('Invalid transfer fee >= 100%');
}
```

This should never happen with valid Token-2022 tokens.

---

## Future Enhancements

### 1. Full Backend Amount Validation (Optional)

**Current State:** Backend logs Token-2022 detection but doesn't validate the exact amount.

**Enhancement:** Decode transfer instruction and validate gross-up math:

```typescript
// Decode transferChecked instruction data
const instructionData = paymentInstruction.data;
const amount = decodeU64(instructionData, AMOUNT_OFFSET);

// Validate gross-up calculation
const expectedGross = calculateGrossAmount(gasCost, feeConfig);
if (amount < expectedGross) {
  return res.status(400).json({
    error: 'Insufficient payment amount for Token-2022 transfer fee'
  });
}
```

**Benefit:** Absolute guarantee of server profitability, independent of Relay.

**Complexity:** Medium (requires understanding SPL Token instruction format).

### 2. Mint Data Caching

**Current State:** Backend fetches mint data on every transaction.

**Enhancement:** Cache mint data to reduce RPC calls:

```typescript
const mintCache = new Map<string, MintInfo>();

async function getMintWithCache(mintAddress: string) {
  if (mintCache.has(mintAddress)) {
    return mintCache.get(mintAddress);
  }

  const mintInfo = await getMint(connection, mintAddress);
  mintCache.set(mintAddress, mintInfo);
  return mintInfo;
}
```

**Benefit:** Reduced latency and RPC costs.

### 3. Transfer Hook Support

**Current State:** Transfer Hooks not supported (skipped in MVP).

**Enhancement:** Resolve extra account metas for Transfer Hook programs:

```typescript
import { resolveExtraAccountMetas } from '@solana/spl-token';

const extraAccounts = await resolveExtraAccountMetas(
  connection,
  transferInstruction,
  mintInfo
);

// Add extra accounts to instruction
transferInstruction.keys.push(...extraAccounts);
```

**Benefit:** Support for tokens with Transfer Hook extensions.

**Complexity:** High (requires external program calls and account resolution).

---

## References

- [Solana Token-2022 Documentation](https://solana.com/docs/tokens/extensions)
- [SPL Token Extensions Guide](https://spl.solana.com/token-2022)
- [Transfer Fee Extension Spec](https://spl.solana.com/token-2022/extensions#transfer-fees)
- [Memo Transfer Extension](https://spl.solana.com/token-2022/extensions#required-memo-on-transfer)
- [Relay Bridge Documentation](https://docs.relay.link)

---

## Summary

CoolSwap's Token-2022 implementation ensures server wallet profitability by:

1. ✅ **Detecting Token-2022 tokens** and extracting transfer fee configuration
2. ✅ **Calculating gross-up amounts** to account for fees deducted on transfer
3. ✅ **Using correct token program** (TOKEN_2022_PROGRAM_ADDRESS) for ATAs and transfers
4. ✅ **Adding memo instructions** conditionally when required by token
5. ✅ **Backend validation** logs Token-2022 payments for monitoring
6. ✅ **Maintaining backward compatibility** with regular SPL tokens

The implementation is production-ready for MVP with optional enhancements available for future hardening.
