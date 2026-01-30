# Technical Specification
## Cross-Chain Swap dApp: Solana → EVM via deBridge DLN

**Version:** 1.0  
**Date:** January 30, 2026  
**Status:** Draft

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REACT APPLICATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Wallet     │  │    Swap      │  │    Token     │  │    Order     │    │
│  │  Connection  │  │    Form      │  │   Selector   │  │   Tracker    │    │
│  │  Component   │  │  Component   │  │  Component   │  │  Component   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │            │
│  ┌──────┴─────────────────┴─────────────────┴─────────────────┴──────┐     │
│  │                         HOOKS LAYER                                │     │
│  │  useWallet  │  useSwap  │  useTokens  │  useQuote  │  useOrder    │     │
│  └──────────────────────────────┬────────────────────────────────────┘     │
│                                 │                                          │
│  ┌──────────────────────────────┴────────────────────────────────────┐     │
│  │                      SERVICES LAYER                                │     │
│  │  ┌─────────────────────────────────────────────────────────────┐  │     │
│  │  │              BRIDGE PROVIDER ABSTRACTION                     │  │     │
│  │  │  ┌─────────────────────┐    ┌─────────────────────┐         │  │     │
│  │  │  │  IBridgeProvider    │◄───│  DeBridgeProvider   │         │  │     │
│  │  │  │  (Interface)        │    │  (Implementation)   │         │  │     │
│  │  │  └─────────────────────┘    └─────────────────────┘         │  │     │
│  │  │           ▲                          │                       │  │     │
│  │  │           │ (Future)                 │                       │  │     │
│  │  │  ┌────────┴────────────┐             │                       │  │     │
│  │  │  │  RelayProvider      │             │                       │  │     │
│  │  │  │  (Not Implemented)  │             │                       │  │     │
│  │  │  └─────────────────────┘             │                       │  │     │
│  │  └──────────────────────────────────────┼───────────────────────┘  │     │
│  │                                         │                          │     │
│  │  ┌─────────────────┐  ┌────────────────┐│ ┌─────────────────────┐  │     │
│  │  │  TokenService   │  │ PriorityFee    ││ │  Token2022Service   │  │     │
│  │  │                 │  │ Service        ││ │                     │  │     │
│  │  └─────────────────┘  └────────────────┘│ └─────────────────────┘  │     │
│  └─────────────────────────────────────────┼──────────────────────────┘     │
│                                            │                                │
├────────────────────────────────────────────┼────────────────────────────────┤
│                           EXTERNAL APIs    │                                │
│  ┌─────────────────┐  ┌───────────────────┐│  ┌─────────────────────┐       │
│  │  deBridge DLN   │  │  Solana RPC       ││  │  Priority Fee API   │       │
│  │  API            │  │  (via web3-compat)││  │  (Helius/Triton)    │       │
│  └─────────────────┘  └───────────────────┘│  └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18+ with TypeScript |
| Styling | Tailwind CSS |
| State Management | React Context + useReducer |
| Solana SDK | `@solana/web3-compat`, `@solana/react-hooks` |
| HTTP Client | Native fetch (or axios) |
| Build Tool | Vite |
| Testing | Vitest + React Testing Library |

---

## 2. Module Breakdown

### 2.1 Directory Structure

```
src/
├── components/
│   ├── wallet/
│   │   ├── WalletButton.tsx
│   │   └── WalletProvider.tsx
│   ├── swap/
│   │   ├── SwapForm.tsx
│   │   ├── TokenInput.tsx
│   │   ├── ChainSelector.tsx
│   │   ├── RecipientInput.tsx
│   │   ├── QuoteDisplay.tsx
│   │   ├── FeeBreakdown.tsx
│   │   └── SwapButton.tsx
│   ├── token/
│   │   ├── TokenSelector.tsx
│   │   ├── TokenList.tsx
│   │   └── TokenSearchInput.tsx
│   ├── order/
│   │   ├── OrderTracker.tsx
│   │   └── OrderStatus.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Spinner.tsx
│       └── Toast.tsx
├── hooks/
│   ├── useWallet.ts
│   ├── useSwap.ts
│   ├── useTokens.ts
│   ├── useQuote.ts
│   ├── useOrder.ts
│   └── usePriorityFee.ts
├── services/
│   ├── bridge/
│   │   ├── types.ts              # Shared interfaces
│   │   ├── IBridgeProvider.ts    # Abstract interface
│   │   ├── DeBridgeProvider.ts   # deBridge implementation
│   │   ├── BridgeProviderFactory.ts
│   │   └── index.ts
│   ├── token/
│   │   ├── TokenService.ts
│   │   └── Token2022Service.ts
│   ├── solana/
│   │   ├── connection.ts
│   │   ├── transaction.ts
│   │   └── priorityFee.ts
│   └── api/
│       └── deBridgeApi.ts
├── context/
│   ├── SwapContext.tsx
│   └── WalletContext.tsx
├── types/
│   ├── token.ts
│   ├── chain.ts
│   ├── quote.ts
│   └── order.ts
├── utils/
│   ├── validation.ts
│   ├── formatting.ts
│   ├── errors.ts
│   └── constants.ts
├── config/
│   ├── chains.ts
│   └── env.ts
└── __tests__/
    ├── services/
    ├── hooks/
    └── components/
```

---

## 3. Bridge Provider Abstraction

### 3.1 Core Interfaces

```typescript
// src/services/bridge/types.ts

/**
 * Normalized chain representation
 * The application uses these IDs; providers map them internally
 */
export interface Chain {
  id: string;                    // Normalized chain identifier
  name: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}

/**
 * Token representation
 */
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: string;
  logoUri?: string;
  isToken2022?: boolean;
  transferFeePercent?: number;   // For Token-2022 with transfer fees
}

/**
 * Quote request parameters
 */
export interface QuoteRequest {
  sourceChainId: string;
  destinationChainId: string;
  sourceTokenAddress: string;
  destinationTokenAddress: string;
  amount: string;                 // Raw amount in smallest units
  senderAddress: string;
  recipientAddress: string;
  slippageTolerance?: number;     // Basis points (e.g., 50 = 0.5%)
}

/**
 * Fee breakdown in the quote
 */
export interface FeeBreakdown {
  operatingExpenses: string;      // Amount in source token
  protocolFee: string;            // Amount in source token
  totalFeeUsd?: number;
}

/**
 * Quote response from bridge provider
 */
export interface Quote {
  id: string;                      // Provider-specific quote/order ID
  sourceAmount: string;            // Total amount user pays (including fees)
  destinationAmount: string;       // Amount user receives
  fees: FeeBreakdown;
  estimatedTimeSeconds: number;
  expiresAt: Date;
  
  // Provider-specific transaction data (opaque to abstraction)
  transactionData: unknown;
}

/**
 * Transaction ready for signing
 */
export interface PreparedTransaction {
  // For Solana: serialized VersionedTransaction (hex)
  // For EVM: { to, data, value }
  data: string;
  chainType: 'solana' | 'evm';
}

/**
 * Order status after submission
 */
export enum OrderStatus {
  PENDING = 'pending',
  CREATED = 'created',
  FULFILLED = 'fulfilled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

/**
 * Order tracking information
 */
export interface OrderInfo {
  orderId: string;
  status: OrderStatus;
  sourceChainId: string;
  destinationChainId: string;
  sourceAmount: string;
  destinationAmount: string;
  sourceTxHash?: string;
  destinationTxHash?: string;
  explorerUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Bridge Provider Interface

```typescript
// src/services/bridge/IBridgeProvider.ts

import {
  Chain,
  Token,
  QuoteRequest,
  Quote,
  PreparedTransaction,
  OrderInfo,
} from './types';

/**
 * Abstract interface for bridge providers.
 * Implementations must handle provider-specific chain ID mapping internally.
 */
export interface IBridgeProvider {
  /**
   * Provider identifier
   */
  readonly name: string;

  /**
   * Get list of supported source chains
   */
  getSupportedSourceChains(): Promise<Chain[]>;

  /**
   * Get list of supported destination chains
   */
  getSupportedDestinationChains(): Promise<Chain[]>;

  /**
   * Get tokens available on a specific chain
   * @param chainId - Normalized chain ID
   * @param options - Optional filters (popular only, search term)
   */
  getTokens(
    chainId: string,
    options?: {
      popularOnly?: boolean;
      searchTerm?: string;
      limit?: number;
    }
  ): Promise<Token[]>;

  /**
   * Get a quote for a cross-chain swap
   * @param request - Quote parameters
   * @returns Quote with fee breakdown and transaction data
   */
  getQuote(request: QuoteRequest): Promise<Quote>;

  /**
   * Prepare transaction for signing
   * @param quote - Quote returned from getQuote
   * @returns Transaction data ready for wallet signing
   */
  prepareTransaction(quote: Quote): Promise<PreparedTransaction>;

  /**
   * Get order status by ID
   * @param orderId - Order ID from quote
   */
  getOrderStatus(orderId: string): Promise<OrderInfo>;

  /**
   * Get order status by source transaction hash
   * @param txHash - Source chain transaction hash
   */
  getOrderByTxHash(txHash: string): Promise<OrderInfo>;
}
```

### 3.3 Chain ID Configuration

```typescript
// src/config/chains.ts

/**
 * Chain configuration with provider-specific mappings
 * The application uses normalized IDs; each provider maps these internally
 */
export interface ChainConfig {
  id: string;                      // Normalized ID used in app
  name: string;
  type: 'solana' | 'evm';
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
  providerChainIds: {
    debridge?: string | number;    // deBridge internal chain ID
    relay?: number;                // Relay chain ID
  };
}

export const CHAIN_CONFIG: Record<string, ChainConfig> = {
  solana: {
    id: 'solana',
    name: 'Solana',
    type: 'solana',
    nativeCurrency: { symbol: 'SOL', decimals: 9 },
    blockExplorerUrl: 'https://solscan.io',
    providerChainIds: {
      debridge: 7565164,
      relay: 792703809, // Solana's chain ID in Relay
    },
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    type: 'evm',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://etherscan.io',
    providerChainIds: {
      debridge: 1,
      relay: 1,
    },
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    type: 'evm',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://arbiscan.io',
    providerChainIds: {
      debridge: 42161,
      relay: 42161,
    },
  },
  base: {
    id: 'base',
    name: 'Base',
    type: 'evm',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://basescan.org',
    providerChainIds: {
      debridge: 8453,
      relay: 8453,
    },
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    type: 'evm',
    nativeCurrency: { symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://polygonscan.com',
    providerChainIds: {
      debridge: 137,
      relay: 137,
    },
  },
  // Add more chains as needed...
};
```

### 3.4 deBridge Provider Implementation

```typescript
// src/services/bridge/DeBridgeProvider.ts

import { IBridgeProvider } from './IBridgeProvider';
import {
  Chain,
  Token,
  QuoteRequest,
  Quote,
  PreparedTransaction,
  OrderInfo,
  OrderStatus,
} from './types';
import { CHAIN_CONFIG } from '../../config/chains';

const DLN_API_BASE = 'https://dln.debridge.finance/v1.0';
const DLN_STATS_API_BASE = 'https://dln-api.debridge.finance/api';

export class DeBridgeProvider implements IBridgeProvider {
  readonly name = 'debridge';

  /**
   * Map normalized chain ID to deBridge internal chain ID
   */
  private toProviderChainId(chainId: string): string {
    const config = CHAIN_CONFIG[chainId];
    if (!config?.providerChainIds.debridge) {
      throw new Error(`Chain ${chainId} not supported by deBridge`);
    }
    return String(config.providerChainIds.debridge);
  }

  /**
   * Map deBridge chain ID back to normalized chain ID
   */
  private fromProviderChainId(providerChainId: string | number): string {
    const entry = Object.entries(CHAIN_CONFIG).find(
      ([_, config]) => String(config.providerChainIds.debridge) === String(providerChainId)
    );
    if (!entry) {
      throw new Error(`Unknown deBridge chain ID: ${providerChainId}`);
    }
    return entry[0];
  }

  async getSupportedSourceChains(): Promise<Chain[]> {
    const response = await fetch(`${DLN_API_BASE}/supported-chains-info`);
    const data = await response.json();
    
    return Object.entries(data.chains).map(([chainId, info]: [string, any]) => ({
      id: this.fromProviderChainId(chainId),
      name: info.chainName,
      nativeCurrency: {
        symbol: info.nativeCurrency.symbol,
        decimals: info.nativeCurrency.decimals,
      },
    }));
  }

  async getSupportedDestinationChains(): Promise<Chain[]> {
    // For deBridge, source and destination chains are the same
    return this.getSupportedSourceChains();
  }

  async getTokens(
    chainId: string,
    options?: { popularOnly?: boolean; searchTerm?: string; limit?: number }
  ): Promise<Token[]> {
    const providerChainId = this.toProviderChainId(chainId);
    
    // Use token-list endpoint for full list, popular tokens endpoint for popular
    const url = options?.popularOnly
      ? `${DLN_STATS_API_BASE}/TokenMetadata/popularTokens/${providerChainId}?take=${options.limit || 50}`
      : `${DLN_API_BASE}/token-list?chainId=${providerChainId}`;

    const response = await fetch(url);
    const data = await response.json();

    if (options?.popularOnly) {
      // Popular tokens endpoint returns different structure
      return data.tokens.map((t: any) => ({
        address: t.tokenAddress.stringValue,
        symbol: '', // Need to fetch metadata separately or cache
        name: '',
        decimals: 0,
        chainId,
      }));
    }

    // Standard token list
    return Object.entries(data.tokens).map(([address, info]: [string, any]) => ({
      address,
      symbol: info.symbol,
      name: info.name,
      decimals: info.decimals,
      chainId,
      logoUri: info.logoURI,
    }));
  }

  async getQuote(request: QuoteRequest): Promise<Quote> {
    const srcChainId = this.toProviderChainId(request.sourceChainId);
    const dstChainId = this.toProviderChainId(request.destinationChainId);

    const params = new URLSearchParams({
      srcChainId,
      srcChainTokenIn: request.sourceTokenAddress,
      srcChainTokenInAmount: request.amount,
      dstChainId,
      dstChainTokenOut: request.destinationTokenAddress,
      dstChainTokenOutAmount: 'auto',
      dstChainTokenOutRecipient: request.recipientAddress,
      srcChainOrderAuthorityAddress: request.senderAddress,
      dstChainOrderAuthorityAddress: request.recipientAddress,
      senderAddress: request.senderAddress,
      prependOperatingExpenses: 'true', // Critical for sponsor protection
    });

    const response = await fetch(`${DLN_API_BASE}/dln/order/create-tx?${params}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errorMessage || 'Failed to get quote');
    }

    const data = await response.json();

    return {
      id: data.orderId,
      sourceAmount: data.estimation.srcChainTokenIn.amount,
      destinationAmount: data.estimation.dstChainTokenOut.amount,
      fees: {
        operatingExpenses: data.estimation.srcChainTokenIn.approximateOperatingExpense || '0',
        protocolFee: '0', // Included in operating expenses for deBridge
      },
      estimatedTimeSeconds: data.order?.approximateFulfillmentDelay || 30,
      expiresAt: new Date(Date.now() + 30000), // 30 second validity
      transactionData: data.tx,
    };
  }

  async prepareTransaction(quote: Quote): Promise<PreparedTransaction> {
    const txData = quote.transactionData as { data: string; to?: string; value?: string };
    
    // For Solana, tx.data is the only field (hex-encoded VersionedTransaction)
    // For EVM, tx has { to, data, value }
    if (txData.to) {
      return {
        data: JSON.stringify(txData),
        chainType: 'evm',
      };
    }

    return {
      data: txData.data,
      chainType: 'solana',
    };
  }

  async getOrderStatus(orderId: string): Promise<OrderInfo> {
    const response = await fetch(`${DLN_API_BASE}/dln/order/${orderId}/status`);
    const data = await response.json();

    return this.mapOrderStatus(data);
  }

  async getOrderByTxHash(txHash: string): Promise<OrderInfo> {
    const response = await fetch(
      `${DLN_STATS_API_BASE}/Orders/creationTxHash/${txHash}`
    );
    const data = await response.json();

    return this.mapOrderStatus(data);
  }

  private mapOrderStatus(data: any): OrderInfo {
    const statusMap: Record<string, OrderStatus> = {
      None: OrderStatus.PENDING,
      Created: OrderStatus.CREATED,
      Fulfilled: OrderStatus.FULFILLED,
      SentUnlock: OrderStatus.COMPLETED,
      OrderCancelled: OrderStatus.CANCELLED,
      SentOrderCancel: OrderStatus.CANCELLED,
      ClaimedUnlock: OrderStatus.COMPLETED,
      ClaimedOrderCancel: OrderStatus.CANCELLED,
    };

    return {
      orderId: data.orderId,
      status: statusMap[data.status] || OrderStatus.PENDING,
      sourceChainId: this.fromProviderChainId(data.giveChainId),
      destinationChainId: this.fromProviderChainId(data.takeChainId),
      sourceAmount: data.giveAmount,
      destinationAmount: data.takeAmount,
      sourceTxHash: data.creationTxHash,
      destinationTxHash: data.fulfillTxHash,
      explorerUrl: `https://app.debridge.finance/order?orderId=${data.orderId}`,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt || data.createdAt),
    };
  }
}
```

### 3.5 Bridge Provider Factory

```typescript
// src/services/bridge/BridgeProviderFactory.ts

import { IBridgeProvider } from './IBridgeProvider';
import { DeBridgeProvider } from './DeBridgeProvider';

export type BridgeProviderType = 'debridge' | 'relay';

export class BridgeProviderFactory {
  private static providers: Map<BridgeProviderType, IBridgeProvider> = new Map();

  static getProvider(type: BridgeProviderType = 'debridge'): IBridgeProvider {
    if (!this.providers.has(type)) {
      switch (type) {
        case 'debridge':
          this.providers.set(type, new DeBridgeProvider());
          break;
        case 'relay':
          throw new Error('Relay provider not implemented');
        default:
          throw new Error(`Unknown provider: ${type}`);
      }
    }
    return this.providers.get(type)!;
  }
}
```

---

## 4. Token-2022 Detection Service

```typescript
// src/services/token/Token2022Service.ts

import { Connection, PublicKey } from '@solana/web3-compat';
import { TOKEN_2022_PROGRAM_ID, getTransferFeeConfig } from '@solana/spl-token';

export interface Token2022Info {
  isToken2022: boolean;
  hasTransferFee: boolean;
  transferFeeBasisPoints?: number;
  maxFee?: bigint;
}

export class Token2022Service {
  constructor(private connection: Connection) {}

  /**
   * Check if a token is Token-2022 and get transfer fee info
   */
  async getToken2022Info(mintAddress: string): Promise<Token2022Info> {
    try {
      const mint = new PublicKey(mintAddress);
      const accountInfo = await this.connection.getAccountInfo(mint);

      if (!accountInfo) {
        return { isToken2022: false, hasTransferFee: false };
      }

      // Check if owned by Token-2022 program
      const isToken2022 = accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);

      if (!isToken2022) {
        return { isToken2022: false, hasTransferFee: false };
      }

      // Get transfer fee config if Token-2022
      const transferFeeConfig = await getTransferFeeConfig(
        this.connection,
        mint
      );

      if (!transferFeeConfig) {
        return { isToken2022: true, hasTransferFee: false };
      }

      const newerConfig = transferFeeConfig.newerTransferFee;
      
      return {
        isToken2022: true,
        hasTransferFee: true,
        transferFeeBasisPoints: newerConfig.transferFeeBasisPoints,
        maxFee: newerConfig.maximumFee,
      };
    } catch (error) {
      console.error('Error checking Token-2022 info:', error);
      return { isToken2022: false, hasTransferFee: false };
    }
  }

  /**
   * Calculate the effective amount after transfer fee
   */
  calculateAmountAfterFee(
    amount: bigint,
    transferFeeBasisPoints: number,
    maxFee: bigint
  ): bigint {
    const fee = (amount * BigInt(transferFeeBasisPoints)) / BigInt(10000);
    const actualFee = fee > maxFee ? maxFee : fee;
    return amount - actualFee;
  }
}
```

---

## 5. Priority Fee Service

```typescript
// src/services/solana/priorityFee.ts

export type PriorityLevel = 'low' | 'medium' | 'high' | 'veryHigh';

export interface PriorityFeeEstimate {
  microLamports: number;
  priorityLevel: PriorityLevel;
}

const PRIORITY_MULTIPLIERS: Record<PriorityLevel, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
  veryHigh: 2.0,
};

/**
 * Fetch priority fee estimates from Helius
 */
export async function getPriorityFeeEstimate(
  rpcUrl: string,
  priorityLevel: PriorityLevel = 'medium'
): Promise<PriorityFeeEstimate> {
  try {
    // Try Helius priority fee API if available
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getPriorityFeeEstimate',
        params: [
          {
            accountKeys: [], // Empty for global estimate
            options: {
              priorityLevel: priorityLevel,
            },
          },
        ],
      }),
    });

    const data = await response.json();
    
    if (data.result?.priorityFeeEstimate) {
      return {
        microLamports: Math.ceil(data.result.priorityFeeEstimate),
        priorityLevel,
      };
    }
  } catch (error) {
    console.warn('Helius priority fee API not available, using fallback');
  }

  // Fallback: Use recent prioritization fees from standard RPC
  return getFallbackPriorityFee(rpcUrl, priorityLevel);
}

async function getFallbackPriorityFee(
  rpcUrl: string,
  priorityLevel: PriorityLevel
): Promise<PriorityFeeEstimate> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPrioritizationFees',
        params: [],
      }),
    });

    const data = await response.json();
    const fees = data.result || [];

    if (fees.length === 0) {
      // Default fallback
      return { microLamports: 10000, priorityLevel };
    }

    // Calculate median fee
    const sortedFees = fees
      .map((f: any) => f.prioritizationFee)
      .sort((a: number, b: number) => a - b);
    
    const medianFee = sortedFees[Math.floor(sortedFees.length / 2)];
    const adjustedFee = Math.ceil(medianFee * PRIORITY_MULTIPLIERS[priorityLevel]);

    return {
      microLamports: Math.max(adjustedFee, 1000), // Minimum 1000 microLamports
      priorityLevel,
    };
  } catch (error) {
    console.error('Error fetching priority fees:', error);
    return { microLamports: 10000, priorityLevel };
  }
}
```

---

## 6. React Hooks

### 6.1 useQuote Hook

```typescript
// src/hooks/useQuote.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { BridgeProviderFactory } from '../services/bridge/BridgeProviderFactory';
import { Quote, QuoteRequest } from '../services/bridge/types';

const QUOTE_VALIDITY_MS = 30000; // 30 seconds
const REFRESH_BUFFER_MS = 5000;  // Refresh 5 seconds before expiry

interface UseQuoteOptions {
  autoRefresh?: boolean;
  onPriceChange?: (oldQuote: Quote, newQuote: Quote) => void;
}

interface UseQuoteResult {
  quote: Quote | null;
  isLoading: boolean;
  error: string | null;
  expiresIn: number; // seconds
  refresh: () => Promise<void>;
}

export function useQuote(
  request: QuoteRequest | null,
  options: UseQuoteOptions = { autoRefresh: true }
): UseQuoteResult {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(0);
  
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const countdownTimerRef = useRef<NodeJS.Timeout>();
  const previousQuoteRef = useRef<Quote | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!request) {
      setQuote(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = BridgeProviderFactory.getProvider();
      const newQuote = await provider.getQuote(request);
      
      // Notify if price changed significantly (>1%)
      if (previousQuoteRef.current && options.onPriceChange) {
        const oldAmount = BigInt(previousQuoteRef.current.destinationAmount);
        const newAmount = BigInt(newQuote.destinationAmount);
        const diff = oldAmount > newAmount 
          ? oldAmount - newAmount 
          : newAmount - oldAmount;
        const percentChange = (diff * BigInt(100)) / oldAmount;
        
        if (percentChange > BigInt(1)) {
          options.onPriceChange(previousQuoteRef.current, newQuote);
        }
      }

      previousQuoteRef.current = newQuote;
      setQuote(newQuote);
      setExpiresIn(QUOTE_VALIDITY_MS / 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quote');
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }, [request, options.onPriceChange]);

  // Auto-refresh logic
  useEffect(() => {
    if (!quote || !options.autoRefresh) return;

    // Countdown timer
    countdownTimerRef.current = setInterval(() => {
      setExpiresIn((prev) => Math.max(0, prev - 1));
    }, 1000);

    // Refresh timer (refresh before expiry)
    refreshTimerRef.current = setTimeout(() => {
      fetchQuote();
    }, QUOTE_VALIDITY_MS - REFRESH_BUFFER_MS);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [quote, options.autoRefresh, fetchQuote]);

  // Initial fetch when request changes
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return {
    quote,
    isLoading,
    error,
    expiresIn,
    refresh: fetchQuote,
  };
}
```

### 6.2 useSwap Hook

```typescript
// src/hooks/useSwap.ts

import { useState, useCallback } from 'react';
import { VersionedTransaction, Connection } from '@solana/web3-compat';
import { BridgeProviderFactory } from '../services/bridge/BridgeProviderFactory';
import { Quote, OrderInfo, OrderStatus } from '../services/bridge/types';
import { getPriorityFeeEstimate } from '../services/solana/priorityFee';
import { useWallet } from './useWallet';

export type SwapState = 
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'submitting'
  | 'confirming'
  | 'tracking'
  | 'completed'
  | 'failed';

interface UseSwapResult {
  state: SwapState;
  error: string | null;
  orderId: string | null;
  txHash: string | null;
  orderInfo: OrderInfo | null;
  executeSwap: (quote: Quote) => Promise<void>;
  reset: () => void;
}

export function useSwap(connection: Connection): UseSwapResult {
  const { signTransaction, publicKey } = useWallet();
  const [state, setState] = useState<SwapState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);

  const executeSwap = useCallback(async (quote: Quote) => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      setState('preparing');
      
      const provider = BridgeProviderFactory.getProvider();
      const prepared = await provider.prepareTransaction(quote);

      if (prepared.chainType !== 'solana') {
        throw new Error('Only Solana source chain supported');
      }

      // Deserialize transaction
      const txBuffer = Buffer.from(prepared.data.slice(2), 'hex');
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // Update priority fee
      const priorityFee = await getPriorityFeeEstimate(
        connection.rpcEndpoint,
        'medium'
      );
      updateTransactionPriorityFee(transaction, priorityFee.microLamports);

      // Update blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.message.recentBlockhash = blockhash;

      // Sign
      setState('signing');
      const signedTx = await signTransaction(transaction);

      // Submit
      setState('submitting');
      const signature = await connection.sendTransaction(signedTx, {
        skipPreflight: false,
        maxRetries: 3,
      });
      setTxHash(signature);

      // Confirm
      setState('confirming');
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      // Track order
      setState('tracking');
      setOrderId(quote.id);
      
      // Poll for completion
      await pollOrderStatus(provider, quote.id, (info) => {
        setOrderInfo(info);
        if (info.status === OrderStatus.COMPLETED) {
          setState('completed');
        } else if (info.status === OrderStatus.FAILED || info.status === OrderStatus.CANCELLED) {
          setState('failed');
          setError('Order failed or was cancelled');
        }
      });

    } catch (err) {
      setState('failed');
      setError(err instanceof Error ? err.message : 'Swap failed');
    }
  }, [connection, publicKey, signTransaction]);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setOrderId(null);
    setTxHash(null);
    setOrderInfo(null);
  }, []);

  return {
    state,
    error,
    orderId,
    txHash,
    orderInfo,
    executeSwap,
    reset,
  };
}

// Helper to update priority fee in transaction
function updateTransactionPriorityFee(
  tx: VersionedTransaction,
  microLamports: number
): void {
  const computeBudgetOffset = 1;
  const priceData = tx.message.compiledInstructions[1]?.data;
  
  if (!priceData) return;

  const encoded = new Uint8Array(8);
  let value = BigInt(microLamports);
  for (let i = 0; i < 8; i++) {
    encoded[i] = Number(value & BigInt(0xff));
    value >>= BigInt(8);
  }

  for (let i = 0; i < encoded.length; i++) {
    priceData[i + computeBudgetOffset] = encoded[i];
  }
}

// Poll order status until complete
async function pollOrderStatus(
  provider: any,
  orderId: string,
  onUpdate: (info: OrderInfo) => void,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const info = await provider.getOrderStatus(orderId);
    onUpdate(info);

    if (
      info.status === OrderStatus.COMPLETED ||
      info.status === OrderStatus.FAILED ||
      info.status === OrderStatus.CANCELLED
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
```

---

## 7. State Management

### 7.1 Swap Context

```typescript
// src/context/SwapContext.tsx

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Token, Quote, OrderInfo } from '../services/bridge/types';

interface SwapState {
  // Source (Solana)
  sourceChainId: string;
  sourceToken: Token | null;
  sourceAmount: string;
  
  // Destination (EVM)
  destinationChainId: string;
  destinationToken: Token | null;
  recipientAddress: string;
  
  // Settings
  slippageTolerance: number; // basis points
  
  // Quote & Order
  quote: Quote | null;
  orderInfo: OrderInfo | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
}

type SwapAction =
  | { type: 'SET_SOURCE_TOKEN'; payload: Token }
  | { type: 'SET_SOURCE_AMOUNT'; payload: string }
  | { type: 'SET_DESTINATION_CHAIN'; payload: string }
  | { type: 'SET_DESTINATION_TOKEN'; payload: Token }
  | { type: 'SET_RECIPIENT_ADDRESS'; payload: string }
  | { type: 'SET_SLIPPAGE'; payload: number }
  | { type: 'SET_QUOTE'; payload: Quote | null }
  | { type: 'SET_ORDER_INFO'; payload: OrderInfo | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

const initialState: SwapState = {
  sourceChainId: 'solana',
  sourceToken: null,
  sourceAmount: '',
  destinationChainId: 'arbitrum',
  destinationToken: null,
  recipientAddress: '',
  slippageTolerance: 50, // 0.5%
  quote: null,
  orderInfo: null,
  isLoading: false,
  error: null,
};

function swapReducer(state: SwapState, action: SwapAction): SwapState {
  switch (action.type) {
    case 'SET_SOURCE_TOKEN':
      return { ...state, sourceToken: action.payload, quote: null };
    case 'SET_SOURCE_AMOUNT':
      return { ...state, sourceAmount: action.payload, quote: null };
    case 'SET_DESTINATION_CHAIN':
      return { 
        ...state, 
        destinationChainId: action.payload, 
        destinationToken: null,
        quote: null 
      };
    case 'SET_DESTINATION_TOKEN':
      return { ...state, destinationToken: action.payload, quote: null };
    case 'SET_RECIPIENT_ADDRESS':
      return { ...state, recipientAddress: action.payload };
    case 'SET_SLIPPAGE':
      return { ...state, slippageTolerance: action.payload };
    case 'SET_QUOTE':
      return { ...state, quote: action.payload };
    case 'SET_ORDER_INFO':
      return { ...state, orderInfo: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const SwapContext = createContext<{
  state: SwapState;
  dispatch: React.Dispatch<SwapAction>;
} | null>(null);

export function SwapProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(swapReducer, initialState);
  
  return (
    <SwapContext.Provider value={{ state, dispatch }}>
      {children}
    </SwapContext.Provider>
  );
}

export function useSwapContext() {
  const context = useContext(SwapContext);
  if (!context) {
    throw new Error('useSwapContext must be used within SwapProvider');
  }
  return context;
}
```

---

## 8. Error Handling

### 8.1 User-Friendly Error Messages

```typescript
// src/utils/errors.ts

export type ErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'QUOTE_EXPIRED'
  | 'WALLET_NOT_CONNECTED'
  | 'INVALID_ADDRESS'
  | 'TRANSACTION_FAILED'
  | 'NETWORK_ERROR'
  | 'SLIPPAGE_EXCEEDED'
  | 'UNKNOWN_ERROR';

const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  INSUFFICIENT_BALANCE: 'You don\'t have enough tokens for this swap.',
  QUOTE_EXPIRED: 'The quote has expired. Please try again.',
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue.',
  INVALID_ADDRESS: 'Please enter a valid destination address.',
  TRANSACTION_FAILED: 'The transaction failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SLIPPAGE_EXCEEDED: 'Price moved too much. Try increasing slippage.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};

export function getUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    // Map known error messages to codes
    const message = error.message.toLowerCase();
    
    if (message.includes('insufficient') || message.includes('balance')) {
      return USER_FRIENDLY_MESSAGES.INSUFFICIENT_BALANCE;
    }
    if (message.includes('expired') || message.includes('stale')) {
      return USER_FRIENDLY_MESSAGES.QUOTE_EXPIRED;
    }
    if (message.includes('wallet') || message.includes('connect')) {
      return USER_FRIENDLY_MESSAGES.WALLET_NOT_CONNECTED;
    }
    if (message.includes('address') || message.includes('invalid')) {
      return USER_FRIENDLY_MESSAGES.INVALID_ADDRESS;
    }
    if (message.includes('slippage')) {
      return USER_FRIENDLY_MESSAGES.SLIPPAGE_EXCEEDED;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return USER_FRIENDLY_MESSAGES.NETWORK_ERROR;
    }
  }

  return USER_FRIENDLY_MESSAGES.UNKNOWN_ERROR;
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Days 1-2)
- [ ] Project setup (Vite + React + TypeScript + Tailwind)
- [ ] Bridge provider abstraction interfaces
- [ ] deBridge API client implementation
- [ ] Chain configuration
- [ ] Basic unit tests for API client

### Phase 2: Services Layer (Days 3-4)
- [ ] DeBridgeProvider implementation
- [ ] Token2022Service implementation
- [ ] PriorityFeeService implementation
- [ ] Token list fetching and caching
- [ ] Unit tests for all services

### Phase 3: React Integration (Days 5-6)
- [ ] Wallet connection (using @solana/react-hooks)
- [ ] SwapContext state management
- [ ] useQuote hook with auto-refresh
- [ ] useSwap hook for transaction execution
- [ ] useTokens hook

### Phase 4: UI Components (Days 7-9)
- [ ] WalletButton component
- [ ] TokenSelector with search
- [ ] ChainSelector dropdown
- [ ] SwapForm main component
- [ ] QuoteDisplay with countdown
- [ ] FeeBreakdown component
- [ ] OrderTracker component

### Phase 5: Polish & Testing (Days 10-12)
- [ ] Error handling and user messages
- [ ] Loading states and animations
- [ ] Responsive design
- [ ] Integration tests
- [ ] Edge case handling
- [ ] Final UI polish

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// src/__tests__/services/DeBridgeProvider.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeBridgeProvider } from '../../services/bridge/DeBridgeProvider';

describe('DeBridgeProvider', () => {
  let provider: DeBridgeProvider;

  beforeEach(() => {
    provider = new DeBridgeProvider();
  });

  describe('getQuote', () => {
    it('should return a valid quote with prependOperatingExpenses', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          orderId: 'test-order-123',
          estimation: {
            srcChainTokenIn: {
              amount: '100000000',
              approximateOperatingExpense: '1000000',
            },
            dstChainTokenOut: {
              amount: '98000000',
            },
          },
          tx: { data: '0x...' },
          order: { approximateFulfillmentDelay: 30 },
        }),
      });

      const quote = await provider.getQuote({
        sourceChainId: 'solana',
        destinationChainId: 'arbitrum',
        sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        destinationTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: '100000000',
        senderAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        recipientAddress: '0x742d35Cc6634C0532925a3b844D5e3dbC8b7C4a2',
      });

      expect(quote.id).toBe('test-order-123');
      expect(quote.sourceAmount).toBe('100000000');
      expect(quote.fees.operatingExpenses).toBe('1000000');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ errorMessage: 'Invalid parameters' }),
      });

      await expect(provider.getQuote({
        sourceChainId: 'solana',
        destinationChainId: 'arbitrum',
        sourceTokenAddress: 'invalid',
        destinationTokenAddress: 'invalid',
        amount: '0',
        senderAddress: 'invalid',
        recipientAddress: 'invalid',
      })).rejects.toThrow('Invalid parameters');
    });
  });
});
```

### 10.2 Mock Fixtures

```typescript
// src/__tests__/fixtures/mockData.ts

export const mockTokens = {
  solanaUsdc: {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 'solana',
  },
  arbitrumUsdc: {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 'arbitrum',
  },
};

export const mockQuote = {
  id: 'mock-order-123',
  sourceAmount: '100000000',
  destinationAmount: '98500000',
  fees: {
    operatingExpenses: '1000000',
    protocolFee: '500000',
  },
  estimatedTimeSeconds: 30,
  expiresAt: new Date(Date.now() + 30000),
  transactionData: { data: '0xmocktxdata' },
};
```

---

## 11. Environment Configuration

```typescript
// src/config/env.ts

export const config = {
  // Solana
  solanaRpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // deBridge
  debridgeDlnApiUrl: import.meta.env.VITE_DEBRIDGE_DLN_API_URL || 'https://dln.debridge.finance/v1.0',
  debridgeStatsApiUrl: import.meta.env.VITE_DEBRIDGE_STATS_API_URL || 'https://dln-api.debridge.finance/api',
  
  // Feature flags
  enableToken2022Detection: import.meta.env.VITE_ENABLE_TOKEN2022_DETECTION !== 'false',
  
  // Defaults
  defaultSlippageBps: Number(import.meta.env.VITE_DEFAULT_SLIPPAGE_BPS) || 50,
  quoteValidityMs: Number(import.meta.env.VITE_QUOTE_VALIDITY_MS) || 30000,
  priorityFeeLevel: (import.meta.env.VITE_PRIORITY_FEE_LEVEL as 'low' | 'medium' | 'high') || 'medium',
};
```

---

## Appendix A: deBridge API Reference

### Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /v1.0/token-list?chainId=X` | Get supported tokens for a chain |
| `GET /v1.0/supported-chains-info` | Get supported chains |
| `GET /v1.0/dln/order/create-tx` | Get quote and transaction |
| `GET /v1.0/dln/order/{orderId}/status` | Get order status |
| `GET /api/TokenMetadata/popularTokens/{chainId}` | Get popular tokens |
| `GET /api/Orders/creationTxHash/{hash}` | Get order by tx hash |

### Key Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `prependOperatingExpenses` | `true` | **Critical** - Ensures sponsor cost recovery |
| `dstChainTokenOutAmount` | `auto` | Let API calculate optimal output |
| `srcChainOrderAuthorityAddress` | User wallet | Authority for order changes |
| `dstChainOrderAuthorityAddress` | Recipient | Authority on destination |

---

## Appendix B: Future Relay Provider Stub

```typescript
// src/services/bridge/RelayProvider.ts (NOT IMPLEMENTED)

import { IBridgeProvider } from './IBridgeProvider';

/**
 * Placeholder for future Relay integration
 * See: https://docs.relay.link/references/api/api_guides/bridging-integration-guide
 */
export class RelayProvider implements IBridgeProvider {
  readonly name = 'relay';

  // All methods throw NotImplementedError
  // Implementation would follow similar patterns to DeBridgeProvider
  // with Relay-specific API calls and chain ID mappings
}
```

---

**Document Complete. Ready for implementation.**
