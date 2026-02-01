/**
 * Wallet context
 * Wraps @solana/react-hooks wallet functionality for app use
 */

import { createContext, useContext, useMemo, ReactNode, useState, useCallback } from 'react';
import { useWalletConnection } from '@solana/react-hooks';

interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  showWalletSelector: boolean;
  setShowWalletSelector: (show: boolean) => void;
  availableWallets: Array<{ id: string; name: string; icon?: string }>;
  connectWallet: (walletId: string) => Promise<void>;
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

  const [showWalletSelector, setShowWalletSelector] = useState(false);

  // Get available wallets from connectors
  const availableWallets = useMemo(() => {
    return connectors.map(connector => ({
      id: connector.id,
      name: connector.name,
      icon: connector.icon,
    }));
  }, [connectors]);

  const connectWallet = useCallback(async (walletId: string) => {
    try {
      await walletConnect(walletId);
      setShowWalletSelector(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }, [walletConnect]);

  const value = useMemo<WalletContextType>(() => {
    // Get public key from wallet session if connected
    const publicKeyStr = wallet?.account?.address?.toString() ?? null;

    return {
      connected,
      publicKey: publicKeyStr,
      connect: async () => {
        // Show wallet selector if multiple wallets available
        if (connectors.length > 1) {
          setShowWalletSelector(true);
        } else if (connectors.length === 1 && connectors[0]) {
          // Connect directly if only one wallet
          await connectWallet(connectors[0].id);
        } else {
          throw new Error(
            'No wallet found. Please install Phantom, Solflare, or another Solana wallet.'
          );
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
      showWalletSelector,
      setShowWalletSelector,
      availableWallets,
      connectWallet,
    };
  }, [connected, connectors, wallet, walletDisconnect, showWalletSelector, availableWallets, connectWallet]);

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
