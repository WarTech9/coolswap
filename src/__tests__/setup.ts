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

// Mock @solana/web3-compat Connection to prevent WebSocket issues in tests
vi.mock('@solana/web3-compat', () => ({
  Connection: vi.fn().mockImplementation(() => ({
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'mock-blockhash-123',
      lastValidBlockHeight: 12345,
    }),
    getAccountInfo: vi.fn().mockResolvedValue(null),
    sendTransaction: vi.fn().mockResolvedValue('mock-signature-456'),
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    getRecentPrioritizationFees: vi.fn().mockResolvedValue([
      { prioritizationFee: 1000 },
      { prioritizationFee: 2000 },
      { prioritizationFee: 1500 },
    ]),
  })),
  PublicKey: vi.fn().mockImplementation((key: string) => ({
    toString: () => key,
    toBase58: () => key,
    equals: (other: { toString: () => string }) => key === other.toString(),
  })),
  VersionedTransaction: vi.fn(),
}));
