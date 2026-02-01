/**
 * ChainSelector component
 * Dropdown for selecting destination chain
 */

import { useState } from 'react';
import type { Chain } from '@/services/bridge/types';

interface ChainSelectorProps {
  chains: Chain[];
  selectedChain: Chain | null;
  onSelect: (chain: Chain) => void;
  label?: string;
}

// Chain logo mapping - using DefiLlama CDN for reliability
const CHAIN_LOGOS: Record<string, string> = {
  ethereum: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
  arbitrum: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg',
  base: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
  polygon: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg',
  optimism: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg',
  avalanche: 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg',
  bnb: 'https://icons.llamao.fi/icons/chains/rsz_binance.jpg',
};

export function ChainSelector({
  chains,
  selectedChain,
  onSelect,
  label = 'Select chain',
}: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/60 hover:bg-white/80 rounded-lg p-3
                   flex items-center gap-2 transition-all text-left backdrop-blur-lg
                   border border-winter-border hover:border-winter-border shadow-sm"
      >
        {selectedChain ? (
          <>
            {CHAIN_LOGOS[selectedChain.id] && (
              <img
                src={CHAIN_LOGOS[selectedChain.id]}
                alt={selectedChain.name}
                className="w-6 h-6 rounded-full border border-winter-border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span className="font-medium text-winter-text">{selectedChain.name}</span>
          </>
        ) : (
          <span className="text-winter-textSecondary">{label}</span>
        )}
        <ChevronDownIcon className="ml-auto w-4 h-4 text-winter-textSecondary" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-50 mt-2 w-full bg-white border-2 border-winter-border
                          rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  onSelect(chain);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-2
                           hover:bg-[#F5FAFB] transition-colors text-left"
              >
                {CHAIN_LOGOS[chain.id] && (
                  <img
                    src={CHAIN_LOGOS[chain.id]}
                    alt={chain.name}
                    className="w-6 h-6 rounded-full border border-winter-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className="font-medium text-winter-text">{chain.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
