/**
 * QuoteDisplay component
 * Shows quote details, fee breakdown, countdown timer, and slippage settings
 */

import type { Quote, Token } from '@/services/bridge/types';
import type { CreateOrderError } from '@/services/bridge/IBridgeProvider';
import { formatTokenAmount, formatSolAmount } from '@/utils/formatting';
import { useGasFee } from '@/hooks';

interface QuoteDisplayProps {
  quote: Quote | null;
  sourceToken: Token | null;
  destinationToken: Token | null;
  isLoading: boolean;
  error: CreateOrderError | null;
  secondsUntilExpiry: number | null;
  slippage: number;
  onSlippageChange: (value: number) => void;
  sourceTokenAddress?: string | null;
}

const SLIPPAGE_OPTIONS = [0.001, 0.005, 0.01]; // 0.1%, 0.5%, 1%

/**
 * Legacy export for backwards compatibility with tests
 * Delegates to shared formatting utility
 */
export { formatTokenAmount as formatAmount, formatSolAmount } from '@/utils/formatting';

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
  sourceTokenAddress,
}: QuoteDisplayProps) {
  // Get gas fee estimate for Kora sponsorship
  const gasFee = useGasFee(quote, sourceTokenAddress ?? null);
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
                ? formatTokenAmount(quote.destinationAmount, destinationToken.decimals)
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
                  ? formatTokenAmount(quote.fees.operatingExpenses, sourceToken.decimals)
                  : quote.fees.operatingExpenses}{' '}
                {sourceToken?.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Bridge protocol fee</span>
                <span
                  className="text-slate-500 cursor-help"
                  title="Fee paid to deBridge network validators (takers)"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
              </div>
              <span className="text-slate-300">
                {formatSolAmount(quote.fees.networkFee)} SOL
              </span>
            </div>
            {/* Gas sponsorship fee */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Gas sponsorship</span>
                {gasFee.isLoading && <LoadingSpinner size="sm" />}
                <span
                  className="text-slate-500 cursor-help"
                  title="Solana transaction gas paid in tokens via Kora"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
              </div>
              <span className="text-slate-300">
                {gasFee.isLoading ? (
                  'Estimating...'
                ) : gasFee.tokenAmount > BigInt(0) && sourceToken ? (
                  <>
                    +{formatTokenAmount(gasFee.tokenAmount.toString(), sourceToken.decimals)}{' '}
                    {sourceToken.symbol}
                    <span className="text-slate-500 text-xs ml-1">
                      (~{formatSolAmount(gasFee.lamports.toString())} SOL)
                    </span>
                  </>
                ) : gasFee.error ? (
                  <span className="text-yellow-400 text-xs">Gas sponsored</span>
                ) : (
                  <span className="text-slate-500">Gas sponsored</span>
                )}
              </span>
            </div>
            {/* Total from wallet */}
            <div className="flex items-center justify-between text-sm border-t border-slate-600/30 pt-2 mt-2">
              <span className="text-slate-300 font-medium">Total from wallet</span>
              <span className="text-white font-medium">
                {sourceToken && gasFee.tokenAmount > BigInt(0) && !gasFee.error ? (
                  <>
                    {formatTokenAmount(
                      (BigInt(quote.sourceAmount) + gasFee.tokenAmount).toString(),
                      sourceToken.decimals
                    )}{' '}
                    {sourceToken.symbol}
                    <span className="text-slate-400 text-xs ml-1">
                      + {formatSolAmount(quote.fees.networkFee)} SOL
                    </span>
                  </>
                ) : (
                  <>
                    {sourceToken
                      ? formatTokenAmount(quote.sourceAmount, sourceToken.decimals)
                      : quote.sourceAmount}{' '}
                    {sourceToken?.symbol}
                    <span className="text-slate-400 text-xs ml-1">
                      + {formatSolAmount(quote.fees.networkFee)} SOL
                    </span>
                  </>
                )}
              </span>
            </div>
            {/* Gas sponsorship note */}
            {!gasFee.error && gasFee.tokenAmount > BigInt(0) && (
              <div className="flex items-start gap-1 text-xs text-slate-400 bg-slate-800/30 rounded px-2 py-1.5">
                <svg
                  className="w-3 h-3 mt-0.5 flex-shrink-0 text-solana-purple"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Transaction gas is paid in {sourceToken?.symbol} via Kora sponsorship</span>
              </div>
            )}
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
