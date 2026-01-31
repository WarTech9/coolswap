# CoolSwap Task List

## Phase 1: Core Infrastructure
[x] Bridge Provider Abstraction - IBridgeProvider interface + DeBridgeProvider implementation
[x] Token Service - Fetch token lists from deBridge API, Token-2022 detection
[x] Solana RPC Utilities - Connection setup, transaction helpers, priority fee fetching

## Phase 2: Wallet & Token Selection
[x] Wallet Integration - Replace stub with @solana/react-hooks, display address/balance
[x] Token Selector Component - Source token dropdown with balances and icons
[x] Chain Selector Component - Destination chain dropdown

## Phase 3: Quote System
[x] Quote Hook (useQuote) - Fetch quotes from deBridge, 30-second auto-refresh
[x] Quote Display Component - Fee breakdown, countdown timer, slippage setting
[x] Amount Input Component - With max button and validation

## Phase 4: Transaction Execution
[x] Swap Execution - Deserialize, update priority fee, sign, submit
[x] Transaction Status UI - Signing, confirming, completed states

## Phase 5: Order Tracking & Polish
[x] Order Tracking - Poll order status, link to deBridge explorer
[x] Error Handling - User-friendly error messages throughout
[x] UI Polish - Loading states, responsive design, edge cases