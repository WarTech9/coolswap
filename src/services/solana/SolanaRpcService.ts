/**
 * Solana RPC service
 * Provides connection management, priority fee calculation, and transaction submission
 */

import { Connection, VersionedTransaction } from '@solana/web3-compat';

interface HeliusPriorityFeeResponse {
  priorityFeeEstimate?: number;
}

export class SolanaRpcService {
  private connection: Connection;
  private heliusApiKey?: string;

  constructor(rpcUrl: string, wsUrl: string, heliusApiKey?: string) {
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: wsUrl,
    });
    this.heliusApiKey = heliusApiKey;
  }

  /**
   * Get the connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get priority fee in microlamports per compute unit
   * Uses Helius API if available, otherwise falls back to RPC getRecentPrioritizationFees
   */
  async getPriorityFee(): Promise<number> {
    if (this.heliusApiKey) {
      return this.getHeliusPriorityFee();
    }

    return this.getRpcPriorityFee();
  }

  /**
   * Get recent blockhash for transaction signing
   */
  async getRecentBlockhash(): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    return blockhash;
  }

  /**
   * Send and confirm a versioned transaction
   * Returns transaction signature
   */
  async sendTransaction(tx: VersionedTransaction): Promise<string> {
    // Serialize the transaction
    const serialized = tx.serialize();

    // Send using sendRawTransaction
    const signature = await this.connection.sendRawTransaction(serialized, {
      skipPreflight: false,
      maxRetries: 3,
    });

    // Wait for confirmation
    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  /**
   * Get priority fee from Helius API
   */
  private async getHeliusPriorityFee(): Promise<number> {
    try {
      const url = `https://mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getPriorityFeeEstimate',
          params: [
            {
              accountKeys: [],
              options: {
                includeAllPriorityFeeLevels: true,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        console.warn('Helius priority fee request failed, falling back to RPC');
        return this.getRpcPriorityFee();
      }

      const data = (await response.json()) as {
        result?: HeliusPriorityFeeResponse;
      };

      const priorityFee = data.result?.priorityFeeEstimate ?? 0;

      // Return in microlamports per CU
      return Math.ceil(priorityFee);
    } catch (error) {
      console.warn('Error fetching Helius priority fee, falling back to RPC:', error);
      return this.getRpcPriorityFee();
    }
  }

  /**
   * Get priority fee from RPC
   * Returns a reasonable default since getRecentPrioritizationFees is not available in web3-compat
   */
  private async getRpcPriorityFee(): Promise<number> {
    // Return a reasonable default priority fee in microlamports
    // This can be adjusted based on network conditions
    return 1000; // 1000 microlamports per CU
  }
}
