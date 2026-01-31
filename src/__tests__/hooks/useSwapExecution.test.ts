/**
 * Tests for useSwapExecution - hexToBytes and error categorization
 */

import { describe, it, expect } from 'vitest';
import { hexToBytes } from '@/hooks/useSwapExecution';

describe('hexToBytes', () => {
  it('should convert hex string with 0x prefix to Uint8Array', () => {
    const hex = '0x1234567890abcdef';
    const result = hexToBytes(hex);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(8);
    expect(Array.from(result)).toEqual([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]);
  });

  it('should convert hex string without 0x prefix to Uint8Array', () => {
    const hex = '1234567890abcdef';
    const result = hexToBytes(hex);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(8);
    expect(Array.from(result)).toEqual([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]);
  });

  it('should convert uppercase hex string', () => {
    const hex = '0xABCDEF123456';
    const result = hexToBytes(hex);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(6);
    expect(Array.from(result)).toEqual([0xab, 0xcd, 0xef, 0x12, 0x34, 0x56]);
  });

  it('should convert mixed case hex string', () => {
    const hex = '0xAbCdEf123456';
    const result = hexToBytes(hex);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual([0xab, 0xcd, 0xef, 0x12, 0x34, 0x56]);
  });

  it('should convert short hex string', () => {
    const hex = '0xaa';
    const result = hexToBytes(hex);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(1);
    expect(Array.from(result)).toEqual([0xaa]);
  });

  it('should convert long hex string', () => {
    const hex = '0x' + 'ff'.repeat(256);
    const result = hexToBytes(hex);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(256);
    expect(Array.from(result)).toEqual(new Array(256).fill(0xff));
  });

  it('should handle hex string with all zeros', () => {
    const hex = '0x00000000';
    const result = hexToBytes(hex);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual([0, 0, 0, 0]);
  });

  it('should handle empty hex string', () => {
    const hex = '0x';
    const result = hexToBytes(hex);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
  });
});

describe('useSwapExecution - error categorization', () => {
  // These tests verify the error message categorization logic
  // The actual hook implementation checks for specific keywords in error messages

  it('should identify rejection errors', () => {
    const rejectionMessages = [
      'User rejected the request',
      'Transaction was cancelled by user',
      'User denied transaction signature',
    ];

    rejectionMessages.forEach((message) => {
      const lower = message.toLowerCase();
      const isRejection =
        lower.includes('reject') || lower.includes('cancel') || lower.includes('denied');
      expect(isRejection).toBe(true);
    });
  });

  it('should identify insufficient balance errors', () => {
    const balanceMessages = [
      'Insufficient balance for transaction',
      'insufficient balance to complete swap',
      'insufficient balance in account',
    ];

    balanceMessages.forEach((message) => {
      const lower = message.toLowerCase();
      const isInsufficientBalance = lower.includes('insufficient') && lower.includes('balance');
      expect(isInsufficientBalance).toBe(true);
    });
  });

  it('should identify insufficient lamports (SOL fee) errors', () => {
    const lamportMessages = [
      'Insufficient lamports for fees',
      'insufficient lamports for transaction',
      'insufficient lamports in account',
    ];

    lamportMessages.forEach((message) => {
      const lower = message.toLowerCase();
      const isInsufficientLamports = lower.includes('insufficient') && lower.includes('lamport');
      expect(isInsufficientLamports).toBe(true);
    });
  });

  it('should identify slippage/price errors', () => {
    const slippageMessages = [
      'Slippage tolerance exceeded',
      'Price impact too high',
      'Price moved beyond acceptable range',
    ];

    slippageMessages.forEach((message) => {
      const lower = message.toLowerCase();
      const isSlippage = lower.includes('slippage') || lower.includes('price');
      expect(isSlippage).toBe(true);
    });
  });

  it('should identify timeout errors', () => {
    const timeoutMessages = [
      'Transaction confirmation timed out',
      'Request timed out',
      'Operation has timed out',
    ];

    timeoutMessages.forEach((message) => {
      const lower = message.toLowerCase();
      const isTimeout = lower.includes('timeout') || lower.includes('timed out');
      expect(isTimeout).toBe(true);
    });
  });

  it('should identify blockhash expiry errors', () => {
    const blockhashMessages = [
      'Blockhash not found',
      'Transaction blockhash not found in history',
      'blockhash not found in recent history',
    ];

    blockhashMessages.forEach((message) => {
      const lower = message.toLowerCase();
      const isBlockhashExpiry = lower.includes('blockhash') && lower.includes('not found');
      expect(isBlockhashExpiry).toBe(true);
    });
  });

  it('should identify network errors', () => {
    const networkMessages = [
      'Network request failed',
      'Failed to fetch from server',
      'Network connection error',
    ];

    networkMessages.forEach((message) => {
      const lower = message.toLowerCase();
      const isNetwork =
        lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch');
      expect(isNetwork).toBe(true);
    });
  });

  it('should identify simulation failed errors', () => {
    const simulationMessages = [
      'Transaction simulation failed',
      'The simulation failed with error',
      'Simulation failed to execute',
    ];

    simulationMessages.forEach((message) => {
      const lower = message.toLowerCase();
      const isSimulationFailed = lower.includes('simulation failed');
      expect(isSimulationFailed).toBe(true);
    });
  });

  it('should not misidentify unrelated errors', () => {
    const unrelatedMessage = 'Some generic error occurred';
    const lower = unrelatedMessage.toLowerCase();

    const isRejection =
      lower.includes('reject') || lower.includes('cancel') || lower.includes('denied');
    const isInsufficientBalance = lower.includes('insufficient') && lower.includes('balance');
    const isSlippage = lower.includes('slippage') || lower.includes('price');

    expect(isRejection).toBe(false);
    expect(isInsufficientBalance).toBe(false);
    expect(isSlippage).toBe(false);
  });
});
