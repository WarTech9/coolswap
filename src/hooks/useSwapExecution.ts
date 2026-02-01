/**
 * Hook to execute swap transactions
 * Handles deserialization, signing, and submission of deBridge transactions
 */

import { useState, useCallback, useRef } from 'react';
import { useWalletConnection } from '@solana/react-hooks';
import { getTransactionDecoder, getTransactionEncoder } from '@solana/transactions';
import { address } from '@solana/addresses';
import { useSolanaClient } from '@/context/SolanaContext';
import { useGasSponsorService } from '@/context/GasSponsorContext';
import { appendInstruction, setFeePayer } from '@/services/solana';
import type { Quote, PreparedTransaction } from '@/services/bridge/types';

export type ExecutionStatus = 'idle' | 'signing' | 'confirming' | 'completed' | 'error';

export interface UseSwapExecutionResult {
  execute: () => Promise<void>;
  isExecuting: boolean;
  txSignature: string | null;
  error: string | null;
  status: ExecutionStatus;
  reset: () => void;
}

/**
 * Decode hex string to Uint8Array
 * Exported for testing
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hook for executing swap transactions
 *
 * @param quote - The current quote containing transaction data
 * @param sourceTokenAddress - Source token mint address for Kora payment
 * @param onPause - Callback to pause quote auto-refresh
 * @param onResume - Callback to resume quote auto-refresh
 */
export function useSwapExecution(
  quote: Quote | null,
  sourceTokenAddress: string | null,
  onPause?: () => void,
  onResume?: () => void
): UseSwapExecutionResult {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isExecutingRef = useRef(false);
  const { wallet } = useWalletConnection();
  const solanaClient = useSolanaClient();
  const gasSponsor = useGasSponsorService();

  const reset = useCallback(() => {
    setStatus('idle');
    setTxSignature(null);
    setError(null);
    isExecutingRef.current = false;
  }, []);

  const execute = useCallback(async () => {
    // Prevent double execution
    if (isExecutingRef.current) {
      return;
    }

    if (!quote) {
      setError('No quote available');
      setStatus('error');
      return;
    }

    if (!wallet) {
      setError('Wallet not connected');
      setStatus('error');
      return;
    }

    const txData = quote.transactionData as PreparedTransaction;
    if (!txData?.data) {
      setError('Invalid transaction data');
      setStatus('error');
      return;
    }

    // Validate hex format before decoding
    const hexPattern = /^(0x)?[0-9a-fA-F]+$/;
    if (!hexPattern.test(txData.data)) {
      setError('Invalid transaction data format');
      setStatus('error');
      return;
    }

    // Ensure even length (2 hex chars per byte)
    const cleanHex = txData.data.startsWith('0x') ? txData.data.slice(2) : txData.data;
    if (cleanHex.length % 2 !== 0) {
      setError('Invalid transaction data format');
      setStatus('error');
      return;
    }

    // Check signing capability before processing
    if (!wallet.signTransaction) {
      setError('Wallet does not support transaction signing. Please use a different wallet.');
      setStatus('error');
      return;
    }

    isExecutingRef.current = true;
    onPause?.();

    try {
      // Step 1: Set signing status
      setStatus('signing');
      setError(null);
      setTxSignature(null);

      // Step 2: Decode the hex transaction from deBridge
      const txBytes = hexToBytes(txData.data);

      // Step 3: Decode bytes to Transaction object using @solana/transactions
      const decoder = getTransactionDecoder();
      let transaction = decoder.decode(txBytes);

      // Step 4: Integrate Kora gas sponsorship
      // Get payment instruction (user pays sponsor in tokens for gas)
      if (!sourceTokenAddress) {
        throw new Error('Source token address is required for gas sponsorship');
      }

      // Encode original transaction as base64 for Kora
      const encoder = getTransactionEncoder();
      const originalTxBytes = encoder.encode(
        transaction as unknown as Parameters<typeof encoder.encode>[0]
      );
      // Convert ReadonlyUint8Array to regular Uint8Array for Buffer
      const originalTxArray = new Uint8Array(originalTxBytes.buffer, originalTxBytes.byteOffset, originalTxBytes.byteLength);
      const originalTxBase64 = Buffer.from(originalTxArray).toString('base64');

      // Get wallet address
      if (!wallet.account?.address) {
        throw new Error('Wallet address not available');
      }

      // Get payment instruction from Kora
      const paymentInfo = await gasSponsor.getPaymentInstruction(
        originalTxBase64,
        sourceTokenAddress,
        wallet.account.address
      );

      // Append payment instruction to transaction
      transaction = appendInstruction(
        transaction as any,
        paymentInfo.paymentInstruction
      );

      // Set Kora as fee payer
      transaction = setFeePayer(
        transaction as any,
        address(paymentInfo.signerAddress)
      );

      // Step 5: User signs the transaction (authorizes swap + payment to sponsor)
      // Use type assertion because deBridge transactions are pre-built and
      // don't carry the nominal type brands from @solana/transactions
      const signedTransaction = await wallet.signTransaction(
        transaction as Parameters<NonNullable<typeof wallet.signTransaction>>[0]
      );

      // Step 6: Encode signed transaction for Kora submission
      setStatus('confirming');

      // Encode the signed transaction to base64
      const signedBytes = encoder.encode(
        signedTransaction as unknown as Parameters<typeof encoder.encode>[0]
      );
      // Convert ReadonlyUint8Array to regular Uint8Array for Buffer
      const signedBytesArray = new Uint8Array(signedBytes.buffer, signedBytes.byteOffset, signedBytes.byteLength);
      const signedTxBase64 = Buffer.from(signedBytesArray).toString('base64');

      // Submit via Kora (Kora adds fee payer signature and submits)
      const txSig = await gasSponsor.submitTransaction(signedTxBase64);
      setTxSignature(txSig);

      setStatus('completed');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();

      // Parse specific error types for user-friendly messages
      let userError: string;

      if (lower.includes('reject') || lower.includes('cancel') || lower.includes('denied')) {
        // User rejected the transaction in wallet
        userError = 'Transaction was rejected';
      } else if (lower.includes('insufficient') && lower.includes('balance')) {
        // Not enough tokens for the swap
        userError = 'Insufficient balance for this transaction';
      } else if (lower.includes('insufficient') && lower.includes('lamport')) {
        // Not enough SOL for fees
        userError = 'Insufficient SOL for transaction fees';
      } else if (lower.includes('slippage') || lower.includes('price')) {
        // Price moved too much
        userError = 'Price moved too much. Try increasing slippage tolerance.';
      } else if (lower.includes('timeout') || lower.includes('timed out')) {
        // Transaction took too long to confirm
        userError = 'Transaction confirmation timed out. Check your wallet for status.';
      } else if (lower.includes('blockhash') && lower.includes('not found')) {
        // Transaction expired before submission
        userError = 'Transaction expired. Please try again with a fresh quote.';
      } else if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
        // Network connectivity issues
        userError = 'Network error. Please check your connection and try again.';
      } else if (lower.includes('simulation failed')) {
        // Transaction simulation failed
        userError = 'Transaction simulation failed. The swap may not be valid.';
      } else if (lower.includes('kora') || lower.includes('gas sponsor') || lower.includes('fee payer')) {
        // Kora-specific errors
        userError = 'Gas sponsorship service error. Please try again.';
      } else if (lower.includes('payment instruction')) {
        // Payment instruction error
        userError = 'Unable to create gas payment. Please check your token balance.';
      } else {
        // Fallback to original message or generic error
        userError = message || 'Transaction failed';
      }

      setError(userError);
      setStatus('error');
      onResume?.();
    } finally {
      isExecutingRef.current = false;
    }
  }, [quote, sourceTokenAddress, wallet, solanaClient, gasSponsor, onPause, onResume]);

  return {
    execute,
    isExecuting: status === 'signing' || status === 'confirming',
    txSignature,
    error,
    status,
    reset,
  };
}
