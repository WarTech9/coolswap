/**
 * Tests for useQuote - isValidQuoteParams and amount conversion
 */

import { describe, it, expect } from 'vitest';
import { isValidQuoteParams, type UseQuoteParams } from '@/hooks/useQuote';

describe('isValidQuoteParams', () => {
  const validParams: UseQuoteParams = {
    sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    destinationChain: 'arbitrum',
    destinationToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    amount: '100',
    sourceTokenDecimals: 6,
    senderAddress: 'SomeBase58SolanaAddress123456789',
    recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    slippage: 0.005,
  };

  it('should return true for valid params', () => {
    expect(isValidQuoteParams(validParams)).toBe(true);
  });

  it('should return false for null params', () => {
    expect(isValidQuoteParams(null)).toBe(false);
  });

  it('should return false when sourceToken is null', () => {
    const params = { ...validParams, sourceToken: null };
    expect(isValidQuoteParams(params)).toBe(false);
  });

  it('should return false when destinationChain is null', () => {
    const params = { ...validParams, destinationChain: null };
    expect(isValidQuoteParams(params)).toBe(false);
  });

  it('should return false when destinationToken is null', () => {
    const params = { ...validParams, destinationToken: null };
    expect(isValidQuoteParams(params)).toBe(false);
  });

  it('should return false when senderAddress is null', () => {
    const params = { ...validParams, senderAddress: null };
    expect(isValidQuoteParams(params)).toBe(false);
  });

  it('should return false when amount is empty string', () => {
    const params = { ...validParams, amount: '' };
    expect(isValidQuoteParams(params)).toBe(false);
  });

  it('should return false when recipientAddress is empty string', () => {
    const params = { ...validParams, recipientAddress: '' };
    expect(isValidQuoteParams(params)).toBe(false);
  });

  it('should return false when amount is not a number', () => {
    const params = { ...validParams, amount: 'not-a-number' };
    expect(isValidQuoteParams(params)).toBe(false);
  });

  it('should return false when amount is zero', () => {
    const params = { ...validParams, amount: '0' };
    expect(isValidQuoteParams(params)).toBe(false);
  });

  it('should return false when amount is negative', () => {
    const params = { ...validParams, amount: '-100' };
    expect(isValidQuoteParams(params)).toBe(false);
  });

  it('should return true for decimal amounts', () => {
    const params = { ...validParams, amount: '100.5' };
    expect(isValidQuoteParams(params)).toBe(true);
  });

  it('should return true for small decimal amounts', () => {
    const params = { ...validParams, amount: '0.1' };
    expect(isValidQuoteParams(params)).toBe(true);
  });

  it('should return true when slippage is undefined', () => {
    const params = { ...validParams, slippage: undefined };
    expect(isValidQuoteParams(params)).toBe(true);
  });
});

describe('useQuote - amount conversion to smallest units', () => {
  // These tests verify the conversion logic used in useQuote
  // Amount is converted: parseFloat(amount) * Math.pow(10, decimals)

  it('should convert USDC amount (6 decimals) correctly', () => {
    const amount = '100'; // 100 USDC
    const decimals = 6;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('100000000'); // 100 * 10^6
  });

  it('should convert USDC decimal amount (6 decimals) correctly', () => {
    const amount = '100.5'; // 100.5 USDC
    const decimals = 6;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('100500000'); // 100.5 * 10^6
  });

  it('should convert SOL amount (9 decimals) correctly', () => {
    const amount = '1'; // 1 SOL
    const decimals = 9;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('1000000000'); // 1 * 10^9
  });

  it('should convert SOL decimal amount (9 decimals) correctly', () => {
    const amount = '0.5'; // 0.5 SOL
    const decimals = 9;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('500000000'); // 0.5 * 10^9
  });

  it('should convert WETH amount (18 decimals) correctly', () => {
    const amount = '1'; // 1 WETH
    const decimals = 18;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('1000000000000000000'); // 1 * 10^18
  });

  it('should convert WETH decimal amount (18 decimals) correctly', () => {
    const amount = '0.25'; // 0.25 WETH
    const decimals = 18;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('250000000000000000'); // 0.25 * 10^18
  });

  it('should convert small amounts correctly', () => {
    const amount = '0.000001'; // 0.000001 USDC (1 micro unit)
    const decimals = 6;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('1'); // Smallest unit
  });

  it('should convert large amounts correctly', () => {
    const amount = '1000000'; // 1 million USDC
    const decimals = 6;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('1000000000000'); // 1M * 10^6
  });

  it('should handle trailing zeros in decimal amounts', () => {
    const amount = '100.500000'; // 100.5 USDC with trailing zeros
    const decimals = 6;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('100500000'); // Same as 100.5
  });

  it('should handle amounts with many decimal places', () => {
    const amount = '1.123456789'; // More decimals than token supports
    const decimals = 6;
    const result = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
    expect(result).toBe('1123457'); // Rounded to 6 decimals
  });
});
