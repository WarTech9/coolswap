/**
 * AmountInput component
 * Input field for swap amount with Max button and balance display
 */

import type { Token } from '@/services/bridge/types';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  token: Token | null;
  balance: string | null;
  balanceLoading?: boolean;
  disabled?: boolean;
}

/**
 * Validate that the input is a valid decimal number
 */
function isValidDecimalInput(value: string): boolean {
  if (value === '') return true;
  // Allow: digits, single decimal point, leading decimal
  return /^\d*\.?\d*$/.test(value);
}

export function AmountInput({
  value,
  onChange,
  token,
  balance,
  balanceLoading = false,
  disabled = false,
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (isValidDecimalInput(newValue)) {
      onChange(newValue);
    }
  };

  const handleMax = () => {
    if (balance && !disabled) {
      onChange(balance);
    }
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder="0.00"
          disabled={disabled || !token}
          className="w-full bg-white/50 rounded-lg p-3 pr-24 text-winter-text text-lg
                     placeholder-winter-textSecondary/60 focus:outline-none focus:ring-2
                     focus:ring-winter-cyan/50 focus:border-winter-cyan backdrop-blur-lg
                     border border-winter-border transition-all hover:bg-white/70
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {balance !== null && (
            <button
              type="button"
              onClick={handleMax}
              disabled={disabled || !token}
              className="px-2 py-1 text-xs font-medium text-winter-cyan
                         hover:text-solana-purple transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          )}
          {token && (
            <span className="text-sm font-medium text-winter-textSecondary">
              {token.symbol}
            </span>
          )}
        </div>
      </div>

      {/* Balance display */}
      {token && (
        <div className="text-sm text-winter-textSecondary px-1">
          Balance:{' '}
          {balanceLoading ? (
            <span className="animate-pulse">...</span>
          ) : balance !== null ? (
            <span className="text-winter-text font-medium">{balance} {token.symbol}</span>
          ) : (
            <span>-</span>
          )}
        </div>
      )}
    </div>
  );
}
