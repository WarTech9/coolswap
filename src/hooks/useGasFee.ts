/**
 * Hook to estimate gas fee for swaps
 * - For Relay: Uses Pyth price conversion (gasSolLamports → token amount)
 * - For deBridge: Uses Kora estimation service
 *
 * This ensures accurate gas fee display across both bridge providers.
 */

import { useState, useEffect } from 'react';
import { getTransactionDecoder, getTransactionEncoder } from '@solana/transactions';
import { useGasSponsorService } from '@/context/GasSponsorContext';
import { convertLamportsToToken } from '@/services/price';
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
 * @param sourceTokenDecimals - Source token decimals (for Pyth conversion)
 * @returns Gas fee estimate in lamports and tokens
 */
export function useGasFee(
  quote: Quote | null,
  sourceTokenAddress: string | null,
  sourceTokenDecimals: number = 6
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

    // Check if we have transaction data in either format
    const hasHexData = txData?.data && typeof txData.data === 'string';
    const hasInstructions = txData?.instructions && txData.instructions.length > 0;

    // For Relay transactions (instructions format), use Pyth price conversion
    // instead of Kora estimation. This bypasses Kora's simulation which fails
    // for Relay's depositFeePayer flow.
    if (hasInstructions) {
      const estimateRelayGas = async () => {
        setIsLoading(true);
        setError(null);

        try {
          // Get gas cost from Relay quote (in lamports)
          if (!quote.fees?.gasSolLamports) {
            throw new Error('Gas cost not available in Relay quote');
          }

          const gasLamports = BigInt(quote.fees.gasSolLamports);

          // Convert lamports to token amount using Pyth
          const tokenAmount = await convertLamportsToToken(
            gasLamports,
            sourceTokenAddress,
            sourceTokenDecimals
          );

          setLamports(gasLamports);
          setTokenAmount(tokenAmount);
          setIsLoading(false);
        } catch (err) {
          console.error('Failed to estimate Relay gas fee:', err);
          setError(err instanceof Error ? err.message : 'Failed to estimate gas fee');
          // Set reasonable defaults
          setLamports(BigInt(quote.fees?.gasSolLamports || '5000'));
          setTokenAmount(BigInt(0));
          setIsLoading(false);
        }
      };

      estimateRelayGas();
      return;
    }

    // Need hex data for Kora estimation (deBridge format)
    if (!hasHexData) {
      return;
    }

    let cancelled = false;

    const estimateFee = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Decode pre-serialized hex transaction (deBridge format)
        const txBytes = hexToBytes(txData.data!);
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

        // Estimate fee via Kora
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
