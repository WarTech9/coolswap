/**
 * Tests for SwapContext - isValidAmount and swapReducer
 */

import { describe, it, expect } from 'vitest';
import { isValidAmount, swapReducer } from '@/context/SwapContext';
import type { Quote } from '@/services/bridge/types';

describe('isValidAmount', () => {
  it('should return true for empty string', () => {
    expect(isValidAmount('')).toBe(true);
  });

  it('should return true for valid integers', () => {
    expect(isValidAmount('0')).toBe(true);
    expect(isValidAmount('1')).toBe(true);
    expect(isValidAmount('100')).toBe(true);
    expect(isValidAmount('1000')).toBe(true);
  });

  it('should return true for valid decimals', () => {
    expect(isValidAmount('0.1')).toBe(true);
    expect(isValidAmount('1.5')).toBe(true);
    expect(isValidAmount('100.25')).toBe(true);
    expect(isValidAmount('1000.999')).toBe(true);
  });

  it('should return true for decimals with leading zero', () => {
    expect(isValidAmount('0.5')).toBe(true);
    expect(isValidAmount('0.123')).toBe(true);
  });

  it('should return true for decimals without leading zero', () => {
    expect(isValidAmount('.5')).toBe(true);
    expect(isValidAmount('.123')).toBe(true);
  });

  it('should return true for integers with trailing decimal point', () => {
    expect(isValidAmount('1.')).toBe(true);
    expect(isValidAmount('100.')).toBe(true);
  });

  it('should return false for standalone decimal point', () => {
    expect(isValidAmount('.')).toBe(false);
  });

  it('should return false for negative numbers', () => {
    expect(isValidAmount('-1')).toBe(false);
    expect(isValidAmount('-1.5')).toBe(false);
  });

  it('should return false for non-numeric characters', () => {
    expect(isValidAmount('abc')).toBe(false);
    expect(isValidAmount('1a2')).toBe(false);
    expect(isValidAmount('1.2.3')).toBe(false);
  });

  it('should return false for special characters', () => {
    expect(isValidAmount('1,000')).toBe(false);
    expect(isValidAmount('$100')).toBe(false);
    expect(isValidAmount('100%')).toBe(false);
  });

  it('should return false for whitespace', () => {
    expect(isValidAmount(' ')).toBe(false);
    expect(isValidAmount('1 2')).toBe(false);
  });
});

describe('swapReducer', () => {
  const initialState = {
    sourceToken: null,
    destinationChain: null,
    destinationToken: null,
    amount: '',
    recipientAddress: '',
    quote: null,
    status: 'idle' as const,
    error: null,
  };

  const mockQuote: Quote = {
    id: 'test-quote-id',
    sourceAmount: '1000000000',
    destinationAmount: '995000000000000000000',
    fees: {
      operatingExpenses: '5000000',
      networkFee: '5000000',
    },
    estimatedTimeSeconds: 180,
    expiresAt: new Date('2024-01-01T00:00:30Z'),
    transactionData: { data: '0x1234', chainType: 'solana' as const },
  };

  describe('SET_SOURCE_TOKEN', () => {
    it('should set source token and clear quote', () => {
      const state = { ...initialState, quote: mockQuote };
      const result = swapReducer(state, { type: 'SET_SOURCE_TOKEN', payload: 'token123' });
      expect(result.sourceToken).toBe('token123');
      expect(result.quote).toBeNull();
    });
  });

  describe('SET_DESTINATION_CHAIN', () => {
    it('should set destination chain and clear destination token and quote', () => {
      const state = { ...initialState, destinationToken: 'token456', quote: mockQuote };
      const result = swapReducer(state, { type: 'SET_DESTINATION_CHAIN', payload: 'arbitrum' });
      expect(result.destinationChain).toBe('arbitrum');
      expect(result.destinationToken).toBeNull();
      expect(result.quote).toBeNull();
    });
  });

  describe('SET_DESTINATION_TOKEN', () => {
    it('should set destination token and clear quote', () => {
      const state = { ...initialState, quote: mockQuote };
      const result = swapReducer(state, { type: 'SET_DESTINATION_TOKEN', payload: 'token789' });
      expect(result.destinationToken).toBe('token789');
      expect(result.quote).toBeNull();
    });
  });

  describe('SET_AMOUNT', () => {
    it('should set valid amount and clear quote', () => {
      const state = { ...initialState, quote: mockQuote };
      const result = swapReducer(state, { type: 'SET_AMOUNT', payload: '100' });
      expect(result.amount).toBe('100');
      expect(result.quote).toBeNull();
    });

    it('should set valid decimal amount', () => {
      const result = swapReducer(initialState, { type: 'SET_AMOUNT', payload: '100.5' });
      expect(result.amount).toBe('100.5');
    });

    it('should not set invalid amount', () => {
      const state = { ...initialState, amount: '50' };
      const result = swapReducer(state, { type: 'SET_AMOUNT', payload: 'invalid' });
      expect(result.amount).toBe('50'); // unchanged
    });

    it('should not set negative amount', () => {
      const state = { ...initialState, amount: '50' };
      const result = swapReducer(state, { type: 'SET_AMOUNT', payload: '-10' });
      expect(result.amount).toBe('50'); // unchanged
    });

    it('should set empty string', () => {
      const state = { ...initialState, amount: '50' };
      const result = swapReducer(state, { type: 'SET_AMOUNT', payload: '' });
      expect(result.amount).toBe('');
    });
  });

  describe('SET_RECIPIENT', () => {
    it('should set recipient address', () => {
      const result = swapReducer(initialState, {
        type: 'SET_RECIPIENT',
        payload: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });
      expect(result.recipientAddress).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
    });

    it('should not clear quote when setting recipient', () => {
      const state = { ...initialState, quote: mockQuote };
      const result = swapReducer(state, {
        type: 'SET_RECIPIENT',
        payload: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });
      expect(result.quote).toBe(mockQuote);
    });
  });

  describe('SET_QUOTE', () => {
    it('should set quote and update status to quoted', () => {
      const result = swapReducer(initialState, { type: 'SET_QUOTE', payload: mockQuote });
      expect(result.quote).toBe(mockQuote);
      expect(result.status).toBe('quoted');
    });
  });

  describe('SET_STATUS', () => {
    it('should set status', () => {
      const result = swapReducer(initialState, { type: 'SET_STATUS', payload: 'loading' });
      expect(result.status).toBe('loading');
    });

    it('should set different statuses', () => {
      expect(swapReducer(initialState, { type: 'SET_STATUS', payload: 'signing' }).status).toBe('signing');
      expect(swapReducer(initialState, { type: 'SET_STATUS', payload: 'confirming' }).status).toBe('confirming');
      expect(swapReducer(initialState, { type: 'SET_STATUS', payload: 'completed' }).status).toBe('completed');
      expect(swapReducer(initialState, { type: 'SET_STATUS', payload: 'error' }).status).toBe('error');
    });
  });

  describe('SET_ERROR', () => {
    it('should set error, update status to error, and clear quote', () => {
      const state = { ...initialState, quote: mockQuote };
      const result = swapReducer(state, { type: 'SET_ERROR', payload: 'Something went wrong' });
      expect(result.error).toBe('Something went wrong');
      expect(result.status).toBe('error');
      expect(result.quote).toBeNull();
    });
  });

  describe('RESET', () => {
    it('should reset state to initial values', () => {
      const state = {
        sourceToken: 'token123',
        destinationChain: 'arbitrum',
        destinationToken: 'token456',
        amount: '100',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        quote: mockQuote,
        status: 'completed' as const,
        error: 'error',
      };
      const result = swapReducer(state, { type: 'RESET' });
      expect(result).toEqual(initialState);
    });
  });
});
