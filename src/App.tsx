import { useState, useMemo, useCallback } from 'react';
import { SolanaProvider as SolanaHooksProvider } from '@solana/react-hooks';
import { SolanaClientProvider } from './context/SolanaContext';
import { BridgeProvider } from './context/BridgeContext';
import { TokenProvider } from './context/TokenContext';
import { WalletProvider, useWalletContext } from './context/WalletContext';
import { SwapProvider, useSwapContext } from './context/SwapContext';
import { GasSponsorProvider } from './context/GasSponsorContext';
import { WalletButton } from './components/wallet/WalletButton';
import { WalletSelectorModal } from './components/wallet/WalletSelectorModal';
import { TokenSelector } from './components/token';
import { ChainSelector, AmountInput, QuoteDisplay, SwapStatusModal } from './components/swap';
import {
  useSourceTokens,
  useDestinationTokens,
  useTokenBalance,
  useQuote,
  useUnifiedSwapExecution,
  useOrderStatus,
} from './hooks';
import { DESTINATION_CHAINS } from './config/chains';
import { env } from './config/env';
import { getAddressValidationError } from './utils/validation';

function SwapForm() {
  const { state, dispatch } = useSwapContext();
  const { connected, publicKey } = useWalletContext();
  const { tokens: sourceTokens, isLoading: loadingSource } = useSourceTokens();
  const { tokens: destTokens, isLoading: loadingDest } = useDestinationTokens(
    state.destinationChain
  );

  // Local slippage state (default 0.5%)
  const [slippage, setSlippage] = useState(0.005);

  // Find selected tokens/chain from state
  const selectedSourceToken =
    sourceTokens.find((t) => t.address === state.sourceToken) ?? null;
  const selectedDestToken =
    destTokens.find((t) => t.address === state.destinationToken) ?? null;
  const selectedChain =
    DESTINATION_CHAINS.find((c) => c.id === state.destinationChain) ?? null;

  // Get balance for selected source token
  const { balance, isLoading: balanceLoading } = useTokenBalance(selectedSourceToken);

  // Validate recipient address
  const recipientAddressError = getAddressValidationError(
    state.recipientAddress,
    state.destinationChain
  );

  // Build quote params - only when all required fields are filled
  const quoteParams = useMemo(() => {
    if (!connected || !publicKey || !selectedSourceToken) return null;
    return {
      sourceToken: state.sourceToken,
      destinationChain: state.destinationChain,
      destinationToken: state.destinationToken,
      amount: state.amount,
      sourceTokenDecimals: selectedSourceToken.decimals,
      senderAddress: publicKey,
      recipientAddress: state.recipientAddress,
      slippage,
    };
  }, [
    connected,
    publicKey,
    selectedSourceToken,
    state.sourceToken,
    state.destinationChain,
    state.destinationToken,
    state.amount,
    state.recipientAddress,
    slippage,
  ]);

  // Fetch quote with pause/resume for execution
  const {
    quote,
    isLoading: quoteLoading,
    error: quoteError,
    secondsUntilExpiry,
    pause: pauseQuote,
    resume: resumeQuote,
  } = useQuote(quoteParams);

  // Get source token decimals for gas conversion (default to 6 for USDC)
  const sourceTokenDecimals = selectedSourceToken?.decimals ?? 6;

  // Swap execution hook - automatically uses deBridge or Relay based on provider
  const {
    execute: executeSwap,
    isExecuting,
    txSignature,
    error: executionError,
    status: executionStatus,
    reset: resetExecution,
  } = useUnifiedSwapExecution(quote, state.sourceToken, sourceTokenDecimals, pauseQuote, resumeQuote);

  // Order status tracking - start polling after tx is confirmed
  const orderId = executionStatus === 'completed' ? quote?.id ?? null : null;
  const {
    orderInfo,
    isLoading: orderLoading,
    error: orderError,
  } = useOrderStatus(orderId);

  // Handle swap button click
  const handleSwap = useCallback(async () => {
    await executeSwap();
  }, [executeSwap]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    resetExecution();
    // If swap completed, reset the form
    if (executionStatus === 'completed') {
      dispatch({ type: 'RESET' });
    } else {
      // Resume quote refresh on error/cancel
      resumeQuote();
    }
  }, [resetExecution, executionStatus, dispatch, resumeQuote]);

  // Handle retry from error state
  const handleRetry = useCallback(() => {
    resetExecution();
    resumeQuote();
  }, [resetExecution, resumeQuote]);

  // Validate amount input
  const amountError = useMemo(() => {
    if (!state.amount) return null;
    const amount = parseFloat(state.amount);
    if (isNaN(amount)) return 'Invalid amount';
    if (amount <= 0) return 'Amount must be greater than zero';
    return null;
  }, [state.amount]);

  // Check if user has sufficient balance
  const insufficientBalance = useMemo(() => {
    if (!balance || !state.amount || !selectedSourceToken) return false;
    const amount = parseFloat(state.amount);
    const userBalance = parseFloat(balance);
    if (isNaN(amount) || isNaN(userBalance)) return false;
    return amount > userBalance;
  }, [balance, state.amount, selectedSourceToken]);

  // Determine if swap button should be enabled
  // Block when: not connected, no quote, loading, executing, quote expiring soon (<5s), invalid address, invalid amount, or insufficient balance
  const quoteExpiringSoon = secondsUntilExpiry !== null && secondsUntilExpiry < 5;
  const canSwap = connected && quote !== null && !quoteLoading && !isExecuting && !quoteExpiringSoon && !recipientAddressError && !amountError && !insufficientBalance;

  return (
    <div className="bg-white/85 rounded-2xl p-5 border border-winter-border shadow-lg backdrop-blur-xl space-y-3 frost-shimmer">
      {/* Source Token */}
      <div>
        <label className="text-sm text-winter-textSecondary mb-1 block">From (Solana)</label>
        <TokenSelector
          tokens={sourceTokens}
          selectedToken={selectedSourceToken}
          onSelect={(token) =>
            dispatch({ type: 'SET_SOURCE_TOKEN', payload: token.address })
          }
          isLoading={loadingSource}
          label="Select source token"
        />
      </div>

      {/* Amount Input */}
      <div className={!selectedSourceToken ? 'opacity-50 pointer-events-none' : ''}>
        <label className="text-sm text-winter-textSecondary mb-1 block">
          Amount {!selectedSourceToken && <span className="text-xs">(Select token first)</span>}
        </label>
        <AmountInput
          value={state.amount}
          onChange={(value) => dispatch({ type: 'SET_AMOUNT', payload: value })}
          token={selectedSourceToken}
          balance={balance}
          balanceLoading={balanceLoading}
          disabled={!selectedSourceToken}
        />
        {amountError && (
          <p className="text-red-600 text-xs mt-1">{amountError}</p>
        )}
        {!amountError && insufficientBalance && (
          <p className="text-red-600 text-xs mt-1">Insufficient balance</p>
        )}
      </div>

      {/* Destination Chain */}
      <div>
        <label className="text-sm text-winter-textSecondary mb-1 block">To Chain</label>
        <ChainSelector
          chains={DESTINATION_CHAINS}
          selectedChain={selectedChain}
          onSelect={(chain) =>
            dispatch({ type: 'SET_DESTINATION_CHAIN', payload: chain.id })
          }
        />
      </div>

      {/* Destination Token */}
      <div className={!state.destinationChain ? 'opacity-50 pointer-events-none' : ''}>
        <label className="text-sm text-winter-textSecondary mb-1 block">
          Receive {!state.destinationChain && <span className="text-xs">(Select chain first)</span>}
        </label>
        <TokenSelector
          tokens={destTokens}
          selectedToken={selectedDestToken}
          onSelect={(token) =>
            dispatch({ type: 'SET_DESTINATION_TOKEN', payload: token.address })
          }
          isLoading={loadingDest}
          label="Select destination token"
        />
      </div>

      {/* Recipient Address */}
      <div className={!selectedDestToken ? 'opacity-50 pointer-events-none' : ''}>
        <label className="text-sm text-winter-textSecondary mb-1 block">
          Recipient Address ({selectedChain?.name || 'Chain'}) {!selectedDestToken && <span className="text-xs">(Select token first)</span>}
        </label>
        <input
          type="text"
          value={state.recipientAddress}
          onChange={(e) =>
            dispatch({ type: 'SET_RECIPIENT', payload: e.target.value.trim() })
          }
          placeholder="0x..."
          disabled={!selectedDestToken}
          className={`w-full bg-white/50 rounded-lg p-3 text-winter-text text-sm
                     placeholder-winter-textSecondary/60 focus:outline-none focus:ring-2
                     backdrop-blur-lg transition-all hover:bg-white/70
                     font-mono ${
                       recipientAddressError
                         ? 'border border-red-400 focus:ring-red-400'
                         : 'border border-winter-border focus:ring-winter-cyan/50 focus:border-winter-cyan'
                     }`}
        />
        {recipientAddressError && (
          <p className="text-red-400 text-xs mt-1">{recipientAddressError}</p>
        )}
      </div>

      {/* Quote Display - only show when there's a quote, loading, or error */}
      {(quote || quoteLoading || quoteError) && (
        <QuoteDisplay
          quote={quote}
          sourceToken={selectedSourceToken}
          destinationToken={selectedDestToken}
          isLoading={quoteLoading}
          error={quoteError}
          secondsUntilExpiry={secondsUntilExpiry}
          slippage={slippage}
          onSlippageChange={setSlippage}
          sourceTokenAddress={state.sourceToken}
        />
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!canSwap}
        className={`w-full bg-gradient-to-r from-solana-purple to-winter-cyan
                   text-white font-semibold py-3 rounded-lg transition-all shadow-md
                   ${canSwap ? 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : 'opacity-50 cursor-not-allowed'}`}
      >
        {!connected
          ? 'Connect Wallet to Swap'
          : isExecuting
            ? 'Processing...'
            : quoteLoading
              ? 'Fetching Quote...'
              : amountError
                ? amountError
                : insufficientBalance
                  ? 'Insufficient Balance'
                  : quoteExpiringSoon
                    ? 'Quote expired - refreshing...'
                    : recipientAddressError
                      ? 'Invalid Recipient Address'
                      : quote
                        ? 'Swap'
                        : 'Enter Amount'}
      </button>

      {/* Swap Status Modal */}
      <SwapStatusModal
        isOpen={isExecuting || executionStatus === 'completed' || executionStatus === 'error'}
        status={executionStatus}
        txSignature={txSignature}
        error={executionError}
        onClose={handleModalClose}
        onRetry={handleRetry}
        orderInfo={orderInfo}
        orderLoading={orderLoading}
        orderError={orderError}
      />
    </div>
  );
}

// Snowflake component for decorations
function Snowflake({ delay = 0, drift = '10px' }: { delay?: number; drift?: string }) {
  return (
    <div
      className="absolute w-2 h-2 bg-[#4A90A4]/40 rounded-full blur-[0.5px] animate-snowfall"
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${delay}s`,
        '--drift': drift,
      } as React.CSSProperties & { '--drift': string }}
    />
  );
}

// Ice crystal decoration SVG
function IceCrystal({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 10 L50 90 M10 50 L90 50 M25 25 L75 75 M75 25 L25 75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="50" cy="10" r="4" fill="currentColor" />
      <circle cx="50" cy="90" r="4" fill="currentColor" />
      <circle cx="10" cy="50" r="4" fill="currentColor" />
      <circle cx="90" cy="50" r="4" fill="currentColor" />
      <circle cx="25" cy="25" r="4" fill="currentColor" />
      <circle cx="75" cy="75" r="4" fill="currentColor" />
      <circle cx="75" cy="25" r="4" fill="currentColor" />
      <circle cx="25" cy="75" r="4" fill="currentColor" />
    </svg>
  );
}

function App() {
  return (
    <SolanaHooksProvider
      config={{
        endpoint: env.SOLANA_RPC_URL,
        websocket: env.SOLANA_WS_URL,
      }}
    >
      <SolanaClientProvider>
        <GasSponsorProvider>
          <BridgeProvider>
            <TokenProvider>
              <WalletProvider>
                <SwapProvider>
                  <div className="min-h-screen bg-gradient-to-br from-[#E8F4F8] via-[#DFF0F5] to-[#D6EAF8] relative overflow-hidden">
                    {/* Snowfall animation layer */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <Snowflake
                          key={i}
                          delay={i * 0.5}
                          drift={`${(Math.random() - 0.5) * 50}px`}
                        />
                      ))}
                    </div>

                    {/* Ice crystal decorations - reduced opacity for light background */}
                    <IceCrystal className="absolute top-20 left-10 w-16 h-16 text-winter-border/15 opacity-30" />
                    <IceCrystal className="absolute top-40 right-20 w-24 h-24 text-winter-border/10 opacity-25" />
                    <IceCrystal className="absolute bottom-32 left-1/4 w-20 h-20 text-winter-glacial/8 opacity-20" />

                    <header className="border-b border-winter-border backdrop-blur-xl bg-white/40 relative z-10">
                      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Ice cube logo */}
                          <div className="w-8 h-8 bg-gradient-to-br from-winter-glacial/30 to-winter-cyan/20 border-2 border-winter-border rounded-lg backdrop-blur-sm shadow-md" />
                          <h1 className="text-2xl font-bold text-winter-text">
                            Cool<span className="bg-gradient-to-r from-winter-cyan to-solana-purple bg-clip-text text-transparent">Swap</span>
                          </h1>
                        </div>
                        <WalletButton />
                      </div>
                    </header>
                    <main className="container mx-auto px-4 py-6 relative z-10">
                      <div className="max-w-lg mx-auto">
                        {/* Page header with title and subtitle */}
                        <div className="text-center mb-6">
                          <h1 className="text-3xl font-bold text-winter-text mb-1 flex items-center justify-center gap-2">
                            <span className="text-winter-cyan">❄️</span>
                            Cross-Chain Swap
                          </h1>
                          <p className="text-winter-textSecondary">
                            Swap from Solana to any EVM chain instantly
                          </p>
                        </div>

                        <SwapForm />

                        {/* Footer */}
                        <div className="text-center mt-4 text-sm text-winter-textSecondary">
                          Powered by Relay • Built with ❄️
                        </div>
                      </div>
                    </main>

                    {/* Wallet Selector Modal */}
                    <WalletSelectorModal />
                  </div>
                </SwapProvider>
              </WalletProvider>
            </TokenProvider>
          </BridgeProvider>
        </GasSponsorProvider>
      </SolanaClientProvider>
    </SolanaHooksProvider>
  );
}

export default App;
