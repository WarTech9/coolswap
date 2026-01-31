/**
 * Gas Sponsor Context
 * Provides gas sponsorship service throughout the application
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  KoraGasSponsorService,
  type GasSponsorService,
} from '@/services/gas';
import { env } from '@/config/env';

const GasSponsorContext = createContext<GasSponsorService | null>(null);

interface GasSponsorProviderProps {
  children: ReactNode;
}

/**
 * Provider component that supplies gas sponsorship service to the app
 * Initializes Kora client with configured URL and optional auth
 */
export function GasSponsorProvider({ children }: GasSponsorProviderProps) {
  const gasSponsor = useMemo(() => {
    return new KoraGasSponsorService(env.KORA_URL);
  }, []);

  return (
    <GasSponsorContext.Provider value={gasSponsor}>
      {children}
    </GasSponsorContext.Provider>
  );
}

/**
 * Hook to access gas sponsorship service
 * @throws Error if used outside of GasSponsorProvider
 */
export function useGasSponsorService(): GasSponsorService {
  const context = useContext(GasSponsorContext);
  if (!context) {
    throw new Error(
      'useGasSponsorService must be used within GasSponsorProvider'
    );
  }
  return context;
}
