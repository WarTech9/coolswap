/**
 * Shared types for bridge providers
 * These are the normalized types used throughout the application
 */

export interface Chain {
  id: string;
  name: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: string;
  logoUri?: string;
  isToken2022?: boolean;
  transferFeePercent?: number;
}

export interface QuoteRequest {
  sourceChainId: string;
  destinationChainId: string;
  sourceTokenAddress: string;
  destinationTokenAddress: string;
  amount: string;
  senderAddress: string;
  recipientAddress: string;
  slippageTolerance?: number;
}

export interface FeeBreakdown {
  operatingExpenses: string;
  /** Flat network fee in source chain's native token (e.g., SOL lamports) */
  networkFee: string;
  totalFeeUsd?: number;
}

export interface Quote {
  id: string;
  sourceAmount: string;
  destinationAmount: string;
  fees: FeeBreakdown;
  estimatedTimeSeconds: number;
  expiresAt: Date;
  transactionData: unknown;
}

export interface PreparedTransaction {
  data: string;
  chainType: 'solana' | 'evm';
}

export enum OrderStatus {
  PENDING = 'pending',
  CREATED = 'created',
  FULFILLED = 'fulfilled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

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
