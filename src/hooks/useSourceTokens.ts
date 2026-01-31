/**
 * Hook to fetch source tokens (Solana tokens)
 */

import { useState, useEffect } from 'react';
import { useTokenService } from '@/context/TokenContext';
import type { Token } from '@/services/bridge/types';

interface UseSourceTokensResult {
  tokens: Token[];
  isLoading: boolean;
  error: string | null;
}

export function useSourceTokens(): UseSourceTokensResult {
  const tokenService = useTokenService();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTokens() {
      try {
        setIsLoading(true);
        setError(null);
        const result = await tokenService.getSourceTokens();
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
  }, [tokenService]);

  return { tokens, isLoading, error };
}
