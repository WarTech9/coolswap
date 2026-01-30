# CoolSwap

Cross-chain swap dApp for swapping Solana SPL tokens to any EVM chain via deBridge DLN.

## Features

- Swap from Solana (SPL tokens) to Ethereum, Arbitrum, Base, Polygon, and other EVM chains
- Token-2022 support with transfer fee handling
- Sponsor-paid gas on Solana side (costs prepended to user input)
- Real-time quotes with 30-second validity

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Vitest for testing
- `@solana/web3-compat` (not deprecated web3.js)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Opens at http://localhost:5173

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_HELIUS_API_KEY=your_key_here  # Optional, for priority fees
```

## Project Structure

```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── services/       # Bridge providers, token services
├── context/        # React context (Wallet, Swap state)
├── config/         # Chain configs, environment
└── __tests__/      # Test files
```

## Architecture

The app uses a bridge provider abstraction (`IBridgeProvider`) allowing the underlying bridge (deBridge) to be swapped for alternatives (e.g., Relay) without changing application code.

## License

MIT