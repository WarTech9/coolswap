/**
 * Hook to estimate gas fee for Kora sponsorship
 * Fetches fee estimate when quote and token are available
 */

import { useState, useEffect } from 'react';
import { getTransactionDecoder, getTransactionEncoder } from '@solana/transactions';
import { useGasSponsorService } from '@/context/GasSponsorContext';
import type { Quote, PreparedTransaction } from '@/services/bridge/types';
import { hexToBytes } from './useSwapExecution';

export interface GasFeeEstimate {
  lamports: bigint;
  tokenAmount: bigint;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to estimate gas fees for a quote
 * @param quote - Current quote with transaction data
 * @param sourceTokenAddress - Source token mint address
 * @returns Gas fee estimate in lamports and tokens
 */
export function useGasFee(
  quote: Quote | null,
  sourceTokenAddress: string | null
): GasFeeEstimate {
  const [lamports, setLamports] = useState<bigint>(BigInt(0));
  const [tokenAmount, setTokenAmount] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gasSponsor = useGasSponsorService();

  useEffect(() => {
    // Reset state when quote or token changes
    if (!quote || !sourceTokenAddress) {
      setLamports(BigInt(0));
      setTokenAmount(BigInt(0));
      setError(null);
      return;
    }

    const txData = quote.transactionData as PreparedTransaction;
    if (!txData?.data) {
      return;
    }

    let cancelled = false;

    const estimateFee = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Decode the transaction to get base64 encoding
        const txBytes = hexToBytes(txData.data);
        const decoder = getTransactionDecoder();
        const transaction = decoder.decode(txBytes);

        // Encode to base64 for Kora
        const encoder = getTransactionEncoder();
        const encodedBytes = encoder.encode(
          transaction as unknown as Parameters<typeof encoder.encode>[0]
        );
        // Convert ReadonlyUint8Array to regular Uint8Array for Buffer
        const encodedBytesArray = new Uint8Array(encodedBytes.buffer, encodedBytes.byteOffset, encodedBytes.byteLength);
        const txBase64 = Buffer.from(encodedBytesArray).toString('base64');

        // Estimate fee
        const estimate = await gasSponsor.estimateFee(
          txBase64,
          sourceTokenAddress
        );

        if (!cancelled) {
          setLamports(estimate.lamports);
          setTokenAmount(estimate.tokenAmount);
        }
      } catch (err) {
        if (!cancelled) {
          // Detailed error logging for debugging Kora integration
          console.error('Failed to estimate gas fee:', {
            error: err,
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            sourceToken: sourceTokenAddress,
            quoteId: quote?.id,
          });
          setError(err instanceof Error ? err.message : 'Failed to estimate gas fee');
          // Set reasonable defaults on error
          setLamports(BigInt(5000)); // ~5000 lamports typical
          setTokenAmount(BigInt(0));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    estimateFee();

    return () => {
      cancelled = true;
    };
  }, [quote, sourceTokenAddress, gasSponsor]);

  return {
    lamports,
    tokenAmount,
    isLoading,
    error,
  };
}
