/**
 * Tests for address validation utilities
 */

import { describe, it, expect } from 'vitest';
import { isValidEVMAddress, getAddressValidationError } from '@/utils/validation';

describe('isValidEVMAddress', () => {
  it('should return true for valid EVM addresses', () => {
    expect(isValidEVMAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(true);
    expect(isValidEVMAddress('0xaf88d065e77c8cC2239327C5EDb3A432268e5831')).toBe(true);
    expect(isValidEVMAddress('0x0000000000000000000000000000000000000000')).toBe(true);
  });

  it('should return true for valid uppercase EVM addresses', () => {
    expect(isValidEVMAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB0')).toBe(true);
    expect(isValidEVMAddress('0xAF88D065E77C8CC2239327C5EDB3A432268E5831')).toBe(true);
  });

  it('should return false for addresses without 0x prefix', () => {
    expect(isValidEVMAddress('742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(false);
  });

  it('should return false for addresses with wrong length', () => {
    expect(isValidEVMAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bE')).toBe(false); // too short
    expect(isValidEVMAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb00')).toBe(false); // too long
  });

  it('should return false for addresses with non-hex characters', () => {
    expect(isValidEVMAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbG')).toBe(false);
    expect(isValidEVMAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb ')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidEVMAddress('')).toBe(false);
  });

  it('should return false for invalid formats', () => {
    expect(isValidEVMAddress('not an address')).toBe(false);
    expect(isValidEVMAddress('0x')).toBe(false);
    expect(isValidEVMAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(false);
  });
});

describe('getAddressValidationError', () => {
  it('should return null for empty address', () => {
    expect(getAddressValidationError('', 'arbitrum')).toBeNull();
    expect(getAddressValidationError('', 'ethereum')).toBeNull();
  });

  it('should return null for solana chain', () => {
    expect(getAddressValidationError('invalid', 'solana')).toBeNull();
    expect(getAddressValidationError('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', 'solana')).toBeNull();
  });

  it('should return null for valid EVM addresses on EVM chains', () => {
    expect(getAddressValidationError('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', 'arbitrum')).toBeNull();
    expect(getAddressValidationError('0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 'ethereum')).toBeNull();
    expect(getAddressValidationError('0x0000000000000000000000000000000000000000', 'base')).toBeNull();
  });

  it('should return error message for invalid EVM addresses', () => {
    const error = getAddressValidationError('invalid', 'arbitrum');
    expect(error).toBe('Invalid address. Must be 0x followed by 40 hex characters.');
  });

  it('should return error message for addresses without 0x prefix', () => {
    const error = getAddressValidationError('742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', 'ethereum');
    expect(error).toBe('Invalid address. Must be 0x followed by 40 hex characters.');
  });

  it('should return error message for addresses with wrong length', () => {
    const error = getAddressValidationError('0x742d35Cc6634C0532925a3b844Bc9e7595f0bE', 'arbitrum');
    expect(error).toBe('Invalid address. Must be 0x followed by 40 hex characters.');
  });

  it('should return error message for addresses with non-hex characters', () => {
    const error = getAddressValidationError('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbG', 'base');
    expect(error).toBe('Invalid address. Must be 0x followed by 40 hex characters.');
  });

  it('should handle null chainId', () => {
    expect(getAddressValidationError('', null)).toBeNull();
    const error = getAddressValidationError('invalid', null);
    expect(error).toBe('Invalid address. Must be 0x followed by 40 hex characters.');
  });
});
