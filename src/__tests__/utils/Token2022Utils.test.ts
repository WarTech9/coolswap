/**
 * Unit tests for Token2022Utils
 * Tests pure calculation functions with no mocking required
 */

import { describe, it, expect } from 'vitest';
import {
  calculateGrossAmount,
  validateTransferAmount,
  isToken2022Program,
} from '@/services/token/Token2022Utils';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

describe('Token2022Utils', () => {
  describe('calculateGrossAmount', () => {
    it('calculates basic gross amount with 1% fee', () => {
      const feeConfig = {
        transferFeeBasisPoints: 100, // 1%
        maximumFee: 10000n,
      };

      const gross = calculateGrossAmount(1000n, feeConfig);

      // Expected: 1000 * 10000 / (10000 - 100) = 1000 * 10000 / 9900 = 1010n (integer division)
      expect(gross).toBe(1010n);
    });

    it('calculates gross amount with higher fee percentage (5%)', () => {
      const feeConfig = {
        transferFeeBasisPoints: 500, // 5%
        maximumFee: 50000n,
      };

      const gross = calculateGrossAmount(1000n, feeConfig);

      // Expected: 1000 * 10000 / (10000 - 500) = 1000 * 10000 / 9500 = 1052n (integer division)
      expect(gross).toBe(1052n);
    });

    it('applies maximum fee cap when calculated fee exceeds cap', () => {
      const feeConfig = {
        transferFeeBasisPoints: 100, // 1%
        maximumFee: 5000n, // Cap at 5000
      };

      const gross = calculateGrossAmount(1000000n, feeConfig);

      // Without cap: 1000000 * 10000 / 9900 = 1010101n
      // Calculated fee: 10101n (exceeds 5000n cap)
      // With cap: 1000000 + 5000 = 1005000n
      expect(gross).toBe(1005000n);
    });

    it('handles zero fee (Token-2022 without transfer fee)', () => {
      const feeConfig = {
        transferFeeBasisPoints: 0,
        maximumFee: 0n,
      };

      const gross = calculateGrossAmount(1000n, feeConfig);

      // Expected: 1000 (no fee applied)
      expect(gross).toBe(1000n);
    });

    it('handles very small amount with precision', () => {
      const feeConfig = {
        transferFeeBasisPoints: 100, // 1%
        maximumFee: 1000n,
      };

      const gross = calculateGrossAmount(1n, feeConfig);

      // Expected: 1 * 10000 / 9900 = 1.01... rounds to 2n
      expect(gross).toBeGreaterThanOrEqual(1n);
    });

    it('handles very large amount', () => {
      const feeConfig = {
        transferFeeBasisPoints: 50, // 0.5%
        maximumFee: 1000000n,
      };

      const gross = calculateGrossAmount(1000000000000n, feeConfig);

      // Expected: capped at max fee = 1000000000000 + 1000000 = 1000001000000n
      expect(gross).toBe(1000001000000n);
    });

    it('throws error for invalid fee >= 100%', () => {
      const feeConfig100 = {
        transferFeeBasisPoints: 10000, // 100%
        maximumFee: 10000n,
      };

      expect(() => calculateGrossAmount(1000n, feeConfig100)).toThrow(
        'Invalid transfer fee'
      );

      const feeConfig150 = {
        transferFeeBasisPoints: 15000, // 150%
        maximumFee: 10000n,
      };

      expect(() => calculateGrossAmount(1000n, feeConfig150)).toThrow(
        'Invalid transfer fee'
      );
    });

    it('handles edge case with 99.99% fee', () => {
      const feeConfig = {
        transferFeeBasisPoints: 9999, // 99.99%
        maximumFee: 100000n,
      };

      const gross = calculateGrossAmount(1000n, feeConfig);

      // Expected: Calculated fee would be 9999000n, but capped at maximumFee 100000n
      // Result: 1000 + 100000 = 101000n
      expect(gross).toBe(101000n);
    });
  });

  describe('validateTransferAmount', () => {
    it('validates sufficient transfer amount', () => {
      const feeConfig = {
        transferFeeBasisPoints: 100, // 1%
        maximumFee: 10000n,
      };

      const result = validateTransferAmount(1010n, 1000n, feeConfig);

      expect(result.valid).toBe(true);
      expect(result.actualNet).toBe(1000n); // 1010 - 10 (1% fee) = 1000
      expect(result.shortfall).toBe(0n);
    });

    it('detects insufficient transfer amount', () => {
      const feeConfig = {
        transferFeeBasisPoints: 100, // 1%
        maximumFee: 10000n,
      };

      const result = validateTransferAmount(1005n, 1000n, feeConfig);

      expect(result.valid).toBe(false);
      expect(result.actualNet).toBe(995n); // 1005 - 10 (1% fee) = 995
      expect(result.shortfall).toBe(5n); // 1000 - 995 = 5
    });

    it('validates exact match with no shortfall', () => {
      const feeConfig = {
        transferFeeBasisPoints: 0,
        maximumFee: 0n,
      };

      const result = validateTransferAmount(1010n, 1010n, feeConfig);

      expect(result.valid).toBe(true);
      expect(result.actualNet).toBe(1010n);
      expect(result.shortfall).toBe(0n);
    });

    it('validates transfer with capped fee', () => {
      const feeConfig = {
        transferFeeBasisPoints: 100, // 1%
        maximumFee: 5000n, // Cap at 5000
      };

      const result = validateTransferAmount(1005000n, 1000000n, feeConfig);

      expect(result.valid).toBe(true);
      // Calculated fee: 1005000 * 100 / 10000 = 10050 (exceeds cap)
      // Actual fee: 5000 (capped)
      // Net: 1005000 - 5000 = 1000000
      expect(result.actualNet).toBe(1000000n);
      expect(result.shortfall).toBe(0n);
    });
  });

  describe('isToken2022Program', () => {
    it('returns true for Token-2022 program ID', () => {
      expect(isToken2022Program(TOKEN_2022_PROGRAM_ID)).toBe(true);
    });

    it('returns false for regular SPL Token program ID', () => {
      expect(isToken2022Program(TOKEN_PROGRAM_ID)).toBe(false);
    });

    it('returns false for random program ID', () => {
      const randomProgramId = new PublicKey('11111111111111111111111111111111');
      expect(isToken2022Program(randomProgramId)).toBe(false);
    });
  });
});
