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

// Chain logo mapping - using publicly available logos
const CHAIN_LOGOS: Record<string, string> = {
  ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  arbitrum: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
  base: 'https://raw.githubusercontent.com/base-org/brand-kit/main/logo/symbol/Base_Symbol_Blue.svg',
  polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  optimism: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg',
  avalanche: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg',
  bnb: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg',
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
        className="w-full bg-slate-700/50 hover:bg-slate-700 rounded-lg p-3
                   flex items-center gap-2 transition-colors text-left"
      >
        {selectedChain ? (
          <>
            {CHAIN_LOGOS[selectedChain.id] && (
              <img
                src={CHAIN_LOGOS[selectedChain.id]}
                alt={selectedChain.name}
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span className="font-medium text-white">{selectedChain.name}</span>
          </>
        ) : (
          <span className="text-slate-400">{label}</span>
        )}
        <ChevronDownIcon className="ml-auto w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-50 mt-2 w-full bg-slate-800 border border-slate-700
                          rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  onSelect(chain);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-2
                           hover:bg-slate-700/50 transition-colors text-left"
              >
                {CHAIN_LOGOS[chain.id] && (
                  <img
                    src={CHAIN_LOGOS[chain.id]}
                    alt={chain.name}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className="font-medium text-white">{chain.name}</span>
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
