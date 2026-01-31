/**
 * Hook to execute Relay swap transactions with Kora-first signing
 *
 * CRITICAL: Relay's depositFeePayer flow requires Kora to sign FIRST,
 * then the user signs. This prevents users from modifying unsigned
 * transactions to drain Kora's wallet.
 *
 * Flow:
 * 1. Decode transaction from Relay (Kora already set as fee payer via depositFeePayer)
 * 2. Send to Kora's signTransaction → Kora signs and returns signed tx
 * 3. User wallet signs the Kora-signed transaction
 * 4. Submit directly to Solana RPC (not through Kora)
 *
 * Unlike deBridge, we do NOT add a token payment instruction.
 * Relay handles fees through the quote (user receives less on destination).
 */

import { useState, useCallback, useRef } from 'react';
import { useWalletConnection } from '@solana/react-hooks';
import { getTransactionDecoder, getTransactionEncoder } from '@solana/transactions';
import { useSolanaClient } from '@/context/SolanaContext';
import { useGasSponsorService } from '@/context/GasSponsorContext';
import type { Quote, PreparedTransaction } from '@/services/bridge/types';
import { hexToBytes } from './useSwapExecution';

export type ExecutionStatus = 'idle' | 'signing' | 'confirming' | 'completed' | 'error';

export interface UseRelaySwapExecutionResult {
  execute: () => Promise<void>;
  isExecuting: boolean;
  txSignature: string | null;
  error: string | null;
  status: ExecutionStatus;
  reset: () => void;
}

/**
 * Hook for executing Relay swap transactions with Kora-first signing
 *
 * @param quote - The current quote containing transaction data from Relay
 * @param onPause - Callback to pause quote auto-refresh
 * @param onResume - Callback to resume quote auto-refresh
 */
export function useRelaySwapExecution(
  quote: Quote | null,
  onPause?: () => void,
  onResume?: () => void
): UseRelaySwapExecutionResult {
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
      setStatus('signing');
      setError(null);
      setTxSignature(null);

      // Step 1: Decode the hex transaction from Relay
      const txBytes = hexToBytes(txData.data);
      const decoder = getTransactionDecoder();
      const transaction = decoder.decode(txBytes);

      // Step 2: Encode to base64 for Kora
      const encoder = getTransactionEncoder();
      const encodedBytes = encoder.encode(
        transaction as unknown as Parameters<typeof encoder.encode>[0]
      );
      const encodedBytesArray = new Uint8Array(
        encodedBytes.buffer,
        encodedBytes.byteOffset,
        encodedBytes.byteLength
      );
      const txBase64 = Buffer.from(encodedBytesArray).toString('base64');

      // Step 3: KORA SIGNS FIRST (critical security requirement)
      // This prevents users from modifying the transaction to drain Kora's wallet
      const koraSignedBase64 = await gasSponsor.signTransaction(txBase64);

      // Step 4: Decode Kora-signed transaction for user signing
      const koraSignedBytes = Buffer.from(koraSignedBase64, 'base64');
      const koraSignedTx = decoder.decode(new Uint8Array(koraSignedBytes));

      // Step 5: USER SIGNS the Kora-signed transaction
      const userSignedTx = await wallet.signTransaction(
        koraSignedTx as Parameters<NonNullable<typeof wallet.signTransaction>>[0]
      );

      // Step 6: Submit directly to Solana RPC
      // Unlike deBridge flow, we don't use Kora's signAndSend
      // because Kora already signed in Step 3
      setStatus('confirming');

      const signedBytes = encoder.encode(
        userSignedTx as unknown as Parameters<typeof encoder.encode>[0]
      );
      const signedBytesArray = new Uint8Array(
        signedBytes.buffer,
        signedBytes.byteOffset,
        signedBytes.byteLength
      );

      // Send transaction directly to Solana RPC using SolanaClientService
      const signature = await solanaClient.sendTransaction(signedBytesArray);

      setTxSignature(signature);
      setStatus('completed');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();

      let userError: string;

      if (lower.includes('reject') || lower.includes('cancel') || lower.includes('denied')) {
        userError = 'Transaction was rejected';
      } else if (lower.includes('insufficient') && lower.includes('balance')) {
        userError = 'Insufficient balance for this transaction';
      } else if (lower.includes('kora') || lower.includes('sign')) {
        userError = 'Fee payer signing failed. Please try again.';
      } else if (lower.includes('timeout') || lower.includes('timed out')) {
        userError = 'Transaction confirmation timed out. Check your wallet for status.';
      } else if (lower.includes('blockhash') && lower.includes('not found')) {
        userError = 'Transaction expired. Please try again with a fresh quote.';
      } else if (lower.includes('network') || lower.includes('fetch')) {
        userError = 'Network error. Please check your connection and try again.';
      } else {
        userError = message || 'Transaction failed';
      }

      setError(userError);
      setStatus('error');
      onResume?.();
    } finally {
      isExecutingRef.current = false;
    }
  }, [quote, wallet, solanaClient, gasSponsor, onPause, onResume]);

  return {
    execute,
    isExecuting: status === 'signing' || status === 'confirming',
    txSignature,
    error,
    status,
    reset,
  };
}
