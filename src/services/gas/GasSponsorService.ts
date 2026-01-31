/**
 * Gas Sponsor Service Interface
 * Defines the contract for gas sponsorship providers like Kora
 */

import type { Instruction } from '@solana/kit';

/**
 * Fee estimation result
 */
export interface FeeEstimate {
  /** Fee amount in lamports */
  lamports: bigint;
  /** Fee amount in tokens (if paying with SPL token) */
  tokenAmount: bigint;
  /** Payment destination address */
  paymentAddress: string;
  /** Signer address (fee payer) */
  signerAddress: string;
}

/**
 * Payment instruction result
 */
export interface PaymentInstructionResult {
  /** The original transaction (base64) */
  originalTransaction: string;
  /** Payment instruction to append to transaction */
  paymentInstruction: Instruction;
  /** Payment amount in token's smallest unit */
  paymentAmount: bigint;
  /** Token mint address used for payment */
  paymentToken: string;
  /** Address receiving the payment (sponsor's ATA) */
  paymentAddress: string;
  /** Address that will sign as fee payer */
  signerAddress: string;
}

/**
 * Interface for gas sponsorship services
 * Allows users to pay transaction fees in tokens instead of SOL
 */
export interface GasSponsorService {
  /**
   * Get the fee payer's public address
   * @returns The public key of the sponsor's fee payer account
   */
  getFeePayer(): Promise<string>;

  /**
   * Submit a user-signed transaction through the sponsor
   * The sponsor adds their signature as fee payer and submits to network
   * @param signedTx - Transaction signed by user (encoded as base64)
   * @returns Transaction signature
   */
  submitTransaction(signedTx: string): Promise<string>;

  /**
   * Check if the sponsor service is available
   * @returns true if service is reachable and operational
   */
  isAvailable(): Promise<boolean>;

  /**
   * Estimate transaction fee in both lamports and tokens
   * @param transaction - Base64-encoded transaction to estimate fees for
   * @param feeToken - Token mint address to use for fee payment
   * @param signerKey - Optional signer address for simulation
   * @param sigVerify - Optional signature verification during simulation
   * @returns Fee estimation in lamports and tokens
   */
  estimateFee(
    transaction: string,
    feeToken: string,
    signerKey?: string,
    sigVerify?: boolean
  ): Promise<FeeEstimate>;

  /**
   * Get a payment instruction to append to a transaction
   * This instruction transfers tokens from user to sponsor to pay for gas
   * @param transaction - Base64-encoded transaction
   * @param feeToken - Token mint address to use for payment
   * @param sourceWallet - User's wallet address
   * @param tokenProgramId - Optional token program ID (defaults to standard Token program)
   * @param signerKey - Optional signer address for simulation
   * @param sigVerify - Optional signature verification during simulation
   * @returns Payment instruction details
   */
  getPaymentInstruction(
    transaction: string,
    feeToken: string,
    sourceWallet: string,
    tokenProgramId?: string,
    signerKey?: string,
    sigVerify?: boolean
  ): Promise<PaymentInstructionResult>;

  /**
   * Get list of token mint addresses supported for gas payment
   * Frontend should filter source tokens to only show these
   * @returns Array of token mint addresses (e.g., USDC, USDT)
   */
  getSupportedTokens(): Promise<string[]>;
}
