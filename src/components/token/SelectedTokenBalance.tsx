/**
 * SelectedTokenBalance component
 * Shows balance for the selected token (only when connected)
 */

import { useTokenBalance } from '@/hooks/useTokenBalance';
import type { Token } from '@/services/bridge/types';

interface SelectedTokenBalanceProps {
  token: Token | null;
}

export function SelectedTokenBalance({ token }: SelectedTokenBalanceProps) {
  const { balance, isLoading } = useTokenBalance(token);

  if (!token) return null;

  return (
    <div className="text-sm text-slate-400 mt-1">
      Balance:{' '}
      {isLoading ? (
        <span className="animate-pulse">...</span>
      ) : balance !== null ? (
        <span className="text-white">{balance} {token.symbol}</span>
      ) : (
        <span>-</span>
      )}
    </div>
  );
}
