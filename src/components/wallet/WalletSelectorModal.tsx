/**
 * Wallet Selector Modal
 * Shows available Solana wallets for user to choose from
 */

import { useWalletContext } from '@/context/WalletContext';

export function WalletSelectorModal() {
  const { showWalletSelector, setShowWalletSelector, availableWallets, connectWallet } = useWalletContext();

  if (!showWalletSelector) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-crystallize">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1A3A52]/60 backdrop-blur-xl"
        onClick={() => setShowWalletSelector(false)}
      />

      {/* Modal */}
      <div className="relative bg-white/95 rounded-2xl p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm mx-4 border-2 border-winter-border shadow-lg backdrop-blur-2xl">
        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold text-winter-text mb-1">
            Connect Wallet
          </h3>
          <p className="text-winter-textSecondary text-sm">
            Choose your preferred Solana wallet
          </p>
        </div>

        {/* Wallet options */}
        <div className="space-y-2">
          {availableWallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => connectWallet(wallet.id)}
              className="w-full bg-white/60 hover:bg-white/80 border border-winter-border
                         rounded-lg p-4 flex items-center gap-3 transition-all
                         hover:scale-[1.02] active:scale-[0.98] group"
            >
              {wallet.icon && (
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="w-10 h-10 rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <span className="text-winter-text font-medium group-hover:text-winter-cyan transition-colors">
                {wallet.name}
              </span>
            </button>
          ))}
        </div>

        {availableWallets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-winter-textSecondary text-sm">
              No wallets detected. Please install a Solana wallet like Phantom or Solflare.
            </p>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => setShowWalletSelector(false)}
          className="mt-4 w-full bg-white/60 hover:bg-white/80 text-winter-text font-medium
                     py-2 rounded-lg transition-colors border border-winter-border"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
