/**
 * Hook to fetch token balance for a selected token
 * Only shows balance when wallet is connected and token is selected
 */

import { useSplToken } from '@solana/react-hooks';
import { useWalletContext } from '@/context/WalletContext';
import type { Token } from '@/services/bridge/types';

interface UseTokenBalanceResult {
  balance: string | null;
  isLoading: boolean;
}

// Dummy address to pass when no token is selected
// useSplToken requires a mint address but we ignore the result when token is null
const DUMMY_MINT = 'So11111111111111111111111111111111111111112';

export function useTokenBalance(token: Token | null): UseTokenBalanceResult {
  const { connected } = useWalletContext();

  // Always call the hook (hooks must be called unconditionally)
  // Use the actual token address or a dummy address
  const mintAddress = token?.address ?? DUMMY_MINT;
  const { balance, status, isFetching } = useSplToken(mintAddress);

  // Don't show balance if not connected or no token selected
  if (!token || !connected) {
    return { balance: null, isLoading: false };
  }

  // Check status
  if (status === 'disconnected' || status === 'error') {
    return { balance: null, isLoading: false };
  }

  if (status === 'loading' || isFetching) {
    return { balance: null, isLoading: true };
  }

  // Get balance - uiAmount is already a formatted string
  if (balance !== null && balance !== undefined && 'uiAmount' in balance) {
    const uiAmount = balance.uiAmount ?? '0';
    const numericValue = Number(uiAmount);

    let formattedBalance: string;
    if (!Number.isFinite(numericValue)) {
      formattedBalance = '0';
    } else if (numericValue === 0) {
      formattedBalance = '0';
    } else if (numericValue >= 1000) {
      formattedBalance = numericValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (numericValue >= 1) {
      formattedBalance = numericValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    } else if (numericValue >= 0.0001) {
      formattedBalance = numericValue.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      });
    } else {
      formattedBalance = numericValue.toExponential(2);
    }

    return {
      balance: formattedBalance,
      isLoading: false,
    };
  }

  return { balance: null, isLoading: false };
}
