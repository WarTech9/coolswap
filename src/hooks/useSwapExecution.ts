/**
 * Hook to execute swap transactions
 * Handles deserialization, signing, and submission of deBridge transactions
 */

import { useState, useCallback, useRef } from 'react';
import { useWalletConnection } from '@solana/react-hooks';
import { getTransactionDecoder, getTransactionEncoder } from '@solana/transactions';
import { useSolanaClient } from '@/context/SolanaContext';
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
 * @param onPause - Callback to pause quote auto-refresh
 * @param onResume - Callback to resume quote auto-refresh
 */
export function useSwapExecution(
  quote: Quote | null,
  onPause?: () => void,
  onResume?: () => void
): UseSwapExecutionResult {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isExecutingRef = useRef(false);
  const { wallet } = useWalletConnection();
  const solanaClient = useSolanaClient();

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
      const transaction = decoder.decode(txBytes);

      // Step 4: Sign the transaction with the wallet
      // The wallet.signTransaction expects a Transaction and returns a signed Transaction
      if (!wallet.signTransaction) {
        throw new Error('Wallet does not support transaction signing');
      }

      // Sign the transaction - wallet will prompt user
      // Use type assertion because deBridge transactions are pre-built and
      // don't carry the nominal type brands from @solana/transactions
      const signedTransaction = await wallet.signTransaction(
        transaction as Parameters<NonNullable<typeof wallet.signTransaction>>[0]
      );

      // Step 5: Encode and send the signed transaction
      setStatus('confirming');

      // Encode the signed transaction to bytes for sending
      const encoder = getTransactionEncoder();
      // Use type assertion for the branded Transaction type
      const signedBytes = encoder.encode(
        signedTransaction as unknown as Parameters<typeof encoder.encode>[0]
      );

      // Convert to regular Uint8Array for our RPC service
      // Copy bytes one by one since signedBytes is ReadonlyUint8Array
      const signedTxBytes = new Uint8Array(signedBytes.length);
      for (let i = 0; i < signedBytes.length; i++) {
        signedTxBytes[i] = signedBytes[i] ?? 0;
      }

      // Send via our RPC service which handles confirmation
      const txSig = await solanaClient.sendTransaction(signedTxBytes);
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
  }, [quote, wallet, solanaClient, onPause, onResume]);

  return {
    execute,
    isExecuting: status === 'signing' || status === 'confirming',
    txSignature,
    error,
    status,
    reset,
  };
}
