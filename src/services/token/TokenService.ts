/**
 * Token service for fetching available tokens
 * Delegates to bridge provider for token lists
 */

import type { IBridgeProvider } from '../bridge/IBridgeProvider';
import type { Token } from '../bridge/types';

export class TokenService {
  constructor(private bridgeProvider: IBridgeProvider) {}

  /**
   * Get tokens available on the source chain (Solana)
   */
  async getSourceTokens(): Promise<Token[]> {
    return this.bridgeProvider.getTokens('solana');
  }

  /**
   * Get tokens available on a destination chain
   */
  async getDestinationTokens(chainId: string): Promise<Token[]> {
    return this.bridgeProvider.getTokens(chainId);
  }
}
