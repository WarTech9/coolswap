/**
 * Relay Protocol API implementation
 * Provides cross-chain swap functionality using Relay's solver network
 *
 * Key differences from deBridge:
 * - No fixed protocol fee (fixFee) - fees are variable based on relayer competition
 * - Supports fee subsidization - sponsors can cover user fees
 * - Uses order-based v2 protocol for Solana
 *
 * @see https://docs.relay.link
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
import type { IBridgeProvider, CreateOrderResult } from './IBridgeProvider';

// Relay API chain IDs - uses numeric chain IDs for all chains
// Solana uses 792703809 (Relay's internal Solana chain ID)
const RELAY_CHAIN_IDS: Record<string, string> = {
  solana: '792703809',
  ethereum: '1',
  arbitrum: '42161',
  base: '8453',
  polygon: '137',
  optimism: '10',
  avalanche: '43114',
  bnb: '56',
};

// Map normalized chain IDs to Relay currencies API chain IDs
// Note: Solana uses a different numeric ID in the currencies API
const RELAY_CURRENCIES_CHAIN_IDS: Record<string, string> = {
  solana: '792703809',
  ethereum: '1',
  arbitrum: '42161',
  base: '8453',
  polygon: '137',
  optimism: '10',
  avalanche: '43114',
  bnb: '56',
};

// Relay API response types
interface RelayQuoteResponse {
  steps: RelayStep[];
  fees: RelayFees;
  details: RelayDetails;
  // v2 protocol fields
  protocol?: {
    orderId?: string;
    orderData?: string;
    payment?: {
      amount: string;
      currency: string;
      depository: string;
    };
  };
}

interface RelayStep {
  id: string;
  action: string;
  description: string;
  kind: 'transaction' | 'signature';
  requestId?: string;
  items: RelayStepItem[];
}

/** Relay instruction format for Solana transactions */
interface RelayInstructionData {
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  programId: string;
  data: string; // hex-encoded
}

interface RelayStepItem {
  status: string;
  data?: {
    chainId?: string | number;
    to?: string;
    data?: string;
    value?: string;
    // Solana instructions array format
    instructions?: RelayInstructionData[];
  };
  // Solana-specific transaction data (legacy format - may not be present)
  txData?: string; // Base64-encoded Solana transaction
  check?: {
    endpoint: string;
    method: string;
  };
}

interface RelayFees {
  gas: RelayFeeAmount;
  relayer: RelayFeeAmount;
  relayerGas: RelayFeeAmount;
  relayerService: RelayFeeAmount;
  app?: RelayFeeAmount;
  subsidized?: RelayFeeAmount;
}

interface RelayFeeAmount {
  amount: string;
  amountFormatted: string;
  amountUsd: string;
  currency?: {
    chainId: string | number;
    address: string;
    symbol: string;
    decimals: number;
  };
}

interface RelayDetails {
  operation: string;
  timeEstimate: number;
  rate: string;
  slippageTolerance: {
    origin: number;
    destination: number;
  };
  currencyIn: {
    currency: RelayCurrency;
    amount: string;
    amountFormatted: string;
    amountUsd: string;
  };
  currencyOut: {
    currency: RelayCurrency;
    amount: string;
    amountFormatted: string;
    amountUsd: string;
  };
}

interface RelayCurrency {
  chainId: string | number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  metadata?: {
    logoURI?: string;
  };
}

interface RelayChainInfo {
  id: string | number;
  name: string;
  displayName?: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  explorerUrl?: string;
}

interface RelayIntentStatusResponse {
  status: string;  // "refund" | "waiting" | "failure" | "pending" | "submitted" | "success"
  details?: string;
  inTxHashes?: string[];  // Array of incoming transaction hashes
  txHashes?: string[];    // Array of outgoing transaction hashes
  updatedAt?: number;     // Timestamp (milliseconds)
  originChainId?: number;
  destinationChainId?: number;
}

interface RelayErrorResponse {
  message: string;
  statusCode?: number;
  error?: string;
}

export class RelayProvider implements IBridgeProvider {
  readonly name = 'Relay';
  private baseUrl: string;
  private apiKey?: string;
  private depositFeePayer?: string;

  /**
   * @param baseUrl - Relay API base URL (e.g., https://api.relay.link)
   * @param apiKey - Optional Relay API key for authenticated requests
   * @param depositFeePayer - Optional Solana address for Kora to pay transaction fees
   *                         Enables zero-SOL swaps via depositFeePayer parameter
   */
  constructor(baseUrl: string, apiKey?: string, depositFeePayer?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.depositFeePayer = depositFeePayer;
  }

  /**
   * Make authenticated request to Relay API
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = (await response.json()) as RelayErrorResponse;
      throw new Error(error.message || `Relay API error: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get supported chains from Relay API
   */
  async getSupportedChains(): Promise<Chain[]> {
    try {
      // Relay uses a config endpoint for chain info
      const data = await this.fetch<{ chains: RelayChainInfo[] }>('/chains');

      return data.chains.map((chain) => ({
        id: this.toNormalizedChainId(chain.id),
        name: chain.displayName || chain.name,
        nativeCurrency: chain.nativeCurrency,
        blockExplorerUrl: chain.explorerUrl,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get supported chains: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get tokens for a specific chain
   *
   * Fetches from Relay's /currencies/v2 API which returns tokens with logos.
   * For Solana, these are filtered by Kora's getSupportedTokens() in useSourceTokens.
   * For destination chains (EVM), no filtering is applied.
   */
  async getTokens(chainId: string): Promise<Token[]> {
    const relayCurrencyChainId = RELAY_CURRENCIES_CHAIN_IDS[chainId];
    if (!relayCurrencyChainId) return [];

    try {
      const currencies = await this.fetch<RelayCurrency[]>('/currencies/v2', {
        method: 'POST',
        body: JSON.stringify({
          chainIds: [relayCurrencyChainId],
          limit: 50,
        }),
      });

      return currencies.map((c) => ({
        address: c.address,
        symbol: c.symbol,
        name: c.name,
        decimals: c.decimals,
        chainId,
        logoUri: c.metadata?.logoURI,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get tokens: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create order and get quote + transaction data
   *
   * Zero-SOL swaps via depositFeePayer:
   * When depositFeePayer is set (Kora's address), Relay returns a transaction
   * that uses Kora as the fee payer. This enables true zero-SOL swaps where:
   * - User needs NO SOL in their wallet
   * - Kora pays all Solana transaction fees and rent
   * - Fees are factored into the quote (user receives slightly less on destination)
   *
   * SECURITY: With depositFeePayer, Kora MUST sign the transaction FIRST,
   * then the user signs. This prevents users from modifying unsigned transactions
   * to drain Kora's wallet. See useRelaySwapExecution for the signing flow.
   */
  async createOrder(request: QuoteRequest): Promise<CreateOrderResult> {
    try {
      const originChainId = this.toRelayChainId(request.sourceChainId);
      const destinationChainId = this.toRelayChainId(request.destinationChainId);

      const quoteRequest = {
        user: request.senderAddress,
        originChainId,
        destinationChainId,
        originCurrency: request.sourceTokenAddress,
        destinationCurrency: request.destinationTokenAddress,
        amount: request.amount,
        recipient: request.recipientAddress,
        tradeType: 'EXACT_INPUT',
        // Solana-specific options for gasless execution
        ...(request.sourceChainId === 'solana' && {
          includeComputeUnitLimit: true,
          useSharedAccounts: true,
          // depositFeePayer enables zero-SOL swaps:
          // - Kora pays Solana transaction fees and rent
          // - User pays no SOL at all
          // - Fees are factored into the quote (lower destination amount)
          ...(this.depositFeePayer && {
            depositFeePayer: this.depositFeePayer,
          }),
        }),
      };

      const data = await this.fetch<RelayQuoteResponse>('/quote', {
        method: 'POST',
        body: JSON.stringify(quoteRequest),
      });

      // Extract transaction data from steps
      const txStep = data.steps.find(
        (s) => s.kind === 'transaction' && s.items.length > 0
      );

      let transactionData: PreparedTransaction | undefined;

      if (txStep?.items[0]) {
        const item = txStep.items[0];

        if (request.sourceChainId === 'solana') {
          // Relay returns Solana transactions in two possible formats:
          // 1. txData: Base64-encoded serialized transaction (legacy)
          // 2. data.instructions: Array of instructions to build into transaction
          if (item.txData) {
            // Legacy format: pre-serialized transaction
            const bytes = Uint8Array.from(atob(item.txData), (c) =>
              c.charCodeAt(0)
            );
            const hex =
              '0x' +
              Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
            transactionData = {
              data: hex,
              chainType: 'solana',
            };
          } else if (item.data?.instructions && item.data.instructions.length > 0) {
            // Instructions format: store raw instructions, build transaction at execution time
            // This allows us to fetch a fresh blockhash when executing
            transactionData = {
              instructions: item.data.instructions.map((inst) => ({
                keys: inst.keys,
                programId: inst.programId,
                data: inst.data,
              })),
              chainType: 'solana',
            };
          }
        } else if (item.data?.data) {
          // EVM transactions
          transactionData = {
            data: item.data.data,
            chainType: 'evm',
          };
        }
      }

      // Calculate total fees
      const totalFeeUsd =
        parseFloat(data.fees.gas.amountUsd || '0') +
        parseFloat(data.fees.relayer.amountUsd || '0');

      // Relay doesn't have a fixed protocol fee like deBridge
      // All fees are variable based on relayer competition
      const quote: Quote = {
        id: data.protocol?.orderId || txStep?.requestId || crypto.randomUUID(),
        sourceAmount: data.details.currencyIn.amount,
        destinationAmount: data.details.currencyOut.amount,
        fees: {
          // Operating expenses in source token (relayer service fee)
          operatingExpenses: data.fees.relayerService.amount || '0',
          // Network fee - When depositFeePayer is set, Kora pays all SOL fees
          // so user pays 0 SOL. The cost is factored into the quote.
          networkFee: this.depositFeePayer ? '0' : (data.fees.gas.amount || '0'),
          totalFeeUsd,
          // Relay-specific fee data for display
          relayerFee: data.fees.relayer.amount,
          relayerFeeFormatted: data.fees.relayer.amountFormatted,
          // SOL gas cost (for Kora sponsorship display)
          gasSolLamports: data.fees.gas.amount,
          gasSolFormatted: data.fees.gas.amountFormatted,
          gasUsd: data.fees.gas.amountUsd,
        },
        estimatedTimeSeconds: data.details.timeEstimate,
        expiresAt: new Date(Date.now() + 30000), // 30 seconds
        transactionData,
      };

      return { success: true, quote };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Map common Relay errors to our error types
      if (
        message.toLowerCase().includes('insufficient') ||
        message.toLowerCase().includes('liquidity')
      ) {
        return {
          success: false,
          error: { code: 'INSUFFICIENT_LIQUIDITY', message },
        };
      }

      if (
        message.toLowerCase().includes('minimum') ||
        message.toLowerCase().includes('too small')
      ) {
        return {
          success: false,
          error: { code: 'AMOUNT_TOO_LOW', message, minimum: '0' },
        };
      }

      if (
        message.toLowerCase().includes('maximum') ||
        message.toLowerCase().includes('too large')
      ) {
        return {
          success: false,
          error: { code: 'AMOUNT_TOO_HIGH', message, maximum: '0' },
        };
      }

      if (
        message.toLowerCase().includes('unsupported') ||
        message.toLowerCase().includes('not supported')
      ) {
        return {
          success: false,
          error: { code: 'UNSUPPORTED_PAIR', message },
        };
      }

      // Re-throw unexpected errors
      throw error;
    }
  }

  /**
   * Get order status by request ID
   */
  async getOrderStatus(orderId: string): Promise<OrderInfo> {
    try {
      const data = await this.fetch<RelayIntentStatusResponse>(
        `/intents/status/v3?requestId=${orderId}`
      );

      return {
        orderId,
        status: this.mapOrderStatus(data.status),
        sourceChainId: data.originChainId
          ? this.toNormalizedChainId(data.originChainId)
          : 'solana',  // Fallback to solana
        destinationChainId: data.destinationChainId
          ? this.toNormalizedChainId(data.destinationChainId)
          : 'unknown',
        sourceAmount: '0',  // Not available in v3 status API
        destinationAmount: '0',  // Not available in v3 status API
        sourceTxHash: data.inTxHashes?.[0],  // Take first hash from array
        destinationTxHash: data.txHashes?.[0],  // Take first hash from array
        createdAt: new Date(),  // Not available in v3 API, use current time
        updatedAt: data.updatedAt
          ? new Date(data.updatedAt)  // Convert timestamp to Date
          : new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to get order status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert normalized chain ID to Relay chain ID
   */
  private toRelayChainId(normalizedId: string): number {
    const chainId = RELAY_CHAIN_IDS[normalizedId];
    if (!chainId) {
      throw new Error(`Unsupported chain ID: ${normalizedId}`);
    }
    return parseInt(chainId, 10);
  }

  /**
   * Convert Relay chain ID to normalized chain ID
   */
  private toNormalizedChainId(relayChainId: string | number): string {
    const id = String(relayChainId);
    const entry = Object.entries(RELAY_CHAIN_IDS).find(([, v]) => v === id);
    return entry ? entry[0] : id;
  }

  /**
   * Map Relay order status to normalized OrderStatus
   */
  private mapOrderStatus(status: string): OrderStatus {
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      case 'pending':
      case 'waiting':
        return 'pending' as OrderStatus;
      case 'processing':
      case 'created':
        return 'created' as OrderStatus;
      case 'success':
      case 'fulfilled':
        return 'fulfilled' as OrderStatus;
      case 'complete':
      case 'completed':
        return 'completed' as OrderStatus;
      case 'refunded':
      case 'cancelled':
        return 'cancelled' as OrderStatus;
      case 'failed':
      case 'expired':
        return 'failed' as OrderStatus;
      default:
        return 'pending' as OrderStatus;
    }
  }
}
