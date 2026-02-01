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

export class SolanaClientService {
  private client: SolanaClient;

  constructor(endpoint: string, websocketEndpoint: string) {
    this.client = createClient({
      endpoint,
      websocket: websocketEndpoint,
      walletConnectors: autoDiscover(),
    });
  }

  /**
   * Get the Solana client instance
   */
  getClient(): SolanaClient {
    return this.client;
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
   * Get recent blockhash with full lifetime info for transaction building
   */
  async getLatestBlockhash(): Promise<{
    blockhash: string;
    lastValidBlockHeight: bigint;
  }> {
    const result = await this.client.runtime.rpc
      .getLatestBlockhash({ commitment: 'confirmed' })
      .send();
    return {
      blockhash: result.value.blockhash,
      lastValidBlockHeight: result.value.lastValidBlockHeight,
    };
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
   * Simulate a transaction to check for errors
   * Returns simulation result with logs
   */
  async simulateTransaction(serializedTx: Uint8Array): Promise<{
    err: unknown | null;
    logs: string[] | null;
  }> {
    // Encode transaction as base64
    const encodedTx = Buffer.from(serializedTx).toString('base64') as Base64EncodedWireTransaction;

    // Simulate the transaction
    const result = await this.client.runtime.rpc
      .simulateTransaction(encodedTx, {
        encoding: 'base64',
        commitment: 'confirmed',
      })
      .send();

    return {
      err: result.value.err,
      logs: result.value.logs,
    };
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
}
