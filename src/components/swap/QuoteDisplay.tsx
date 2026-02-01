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
  // Get gas fee estimate (uses Pyth for Relay, Kora for deBridge)
  const gasFee = useGasFee(
    quote,
    sourceTokenAddress ?? null,
    sourceToken?.decimals ?? 6
  );
  return (
    <div className="bg-white/60 rounded-lg p-3 space-y-2 backdrop-blur-lg border border-winter-border">
      {/* Placeholder when no quote */}
      {!quote && !isLoading && !error && (
        <div className="flex items-center justify-center py-8 text-center">
          <p className="text-winter-textSecondary text-sm">
            Enter amount and select tokens to see quote details
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !quote && (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner />
          <span className="ml-2 text-winter-textSecondary">Fetching quote...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3">
          <p className="text-red-700 text-sm">
            {getErrorMessage(error, sourceToken?.symbol)}
          </p>
        </div>
      )}

      {/* Quote details */}
      {quote && (
        <>
          {/* You receive */}
          <div className="flex items-center justify-between">
            <span className="text-winter-textSecondary text-sm">You receive</span>
            <span className="text-winter-text font-medium">
              {destinationToken
                ? formatTokenAmount(quote.destinationAmount, destinationToken.decimals)
                : quote.destinationAmount}{' '}
              <span className="text-winter-textSecondary">{destinationToken?.symbol}</span>
            </span>
          </div>

          {/* Fee breakdown */}
          <div className="border-t border-winter-border pt-3 space-y-2">
            {/* Relay fee - shown for Relay provider (already deducted from output) */}
            {quote.fees.relayerFeeFormatted && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-winter-textSecondary">Relay fee</span>
                  <span
                    className="text-winter-textSecondary/70 cursor-help"
                    title="Bridge fee (already deducted from amount you receive)"
                  >
                    <InfoIcon />
                  </span>
                </div>
                <span className="text-winter-text">
                  -{quote.fees.relayerFeeFormatted} {sourceToken?.symbol}
                </span>
              </div>
            )}

            {/* Bridge protocol fee - only show if user pays SOL (deBridge) */}
            {quote.fees.networkFee !== '0' && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-winter-textSecondary">Bridge protocol fee</span>
                  <span
                    className="text-winter-textSecondary/70 cursor-help"
                    title="Fee paid to bridge network validators"
                  >
                    <InfoIcon />
                  </span>
                </div>
                <span className="text-winter-text">
                  {formatSolAmount(quote.fees.networkFee)} SOL
                </span>
              </div>
            )}

            {/* Gas sponsorship fee */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <span className="text-winter-textSecondary">Gas sponsorship</span>
                {gasFee.isLoading && <LoadingSpinner size="sm" />}
                <span
                  className="text-winter-textSecondary/70 cursor-help"
                  title="Solana transaction gas paid in tokens via Kora"
                >
                  <InfoIcon />
                </span>
              </div>
              <span className="text-winter-text">
                {gasFee.isLoading ? (
                  'Estimating...'
                ) : gasFee.tokenAmount > BigInt(0) && sourceToken ? (
                  <>
                    +{formatTokenAmount(gasFee.tokenAmount.toString(), sourceToken.decimals)}{' '}
                    {sourceToken.symbol}
                    <span className="text-winter-textSecondary/70 text-xs ml-1">
                      (~{formatSolAmount(gasFee.lamports.toString())} SOL)
                    </span>
                  </>
                ) : quote.fees.gasSolFormatted ? (
                  // Fallback: Use Relay's gas data when Kora estimate fails
                  <span className="text-winter-text">
                    ~{quote.fees.gasSolFormatted} SOL
                    {quote.fees.gasUsd && (
                      <span className="text-winter-textSecondary/70 text-xs ml-1">
                        (${quote.fees.gasUsd})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-winter-text">Sponsored</span>
                )}
              </span>
            </div>
            {/* Total from wallet */}
            <div className="flex items-center justify-between text-sm border-t border-winter-border pt-2 mt-2">
              <span className="text-winter-text font-medium">Total from wallet</span>
              <span className="text-winter-text font-semibold">
                {sourceToken && gasFee.tokenAmount > BigInt(0) && !gasFee.error ? (
                  <>
                    {formatTokenAmount(
                      (BigInt(quote.sourceAmount) + gasFee.tokenAmount).toString(),
                      sourceToken.decimals
                    )}{' '}
                    {sourceToken.symbol}
                    {quote.fees.networkFee !== '0' && (
                      <span className="text-winter-textSecondary text-xs ml-1">
                        + {formatSolAmount(quote.fees.networkFee)} SOL
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {sourceToken
                      ? formatTokenAmount(quote.sourceAmount, sourceToken.decimals)
                      : quote.sourceAmount}{' '}
                    {sourceToken?.symbol}
                    {quote.fees.networkFee !== '0' && (
                      <span className="text-winter-textSecondary text-xs ml-1">
                        + {formatSolAmount(quote.fees.networkFee)} SOL
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
            {/* Gas sponsorship note */}
            {!gasFee.error && gasFee.tokenAmount > BigInt(0) && (
              <div className="flex items-start gap-1 text-xs text-winter-textSecondary bg-white/40 rounded px-2 py-1.5 border border-winter-border">
                <svg
                  className="w-3 h-3 mt-0.5 flex-shrink-0 text-winter-cyan"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Gas fees paid in {sourceToken?.symbol} </span>
              </div>
            )}
          </div>

          {/* Estimated time */}
          <div className="flex items-center justify-between text-sm border-t border-winter-border pt-3">
            <span className="text-winter-textSecondary">Estimated time</span>
            <span className="text-winter-text">
              ~{Math.ceil(quote.estimatedTimeSeconds / 60)} min
            </span>
          </div>

          {/* Countdown timer */}
          {secondsUntilExpiry !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-winter-textSecondary">Quote expires</span>
              <div className="flex items-center gap-2">
                {isLoading && <LoadingSpinner size="sm" />}
                <span className={secondsUntilExpiry <= 5 ? 'text-orange-600 font-medium' : 'text-winter-text'}>
                  {secondsUntilExpiry}s
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Slippage setting */}
      <div className="border-t border-winter-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-winter-textSecondary text-sm">Slippage tolerance</span>
          <div className="flex items-center gap-1">
            {SLIPPAGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSlippageChange(option)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  slippage === option
                    ? 'bg-gradient-to-r from-solana-purple to-winter-cyan text-white shadow-md font-medium'
                    : 'bg-white/50 text-winter-text hover:bg-white/70 border border-winter-border'
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
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <svg
      className={`${sizeClass} animate-spin text-winter-cyan`}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 10 L50 90 M10 50 L90 50 M25 25 L75 75 M75 25 L25 75"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="50" cy="10" r="5" fill="currentColor" />
      <circle cx="90" cy="50" r="5" fill="currentColor" />
    </svg>
  );
}

function InfoIcon() {
  return (
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
  );
}
