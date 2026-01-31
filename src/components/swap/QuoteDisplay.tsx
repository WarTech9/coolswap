/**
 * QuoteDisplay component
 * Shows quote details, fee breakdown, countdown timer, and slippage settings
 */

import type { Quote, Token } from '@/services/bridge/types';
import type { CreateOrderError } from '@/services/bridge/IBridgeProvider';

interface QuoteDisplayProps {
  quote: Quote | null;
  sourceToken: Token | null;
  destinationToken: Token | null;
  isLoading: boolean;
  error: CreateOrderError | null;
  secondsUntilExpiry: number | null;
  slippage: number;
  onSlippageChange: (value: number) => void;
}

const SLIPPAGE_OPTIONS = [0.001, 0.005, 0.01]; // 0.1%, 0.5%, 1%
const SOL_DECIMALS = 9; // Solana native token decimals

/**
 * Format amount for display (trim trailing zeros)
 * Exported for testing
 */
export function formatAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount) / Math.pow(10, decimals);
  if (isNaN(num)) return '0';
  // Format with up to 6 decimal places, trim trailing zeros
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

/**
 * Format SOL amount (always 9 decimals)
 * Exported for testing
 */
export function formatSolAmount(amount: string): string {
  const num = parseFloat(amount) / Math.pow(10, SOL_DECIMALS);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

/**
 * Get user-friendly error message
 * Exported for testing
 */
export function getErrorMessage(error: CreateOrderError, sourceSymbol?: string): string {
  switch (error.code) {
    case 'INSUFFICIENT_LIQUIDITY':
      return error.message || 'Not enough liquidity for this swap. Try a smaller amount.';
    case 'AMOUNT_TOO_LOW':
      return `Amount too low. Minimum is ${error.minimum}${sourceSymbol ? ` ${sourceSymbol}` : ''}.`;
    case 'AMOUNT_TOO_HIGH':
      return `Amount too high. Maximum is ${error.maximum}${sourceSymbol ? ` ${sourceSymbol}` : ''}.`;
    case 'UNSUPPORTED_PAIR':
      return error.message || 'This token pair is not supported.';
  }
}

export function QuoteDisplay({
  quote,
  sourceToken,
  destinationToken,
  isLoading,
  error,
  secondsUntilExpiry,
  slippage,
  onSlippageChange,
}: QuoteDisplayProps) {
  // Show nothing if no quote data and not loading
  if (!quote && !isLoading && !error) {
    return null;
  }

  return (
    <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
      {/* Loading state */}
      {isLoading && !quote && (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner />
          <span className="ml-2 text-slate-400">Fetching quote...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">
            {getErrorMessage(error, sourceToken?.symbol)}
          </p>
        </div>
      )}

      {/* Quote details */}
      {quote && (
        <>
          {/* You receive */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">You receive</span>
            <span className="text-white font-medium">
              {destinationToken
                ? formatAmount(quote.destinationAmount, destinationToken.decimals)
                : quote.destinationAmount}{' '}
              <span className="text-slate-400">{destinationToken?.symbol}</span>
            </span>
          </div>

          {/* Fee breakdown */}
          <div className="border-t border-slate-600/50 pt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Operating expenses</span>
              <span className="text-slate-300">
                +{sourceToken
                  ? formatAmount(quote.fees.operatingExpenses, sourceToken.decimals)
                  : quote.fees.operatingExpenses}{' '}
                {sourceToken?.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Network fee</span>
              <span className="text-slate-300">
                {formatSolAmount(quote.fees.networkFee)} SOL
              </span>
            </div>
            {/* Total from wallet */}
            <div className="flex items-center justify-between text-sm border-t border-slate-600/30 pt-2 mt-2">
              <span className="text-slate-300 font-medium">Total from wallet</span>
              <span className="text-white font-medium">
                {sourceToken
                  ? formatAmount(quote.sourceAmount, sourceToken.decimals)
                  : quote.sourceAmount}{' '}
                {sourceToken?.symbol}
                <span className="text-slate-400 text-xs ml-1">
                  + {formatSolAmount(quote.fees.networkFee)} SOL
                </span>
              </span>
            </div>
            {quote.fees.totalFeeUsd !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total fees</span>
                <span className="text-slate-300">
                  ${quote.fees.totalFeeUsd.toFixed(2)} USD
                </span>
              </div>
            )}
          </div>

          {/* Estimated time */}
          <div className="flex items-center justify-between text-sm border-t border-slate-600/50 pt-3">
            <span className="text-slate-400">Estimated time</span>
            <span className="text-slate-300">
              ~{Math.ceil(quote.estimatedTimeSeconds / 60)} min
            </span>
          </div>

          {/* Countdown timer */}
          {secondsUntilExpiry !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Quote expires</span>
              <div className="flex items-center gap-2">
                {isLoading && <LoadingSpinner size="sm" />}
                <span className={secondsUntilExpiry <= 5 ? 'text-yellow-400' : 'text-slate-300'}>
                  {secondsUntilExpiry}s
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Slippage setting */}
      <div className="border-t border-slate-600/50 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Slippage tolerance</span>
          <div className="flex items-center gap-1">
            {SLIPPAGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSlippageChange(option)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  slippage === option
                    ? 'bg-solana-purple text-white'
                    : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {(option * 100).toFixed(1)}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-5 h-5';
  return (
    <svg
      className={`${sizeClass} animate-spin text-solana-purple`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
