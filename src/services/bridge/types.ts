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

/**
 * Base token properties (always present)
 */
interface BaseToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: string;
  logoUri?: string;
}

/**
 * Token type with discriminated union for Token-2022 state
 *
 * Valid states:
 * 1. Regular SPL token: { isToken2022: false }
 * 2. Token-2022 without fees: { isToken2022: true, transferFeePercent: null, ... }
 * 3. Token-2022 with fees: { isToken2022: true, transferFeePercent: number, ... }
 *
 * This prevents invalid states like:
 * - Token-2022 with missing fee data
 * - Regular token with fee data
 * - Partial fee data
 */
export type Token = BaseToken & (
  // Regular SPL token (no Token-2022 properties)
  | {
      isToken2022: false;
    }

  // Token-2022 without transfer fees
  | {
      isToken2022: true;
      transferFeePercent: null;
      transferFeeBasisPoints: null;
      maximumFee: null;
      requiresMemoTransfers?: boolean;
    }

  // Token-2022 with transfer fees (all three required)
  | {
      isToken2022: true;
      transferFeePercent: number;
      transferFeeBasisPoints: number;
      maximumFee: bigint;
      requiresMemoTransfers?: boolean;
    }
);

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
  /** Relay-specific: Total relayer fee in source token smallest units */
  relayerFee?: string;
  /** Relay-specific: Human-readable relayer fee (e.g., "0.02693") */
  relayerFeeFormatted?: string;
  /** Relay-specific: SOL gas cost in lamports */
  gasSolLamports?: string;
  /** Relay-specific: Human-readable SOL gas (e.g., "0.001175") */
  gasSolFormatted?: string;
  /** Relay-specific: SOL gas cost in USD */
  gasUsd?: string;
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

/** Relay instruction format from API response */
export interface RelayInstruction {
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  programId: string;
  /** Hex-encoded instruction data */
  data: string;
}

export interface PreparedTransaction {
  /** Hex-encoded serialized transaction (deBridge format) */
  data?: string;
  /** Raw instructions array (Relay format) - built into transaction at execution time */
  instructions?: RelayInstruction[];
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
