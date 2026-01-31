# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoolSwap is a cross-chain swap dApp enabling swaps from **Solana (SPL tokens)** to **any EVM chain** via deBridge DLN API. The sponsor wallet pays Solana-side gas costs, with economic guarantees ensuring the sponsor never loses funds.

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

The app uses an abstraction layer (`IBridgeProvider` interface) so deBridge can be swapped for Relay later:

```
src/services/bridge/
├── types.ts              # Shared interfaces (Chain, Token, Quote, etc.)
├── IBridgeProvider.ts    # Abstract interface
├── DeBridgeProvider.ts   # deBridge implementation (MVP)
├── BridgeProviderFactory.ts
```

App uses **normalized chain IDs** (`"solana"`, `"arbitrum"`). Each provider maps these internally (deBridge uses `7565164` for Solana).

### Key Directories

- `src/components/` - React components (wallet, swap, token, order, ui)
- `src/hooks/` - Custom hooks (useWallet, useSwap, useQuote, useTokens, useOrder)
- `src/services/` - Bridge providers, token services, Solana utilities
- `src/context/` - SwapContext state management
- `src/config/` - Chain configs, environment variables

## deBridge API Integration

**Base URLs**:
- DLN API: `https://dln.debridge.finance/v1.0`
- Stats API: `https://dln-api.debridge.finance/api`

### Critical Parameter

**Always set `prependOperatingExpenses=true`** in create-tx calls. This ensures:
- Sponsor costs are added to user's input amount
- All fees deducted from input token
- No separate SOL transfers needed
- Sponsor never loses funds

### Quote + Transaction Flow

deBridge's `create-tx` returns both quote and transaction together. Don't make separate calls. Sign and submit within **30 seconds** or refresh the quote.

### Transaction Processing (Solana Source)

1. Decode hex: `Buffer.from(tx.data.slice(2), 'hex')`
2. Deserialize: `VersionedTransaction.deserialize(buffer)`
3. Update priority fee at instruction[1]
4. Update `recentBlockhash`
5. Sign and submit

### deBridge Chain IDs

| Chain | ID |
|-------|-----|
| Solana | 7565164 |
| Ethereum | 1 |
| Arbitrum | 42161 |
| Base | 8453 |
| Polygon | 137 |

## Token-2022 Handling

Detect Token-2022 mints at runtime:
1. Check if mint owner is `TOKEN_2022_PROGRAM_ID`
2. Use `getTransferFeeConfig()` from `@solana/spl-token` if Token-2022
3. Factor transfer fees into amount calculations

## Testing

- Use mocks/stubs for deBridge API and Solana RPC
- No devnet integration tests for MVP
- Mock fixtures in `src/__tests__/fixtures/`

## Out of Scope (MVP)

- EVM → Solana direction
- Recovery from partial failures
- Multiple simultaneous swaps
- Transaction history persistence
- Relay provider (stub only)

## Reference Docs

- deBridge: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/creating-order
- Solana frontend: https://solana.com/docs/frontend
- @solana/react-hooks: https://github.com/solana-foundation/framework-kit/tree/main/packages/react-hooks
