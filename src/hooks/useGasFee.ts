/**
 * Hook to estimate gas fee for Relay swaps
 * Uses Pyth price conversion (gasSolLamports → token amount)
 */

import { useState, useEffect } from 'react';
import { convertLamportsToToken } from '@/services/price';
import type { Quote } from '@/services/bridge/types';

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

  useEffect(() => {
    // Reset state when quote or token changes
    if (!quote || !sourceTokenAddress) {
      setLamports(BigInt(0));
      setTokenAmount(BigInt(0));
      setError(null);
      return;
    }

    // Relay quotes include gasSolLamports
    if (!quote.fees?.gasSolLamports) {
      setError('Gas cost not available in quote');
      return;
    }

    let cancelled = false;

    const estimateGasFee = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const gasLamports = BigInt(quote.fees.gasSolLamports!);

        // Convert lamports to token amount using Pyth price oracle
        const tokenAmount = await convertLamportsToToken(
          gasLamports,
          sourceTokenAddress,
          sourceTokenDecimals
        );

        if (!cancelled) {
          setLamports(gasLamports);
          setTokenAmount(tokenAmount);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to estimate gas fee:', err);
          setError(err instanceof Error ? err.message : 'Failed to estimate gas fee');
          // Set reasonable defaults
          setLamports(BigInt(quote.fees.gasSolLamports || '5000'));
          setTokenAmount(BigInt(0));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    estimateGasFee();

    return () => {
      cancelled = true;
    };
  }, [quote, sourceTokenAddress, sourceTokenDecimals]);

  return {
    lamports,
    tokenAmount,
    isLoading,
    error,
  };
}
