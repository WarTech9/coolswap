/**
 * Token-2022 utility functions for transfer fee calculations
 * Pure calculation functions (no RPC calls)
 */

import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import type { PublicKey } from '@solana/web3.js';

export interface TransferFeeConfig {
  transferFeeBasisPoints: number;
  maximumFee: bigint;
}

/**
 * Calculate gross amount needed so that after transfer fees,
 * the recipient receives the target net amount.
 *
 * Formula: gross = (target * 10000) / (10000 - feeBps)
 * Applies maximum fee cap if calculated fee exceeds it.
 *
 * NOTE: This function does NOT add a buffer. Caller should apply
 * buffer externally if needed for price volatility.
 *
 * @param targetNet - The amount the recipient must receive (smallest units)
 * @param feeConfig - Transfer fee configuration from mint account
 * @returns Gross amount to transfer (includes fee only, no buffer)
 * @throws Error if transferFeeBasisPoints >= 10000 (invalid/impossible fee)
 */
export function calculateGrossAmount(
  targetNet: bigint,
  feeConfig: TransferFeeConfig
): bigint {
  const { transferFeeBasisPoints, maximumFee } = feeConfig;

  // Validate transfer fee basis points
  if (transferFeeBasisPoints >= 10000) {
    throw new Error(
      `Invalid transfer fee: ${transferFeeBasisPoints} basis points (>= 100%). ` +
      'Transfer fees must be less than 10000 basis points.'
    );
  }

  // Calculate gross using bigint math
  const gross = (targetNet * 10000n) / (10000n - BigInt(transferFeeBasisPoints));
  const calculatedFee = gross - targetNet;

  // Apply maximum fee cap
  const actualGross = calculatedFee > maximumFee
    ? targetNet + maximumFee
    : gross;

  return actualGross;
}

/**
 * Validate that a transfer amount is sufficient after fees.
 * Returns true if actualNet >= expectedNet after fees applied.
 *
 * @param grossAmount - The amount being transferred (includes fee)
 * @param expectedNet - The expected amount to receive after fees
 * @param feeConfig - Transfer fee configuration from mint account
 * @returns Validation result with actual net amount and shortfall if any
 */
export function validateTransferAmount(
  grossAmount: bigint,
  expectedNet: bigint,
  feeConfig: TransferFeeConfig
): { valid: boolean; actualNet: bigint; shortfall: bigint } {
  const { transferFeeBasisPoints, maximumFee } = feeConfig;

  // Calculate fee on gross amount
  const calculatedFee = (grossAmount * BigInt(transferFeeBasisPoints)) / 10000n;
  const actualFee = calculatedFee > maximumFee ? maximumFee : calculatedFee;

  // Calculate actual net received
  const actualNet = grossAmount - actualFee;

  const valid = actualNet >= expectedNet;
  const shortfall = valid ? 0n : (expectedNet - actualNet);

  return { valid, actualNet, shortfall };
}

/**
 * Check if a public key is the Token-2022 program.
 *
 * @param programId - Program ID to check
 * @returns True if the program ID matches Token-2022
 */
export function isToken2022Program(programId: PublicKey): boolean {
  return programId.equals(TOKEN_2022_PROGRAM_ID);
}
