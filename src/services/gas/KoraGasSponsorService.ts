/**
 * Kora Gas Sponsor Service Implementation
 * Uses Kora's fee relayer service to sponsor transaction fees
 *
 * Uses a minimal RPC client instead of @solana/kora SDK to avoid
 * Node.js crypto dependency issues with Vite bundling.
 */

import { assertIsAddress, createNoopSigner, address } from '@solana/kit';
import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
  getTransferInstruction,
} from '@solana-program/token';
import { KoraRpcClient } from './KoraRpcClient';
import type {
  GasSponsorService,
  FeeEstimate,
  PaymentInstructionResult,
} from './GasSponsorService';

/**
 * Kora implementation of gas sponsorship service
 * Allows users to pay transaction fees in SPL tokens instead of SOL
 */
export class KoraGasSponsorService implements GasSponsorService {
  private client: KoraRpcClient;
  private cachedFeePayer: string | null = null;
  private cachedSupportedTokens: string[] | null = null;

  constructor(koraUrl: string) {
    this.client = new KoraRpcClient(koraUrl);
  }

  /**
   * Get the fee payer's public address
   * Results are cached to avoid repeated API calls
   */
  async getFeePayer(): Promise<string> {
    if (this.cachedFeePayer) {
      return this.cachedFeePayer;
    }

    const response = await this.client.getPayerSigner();
    this.cachedFeePayer = response.signer_address;
    return this.cachedFeePayer;
  }

  /**
   * Submit a user-signed transaction through Kora
   * Kora adds fee payer signature and submits to network
   */
  async submitTransaction(signedTx: string): Promise<string> {
    const response = await this.client.signAndSendTransaction({
      transaction: signedTx,
    });
    return response.signature;
  }

  /**
   * Check if Kora service is available
   * Uses getConfig as a health check endpoint
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.getConfig();
      return true;
    } catch (error) {
      console.warn('Kora service unavailable:', error);
      return false;
    }
  }

  /**
   * Estimate transaction fee in both lamports and tokens
   */
  async estimateFee(
    transaction: string,
    feeToken: string,
    signerKey?: string,
    sigVerify?: boolean
  ): Promise<FeeEstimate> {
    try {
      const response = await this.client.estimateTransactionFee({
        transaction,
        fee_token: feeToken,
        signer_key: signerKey,
        sig_verify: sigVerify,
      });

      return {
        lamports: BigInt(response.fee_in_lamports),
        tokenAmount: BigInt(response.fee_in_token),
        paymentAddress: response.payment_address,
        signerAddress: response.signer_pubkey,
      };
    } catch (error) {
      // Enhanced logging for Kora RPC errors
      console.error('Kora estimateFee RPC error:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        feeToken,
        transactionLength: transaction.length,
        signerKey,
        sigVerify,
      });
      throw error;
    }
  }

  /**
   * Get a payment instruction to append to a transaction
   * This instruction transfers tokens from user to sponsor to pay for gas
   *
   * Implementation mirrors @solana/kora SDK's getPaymentInstruction:
   * 1. Estimate fee to get amount and payment address
   * 2. Find ATAs for source (user) and destination (sponsor)
   * 3. Create SPL token transfer instruction
   */
  async getPaymentInstruction(
    transaction: string,
    feeToken: string,
    sourceWallet: string,
    tokenProgramId?: string,
    signerKey?: string,
    sigVerify?: boolean
  ): Promise<PaymentInstructionResult> {
    // Validate addresses
    assertIsAddress(sourceWallet);
    assertIsAddress(feeToken);

    const tokenProgram = tokenProgramId
      ? address(tokenProgramId)
      : TOKEN_PROGRAM_ADDRESS;

    // Get fee estimate from Kora
    const feeResponse = await this.client.estimateTransactionFee({
      transaction,
      fee_token: feeToken,
      signer_key: signerKey,
      sig_verify: sigVerify,
    });

    assertIsAddress(feeResponse.payment_address);

    // Find source token account (user's ATA)
    const [sourceTokenAccount] = await findAssociatedTokenPda({
      owner: address(sourceWallet),
      tokenProgram,
      mint: address(feeToken),
    });

    // Find destination token account (sponsor's ATA)
    const [destinationTokenAccount] = await findAssociatedTokenPda({
      owner: address(feeResponse.payment_address),
      tokenProgram,
      mint: address(feeToken),
    });

    // Create transfer instruction from user to sponsor
    const paymentInstruction = getTransferInstruction({
      source: sourceTokenAccount,
      destination: destinationTokenAccount,
      authority: createNoopSigner(address(sourceWallet)),
      amount: BigInt(feeResponse.fee_in_token),
    });

    return {
      originalTransaction: transaction,
      paymentInstruction,
      paymentAmount: BigInt(feeResponse.fee_in_token),
      paymentToken: feeToken,
      paymentAddress: feeResponse.payment_address,
      signerAddress: feeResponse.signer_pubkey,
    };
  }

  /**
   * Get list of tokens supported for gas payment
   * Results are cached since the list doesn't change during a session
   */
  async getSupportedTokens(): Promise<string[]> {
    if (this.cachedSupportedTokens) {
      return this.cachedSupportedTokens;
    }

    const response = await this.client.getSupportedTokens();
    this.cachedSupportedTokens = response.tokens;
    return this.cachedSupportedTokens;
  }
}
