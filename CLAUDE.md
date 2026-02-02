# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoolSwap is a cross-chain swap dApp enabling swaps from **Solana (SPL tokens)** to **any EVM chain** via Relay. The server wallet pays Solana-side gas costs and receives token reimbursements through Relay's depositFeePayer mechanism.

## Tech Stack

- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **Package Manager**: pnpm
- **Testing**: Vitest + React Testing Library (mocks only, no devnet)
- **State**: React Context + useReducer
- **Solana SDK**: `@solana/web3-compat`, `@solana/react-hooks` from framework-kit

**CRITICAL**: Do NOT use the deprecated `@solana/web3.js`. Always use `@solana/web3-compat`.

## Build and Test Commands

```bash
pnpm install         # Install dependencies
pnpm dev             # Start development server
pnpm build           # Production build
pnpm test            # Run tests
pnpm lint            # Run linter
```

## Development workflow
- Use the fullstack-developer subagent for writing code
- After every major code change, use the code-reviewer subagent for reviewing changes

## Architecture

### Bridge Provider Abstraction

The app uses an abstraction layer (`IBridgeProvider` interface) for potential future provider implementations:

```
src/services/bridge/
├── types.ts              # Shared interfaces (Chain, Token, Quote, etc.)
├── IBridgeProvider.ts    # Abstract interface
├── RelayProvider.ts      # Relay implementation (current)
├── BridgeProviderFactory.ts
```

App uses **normalized chain IDs** (`"solana"`, `"arbitrum"`, etc.). Each provider maps these internally.

### Key Directories

- `src/components/` - React components (wallet, swap, token, order, ui)
- `src/hooks/` - Custom hooks (useWallet, useSwap, useQuote, useTokens, useOrder)
- `src/services/` - Bridge providers, token services, Solana utilities
- `src/context/` - SwapContext state management
- `src/config/` - Chain configs, environment variables

## Relay API Integration

**Base URL**: `https://api.relay.link`

### Gas Sponsorship Flow

Uses Relay's `depositFeePayer` mechanism for zero-SOL swaps:
1. User approves token transfer and bridge transaction
2. Server wallet pays SOL fees upfront
3. Bridge provider deducts equivalent tokens from user's deposit
4. Server wallet receives token reimbursement automatically

### Quote + Transaction Flow

Relay provides unified quote endpoint. Transactions expire after **30 seconds** - refresh if needed.

### Transaction Processing (Solana Source)

1. User signs transaction with wallet
2. Server adds its signature as fee payer
3. Backend submits combined transaction to Solana
4. Fee reimbursement happens automatically via Relay

## Token-2022 Handling

Detect Token-2022 mints at runtime:
1. Check if mint owner is `TOKEN_2022_PROGRAM_ID`
2. Use `getTransferFeeConfig()` from `@solana/spl-token` if Token-2022
3. Factor transfer fees into amount calculations

## Testing

- Use mocks/stubs for Relay API and Solana RPC
- No devnet integration tests for MVP
- Mock fixtures in `src/__tests__/fixtures/`

## Out of Scope (MVP)

- EVM → Solana direction
- Recovery from partial failures
- Multiple simultaneous swaps
- Transaction history persistence

## Reference Docs

- Relay: https://docs.relay.link
- Solana frontend: https://solana.com/docs/frontend
- @solana/react-hooks: https://github.com/solana-foundation/framework-kit/tree/main/packages/react-hooks
