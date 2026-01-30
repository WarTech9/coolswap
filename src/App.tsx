import { WalletProvider } from './context/WalletContext';
import { SwapProvider } from './context/SwapContext';

function App() {
  return (
    <WalletProvider>
      <SwapProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <header className="border-b border-slate-700/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">
                Cool<span className="text-solana-purple">Swap</span>
              </h1>
              {/* WalletButton will go here */}
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-md mx-auto">
              {/* SwapForm will go here */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <p className="text-slate-400 text-center">
                  Swap form placeholder - connect wallet to begin
                </p>
              </div>
            </div>
          </main>
        </div>
      </SwapProvider>
    </WalletProvider>
  );
}

export default App;
