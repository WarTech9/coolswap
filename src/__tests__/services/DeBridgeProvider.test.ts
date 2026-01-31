/**
 * Tests for DeBridgeProvider mapping and conversion methods
 */

import { describe, it, expect } from 'vitest';
import {
  toDeBridgeChainId,
  toNormalizedChainId,
  mapToDeBridgeError,
  mapOrderStatus,
} from '../helpers/DeBridgeTestHelper';
import {
  mockErrorInsufficientLiquidity,
  mockErrorAmountTooLow,
  mockErrorAmountTooHigh,
  mockErrorUnsupportedPair,
} from '../fixtures/debridge';

describe('DeBridgeProvider - toDeBridgeChainId', () => {
  it('should convert solana to 7565164', () => {
    expect(toDeBridgeChainId('solana')).toBe(7565164);
  });

  it('should convert ethereum to 1', () => {
    expect(toDeBridgeChainId('ethereum')).toBe(1);
  });

  it('should convert arbitrum to 42161', () => {
    expect(toDeBridgeChainId('arbitrum')).toBe(42161);
  });

  it('should convert base to 8453', () => {
    expect(toDeBridgeChainId('base')).toBe(8453);
  });

  it('should convert polygon to 137', () => {
    expect(toDeBridgeChainId('polygon')).toBe(137);
  });

  it('should convert optimism to 10', () => {
    expect(toDeBridgeChainId('optimism')).toBe(10);
  });

  it('should convert avalanche to 43114', () => {
    expect(toDeBridgeChainId('avalanche')).toBe(43114);
  });

  it('should convert bnb to 56', () => {
    expect(toDeBridgeChainId('bnb')).toBe(56);
  });

  it('should throw error for unknown chain ID', () => {
    expect(() => toDeBridgeChainId('unknown')).toThrow('Unsupported chain ID: unknown');
  });

  it('should throw error for empty string', () => {
    expect(() => toDeBridgeChainId('')).toThrow('Unsupported chain ID: ');
  });
});

describe('DeBridgeProvider - toNormalizedChainId', () => {
  it('should convert 7565164 to solana', () => {
    expect(toNormalizedChainId(7565164)).toBe('solana');
  });

  it('should convert 1 to ethereum', () => {
    expect(toNormalizedChainId(1)).toBe('ethereum');
  });

  it('should convert 42161 to arbitrum', () => {
    expect(toNormalizedChainId(42161)).toBe('arbitrum');
  });

  it('should convert 8453 to base', () => {
    expect(toNormalizedChainId(8453)).toBe('base');
  });

  it('should convert 137 to polygon', () => {
    expect(toNormalizedChainId(137)).toBe('polygon');
  });

  it('should convert 10 to optimism', () => {
    expect(toNormalizedChainId(10)).toBe('optimism');
  });

  it('should convert 43114 to avalanche', () => {
    expect(toNormalizedChainId(43114)).toBe('avalanche');
  });

  it('should convert 56 to bnb', () => {
    expect(toNormalizedChainId(56)).toBe('bnb');
  });

  it('should return null for unknown deBridge chain ID', () => {
    expect(toNormalizedChainId(999999)).toBeNull();
  });

  it('should return null for 0', () => {
    expect(toNormalizedChainId(0)).toBeNull();
  });
});

describe('DeBridgeProvider - mapToDeBridgeError', () => {
  it('should map insufficient liquidity error', () => {
    const result = mapToDeBridgeError(mockErrorInsufficientLiquidity);
    expect(result.code).toBe('INSUFFICIENT_LIQUIDITY');
    expect(result.message).toBe('Insufficient liquidity for this swap');
  });

  it('should map insufficient liquidity error with "liquidity" keyword', () => {
    const result = mapToDeBridgeError({
      errorId: 'ERR',
      errorMessage: 'Not enough liquidity available',
    });
    expect(result.code).toBe('INSUFFICIENT_LIQUIDITY');
    expect(result.message).toBe('Not enough liquidity available');
  });

  it('should map amount too low error', () => {
    const result = mapToDeBridgeError(mockErrorAmountTooLow);
    expect(result.code).toBe('AMOUNT_TOO_LOW');
    expect(result.message).toBe('Amount is below minimum');
    if (result.code === 'AMOUNT_TOO_LOW') {
      expect(result.minimum).toBe('100000000');
    }
  });

  it('should map amount too low error with "minimum" keyword', () => {
    const result = mapToDeBridgeError({
      errorId: 'ERR',
      errorMessage: 'Amount below minimum threshold',
      constraints: { minAmount: '50000000' },
    });
    expect(result.code).toBe('AMOUNT_TOO_LOW');
    if (result.code === 'AMOUNT_TOO_LOW') {
      expect(result.minimum).toBe('50000000');
    }
  });

  it('should map amount too low error without constraints', () => {
    const result = mapToDeBridgeError({
      errorId: 'ERR',
      errorMessage: 'Amount too low',
    });
    expect(result.code).toBe('AMOUNT_TOO_LOW');
    if (result.code === 'AMOUNT_TOO_LOW') {
      expect(result.minimum).toBe('0');
    }
  });

  it('should map amount too high error', () => {
    const result = mapToDeBridgeError(mockErrorAmountTooHigh);
    expect(result.code).toBe('AMOUNT_TOO_HIGH');
    expect(result.message).toBe('Amount exceeds maximum');
    if (result.code === 'AMOUNT_TOO_HIGH') {
      expect(result.maximum).toBe('10000000000000');
    }
  });

  it('should map amount too high error with "maximum" keyword', () => {
    const result = mapToDeBridgeError({
      errorId: 'ERR',
      errorMessage: 'Amount exceeds maximum allowed',
      constraints: { maxAmount: '5000000000000' },
    });
    expect(result.code).toBe('AMOUNT_TOO_HIGH');
    if (result.code === 'AMOUNT_TOO_HIGH') {
      expect(result.maximum).toBe('5000000000000');
    }
  });

  it('should map amount too high error without constraints', () => {
    const result = mapToDeBridgeError({
      errorId: 'ERR',
      errorMessage: 'Amount too high',
    });
    expect(result.code).toBe('AMOUNT_TOO_HIGH');
    if (result.code === 'AMOUNT_TOO_HIGH') {
      expect(result.maximum).toBe('0');
    }
  });

  it('should map unsupported pair error', () => {
    const result = mapToDeBridgeError(mockErrorUnsupportedPair);
    expect(result.code).toBe('UNSUPPORTED_PAIR');
    expect(result.message).toBe('Token pair not supported');
  });

  it('should map unsupported pair error with "not supported" keyword', () => {
    const result = mapToDeBridgeError({
      errorId: 'ERR',
      errorMessage: 'This pair is not supported',
    });
    expect(result.code).toBe('UNSUPPORTED_PAIR');
    expect(result.message).toBe('This pair is not supported');
  });

  it('should default to unsupported pair for unknown errors', () => {
    const result = mapToDeBridgeError({
      errorId: 'ERR',
      errorMessage: 'Some unknown error occurred',
    });
    expect(result.code).toBe('UNSUPPORTED_PAIR');
    expect(result.message).toBe('Some unknown error occurred');
  });
});

describe('DeBridgeProvider - mapOrderStatus', () => {
  it('should map "created" to created', () => {
    expect(mapOrderStatus('created')).toBe('created');
  });

  it('should map "pending" to created', () => {
    expect(mapOrderStatus('pending')).toBe('created');
  });

  it('should map "PENDING" (uppercase) to created', () => {
    expect(mapOrderStatus('PENDING')).toBe('created');
  });

  it('should map "fulfilled" to fulfilled', () => {
    expect(mapOrderStatus('fulfilled')).toBe('fulfilled');
  });

  it('should map "FULFILLED" (uppercase) to fulfilled', () => {
    expect(mapOrderStatus('FULFILLED')).toBe('fulfilled');
  });

  it('should map "completed" to completed', () => {
    expect(mapOrderStatus('completed')).toBe('completed');
  });

  it('should map "claimed" to completed', () => {
    expect(mapOrderStatus('claimed')).toBe('completed');
  });

  it('should map "COMPLETED" (uppercase) to completed', () => {
    expect(mapOrderStatus('COMPLETED')).toBe('completed');
  });

  it('should map "cancelled" to cancelled', () => {
    expect(mapOrderStatus('cancelled')).toBe('cancelled');
  });

  it('should map "CANCELLED" (uppercase) to cancelled', () => {
    expect(mapOrderStatus('CANCELLED')).toBe('cancelled');
  });

  it('should map "failed" to failed', () => {
    expect(mapOrderStatus('failed')).toBe('failed');
  });

  it('should map "FAILED" (uppercase) to failed', () => {
    expect(mapOrderStatus('FAILED')).toBe('failed');
  });

  it('should map unknown status to pending', () => {
    expect(mapOrderStatus('unknown')).toBe('pending');
    expect(mapOrderStatus('processing')).toBe('pending');
    expect(mapOrderStatus('')).toBe('pending');
  });
});
