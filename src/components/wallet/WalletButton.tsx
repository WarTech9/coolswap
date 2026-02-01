/**
 * WalletButton component
 * Shows connect button when disconnected, shows address when connected
 */

import { useWalletContext } from '@/context/WalletContext';

function formatAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { connected, publicKey, connect, disconnect } = useWalletContext();

  if (connected && publicKey) {
    return (
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 bg-white/60 hover:bg-white/80 text-winter-text rounded-lg
                   border border-winter-border hover:border-winter-border transition-all
                   backdrop-blur-lg flex items-center gap-2 shadow-sm"
      >
        <span className="w-2 h-2 bg-winter-cyan rounded-full shadow-sm animate-pulse" />
        {formatAddress(publicKey)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect()}
      className="px-4 py-2 bg-gradient-to-r from-solana-purple to-winter-cyan
                 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                 text-white font-medium rounded-lg transition-all shadow-md"
    >
      Connect Wallet
    </button>
  );
}
