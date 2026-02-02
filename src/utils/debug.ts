/**
 * Debug logging utility that respects environment settings
 *
 * In development: logs to console
 * In production: silent (unless VITE_DEBUG=true)
 *
 * Usage:
 *   import { debug } from '@/utils/debug';
 *   debug.log('Debug message');
 *   debug.warn('Warning message');
 *   debug.error('Error message'); // Always logs
 */

const isDebugMode = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

export const debug = {
  /**
   * Log a debug message (silent in production unless VITE_DEBUG=true)
   */
  log: (...args: unknown[]) => {
    if (isDebugMode) {
      console.log(...args);
    }
  },

  /**
   * Log a warning message (silent in production unless VITE_DEBUG=true)
   */
  warn: (...args: unknown[]) => {
    if (isDebugMode) {
      console.warn(...args);
    }
  },

  /**
   * Log an error message (ALWAYS logs, even in production)
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Start a console group (silent in production unless VITE_DEBUG=true)
   */
  group: (label: string) => {
    if (isDebugMode) {
      console.group(label);
    }
  },

  /**
   * End a console group (silent in production unless VITE_DEBUG=true)
   */
  groupEnd: () => {
    if (isDebugMode) {
      console.groupEnd();
    }
  },
};
