/**
 * Tests for QuoteDisplay - formatting and error message functions
 */

import { describe, it, expect } from 'vitest';
import { formatAmount, formatSolAmount, getErrorMessage } from '@/components/swap/QuoteDisplay';
import type { CreateOrderError } from '@/services/bridge/IBridgeProvider';

describe('formatAmount', () => {
  it('should format integer amounts correctly', () => {
    expect(formatAmount('1000000000', 6)).toBe('1,000'); // 1000 USDC
    expect(formatAmount('100000000', 6)).toBe('100'); // 100 USDC
  });

  it('should format decimal amounts correctly', () => {
    expect(formatAmount('100500000', 6)).toBe('100.5'); // 100.5 USDC
    expect(formatAmount('123456789', 6)).toBe('123.456789'); // 123.456789 USDC
  });

  it('should trim trailing zeros', () => {
    expect(formatAmount('100000000', 6)).toBe('100'); // Not 100.000000
    expect(formatAmount('100500000', 6)).toBe('100.5'); // Not 100.500000
  });

  it('should handle amounts with more than 6 decimal places', () => {
    const result = formatAmount('1234567', 6); // 1.234567 USDC
    expect(result).toBe('1.234567');
  });

  it('should handle zero amount', () => {
    expect(formatAmount('0', 6)).toBe('0');
  });

  it('should handle very small amounts', () => {
    expect(formatAmount('1', 6)).toBe('0.000001'); // Smallest USDC unit
  });

  it('should handle very large amounts', () => {
    expect(formatAmount('1000000000000', 6)).toBe('1,000,000'); // 1 million USDC
  });

  it('should handle different decimal places', () => {
    expect(formatAmount('1000000000', 9)).toBe('1'); // 1 SOL (9 decimals)
    expect(formatAmount('1000000000000000000', 18)).toBe('1'); // 1 ETH (18 decimals)
  });

  it('should return 0 for invalid amount strings', () => {
    expect(formatAmount('invalid', 6)).toBe('0');
    expect(formatAmount('', 6)).toBe('0');
  });

  it('should handle negative amounts as zero', () => {
    expect(formatAmount('-1000000', 6)).toBe('-1');
  });
});

describe('formatSolAmount', () => {
  it('should format SOL amounts with 9 decimals', () => {
    expect(formatSolAmount('1000000000')).toBe('1'); // 1 SOL
    expect(formatSolAmount('500000000')).toBe('0.5'); // 0.5 SOL
  });

  it('should format small SOL amounts', () => {
    expect(formatSolAmount('5000000')).toBe('0.005'); // 0.005 SOL (5M lamports)
    expect(formatSolAmount('1000000')).toBe('0.001'); // 0.001 SOL (1M lamports)
  });

  it('should trim trailing zeros', () => {
    expect(formatSolAmount('1000000000')).toBe('1'); // Not 1.000000
    expect(formatSolAmount('100000000')).toBe('0.1'); // Not 0.100000
  });

  it('should handle zero SOL', () => {
    expect(formatSolAmount('0')).toBe('0');
  });

  it('should handle very small SOL amounts', () => {
    // 1 lamport is too small to display with maximumFractionDigits: 6
    expect(formatSolAmount('1')).toBe('0'); // 1 lamport rounds to 0
    expect(formatSolAmount('1000')).toBe('0.000001'); // 1000 lamports
  });

  it('should handle large SOL amounts', () => {
    expect(formatSolAmount('100000000000')).toBe('100'); // 100 SOL
    expect(formatSolAmount('1000000000000')).toBe('1,000'); // 1000 SOL
  });

  it('should return 0 for invalid amount strings', () => {
    expect(formatSolAmount('invalid')).toBe('0');
    expect(formatSolAmount('')).toBe('0');
  });
});

describe('getErrorMessage', () => {
  it('should return message for INSUFFICIENT_LIQUIDITY error', () => {
    const error: CreateOrderError = {
      code: 'INSUFFICIENT_LIQUIDITY',
      message: 'Not enough liquidity available',
    };
    const result = getErrorMessage(error);
    expect(result).toBe('Not enough liquidity available');
  });

  it('should return default message for INSUFFICIENT_LIQUIDITY without message', () => {
    const error: CreateOrderError = {
      code: 'INSUFFICIENT_LIQUIDITY',
      message: '',
    };
    const result = getErrorMessage(error);
    expect(result).toBe('Not enough liquidity for this swap. Try a smaller amount.');
  });

  it('should return message for AMOUNT_TOO_LOW error', () => {
    const error: CreateOrderError = {
      code: 'AMOUNT_TOO_LOW',
      message: 'Amount is below minimum',
      minimum: '100000000',
    };
    const result = getErrorMessage(error);
    expect(result).toBe('Amount too low. Minimum is 100000000.');
  });

  it('should include symbol for AMOUNT_TOO_LOW error', () => {
    const error: CreateOrderError = {
      code: 'AMOUNT_TOO_LOW',
      message: 'Amount is below minimum',
      minimum: '100000000',
    };
    const result = getErrorMessage(error, 'USDC');
    expect(result).toBe('Amount too low. Minimum is 100000000 USDC.');
  });

  it('should return message for AMOUNT_TOO_HIGH error', () => {
    const error: CreateOrderError = {
      code: 'AMOUNT_TOO_HIGH',
      message: 'Amount exceeds maximum',
      maximum: '10000000000000',
    };
    const result = getErrorMessage(error);
    expect(result).toBe('Amount too high. Maximum is 10000000000000.');
  });

  it('should include symbol for AMOUNT_TOO_HIGH error', () => {
    const error: CreateOrderError = {
      code: 'AMOUNT_TOO_HIGH',
      message: 'Amount exceeds maximum',
      maximum: '10000000000000',
    };
    const result = getErrorMessage(error, 'USDC');
    expect(result).toBe('Amount too high. Maximum is 10000000000000 USDC.');
  });

  it('should return message for UNSUPPORTED_PAIR error', () => {
    const error: CreateOrderError = {
      code: 'UNSUPPORTED_PAIR',
      message: 'This token pair is not supported',
    };
    const result = getErrorMessage(error);
    expect(result).toBe('This token pair is not supported');
  });

  it('should return default message for UNSUPPORTED_PAIR without message', () => {
    const error: CreateOrderError = {
      code: 'UNSUPPORTED_PAIR',
      message: '',
    };
    const result = getErrorMessage(error);
    expect(result).toBe('This token pair is not supported.');
  });
});
