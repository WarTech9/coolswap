/**
 * Token-2022 detection and fee calculation service
 * Handles Token-2022 mints with transfer fees
 */

import {
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getTransferFeeConfig,
  getExtensionTypes,
  ExtensionType,
} from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import type { SolanaClientService } from '../solana/SolanaClientService';

export interface Token2022Info {
  isToken2022: boolean;
  transferFeePercent: number | null;
  transferFeeBasisPoints: number | null;
  maximumFee: bigint | null;
  requiresMemoTransfers: boolean;
}

export class Token2022Service {
  private connection: Connection;

  constructor(private solanaClient: SolanaClientService, rpcEndpoint: string) {
    // Create a Connection instance for @solana/spl-token compatibility
    this.connection = new Connection(rpcEndpoint, 'confirmed');
  }

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
          transferFeeBasisPoints: null,
          maximumFee: null,
          requiresMemoTransfers: false,
        };
      }

      // Check if mint owner is TOKEN_2022_PROGRAM_ID
      const isToken2022 = String(accountInfo.owner) === TOKEN_2022_PROGRAM_ID.toBase58();

      if (!isToken2022) {
        return {
          isToken2022: false,
          transferFeePercent: null,
          transferFeeBasisPoints: null,
          maximumFee: null,
          requiresMemoTransfers: false,
        };
      }

      // Token-2022 detected - extract transfer fee config and extensions
      try {
        const mintInfo = await getMint(
          this.connection,
          new PublicKey(mintAddress),
          'confirmed',
          TOKEN_2022_PROGRAM_ID
        );

        // Check for MemoTransfer extension
        const extensions = getExtensionTypes(mintInfo.tlvData);
        const requiresMemoTransfers = extensions.includes(ExtensionType.MemoTransfer);

        const transferFeeConfig = getTransferFeeConfig(mintInfo);

        if (transferFeeConfig) {
          const { newerTransferFee } = transferFeeConfig;
          const basisPoints = newerTransferFee.transferFeeBasisPoints;
          const maxFee = newerTransferFee.maximumFee;

          // Convert basis points to percentage
          const feePercent = Number(basisPoints) / 10000;

          return {
            isToken2022: true,
            transferFeePercent: feePercent,
            transferFeeBasisPoints: Number(basisPoints),
            maximumFee: maxFee,
            requiresMemoTransfers,
          };
        }

        // Token-2022 without transfer fee config
        return {
          isToken2022: true,
          transferFeePercent: null,
          transferFeeBasisPoints: null,
          maximumFee: null,
          requiresMemoTransfers,
        };
      } catch (error) {
        console.warn('Failed to get transfer fee config:', error);
      }

      return {
        isToken2022: true,
        transferFeePercent: null,
        transferFeeBasisPoints: null,
        maximumFee: null,
        requiresMemoTransfers: false,
      };
    } catch (error) {
      // If any error occurs, assume regular SPL token
      console.error('Error detecting Token-2022:', error);
      return {
        isToken2022: false,
        transferFeePercent: null,
        transferFeeBasisPoints: null,
        maximumFee: null,
        requiresMemoTransfers: false,
      };
    }
  }
}
