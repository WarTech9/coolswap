/**
 * Token-2022 detection and fee calculation service
 * Handles Token-2022 mints with transfer fees
 */

import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import type { SolanaClientService } from '../solana/SolanaClientService';

export interface Token2022Info {
  isToken2022: boolean;
  transferFeePercent: number | null;
}

export class Token2022Service {
  constructor(private solanaClient: SolanaClientService) {}

  /**
   * Detect if a mint is Token-2022 by checking account owner
   */
  async detectToken2022(mintAddress: string): Promise<Token2022Info> {
    try {
      const accountInfo = await this.solanaClient.getAccountInfo(mintAddress);

      // Check if account exists (owner is null if account doesn't exist)
      if (!accountInfo || accountInfo.owner === null) {
        return {
          isToken2022: false,
          transferFeePercent: null,
        };
      }

      // Check if mint owner is TOKEN_2022_PROGRAM_ID
      const isToken2022 = String(accountInfo.owner) === TOKEN_2022_PROGRAM_ID.toBase58();

      if (!isToken2022) {
        return {
          isToken2022: false,
          transferFeePercent: null,
        };
      }

      // Token-2022 detected
      // Transfer fee extraction requires parsing the mint account data
      // This will be enhanced in future phases
      // TODO: Transfer fee extraction not yet implemented
      // This may cause incorrect amount calculations for Token-2022 mints with transfer fees
      console.warn(
        `Token-2022 mint detected (${mintAddress}), but transfer fee extraction not implemented. ` +
        `Amounts may be inaccurate if this mint has transfer fees enabled.`
      );
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
