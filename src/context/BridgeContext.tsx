/**
 * Bridge provider context
 * Provides IBridgeProvider instance (currently deBridge) throughout the app
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import type { IBridgeProvider } from '@/services/bridge';
import { DeBridgeProvider } from '@/services/bridge';
import { env } from '@/config/env';

interface BridgeContextType {
  bridgeProvider: IBridgeProvider;
}

const BridgeContext = createContext<BridgeContextType | undefined>(undefined);

export function BridgeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<BridgeContextType>(() => {
    const bridgeProvider = new DeBridgeProvider(env.DEBRIDGE_DLN_API_URL);

    return { bridgeProvider };
  }, []);

  return (
    <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>
  );
}

export function useBridgeProvider() {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error('useBridgeProvider must be used within BridgeProvider');
  }
  return context.bridgeProvider;
}
