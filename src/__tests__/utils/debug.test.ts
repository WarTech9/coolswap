/**
 * Unit tests for debug utility
 * Tests environment-based logging behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debug } from '@/utils/debug';

describe('debug utility', () => {
  // Save original console methods
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalGroup = console.group;
  const originalGroupEnd = console.groupEnd;

  // Mock console methods
  let logSpy: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.fn>;
  let groupSpy: ReturnType<typeof vi.fn>;
  let groupEndSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create spies for console methods
    logSpy = vi.fn();
    warnSpy = vi.fn();
    errorSpy = vi.fn();
    groupSpy = vi.fn();
    groupEndSpy = vi.fn();

    console.log = logSpy;
    console.warn = warnSpy;
    console.error = errorSpy;
    console.group = groupSpy;
    console.groupEnd = groupEndSpy;
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    console.group = originalGroup;
    console.groupEnd = originalGroupEnd;

    vi.clearAllMocks();
  });

  describe('debug.log', () => {
    it('should call console.log in development mode', () => {
      // Note: import.meta.env.DEV is true in test environment
      debug.log('test message');
      expect(logSpy).toHaveBeenCalledWith('test message');
    });

    it('should handle multiple arguments', () => {
      debug.log('test', 123, { key: 'value' });
      expect(logSpy).toHaveBeenCalledWith('test', 123, { key: 'value' });
    });
  });

  describe('debug.warn', () => {
    it('should call console.warn in development mode', () => {
      debug.warn('warning message');
      expect(warnSpy).toHaveBeenCalledWith('warning message');
    });

    it('should handle multiple arguments', () => {
      debug.warn('warning', 456);
      expect(warnSpy).toHaveBeenCalledWith('warning', 456);
    });
  });

  describe('debug.error', () => {
    it('should always call console.error', () => {
      debug.error('error message');
      expect(errorSpy).toHaveBeenCalledWith('error message');
    });

    it('should handle Error objects', () => {
      const error = new Error('test error');
      debug.error('An error occurred:', error);
      expect(errorSpy).toHaveBeenCalledWith('An error occurred:', error);
    });

    it('should handle multiple arguments', () => {
      debug.error('error', 789, 'details');
      expect(errorSpy).toHaveBeenCalledWith('error', 789, 'details');
    });
  });

  describe('debug.group', () => {
    it('should call console.group in development mode', () => {
      debug.group('Test Group');
      expect(groupSpy).toHaveBeenCalledWith('Test Group');
    });
  });

  describe('debug.groupEnd', () => {
    it('should call console.groupEnd in development mode', () => {
      debug.groupEnd();
      expect(groupEndSpy).toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('should support grouped logging', () => {
      debug.group('Transaction Details');
      debug.log('Gas cost:', 50000);
      debug.log('Token amount:', 100);
      debug.groupEnd();

      expect(groupSpy).toHaveBeenCalledWith('Transaction Details');
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(groupEndSpy).toHaveBeenCalled();
    });

    it('should handle errors within groups', () => {
      debug.group('Error Context');
      debug.error('Something went wrong');
      debug.groupEnd();

      expect(groupSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith('Something went wrong');
      expect(groupEndSpy).toHaveBeenCalled();
    });
  });
});
