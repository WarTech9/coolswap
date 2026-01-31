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
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg
                   border border-slate-600 transition-colors flex items-center gap-2"
      >
        <span className="w-2 h-2 bg-green-400 rounded-full" />
        {formatAddress(publicKey)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect()}
      className="px-4 py-2 bg-gradient-to-r from-solana-purple to-solana-green
                 hover:from-solana-purple/80 hover:to-solana-green/80
                 text-white font-medium rounded-lg transition-all"
    >
      Connect Wallet
    </button>
  );
}
