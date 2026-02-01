/**
 * Unit tests for RelayProvider
 * Tests critical bridge API integration logic
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RelayProvider } from '@/services/bridge/RelayProvider';
import type { QuoteRequest } from '@/services/bridge/types';
import {
  mockRelayQuoteWithInstructions,
  mockRelayQuoteWithDepositFeePayer,
  mockRelayQuoteWithoutDepositFeePayer,
  mockRelayErrorResponses,
} from '../fixtures/relay';
import { toRelayChainId, toNormalizedChainId } from '../helpers/RelayTestHelper';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('RelayProvider', () => {
  let provider: RelayProvider;
  let providerWithDepositFeePayer: RelayProvider;

  const mockQuoteRequest: QuoteRequest = {
    sourceChainId: 'solana',
    destinationChainId: 'ethereum',
    sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    destinationTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1000000',
    senderAddress: 'Fe3Payer11111111111111111111111111111111',
    recipientAddress: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(() => {
    provider = new RelayProvider('https://api.relay.link');
    providerWithDepositFeePayer = new RelayProvider(
      'https://api.relay.link',
      undefined,
      'ServerWallet1111111111111111111111111111'
    );
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrder - depositFeePayer handling', () => {
    it('includes depositFeePayer when set for Solana source chain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayQuoteWithDepositFeePayer,
      });

      await providerWithDepositFeePayer.createOrder(mockQuoteRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.relay.link/quote',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('depositFeePayer'),
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      expect(callBody.depositFeePayer).toBe('ServerWallet1111111111111111111111111111');
    });

    it('omits depositFeePayer when not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayQuoteWithoutDepositFeePayer,
      });

      await provider.createOrder(mockQuoteRequest);

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      expect(callBody.depositFeePayer).toBeUndefined();
    });

    it('never includes depositFeePayer for non-Solana chains', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayQuoteWithInstructions,
      });

      const evmRequest = { ...mockQuoteRequest, sourceChainId: 'ethereum' };
      await providerWithDepositFeePayer.createOrder(evmRequest);

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      expect(callBody.depositFeePayer).toBeUndefined();
    });

    it('sets networkFee to "0" when depositFeePayer is set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayQuoteWithDepositFeePayer,
      });

      const result = await providerWithDepositFeePayer.createOrder(mockQuoteRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.quote.fees.networkFee).toBe('0');
      }
    });

    it('uses actual gas.amount for networkFee when depositFeePayer is not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayQuoteWithoutDepositFeePayer,
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.quote.fees.networkFee).toBe('5000');
      }
    });
  });

  describe('createOrder - error mapping', () => {
    it('maps "insufficient liquidity" to INSUFFICIENT_LIQUIDITY', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockRelayErrorResponses.insufficientLiquidity,
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INSUFFICIENT_LIQUIDITY');
      }
    });

    it('maps "minimum amount" to AMOUNT_TOO_LOW', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockRelayErrorResponses.amountTooLow,
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AMOUNT_TOO_LOW');
        if (result.error.code === 'AMOUNT_TOO_LOW') {
          expect(result.error.minimum).toBe('0');
        }
      }
    });

    it('maps "maximum amount" to AMOUNT_TOO_HIGH', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockRelayErrorResponses.amountTooHigh,
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AMOUNT_TOO_HIGH');
        if (result.error.code === 'AMOUNT_TOO_HIGH') {
          expect(result.error.maximum).toBe('0');
        }
      }
    });

    it('maps "unsupported pair" to UNSUPPORTED_PAIR', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockRelayErrorResponses.unsupportedPair,
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNSUPPORTED_PAIR');
      }
    });

    it('handles case-insensitive error matching', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'INSUFFICIENT LIQUIDITY' }),
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INSUFFICIENT_LIQUIDITY');
      }
    });

    it('re-throws unexpected errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockRelayErrorResponses.genericError,
      });

      await expect(provider.createOrder(mockQuoteRequest)).rejects.toThrow();
    });
  });

  describe('createOrder - transaction format detection', () => {
    it('extracts instructions array (new format)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayQuoteWithInstructions,
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.quote.transactionData).toBeDefined();
        expect((result.quote.transactionData as any)?.chainType).toBe('solana');
        expect((result.quote.transactionData as any)?.instructions).toBeDefined();
        expect(Array.isArray((result.quote.transactionData as any)?.instructions)).toBe(true);
      }
    });

    it('extracts Base64-encoded txData (legacy format)', async () => {
      const { mockRelayQuoteWithTxData } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayQuoteWithTxData,
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.quote.transactionData).toBeDefined();
        expect((result.quote.transactionData as any)?.chainType).toBe('solana');
        expect((result.quote.transactionData as any)?.data).toMatch(/^0x[0-9a-f]+$/i);
      }
    });

    it('handles EVM transactions with data field', async () => {
      const { mockRelayQuoteEVM } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayQuoteEVM,
      });

      const evmRequest = { ...mockQuoteRequest, sourceChainId: 'ethereum' };
      const result = await provider.createOrder(evmRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.quote.transactionData as any)?.chainType).toBe('evm');
        expect((result.quote.transactionData as any)?.data).toBeDefined();
      }
    });

    it('returns undefined transactionData when no tx data present', async () => {
      const quoteWithoutTx = {
        ...mockRelayQuoteWithInstructions,
        steps: [],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => quoteWithoutTx,
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.quote.transactionData).toBeUndefined();
      }
    });

    it('handles empty instructions array gracefully', async () => {
      const quoteWithEmptyInstructions = {
        ...mockRelayQuoteWithInstructions,
        steps: [
          {
            ...mockRelayQuoteWithInstructions.steps[0],
            items: [{ status: 'pending', data: { instructions: [] } }],
          },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => quoteWithEmptyInstructions,
      });

      const result = await provider.createOrder(mockQuoteRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.quote.transactionData).toBeUndefined();
      }
    });
  });

  describe('getOrderStatus - status mapping', () => {
    it('maps "pending" and "waiting" to pending status', async () => {
      const { mockRelayStatusResponses } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayStatusResponses.pending,
      });

      const result = await provider.getOrderStatus('order-123');
      expect(result.status).toBe('pending');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockRelayStatusResponses.pending, status: 'waiting' }),
      });

      const result2 = await provider.getOrderStatus('order-456');
      expect(result2.status).toBe('pending');
    });

    it('maps "created" status correctly', async () => {
      const { mockRelayStatusResponses } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayStatusResponses.created,
      });

      const result = await provider.getOrderStatus('order-123');
      expect(result.status).toBe('created');
    });

    it('maps "fulfilled" status correctly', async () => {
      const { mockRelayStatusResponses } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayStatusResponses.fulfilled,
      });

      const result = await provider.getOrderStatus('order-123');
      expect(result.status).toBe('fulfilled');
    });

    it('maps "completed" status correctly', async () => {
      const { mockRelayStatusResponses } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayStatusResponses.completed,
      });

      const result = await provider.getOrderStatus('order-123');
      expect(result.status).toBe('completed');
    });

    it('handles case-insensitive status strings', async () => {
      const { mockRelayStatusResponses } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockRelayStatusResponses.fulfilled, status: 'FULFILLED' }),
      });

      const result = await provider.getOrderStatus('order-123');
      expect(result.status).toBe('fulfilled');
    });

    it('takes first hash from inTxHashes array', async () => {
      const { mockRelayStatusResponses } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockRelayStatusResponses.pending,
          inTxHashes: ['first-hash', 'second-hash'],
        }),
      });

      const result = await provider.getOrderStatus('order-123');
      expect(result.sourceTxHash).toBe('first-hash');
    });

    it('takes first hash from txHashes array', async () => {
      const { mockRelayStatusResponses } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockRelayStatusResponses.fulfilled,
          txHashes: ['dest-hash-1', 'dest-hash-2'],
        }),
      });

      const result = await provider.getOrderStatus('order-123');
      expect(result.destinationTxHash).toBe('dest-hash-1');
    });

    it('falls back to "solana" for missing sourceChainId', async () => {
      const { mockRelayStatusResponses } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockRelayStatusResponses.pending, originChainId: undefined }),
      });

      const result = await provider.getOrderStatus('order-123');
      expect(result.sourceChainId).toBe('solana');
    });

    it('falls back to "unknown" for missing destinationChainId', async () => {
      const { mockRelayStatusResponses } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockRelayStatusResponses.pending, destinationChainId: undefined }),
      });

      const result = await provider.getOrderStatus('order-123');
      expect(result.destinationChainId).toBe('unknown');
    });
  });

  describe('chain ID conversion', () => {
    it('converts "solana" to 792703809', () => {
      expect(toRelayChainId('solana')).toBe(792703809);
    });

    it('converts "ethereum" to 1', () => {
      expect(toRelayChainId('ethereum')).toBe(1);
    });

    it('converts "arbitrum" to 42161', () => {
      expect(toRelayChainId('arbitrum')).toBe(42161);
    });

    it('throws error for unsupported chain ID', () => {
      expect(() => toRelayChainId('unsupported')).toThrow('Unsupported chain ID');
    });

    it('converts 792703809 to "solana"', () => {
      expect(toNormalizedChainId(792703809)).toBe('solana');
    });

    it('converts numeric string "792703809" to "solana"', () => {
      expect(toNormalizedChainId('792703809')).toBe('solana');
    });

    it('returns unknown ID as string', () => {
      expect(toNormalizedChainId(99999)).toBe('99999');
    });
  });

  describe('getTokens', () => {
    it('returns normalized tokens for valid chain ID', async () => {
      const { mockRelayTokensResponse } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayTokensResponse,
      });

      const result = await provider.getTokens('solana');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!).toHaveProperty('address');
      expect(result[0]!).toHaveProperty('symbol');
      expect(result[0]!).toHaveProperty('decimals');
      expect(result[0]!.chainId).toBe('solana');
    });

    it('returns empty array for unmapped chain ID', async () => {
      const result = await provider.getTokens('unsupported-chain');
      expect(result).toEqual([]);
    });

    it('handles missing logoUri gracefully', async () => {
      const tokensWithoutLogo = [
        {
          chainId: 792703809,
          address: 'TestToken111111111111111111111111111111',
          symbol: 'TEST',
          name: 'Test Token',
          decimals: 9,
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => tokensWithoutLogo,
      });

      const result = await provider.getTokens('solana');

      expect(result[0]!.logoUri).toBeUndefined();
    });

    it('maps RelayCurrency to Token format correctly', async () => {
      const { mockRelayTokensResponse } = await import('../fixtures/relay');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelayTokensResponse,
      });

      const result = await provider.getTokens('solana');

      expect(result[0]!).toMatchObject({
        address: expect.any(String),
        symbol: expect.any(String),
        name: expect.any(String),
        decimals: expect.any(Number),
        chainId: 'solana',
      });
    });
  });
});
