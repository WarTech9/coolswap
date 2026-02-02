/**
 * Modal component for displaying swap transaction status
 * Shows signing, confirming, completed, and error states
 * Also displays order tracking after transaction confirmation
 */

import type { ExecutionStatus } from '@/hooks/useUnifiedSwapExecution';
import type { OrderInfo } from '@/services/bridge/types';
import { OrderStatus } from '@/services/bridge/types';

interface SwapStatusModalProps {
  isOpen: boolean;
  status: ExecutionStatus;
  txSignature: string | null;
  error: string | null;
  onClose: () => void;
  onRetry?: () => void;
  /** Order tracking info after transaction is confirmed */
  orderInfo?: OrderInfo | null;
  /** Whether order status is being loaded */
  orderLoading?: boolean;
  /** Error from order tracking */
  orderError?: string | null;
}

/**
 * Truncate a signature for display
 */
function truncateSignature(sig: string): string {
  if (sig.length <= 16) return sig;
  return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
}

/**
 * Get Solana explorer URL for a transaction
 */
function getExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}`;
}

/**
 * Spinning ice crystal loader animation
 */
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
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

/**
 * Checkmark icon for success state
 */
function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

/**
 * X icon for error state
 */
function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * Wallet icon for signing state
 */
function WalletIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
      />
    </svg>
  );
}

/**
 * External link icon
 */
function ExternalLinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export function SwapStatusModal({
  isOpen,
  status,
  txSignature,
  error,
  onClose,
  onRetry,
  orderInfo,
  orderLoading,
  orderError,
}: SwapStatusModalProps) {
  if (!isOpen) return null;

  // Determine if order is in terminal state
  const isOrderTerminal = orderInfo && (
    orderInfo.status === OrderStatus.FULFILLED ||
    orderInfo.status === OrderStatus.COMPLETED ||
    orderInfo.status === OrderStatus.CANCELLED ||
    orderInfo.status === OrderStatus.FAILED
  );

  const renderContent = () => {
    switch (status) {
      case 'signing':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-winter-cyan/20 rounded-full flex items-center justify-center mb-4 border border-winter-cyan/30">
              <WalletIcon className="w-8 h-8 text-winter-cyan" />
            </div>
            <h3 className="text-lg font-semibold text-winter-text mb-2">
              Waiting for Wallet
            </h3>
            <p className="text-winter-textSecondary text-sm">
              Please approve the transaction in your wallet...
            </p>
            <Spinner className="w-6 h-6 text-winter-cyan mx-auto mt-4" />
          </div>
        );

      case 'confirming':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-winter-cyan/20 rounded-full flex items-center justify-center mb-4 border border-winter-cyan/30">
              <Spinner className="w-8 h-8 text-winter-cyan" />
            </div>
            <h3 className="text-lg font-semibold text-winter-text mb-2">
              Confirming Transaction
            </h3>
            <p className="text-winter-textSecondary text-sm mb-4">
              Your transaction is being confirmed on Solana...
            </p>
            {txSignature && (
              <a
                href={getExplorerUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-winter-cyan hover:text-winter-glacial font-mono"
              >
                {truncateSignature(txSignature)}
              </a>
            )}
          </div>
        );

      case 'completed':
        // Show order tracking progress after tx confirmation
        return (
          <div className="text-center">
            {/* Show order tracking if we have order info or are loading it */}
            {(orderInfo || orderLoading) && !orderError ? (
              <>
                {/* Order Created - waiting for fulfillment */}
                {orderLoading || (orderInfo && orderInfo.status === OrderStatus.CREATED) ? (
                  <>
                    <div className="mx-auto w-16 h-16 bg-winter-cyan/20 rounded-full flex items-center justify-center mb-4 border border-winter-cyan/30">
                      <Spinner className="w-8 h-8 text-winter-cyan" />
                    </div>
                    <h3 className="text-lg font-semibold text-winter-text mb-2">
                      Order Submitted
                    </h3>
                    <p className="text-winter-textSecondary text-sm mb-4">
                      Your order has been submitted to the bridge. Waiting for fulfillment...
                    </p>
                  </>
                ) : orderInfo && (orderInfo.status === OrderStatus.FULFILLED || orderInfo.status === OrderStatus.COMPLETED) ? (
                  <>
                    <div className="mx-auto w-16 h-16 bg-winter-cyan/20 rounded-full flex items-center justify-center mb-4 border border-winter-cyan/30 shadow-sm">
                      <CheckIcon className="w-8 h-8 text-winter-cyan" />
                    </div>
                    <h3 className="text-lg font-semibold text-winter-text mb-2">
                      Tokens Delivered!
                    </h3>
                    <p className="text-winter-textSecondary text-sm mb-4">
                      Your tokens have been delivered to the destination chain.
                    </p>
                    {orderInfo.destinationTxHash && (
                      <p className="text-xs text-winter-textSecondary/70 mb-2 font-mono">
                        Dest TX: {truncateSignature(orderInfo.destinationTxHash)}
                      </p>
                    )}
                  </>
                ) : orderInfo && (orderInfo.status === OrderStatus.CANCELLED || orderInfo.status === OrderStatus.FAILED) ? (
                  <>
                    <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                      <XIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-winter-text mb-2">
                      Order {orderInfo.status === OrderStatus.CANCELLED ? 'Cancelled' : 'Failed'}
                    </h3>
                    <p className="text-winter-textSecondary text-sm mb-4">
                      {orderInfo.status === OrderStatus.CANCELLED
                        ? 'Your order was cancelled.'
                        : 'Your order failed to complete. Please contact support.'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-16 h-16 bg-winter-cyan/20 rounded-full flex items-center justify-center mb-4">
                      <Spinner className="w-8 h-8 text-winter-cyan" />
                    </div>
                    <h3 className="text-lg font-semibold text-winter-text mb-2">
                      Processing Order
                    </h3>
                    <p className="text-winter-textSecondary text-sm mb-4">
                      Your order is being processed...
                    </p>
                  </>
                )}

                {/* Source tx link */}
                {txSignature && (
                  <a
                    href={getExplorerUrl(txSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-winter-cyan hover:text-winter-glacial mb-4 transition-colors"
                  >
                    View Solana TX
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                )}

                {/* Only show Done button when order is terminal */}
                {isOrderTerminal && (
                  <button
                    onClick={onClose}
                    className="mt-4 w-full bg-gradient-to-r from-solana-purple to-winter-cyan
                               text-white font-medium py-3 rounded-lg hover:shadow-glow-purple hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Done
                  </button>
                )}
              </>
            ) : orderError ? (
              <>
                <div className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckIcon className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-lg font-semibold text-winter-text mb-2">
                  Transaction Confirmed
                </h3>
                <p className="text-winter-textSecondary text-sm mb-2">
                  Your transaction was confirmed on Solana.
                </p>
                <p className="text-yellow-400 text-xs mb-4">
                  {orderError}
                </p>
                {txSignature && (
                  <a
                    href={getExplorerUrl(txSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-solana-purple hover:text-solana-purple/80"
                  >
                    View on Explorer
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="mt-6 w-full bg-gradient-to-r from-solana-purple to-solana-green
                             text-white font-medium py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckIcon className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-winter-text mb-2">
                  Swap Completed!
                </h3>
                <p className="text-winter-textSecondary text-sm mb-4">
                  Your cross-chain swap has been submitted successfully.
                </p>
                {txSignature && (
                  <a
                    href={getExplorerUrl(txSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-solana-purple hover:text-solana-purple/80"
                  >
                    View on Explorer
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="mt-6 w-full bg-gradient-to-r from-solana-purple to-solana-green
                             text-white font-medium py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <XIcon className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-winter-text mb-2">
              Transaction Failed
            </h3>
            <p className="text-winter-textSecondary text-sm mb-4">
              {error || 'An unknown error occurred'}
            </p>
            {txSignature && (
              <a
                href={getExplorerUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-solana-purple hover:text-solana-purple/80 font-mono block mb-4"
              >
                {truncateSignature(txSignature)}
              </a>
            )}
            <div className="flex gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex-1 bg-white/60 hover:bg-white/80 text-winter-text font-medium
                             py-3 rounded-lg transition-colors border border-winter-border"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={onClose}
                className={`${onRetry ? 'flex-1' : 'w-full'} bg-white/60 hover:bg-white/80
                           text-winter-text font-medium py-3 rounded-lg transition-colors border border-winter-border`}
              >
                Close
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-crystallize">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1A3A52]/60 backdrop-blur-xl"
        onClick={status === 'completed' || status === 'error' ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white/95 rounded-2xl p-4 sm:p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm mx-4 border-2 border-winter-border shadow-lg backdrop-blur-2xl">
        {renderContent()}
      </div>
    </div>
  );
}
