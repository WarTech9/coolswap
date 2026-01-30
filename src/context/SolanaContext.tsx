/**
 * Solana RPC context
 * Provides SolanaRpcService instance throughout the app
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { SolanaRpcService } from '@/services/solana';
import { env } from '@/config/env';

interface SolanaContextType {
  solanaRpc: SolanaRpcService;
}

const SolanaContext = createContext<SolanaContextType | undefined>(undefined);

export function SolanaProvider({ children }: { children: ReactNode }) {
  const value = useMemo<SolanaContextType>(() => {
    const solanaRpc = new SolanaRpcService(
      env.SOLANA_RPC_URL,
      env.SOLANA_WS_URL,
      env.HELIUS_API_KEY
    );

    return { solanaRpc };
  }, []);

  return (
    <SolanaContext.Provider value={value}>{children}</SolanaContext.Provider>
  );
}

export function useSolanaRpc() {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error('useSolanaRpc must be used within SolanaProvider');
  }
  return context.solanaRpc;
}
