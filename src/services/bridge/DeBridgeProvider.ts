/**
 * deBridge DLN API implementation
 * Provides cross-chain swap functionality using deBridge protocol
 */

import type {
  Chain,
  Token,
  QuoteRequest,
  Quote,
  OrderInfo,
  OrderStatus,
  PreparedTransaction,
} from './types';
import type { IBridgeProvider, CreateOrderResult, CreateOrderError } from './IBridgeProvider';
import { DEBRIDGE_CHAIN_IDS } from '@/config/chains';

// deBridge API response types
interface DeBridgeChainInfo {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}

interface DeBridgeToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

interface DeBridgeCreateTxResponse {
  orderId: string;
  estimation: {
    srcChainTokenIn: {
      amount: string;
    };
    dstChainTokenOut: {
      amount: string;
      maxRefundAmount: string;
    };
  };
  order: {
    approximateFulfillmentDelay: number;
  };
  tx: {
    data: string;
  };
  prependedOperatingExpenses?: string;
  fixFee?: string;
}

interface DeBridgeOrderStatusResponse {
  orderId: string;
  status: string;
  srcChainId: number;
  dstChainId: number;
  srcChainTokenIn: {
    amount: string;
  };
  dstChainTokenOut: {
    amount: string;
  };
  srcTransactionHash?: string;
  dstTransactionHash?: string;
  srcExplorerLink?: string;
  createdAt: string;
  updatedAt: string;
}

interface DeBridgeErrorResponse {
  errorId: string;
  errorCode?: string;
  errorMessage: string;
  constraints?: {
    minAmount?: string;
    maxAmount?: string;
  };
}

export class DeBridgeProvider implements IBridgeProvider {
  readonly name = 'deBridge';
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Get supported chains from deBridge API
   */
  async getSupportedChains(): Promise<Chain[]> {
    try {
      const response = await fetch(`${this.baseUrl}/supported-chains-info`);

      if (!response.ok) {
        throw new Error(`Failed to fetch supported chains: ${response.statusText}`);
      }

      const data = (await response.json()) as DeBridgeChainInfo[];

      // Convert deBridge chain IDs back to normalized IDs
      const normalizedChains: Chain[] = [];

      for (const chain of data) {
        const normalizedId = this.toNormalizedChainId(chain.chainId);
        if (normalizedId) {
          normalizedChains.push({
            id: normalizedId,
            name: chain.chainName,
            nativeCurrency: chain.nativeCurrency,
            blockExplorerUrl: chain.blockExplorerUrl,
          });
        }
      }

      return normalizedChains;
    } catch (error) {
      throw new Error(
        `Failed to get supported chains: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get tokens for a specific chain
   */
  async getTokens(chainId: string): Promise<Token[]> {
    try {
      const deBridgeChainId = this.toDeBridgeChainId(chainId);
      const response = await fetch(`${this.baseUrl}/token-list?chainId=${deBridgeChainId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.statusText}`);
      }

      // API returns tokens as object with addresses as keys, not array
      const data = (await response.json()) as { tokens: Record<string, DeBridgeToken> };

      return Object.values(data.tokens).map((token) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        chainId,
        logoUri: token.logoURI,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get tokens: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create order and get quote + transaction data
   * CRITICAL: Always sets prependOperatingExpenses=true for sponsor safety
   */
  async createOrder(request: QuoteRequest): Promise<CreateOrderResult> {
    try {
      const srcChainId = this.toDeBridgeChainId(request.sourceChainId);
      const dstChainId = this.toDeBridgeChainId(request.destinationChainId);

      const params = new URLSearchParams({
        srcChainId: srcChainId.toString(),
        srcChainTokenIn: request.sourceTokenAddress,
        srcChainTokenInAmount: request.amount,
        dstChainId: dstChainId.toString(),
        dstChainTokenOut: request.destinationTokenAddress,
        dstChainTokenOutRecipient: request.recipientAddress,
        srcChainOrderAuthorityAddress: request.senderAddress,
        dstChainOrderAuthorityAddress: request.recipientAddress,
        // CRITICAL: Prepend operating expenses to ensure sponsor never loses funds
        prependOperatingExpenses: 'true',
      });

      // Add optional slippage if provided
      if (request.slippageTolerance !== undefined) {
        // deBridge expects slippage in basis points (e.g., 50 = 0.5%)
        const slippageBps = Math.floor(request.slippageTolerance * 100);
        params.append('affiliateFeePercent', slippageBps.toString());
      }

      const url = `${this.baseUrl}/dln/order/create-tx?${params.toString()}`;
      const response = await fetch(url);

      // Handle expected errors (insufficient liquidity, amount constraints, etc.)
      if (!response.ok) {
        const errorData = (await response.json()) as DeBridgeErrorResponse;
        const createOrderError = this.mapToDeBridgeError(errorData);
        return { success: false, error: createOrderError };
      }

      const data = (await response.json()) as DeBridgeCreateTxResponse;

      // Transaction expires in 30 seconds per deBridge docs
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + 30);

      const quote: Quote = {
        id: data.orderId,
        sourceAmount: data.estimation.srcChainTokenIn.amount,
        destinationAmount: data.estimation.dstChainTokenOut.amount,
        fees: {
          operatingExpenses: data.prependedOperatingExpenses ?? '0',
          protocolFee: data.fixFee ?? '0',
        },
        estimatedTimeSeconds: data.order.approximateFulfillmentDelay,
        expiresAt,
        transactionData: {
          data: data.tx.data,
          chainType: request.sourceChainId === 'solana' ? 'solana' : 'evm',
        } as PreparedTransaction,
      };

      return { success: true, quote };
    } catch (error) {
      // Unexpected errors (network failures, 5xx, etc.)
      throw new Error(
        `Failed to create order: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get order status by order ID
   */
  async getOrderStatus(orderId: string): Promise<OrderInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/dln/order/${orderId}/status`);

      if (!response.ok) {
        throw new Error(`Failed to fetch order status: ${response.statusText}`);
      }

      const data = (await response.json()) as DeBridgeOrderStatusResponse;

      return {
        orderId: data.orderId,
        status: this.mapOrderStatus(data.status),
        sourceChainId: this.toNormalizedChainId(data.srcChainId) ?? 'unknown',
        destinationChainId: this.toNormalizedChainId(data.dstChainId) ?? 'unknown',
        sourceAmount: data.srcChainTokenIn.amount,
        destinationAmount: data.dstChainTokenOut.amount,
        sourceTxHash: data.srcTransactionHash,
        destinationTxHash: data.dstTransactionHash,
        explorerUrl: data.srcExplorerLink,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    } catch (error) {
      throw new Error(
        `Failed to get order status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert normalized chain ID to deBridge chain ID
   */
  private toDeBridgeChainId(normalizedId: string): number {
    const chainId = DEBRIDGE_CHAIN_IDS[normalizedId as keyof typeof DEBRIDGE_CHAIN_IDS];
    if (!chainId) {
      throw new Error(`Unsupported chain ID: ${normalizedId}`);
    }
    return chainId;
  }

  /**
   * Convert deBridge chain ID to normalized chain ID
   */
  private toNormalizedChainId(deBridgeChainId: number): string | null {
    const entry = Object.entries(DEBRIDGE_CHAIN_IDS).find(
      ([, id]) => id === deBridgeChainId
    );
    return entry ? entry[0] : null;
  }

  /**
   * Map deBridge error response to CreateOrderError
   */
  private mapToDeBridgeError(errorData: DeBridgeErrorResponse): CreateOrderError {
    const message = errorData.errorMessage;

    // Check for insufficient liquidity
    if (
      message.toLowerCase().includes('insufficient') ||
      message.toLowerCase().includes('liquidity')
    ) {
      return { code: 'INSUFFICIENT_LIQUIDITY', message };
    }

    // Check for amount too low
    if (
      message.toLowerCase().includes('minimum') ||
      message.toLowerCase().includes('too low')
    ) {
      return {
        code: 'AMOUNT_TOO_LOW',
        message,
        minimum: errorData.constraints?.minAmount ?? '0',
      };
    }

    // Check for amount too high
    if (
      message.toLowerCase().includes('maximum') ||
      message.toLowerCase().includes('too high')
    ) {
      return {
        code: 'AMOUNT_TOO_HIGH',
        message,
        maximum: errorData.constraints?.maxAmount ?? '0',
      };
    }

    // Check for unsupported pair
    if (
      message.toLowerCase().includes('unsupported') ||
      message.toLowerCase().includes('not supported')
    ) {
      return { code: 'UNSUPPORTED_PAIR', message };
    }

    // Default to unsupported pair for unknown errors
    return { code: 'UNSUPPORTED_PAIR', message };
  }

  /**
   * Map deBridge order status to normalized OrderStatus
   */
  private mapOrderStatus(status: string): OrderStatus {
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      case 'pending':
      case 'created':
        return 'created' as OrderStatus;
      case 'fulfilled':
        return 'fulfilled' as OrderStatus;
      case 'completed':
      case 'claimed':
        return 'completed' as OrderStatus;
      case 'cancelled':
        return 'cancelled' as OrderStatus;
      case 'failed':
        return 'failed' as OrderStatus;
      default:
        return 'pending' as OrderStatus;
    }
  }
}
