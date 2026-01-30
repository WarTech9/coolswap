/**
 * Token-2022 detection and fee calculation service
 * Handles Token-2022 mints with transfer fees
 */

import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3-compat';
import type { SolanaRpcService } from '../solana/SolanaRpcService';

export interface Token2022Info {
  isToken2022: boolean;
  transferFeePercent: number | null;
}

export class Token2022Service {
  constructor(private solanaRpc: SolanaRpcService) {}

  /**
   * Detect if a mint is Token-2022 by checking account owner
   * Note: Transfer fee extraction requires full web3.js, which we'll add in future phases
   */
  async detectToken2022(mintAddress: string): Promise<Token2022Info> {
    try {
      const connection = this.solanaRpc.getConnection();
      const mintPubkey = new PublicKey(mintAddress);

      // Fetch mint account info
      const accountInfo = await connection.getAccountInfo(mintPubkey);

      if (!accountInfo) {
        return {
          isToken2022: false,
          transferFeePercent: null,
        };
      }

      // Check if mint owner is TOKEN_2022_PROGRAM_ID
      const isToken2022 = accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);

      if (!isToken2022) {
        return {
          isToken2022: false,
          transferFeePercent: null,
        };
      }

      // Token-2022 detected but we can't extract transfer fee config yet
      // This will be enhanced when we integrate full web3.js for token operations
      return {
        isToken2022: true,
        transferFeePercent: null,
      };
    } catch (error) {
      // If any error occurs, assume regular SPL token
      console.error('Error detecting Token-2022:', error);
      return {
        isToken2022: false,
        transferFeePercent: null,
      };
    }
  }
}
