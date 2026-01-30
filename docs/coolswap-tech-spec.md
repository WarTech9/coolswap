# Technical Handoff Document
## Cross-Chain Swap dApp: Solana → EVM via deBridge

**Date:** January 30, 2026  
**Purpose:** Handoff document for implementation in Claude Code

---

## 1. Project Overview

Build a React dApp that enables cross-chain swaps from Solana (SPL tokens) to any EVM chain using deBridge's DLN API. The system must guarantee the gas sponsor never loses funds.

### Core Flow
1. User connects Solana wallet
2. User selects source token (Solana) and destination chain/token (EVM)
3. User enters amount and EVM recipient address
4. System fetches quote with fees prepended
5. User signs transaction
6. System tracks order until completion

---

## 2. Tech Stack Decisions

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React + TypeScript | |
| Styling | Tailwind CSS | Should look polished |
| Solana SDK | `@solana/web3-compat` | NOT deprecated `@solana/web3.js` |
| Wallet | `@solana/react-hooks` | From Solana's framework-kit |
| Build | Vite (recommended) | |
| Testing | Vitest | Mocks/stubs only, no devnet |

---

## 3. Key Architectural Decisions

### 3.1 Bridge Provider Abstraction

Create an abstraction layer so deBridge can be swapped for Relay later:

- **Interface with separate methods**: `getQuote()`, `prepareTransaction()`, `getOrderStatus()`, `getTokens()`
- **MVP**: Only implement `DeBridgeProvider`
- **Chain ID mapping**: Externalize in config. App uses normalized IDs (`"solana"`, `"arbitrum"`), provider maps to internal IDs (deBridge uses `7565164` for Solana)

### 3.2 State Management

- React Context + useReducer (or similar)
- Persist swap state in memory only (survives within session, not across refreshes)
- No database/localStorage persistence

### 3.3 Priority Fees

- Fetch automatically from Helius API (falls back to standard RPC `getRecentPrioritizationFees`)
- Default to **medium** priority
- Update the transaction's compute unit price before signing

### 3.4 Token-2022 Handling

- Query Solana on-chain at runtime to detect Token-2022 mints
- Check for transfer fee extension using `@solana/spl-token`
- Factor transfer fee into amount calculations

### 3.5 Quote Management

- **30-second validity window**
- Auto-refresh silently before expiry
- Show countdown timer in UI

---

## 4. Economic Guarantees (Critical)

The sponsor must never lose funds. This is achieved entirely through deBridge's `prependOperatingExpenses` parameter:

| Guarantee | How It's Achieved |
|-----------|-------------------|
| Sponsor pays Solana gas | `prependOperatingExpenses=true` adds costs to user's input |
| User charged in input token | Operating expenses deducted from input amount |
| Fee covers all costs | deBridge API calculates full operating expense |
| No accidental SOL gifting | All costs embedded in token amount, no separate transfers |

**Key API Parameter**: Always set `prependOperatingExpenses=true` in the `create-tx` call.

---

## 5. deBridge API Integration

### Base URLs
- DLN API: `https://dln.debridge.finance/v1.0`
- Stats API: `https://dln-api.debridge.finance/api`

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /v1.0/token-list?chainId=X` | Get supported tokens |
| `GET /v1.0/supported-chains-info` | Get supported chains |
| `GET /v1.0/dln/order/create-tx?...` | Get quote + transaction (paired) |
| `GET /v1.0/dln/order/{orderId}/status` | Track order status |
| `GET /api/TokenMetadata/popularTokens/{chainId}` | Popular tokens (different API) |

### Critical create-tx Parameters

```
srcChainId              = deBridge chain ID (Solana = 7565164)
srcChainTokenIn         = Token mint address
srcChainTokenInAmount   = Amount in smallest units
dstChainId              = Destination chain ID
dstChainTokenOut        = Destination token address
dstChainTokenOutAmount  = "auto" (let API calculate)
dstChainTokenOutRecipient = User's EVM address
srcChainOrderAuthorityAddress = User's Solana address
dstChainOrderAuthorityAddress = User's EVM address
senderAddress           = User's Solana address
prependOperatingExpenses = true  ← CRITICAL
```

### Solana Transaction Handling

For Solana source, the API returns `tx.data` as a hex-encoded `VersionedTransaction`:

1. Decode: `Buffer.from(tx.data.slice(2), 'hex')`
2. Deserialize: `VersionedTransaction.deserialize(buffer)`
3. Update priority fee in compiled instructions
4. Update `recentBlockhash`
5. Sign with wallet
6. Submit to network

### deBridge Chain IDs (for reference)

| Chain | deBridge ID |
|-------|-------------|
| Solana | 7565164 |
| Ethereum | 1 |
| Arbitrum | 42161 |
| Base | 8453 |
| Polygon | 137 |
| Avalanche | 43114 |
| BNB Chain | 56 |
| Optimism | 10 |
| Linea | 59144 |

---

## 6. UI Requirements

### Main Interface Elements
- Wallet connect button (Solana)
- Source token selector (query from deBridge)
- Amount input
- Destination chain selector
- Destination token selector
- Recipient address input (EVM, required)
- Quote display with fee breakdown
- Countdown timer for quote validity
- Slippage setting (configurable, default 0.5%)
- Execute button
- Order tracking display

### Error Handling
- User-friendly messages only (no technical details)
- Map API errors to readable text

### States to Handle
- Wallet not connected
- Loading tokens/quote
- Quote ready (with countdown)
- Transaction signing
- Transaction confirming
- Order tracking
- Completed/Failed

---

## 7. Token-2022 Detection

Check if a Solana token is Token-2022 with transfer fees:

1. Fetch account info for the mint
2. Check if owner is `TOKEN_2022_PROGRAM_ID`
3. If Token-2022, use `getTransferFeeConfig()` from `@solana/spl-token`
4. If transfer fee exists, factor into calculations

---

## 8. Out of Scope (MVP)

- Recovery from partial failures
- EVM → Solana direction
- Multiple simultaneous swaps
- Price alerts / limit orders
- Transaction history persistence
- Relay provider implementation

---

## 9. Reference Documentation

### deBridge
- Order Creation: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/creating-order
- Quick Start: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/quick-start
- API Parameters: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/api-parameters/api-parameters
- Submitting Transaction: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/submitting-the-transaction
- Token List: https://docs.debridge.com/api-reference/utils/get-v10token-list
- Example Code: https://github.com/debridge-finance/api-integrator-example

### Solana
- Frontend Docs: https://solana.com/docs/frontend
- @solana/react-hooks: https://github.com/solana-foundation/framework-kit/tree/main/packages/react-hooks
- @solana/web3-compat: https://github.com/solana-foundation/framework-kit/tree/main/packages/web3-compat

### Relay (for future reference)
- Bridging Guide: https://docs.relay.link/references/api/api_guides/bridging-integration-guide
- Solana Support: https://docs.relay.link/references/api/api_guides/solana

---

## 10. Testing Approach

- Unit tests with mocks/stubs
- Mock deBridge API responses
- Mock Solana RPC calls
- No devnet integration tests for MVP

---

## 11. Key Implementation Notes

1. **Quote + Transaction are paired** - deBridge's `create-tx` returns both in one call. Don't make separate quote/build calls.

2. **Don't replay quotes** - Using returned amounts in a second call creates a limit order that may not fill. Use the original quote immediately.

3. **30-second window** - Sign and submit within 30 seconds or refresh the quote.

4. **Priority fee pattern** - deBridge's transaction has compute budget instructions at index 0 and 1. Update the price at instruction[1].

5. **Uncloseable accounts** - If Token-2022 accounts can't be closed, absorb rent cost into fee calculation.

6. **deBridge uses different APIs** - Token list is on DLN API, popular tokens is on Stats API. Different base URLs.

---

## 12. References
- Creating an order: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/creating-order
- Quickstart: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/quick-start
- Submitting Transactions: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/submitting-the-transaction
- Refreshing Estimates: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/refreshing-estimates
- Token List API: https://docs.debridge.com/api-reference/utils/get-v10token-list
- Popular tokens API: https://docs.debridge.com/api-reference/tokenmetadata/get-list-of-tokens-from-a-specific-chain-transferred-with-dln-sorted-by-popularity

---

*End of handoff document. Implementation details to be determined during development.*
