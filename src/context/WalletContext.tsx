import { createContext, useContext, useMemo, ReactNode } from 'react';

interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  // Stub implementation - will be replaced with @solana/react-hooks
  const value = useMemo<WalletContextType>(
    () => ({
      connected: false,
      publicKey: null,
      connect: async () => {
        console.log('Connect wallet - to be implemented');
      },
      disconnect: async () => {
        console.log('Disconnect wallet - to be implemented');
      },
    }),
    []
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
}
