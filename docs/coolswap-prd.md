# Product Requirements Document (PRD)
## Cross-Chain Swap dApp: Solana → EVM via deBridge DLN

**Version:** 1.0  
**Date:** January 30, 2026  
**Status:** Approved

---

## 1. Overview

Build a React-based frontend dApp that enables users to execute cross-chain swaps from **Solana (SPL tokens)** to **any supported EVM chain**, using the **deBridge Liquidity Network (DLN) API**. The system must ensure economic guarantees that the gas sponsor never incurs a net loss.

---

## 2. User Personas

| Persona | Description |
|---------|-------------|
| **End User** | Holds SPL tokens on Solana, wants to receive tokens on an EVM chain |
| **Gas Sponsor** | Platform wallet that pays Solana-side transaction costs (abstracted via `prependOperatingExpenses`) |

---

## 3. Functional Requirements

### 3.1 Wallet Connection
- Connect Solana wallet using `@solana/react-hooks` (from Solana's standard framework-kit)
- Display connected wallet address and SOL balance
- Support wallet disconnection

### 3.2 Token Selection (Source - Solana)
- Query supported source tokens from deBridge DLN API
- Display token list with symbols, icons, and user balances
- Support both **legacy SPL tokens** and **Token-2022** mints
- Handle Token-2022 **transfer fees** in calculations

### 3.3 Destination Configuration
- Select target EVM chain from deBridge-supported chains
- Select destination token from deBridge-supported tokens for that chain
- Input EVM recipient address (required, user-provided)
- Validate EVM address format

### 3.4 Quote & Fee Display
- Fetch quote from deBridge `create-tx` endpoint with `prependOperatingExpenses=true`
- Display:
  - Input amount (user-specified)
  - Operating expenses (prepended to input)
  - Total amount charged to user
  - Estimated output on destination chain
  - Protocol fees
  - Approximate fulfillment time
- Quote validity: **30 seconds** (auto-refresh or manual refresh)
- Configurable **slippage tolerance** (user input)

### 3.5 Transaction Execution
- Deserialize the hex-encoded `VersionedTransaction` from API response
- User signs transaction via connected wallet
- Submit to Solana network
- Display transaction status and confirmation

### 3.6 Order Tracking
- Display order ID from API response
- Link to deBridge explorer for cross-chain tracking
- Show order states: Created → Fulfilled → Completed

### 3.7 Error Handling
- Display **user-friendly error messages only** (no technical details)
- Handle common errors:
  - Insufficient balance (including fees)
  - Quote expired
  - Wallet connection issues
  - Network errors
  - Invalid destination address

---

## 4. Non-Functional Requirements

### 4.1 Economic Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| Sponsor pays all Solana-side costs | Use `prependOperatingExpenses=true` - automatically adds costs to user's input amount |
| User pays fee in input token | deBridge deducts from input token, prepends operating expenses |
| Fee covers all sponsored costs | API calculates and prepends full operating expense |
| Sponsor never has net loss | Prepended expenses ensure cost recovery before order creation |
| No accidental SOL gifting | No separate SOL transfers; all costs embedded in token amount |

### 4.2 Token Handling

| Scenario | Handling |
|----------|----------|
| Token-2022 with transfer fees | Include transfer fee in total amount calculation |
| Dust amounts | Validate minimum viable amounts from API |
| Uncloseable accounts (rent) | Absorb rent cost into fee calculation |
| Quote drift/volatility | 30-second validity window; re-fetch before execution |

### 4.3 Bridge Abstraction

The bridge integration must be **encapsulated behind an abstraction layer** to allow swapping between bridge providers (deBridge, Relay) without modifying application logic. This includes:

- Common interface for quote fetching
- Common interface for transaction building
- Common interface for order tracking
- Provider-specific implementations hidden behind the abstraction

### 4.4 Technical Constraints

- **TypeScript** implementation
- **Fully off-chain** (no Solana programs or on-chain contracts)
- Use **standard Solana SDKs** only (`@solana/kit`, `@solana/client`, `@solana/react-hooks`)
- Do NOT use deprecated `@solana/web3.js`
- React + Tailwind CSS for UI

---

## 5. UI/UX Requirements

### 5.1 Main Swap Interface

```
┌─────────────────────────────────────────────┐
│  [Connect Wallet]           Connected: 7xK..│
├─────────────────────────────────────────────┤
│  FROM (Solana)                              │
│  ┌─────────────────────────────────────┐    │
│  │ [Token Selector ▼]     Amount: [___]│    │
│  │ Balance: 1,234.56 USDC              │    │
│  └─────────────────────────────────────┘    │
│                    ↓                        │
│  TO (EVM Chain)                             │
│  ┌─────────────────────────────────────┐    │
│  │ [Chain Selector ▼] [Token ▼]        │    │
│  │ Recipient: [0x________________]     │    │
│  │ You receive: ~1,230.50 USDC         │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│  Fee Breakdown:                             │
│  • Operating expenses: 2.50 USDC           │
│  • Protocol fee: 1.00 USDC                 │
│  • Slippage: 0.5% [Edit]                   │
│  • Est. time: ~5 seconds                   │
├─────────────────────────────────────────────┤
│  Quote refreshes in: 25s [Refresh]         │
│           [Execute Swap]                    │
└─────────────────────────────────────────────┘
```

### 5.2 States to Display

- Wallet not connected
- Loading tokens/chains
- Fetching quote
- Quote ready (with countdown)
- Quote expired
- Transaction pending
- Transaction confirmed
- Order tracking

---

## 6. Out of Scope (MVP)

- Recovery from partial failures (post-MVP)
- Multiple simultaneous swaps
- Price alerts or limit orders
- Transaction history persistence
- EVM → Solana direction

---

## 7. Success Criteria

1. User can complete a swap from any supported SPL token to any EVM chain
2. Sponsor (via prependOperatingExpenses) never loses funds
3. All fees are transparently displayed before execution
4. Token-2022 tokens with transfer fees work correctly
5. Unit tests pass with mocks/stubs

---

## 8. Acceptance Criteria

| # | Scenario | Expected Outcome |
|---|----------|------------------|
| 1 | User swaps 100 USDC from Solana to Arbitrum | Receives ~97-99 USDC on Arbitrum after fees |
| 2 | User attempts swap with insufficient balance | Clear error message, swap blocked |
| 3 | Quote expires before signing | User prompted to refresh quote |
| 4 | Token-2022 with 1% transfer fee | Fee correctly accounted in total charged |
| 5 | Invalid EVM address entered | Validation error shown immediately |

---

## Appendix A: Reference Documentation

### deBridge DLN API
- Order Creation: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/creating-order
- Quick Start: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/quick-start
- Submitting Transaction: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/submitting-the-transaction

### Relay API (Alternative Provider)
- Bridging Guide: https://docs.relay.link/references/api/api_guides/bridging-integration-guide
- Calling Guide: https://docs.relay.link/references/api/api_guides/calling-integration-guide

### Solana SDKs
- Frontend Documentation: https://solana.com/docs/frontend
- `@solana/react-hooks`: https://github.com/solana-foundation/framework-kit/tree/main/packages/react-hooks
- `@solana/client`: https://github.com/solana-foundation/framework-kit/tree/main/packages/client
