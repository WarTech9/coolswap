/**
 * Hook to fetch destination tokens for a specific chain
 */

import { useState, useEffect } from 'react';
import { useTokenService } from '@/context/TokenContext';
import type { Token } from '@/services/bridge/types';

interface UseDestinationTokensResult {
  tokens: Token[];
  isLoading: boolean;
  error: string | null;
}

export function useDestinationTokens(chainId: string | null): UseDestinationTokensResult {
  const tokenService = useTokenService();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chainId) {
      setTokens([]);
      setIsLoading(false);
      return;
    }

    // Capture chainId for use in async function (TypeScript narrowing)
    const currentChainId = chainId;
    let cancelled = false;

    async function fetchTokens() {
      try {
        setIsLoading(true);
        setError(null);
        const result = await tokenService.getDestinationTokens(currentChainId);
        if (!cancelled) {
          setTokens(result);
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
  }, [chainId, tokenService]);

  return { tokens, isLoading, error };
}
