/**
 * Hook to fetch source tokens (Solana tokens)
 * Filters tokens to only show those supported for gas payment
 */

import { useState, useEffect } from 'react';
import { useTokenService } from '@/context/TokenContext';
import { ALLOWED_SPL_PAID_TOKENS } from '@/config/supportedTokens';
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

        // Fetch tokens from bridge provider
        const allTokens = await tokenService.getSourceTokens();

        if (!cancelled) {
          // Filter to only show tokens that are supported for gas payment
          const supportedSet = new Set(
            ALLOWED_SPL_PAID_TOKENS.map((addr: string) => addr.toLowerCase())
          );
          const filteredTokens = allTokens.filter((token: Token) =>
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
  }, [tokenService]);

  return { tokens, isLoading, error };
}
