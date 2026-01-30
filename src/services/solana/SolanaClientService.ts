/**
 * Solana Client Service
 * Provides Solana client instance and helper methods for RPC operations
 */

import {
  createClient,
  autoDiscover,
  type SolanaClient,
  type AccountCacheEntry,
} from '@solana/client';
import { address } from '@solana/addresses';
import type { Signature } from '@solana/keys';
import type { Base64EncodedWireTransaction } from '@solana/transactions';

interface HeliusPriorityFeeResponse {
  priorityFeeEstimate?: number;
}

export class SolanaClientService {
  private client: SolanaClient;
  private heliusApiKey?: string;

  constructor(endpoint: string, websocketEndpoint: string, heliusApiKey?: string) {
    this.client = createClient({
      endpoint,
      websocket: websocketEndpoint,
      walletConnectors: autoDiscover(),
    });
    this.heliusApiKey = heliusApiKey;
  }

  /**
   * Get the Solana client instance
   */
  getClient(): SolanaClient {
    return this.client;
  }

  /**
   * Get priority fee in microlamports per compute unit
   * Uses Helius API if available, otherwise returns a default
   */
  async getPriorityFee(): Promise<number> {
    if (this.heliusApiKey) {
      return this.getHeliusPriorityFee();
    }
    return this.getDefaultPriorityFee();
  }

  /**
   * Get recent blockhash for transaction signing
   */
  async getRecentBlockhash(): Promise<string> {
    const result = await this.client.runtime.rpc
      .getLatestBlockhash({ commitment: 'confirmed' })
      .send();
    return result.value.blockhash;
  }

  /**
   * Fetch account info for a given address
   * Returns AccountCacheEntry with owner as Address or null if account doesn't exist
   */
  async getAccountInfo(addressStr: string): Promise<AccountCacheEntry> {
    const addr = address(addressStr);
    return this.client.actions.fetchAccount(addr);
  }

  /**
   * Send and confirm a serialized transaction
   * Returns transaction signature
   */
  async sendTransaction(serializedTx: Uint8Array): Promise<string> {
    // Encode transaction as base64
    const encodedTx = Buffer.from(serializedTx).toString('base64') as Base64EncodedWireTransaction;

    // Send the transaction
    const signature = await this.client.runtime.rpc
      .sendTransaction(encodedTx, {
        encoding: 'base64',
        skipPreflight: false,
        maxRetries: BigInt(3),
      })
      .send();

    // Wait for confirmation
    await this.confirmTransaction(signature);

    return signature;
  }

  /**
   * Confirm a transaction by signature
   */
  private async confirmTransaction(signature: Signature): Promise<void> {
    // Poll for confirmation
    const maxAttempts = 30;
    const delayMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.client.runtime.rpc
        .getSignatureStatuses([signature])
        .send();

      const result = status.value[0];
      if (result) {
        if (result.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(result.err)}`);
        }
        if (result.confirmationStatus === 'confirmed' || result.confirmationStatus === 'finalized') {
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error('Transaction confirmation timeout');
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
        console.warn('Helius priority fee request failed, using default');
        return this.getDefaultPriorityFee();
      }

      const data = (await response.json()) as {
        result?: HeliusPriorityFeeResponse;
      };

      const priorityFee = data.result?.priorityFeeEstimate ?? 0;
      return Math.ceil(priorityFee);
    } catch (error) {
      console.warn('Error fetching Helius priority fee:', error);
      return this.getDefaultPriorityFee();
    }
  }

  /**
   * Get default priority fee
   */
  private getDefaultPriorityFee(): number {
    return 1000; // 1000 microlamports per CU
  }
}
