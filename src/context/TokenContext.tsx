/**
 * Token services context
 * Provides TokenService and Token2022Service instances throughout the app
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { TokenService, Token2022Service } from '@/services/token';
import { useBridgeProvider } from './BridgeContext';
import { useSolanaRpc } from './SolanaContext';

interface TokenContextType {
  tokenService: TokenService;
  token2022Service: Token2022Service;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: ReactNode }) {
  const bridgeProvider = useBridgeProvider();
  const solanaRpc = useSolanaRpc();

  const value = useMemo<TokenContextType>(() => {
    const tokenService = new TokenService(bridgeProvider);
    const token2022Service = new Token2022Service(solanaRpc);

    return { tokenService, token2022Service };
  }, [bridgeProvider, solanaRpc]);

  return (
    <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
  );
}

export function useTokenService() {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useTokenService must be used within TokenProvider');
  }
  return context.tokenService;
}

export function useToken2022Service() {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken2022Service must be used within TokenProvider');
  }
  return context.token2022Service;
}
