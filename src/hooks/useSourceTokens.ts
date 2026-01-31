/**
 * Hook to fetch source tokens (Solana tokens)
 * Filters tokens to only show those supported by Kora for gas payment
 */

import { useState, useEffect } from 'react';
import { useTokenService } from '@/context/TokenContext';
import { useGasSponsorService } from '@/context/GasSponsorContext';
import type { Token } from '@/services/bridge/types';

interface UseSourceTokensResult {
  tokens: Token[];
  isLoading: boolean;
  error: string | null;
}

export function useSourceTokens(): UseSourceTokensResult {
  const tokenService = useTokenService();
  const gasSponsor = useGasSponsorService();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTokens() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch tokens from deBridge and supported tokens from Kora in parallel
        const [allTokens, supportedTokens] = await Promise.all([
          tokenService.getSourceTokens(),
          gasSponsor.getSupportedTokens(),
        ]);

        if (!cancelled) {
          // Filter to only show tokens that Kora accepts for gas payment
          const supportedSet = new Set(supportedTokens.map((t) => t.toLowerCase()));
          const filteredTokens = allTokens.filter((token) =>
            supportedSet.has(token.address.toLowerCase())
          );
          setTokens(filteredTokens);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tokens');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchTokens();

    return () => {
      cancelled = true;
    };
  }, [tokenService, gasSponsor]);

  return { tokens, isLoading, error };
}
