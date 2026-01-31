import { useState, useMemo } from 'react';
import { SolanaProvider as SolanaHooksProvider } from '@solana/react-hooks';
import { SolanaClientProvider } from './context/SolanaContext';
import { BridgeProvider } from './context/BridgeContext';
import { TokenProvider } from './context/TokenContext';
import { WalletProvider, useWalletContext } from './context/WalletContext';
import { SwapProvider, useSwapContext } from './context/SwapContext';
import { WalletButton } from './components/wallet/WalletButton';
import { TokenSelector } from './components/token';
import { ChainSelector, AmountInput, QuoteDisplay } from './components/swap';
import {
  useSourceTokens,
  useDestinationTokens,
  useTokenBalance,
  useQuote,
} from './hooks';
import { DESTINATION_CHAINS } from './config/chains';
import { env } from './config/env';

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

  // Fetch quote
  const {
    quote,
    isLoading: quoteLoading,
    error: quoteError,
    secondsUntilExpiry,
  } = useQuote(quoteParams);

  // Determine if swap button should be enabled
  const canSwap = connected && quote !== null && !quoteLoading;

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 shadow-xl space-y-4">
      {/* Source Token */}
      <div>
        <label className="text-sm text-slate-400 mb-1 block">From (Solana)</label>
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
      {selectedSourceToken && (
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Amount</label>
          <AmountInput
            value={state.amount}
            onChange={(value) => dispatch({ type: 'SET_AMOUNT', payload: value })}
            token={selectedSourceToken}
            balance={balance}
            balanceLoading={balanceLoading}
          />
        </div>
      )}

      {/* Destination Chain */}
      <div>
        <label className="text-sm text-slate-400 mb-1 block">To Chain</label>
        <ChainSelector
          chains={DESTINATION_CHAINS}
          selectedChain={selectedChain}
          onSelect={(chain) =>
            dispatch({ type: 'SET_DESTINATION_CHAIN', payload: chain.id })
          }
        />
      </div>

      {/* Destination Token */}
      {state.destinationChain && (
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Receive</label>
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
      )}

      {/* Recipient Address */}
      {selectedDestToken && (
        <div>
          <label className="text-sm text-slate-400 mb-1 block">
            Recipient Address ({selectedChain?.name})
          </label>
          <input
            type="text"
            value={state.recipientAddress}
            onChange={(e) =>
              dispatch({ type: 'SET_RECIPIENT', payload: e.target.value })
            }
            placeholder="0x..."
            className="w-full bg-slate-700/50 rounded-lg p-3 text-white text-sm
                       placeholder-slate-500 focus:outline-none focus:ring-2
                       focus:ring-solana-purple font-mono"
          />
        </div>
      )}

      {/* Quote Display */}
      <QuoteDisplay
        quote={quote}
        sourceToken={selectedSourceToken}
        destinationToken={selectedDestToken}
        isLoading={quoteLoading}
        error={quoteError}
        secondsUntilExpiry={secondsUntilExpiry}
        slippage={slippage}
        onSlippageChange={setSlippage}
      />

      {/* Swap Button */}
      <button
        disabled={!canSwap}
        className={`w-full bg-gradient-to-r from-solana-purple to-solana-green
                   text-white font-medium py-3 rounded-lg transition-opacity
                   ${canSwap ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'}`}
      >
        {!connected
          ? 'Connect Wallet'
          : quoteLoading
            ? 'Fetching Quote...'
            : quote
              ? 'Swap (Phase 4)'
              : 'Enter Amount'}
      </button>
    </div>
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
        <BridgeProvider>
          <TokenProvider>
            <WalletProvider>
              <SwapProvider>
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                  <header className="border-b border-slate-700/50 backdrop-blur-sm">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                      <h1 className="text-2xl font-bold text-white">
                        Cool<span className="text-solana-purple">Swap</span>
                      </h1>
                      <WalletButton />
                    </div>
                  </header>
                  <main className="container mx-auto px-4 py-8">
                    <div className="max-w-md mx-auto">
                      <SwapForm />
                    </div>
                  </main>
                </div>
              </SwapProvider>
            </WalletProvider>
          </TokenProvider>
        </BridgeProvider>
      </SolanaClientProvider>
    </SolanaHooksProvider>
  );
}

export default App;
