/**
 * Tests for useOrderStatus - isTerminalStatus
 */

import { describe, it, expect } from 'vitest';
import { isTerminalStatus } from '@/hooks/useOrderStatus';
import { OrderStatus } from '@/services/bridge/types';

describe('isTerminalStatus', () => {
  it('should return true for fulfilled status', () => {
    expect(isTerminalStatus(OrderStatus.FULFILLED)).toBe(true);
    expect(isTerminalStatus('fulfilled' as OrderStatus)).toBe(true);
  });

  it('should return true for completed status', () => {
    expect(isTerminalStatus(OrderStatus.COMPLETED)).toBe(true);
    expect(isTerminalStatus('completed' as OrderStatus)).toBe(true);
  });

  it('should return true for cancelled status', () => {
    expect(isTerminalStatus(OrderStatus.CANCELLED)).toBe(true);
    expect(isTerminalStatus('cancelled' as OrderStatus)).toBe(true);
  });

  it('should return true for failed status', () => {
    expect(isTerminalStatus(OrderStatus.FAILED)).toBe(true);
    expect(isTerminalStatus('failed' as OrderStatus)).toBe(true);
  });

  it('should return false for pending status', () => {
    expect(isTerminalStatus(OrderStatus.PENDING)).toBe(false);
    expect(isTerminalStatus('pending' as OrderStatus)).toBe(false);
  });

  it('should return false for created status', () => {
    expect(isTerminalStatus(OrderStatus.CREATED)).toBe(false);
    expect(isTerminalStatus('created' as OrderStatus)).toBe(false);
  });
});
