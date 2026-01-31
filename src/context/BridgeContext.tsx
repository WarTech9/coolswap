/**
 * Bridge provider context
 * Provides IBridgeProvider instance throughout the app
 * Supports both deBridge (with fixFee) and Relay (zero-SOL via depositFeePayer)
 */

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import type { IBridgeProvider } from '@/services/bridge';
import { DeBridgeProvider, RelayProvider } from '@/services/bridge';
import { useGasSponsorService } from './GasSponsorContext';
import { env } from '@/config/env';

export type BridgeProviderType = 'debridge' | 'relay';

interface BridgeContextType {
  bridgeProvider: IBridgeProvider;
  providerType: BridgeProviderType;
  setProviderType: (type: BridgeProviderType) => void;
  isZeroSolSupported: boolean;
}

const BridgeContext = createContext<BridgeContextType | undefined>(undefined);

interface BridgeProviderProps {
  children: ReactNode;
  defaultProvider?: BridgeProviderType;
}

export function BridgeProvider({
  children,
  defaultProvider = 'relay', // Default to Relay for zero-SOL swaps
}: BridgeProviderProps) {
  const [providerType, setProviderType] = useState<BridgeProviderType>(defaultProvider);
  const [koraFeePayer, setKoraFeePayer] = useState<string | null>(null);
  const gasSponsor = useGasSponsorService();

  // Fetch Kora's fee payer address on mount
  useEffect(() => {
    const fetchFeePayer = async () => {
      try {
        const address = await gasSponsor.getFeePayer();
        setKoraFeePayer(address);
      } catch (error) {
        console.warn('Failed to fetch Kora fee payer address:', error);
        // If Kora is unavailable, fall back to deBridge
        setProviderType('debridge');
      }
    };
    fetchFeePayer();
  }, [gasSponsor]);

  const bridgeProvider = useMemo<IBridgeProvider>(() => {
    if (providerType === 'relay') {
      // Use Relay with Kora as depositFeePayer for zero-SOL swaps
      return new RelayProvider(
        env.RELAY_API_URL,
        env.RELAY_API_KEY,
        koraFeePayer ?? undefined // Pass Kora's address as fee payer
      );
    }

    // deBridge (has 0.015 SOL fixFee requirement)
    return new DeBridgeProvider(env.DEBRIDGE_DLN_API_URL);
  }, [providerType, koraFeePayer]);

  const handleSetProviderType = useCallback((type: BridgeProviderType) => {
    setProviderType(type);
  }, []);

  // Zero-SOL is only supported when using Relay with Kora fee payer
  const isZeroSolSupported = providerType === 'relay' && koraFeePayer !== null;

  const value = useMemo<BridgeContextType>(
    () => ({
      bridgeProvider,
      providerType,
      setProviderType: handleSetProviderType,
      isZeroSolSupported,
    }),
    [bridgeProvider, providerType, handleSetProviderType, isZeroSolSupported]
  );

  return (
    <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>
  );
}

export function useBridgeProvider(): IBridgeProvider {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error('useBridgeProvider must be used within BridgeProvider');
  }
  return context.bridgeProvider;
}

export function useBridgeContext(): BridgeContextType {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error('useBridgeContext must be used within BridgeProvider');
  }
  return context;
}
