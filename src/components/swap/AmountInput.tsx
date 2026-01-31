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
          className="w-full bg-slate-700/50 rounded-lg p-3 pr-24 text-white text-lg
                     placeholder-slate-500 focus:outline-none focus:ring-2
                     focus:ring-solana-purple disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {balance !== null && (
            <button
              type="button"
              onClick={handleMax}
              disabled={disabled || !token}
              className="px-2 py-1 text-xs font-medium text-solana-purple
                         hover:text-solana-green transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          )}
          {token && (
            <span className="text-sm font-medium text-slate-400">
              {token.symbol}
            </span>
          )}
        </div>
      </div>

      {/* Balance display */}
      {token && (
        <div className="text-sm text-slate-400 px-1">
          Balance:{' '}
          {balanceLoading ? (
            <span className="animate-pulse">...</span>
          ) : balance !== null ? (
            <span className="text-slate-300">{balance} {token.symbol}</span>
          ) : (
            <span>-</span>
          )}
        </div>
      )}
    </div>
  );
}
