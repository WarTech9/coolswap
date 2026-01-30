import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia for Tailwind/CSS tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Buffer polyfill for tests
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Mock @solana/client to prevent WebSocket issues in tests
vi.mock('@solana/client', () => {
  const mockRpc = {
    getLatestBlockhash: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({
        value: { blockhash: 'mock-blockhash-123', lastValidBlockHeight: 12345 },
      }),
    }),
    getSignatureStatuses: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({
        value: [{ confirmationStatus: 'confirmed', err: null }],
      }),
    }),
    sendTransaction: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue('mock-signature-456'),
    }),
  };

  return {
    createClient: vi.fn().mockReturnValue({
      rpc: mockRpc,
      wallets: [],
    }),
    autoDiscover: vi.fn().mockReturnValue([]),
    fetchAccount: vi.fn().mockResolvedValue({
      exists: true,
      programAddress: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    }),
  };
});

// Mock @solana/addresses
vi.mock('@solana/addresses', () => ({
  address: vi.fn().mockImplementation((addr: string) => addr),
}));

// Mock @solana/react-hooks
vi.mock('@solana/react-hooks', () => ({
  SolanaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSolanaClient: vi.fn().mockReturnValue({
    rpc: {
      getLatestBlockhash: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({
          value: { blockhash: 'mock-blockhash-123' },
        }),
      }),
    },
  }),
  useWallet: vi.fn().mockReturnValue({
    connected: false,
    publicKey: null,
  }),
  useConnectWallet: vi.fn().mockReturnValue({
    connect: vi.fn(),
    isPending: false,
  }),
  useDisconnectWallet: vi.fn().mockReturnValue({
    disconnect: vi.fn(),
    isPending: false,
  }),
  useBalance: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
  }),
  useSplToken: vi.fn().mockReturnValue({
    balance: null,
    status: 'disconnected',
    isFetching: false,
  }),
  useWalletConnection: vi.fn().mockReturnValue({
    connected: false,
    connectors: [],
    wallet: null,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  }),
}));
