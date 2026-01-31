import { describe, it, expect } from 'vitest';
import { formatTokenAmount, formatSolAmount, toSmallestUnits } from '../formatting';

describe('toSmallestUnits', () => {
  it('converts whole numbers correctly', () => {
    expect(toSmallestUnits('1000', 6)).toBe('1000000000');
    expect(toSmallestUnits('1', 9)).toBe('1000000000');
  });

  it('converts decimal amounts correctly', () => {
    expect(toSmallestUnits('1000.5', 6)).toBe('1000500000');
    expect(toSmallestUnits('0.000001', 6)).toBe('1');
    expect(toSmallestUnits('123.456789', 6)).toBe('123456789');
  });

  it('handles precision correctly', () => {
    expect(toSmallestUnits('1.123456789', 6)).toBe('1123456');
    expect(toSmallestUnits('1.5', 6)).toBe('1500000');
  });

  it('handles edge cases', () => {
    expect(toSmallestUnits('0', 6)).toBe('0');
    expect(toSmallestUnits('0.0', 6)).toBe('0');
  });

  it('maintains precision for large amounts', () => {
    expect(toSmallestUnits('999999999.999999', 6)).toBe('999999999999999');
  });
});

describe('formatTokenAmount', () => {
  it('formats whole numbers correctly', () => {
    expect(formatTokenAmount('1000000000', 6)).toBe('1,000');
    expect(formatTokenAmount('1000000', 6)).toBe('1');
  });

  it('formats decimal amounts correctly', () => {
    expect(formatTokenAmount('1500000', 6)).toBe('1.5');
    expect(formatTokenAmount('1234567', 6)).toBe('1.234567');
  });

  it('trims trailing zeros', () => {
    expect(formatTokenAmount('1000000', 6)).toBe('1');
    expect(formatTokenAmount('1500000', 6)).toBe('1.5');
  });

  it('handles edge cases', () => {
    expect(formatTokenAmount('0', 6)).toBe('0');
    expect(formatTokenAmount('', 6)).toBe('0');
  });
});

describe('formatSolAmount', () => {
  it('formats lamports to SOL', () => {
    expect(formatSolAmount('1000000000')).toBe('1');
    expect(formatSolAmount('500000000')).toBe('0.5');
  });
});
