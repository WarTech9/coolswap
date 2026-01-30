/**
 * Solana client context
 * Provides SolanaClientService instance throughout the app
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { SolanaClientService } from '@/services/solana';
import { env } from '@/config/env';

interface SolanaContextType {
  solanaClient: SolanaClientService;
}

const SolanaContext = createContext<SolanaContextType | undefined>(undefined);

export function SolanaClientProvider({ children }: { children: ReactNode }) {
  const value = useMemo<SolanaContextType>(() => {
    const solanaClient = new SolanaClientService(
      env.SOLANA_RPC_URL,
      env.SOLANA_WS_URL,
      env.HELIUS_API_KEY
    );

    return { solanaClient };
  }, []);

  return (
    <SolanaContext.Provider value={value}>{children}</SolanaContext.Provider>
  );
}

// Alias for backwards compatibility
export const SolanaProvider = SolanaClientProvider;

export function useSolanaClient() {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error('useSolanaClient must be used within SolanaProvider');
  }
  return context.solanaClient;
}

// Alias for backwards compatibility during migration
export const useSolanaRpc = useSolanaClient;
