/**
 * TokenSelector component
 * Dropdown with search for selecting tokens
 */

import { useState, useMemo } from 'react';
import type { Token } from '@/services/bridge/types';

interface TokenSelectorProps {
  tokens: Token[];
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  isLoading?: boolean;
  label?: string;
}

export function TokenSelector({
  tokens,
  selectedToken,
  onSelect,
  isLoading = false,
  label = 'Select token',
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTokens = useMemo(() => {
    if (!search) return tokens;
    const lowerSearch = search.toLowerCase();
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(lowerSearch) ||
        t.name.toLowerCase().includes(lowerSearch)
    );
  }, [tokens, search]);

  if (isLoading) {
    return (
      <div className="bg-white/60 rounded-lg p-3 animate-pulse border border-winter-border backdrop-blur-lg">
        <div className="h-6 bg-white/40 rounded w-24" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/60 hover:bg-white/80 rounded-lg p-3
                   flex items-center gap-2 transition-all text-left backdrop-blur-lg
                   border border-winter-border hover:border-winter-border shadow-sm"
      >
        {selectedToken ? (
          <>
            {selectedToken.logoUri && (
              <img
                src={selectedToken.logoUri}
                alt={selectedToken.symbol}
                className="w-6 h-6 rounded-full border border-winter-border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span className="font-medium text-winter-text">{selectedToken.symbol}</span>
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
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
          />

          {/* Dropdown */}
          <div className="absolute z-50 mt-2 w-full bg-white border-2 border-winter-border
                          rounded-lg shadow-lg max-h-[min(300px,60vh)] overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-winter-border">
              <input
                type="text"
                placeholder="Search tokens..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/80 rounded px-3 py-2 text-sm text-winter-text
                           placeholder-winter-textSecondary/60 focus:outline-none focus:ring-2
                           focus:ring-winter-cyan/50 border border-winter-border"
                autoFocus
              />
            </div>

            {/* Token list */}
            <div className="overflow-y-auto max-h-[min(200px,45vh)]">
              {filteredTokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelect(token);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2
                             hover:bg-[#F5FAFB] transition-colors text-left"
                >
                  {token.logoUri && (
                    <img
                      src={token.logoUri}
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full border border-winter-border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <div className="font-medium text-winter-text">{token.symbol}</div>
                    <div className="text-xs text-winter-textSecondary">{token.name}</div>
                  </div>
                </button>
              ))}
              {filteredTokens.length === 0 && (
                <div className="px-3 py-4 text-center text-winter-textSecondary">
                  No tokens found
                </div>
              )}
            </div>
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
