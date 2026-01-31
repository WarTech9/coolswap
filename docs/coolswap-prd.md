# Product Requirements Document (PRD)
## Cross-Chain Swap dApp: Solana → EVM via deBridge DLN

**Version:** 1.1
**Date:** January 31, 2026
**Status:** In Progress

---

## 1. Overview

Build a React-based frontend dApp that enables users to execute cross-chain swaps from **Solana (SPL tokens)** to **any supported EVM chain**, using the **deBridge Liquidity Network (DLN) API**.

**Core UX Principle:** Users should **NOT need to hold SOL** to perform a swap. All costs (gas fees, protocol fees, operating expenses) must be payable in the user's input token. This requires a gas sponsorship mechanism.

The system must ensure economic guarantees that the gas sponsor never incurs a net loss.

---

## 2. User Personas

| Persona | Description |
|---------|-------------|
| **End User** | Holds SPL tokens on Solana, wants to receive tokens on an EVM chain. **Does not need to hold SOL.** |
| **Gas Sponsor** | Server-side wallet that pays Solana transaction fees (gas) on behalf of users. Gets reimbursed from the user's input token to ensure zero net loss. |

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

There are **two distinct cost categories** that must be handled:

#### 4.1.1 deBridge Operating Expenses (Handled by API)

| Guarantee | Implementation |
|-----------|----------------|
| deBridge fees paid in input token | Use `prependOperatingExpenses=true` in API calls |
| User pays deBridge fees | API calculates and prepends operating expenses to input amount |

#### 4.1.2 Solana Transaction Gas Fees (Requires Sponsor Mechanism)

**Problem:** Solana requires SOL to pay transaction fees (gas). The deBridge API's `prependOperatingExpenses` does NOT cover this - it only covers deBridge's own fees. Users without SOL cannot submit transactions.

**Requirement:** Implement a gas sponsorship mechanism so users can swap without holding SOL.

| Guarantee | Implementation |
|-----------|----------------|
| User does not need SOL | Sponsor wallet pays Solana transaction fees on user's behalf |
| Sponsor never loses funds | Sponsor is reimbursed from user's input token (before or during swap) |
| Fee covers gas + margin | Include estimated gas cost + small margin in total fee to user |
| Transparent pricing | Display gas sponsorship fee separately in fee breakdown |

#### 4.1.3 Potential Implementation Approaches

| Approach | Description | Complexity |
|----------|-------------|------------|
| **Fee Relay Service** | Third-party service (e.g., Octane, Jito) that accepts token payment for gas | Low - integrate existing solution |
| **Custom Sponsor Backend** | Our own server with funded wallet, swaps portion of user's tokens to SOL for gas | Medium - requires backend service |
| **Bundled Transaction** | Sponsor co-signs and pays gas, gets reimbursed via instruction in same tx | High - requires careful tx construction |

**Decision Required:** Select implementation approach before Phase 6 development.

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
│  • Gas sponsorship: 0.05 USDC              │
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
2. **User can swap without holding any SOL** (gas sponsorship works)
3. Gas sponsor never loses funds (reimbursed from input token)
4. All fees (gas, protocol, operating) are transparently displayed before execution
5. Token-2022 tokens with transfer fees work correctly
6. Unit tests pass with mocks/stubs

---

## 8. Acceptance Criteria

| # | Scenario | Expected Outcome |
|---|----------|------------------|
| 1 | User swaps 100 USDC from Solana to Arbitrum | Receives ~97-99 USDC on Arbitrum after fees |
| 2 | User attempts swap with insufficient balance | Clear error message, swap blocked |
| 3 | Quote expires before signing | User prompted to refresh quote |
| 4 | Token-2022 with 1% transfer fee | Fee correctly accounted in total charged |
| 5 | Invalid EVM address entered | Validation error shown immediately |
| 6 | **User with 0 SOL swaps USDC** | Swap completes successfully; gas paid via sponsorship |
| 7 | **Gas sponsorship fee displayed** | Fee breakdown shows gas sponsorship cost separately |

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

