/**
 * Wallet context
 * Wraps @solana/react-hooks wallet functionality for app use
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useWalletConnection } from '@solana/react-hooks';

interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const {
    connected,
    connectors,
    connect: walletConnect,
    disconnect: walletDisconnect,
    wallet,
  } = useWalletConnection();

  const value = useMemo<WalletContextType>(() => {
    // Get public key from wallet session if connected
    const publicKeyStr = wallet?.account?.address?.toString() ?? null;

    return {
      connected,
      publicKey: publicKeyStr,
      connect: async () => {
        try {
          // Use the first available connector
          const connector = connectors[0];
          if (!connector) {
            throw new Error(
              'No wallet found. Please install Phantom, Solflare, or another Solana wallet.'
            );
          }
          await walletConnect(connector.id);
        } catch (error) {
          console.error('Failed to connect wallet:', error);
          throw error;
        }
      },
      disconnect: async () => {
        try {
          await walletDisconnect();
        } catch (error) {
          console.error('Failed to disconnect wallet:', error);
          throw error;
        }
      },
    };
  }, [connected, connectors, wallet, walletConnect, walletDisconnect]);

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
