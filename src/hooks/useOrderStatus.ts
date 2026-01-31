/**
 * Hook to poll order status from deBridge after swap execution
 * Polls every 5 seconds until a terminal status is reached
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBridgeProvider } from './useBridgeProvider';
import type { OrderInfo, OrderStatus } from '@/services/bridge/types';

// Poll every 5 seconds
const POLL_INTERVAL_MS = 5_000;
// Max 60 polls (~5 minutes)
const MAX_POLLS = 60;

export interface UseOrderStatusResult {
  orderInfo: OrderInfo | null;
  isLoading: boolean;
  error: string | null;
  /** Whether the order has reached a terminal status */
  isTerminal: boolean;
}

/**
 * Check if an order status is terminal (no more polling needed)
 * Exported for testing
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return (
    status === 'fulfilled' ||
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'failed'
  );
}

/**
 * Hook for polling order status after swap execution
 *
 * @param orderId - The deBridge order ID (from quote.id)
 */
export function useOrderStatus(orderId: string | null): UseOrderStatusResult {
  const bridgeProvider = useBridgeProvider();
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTerminal, setIsTerminal] = useState(false);

  // Refs for cleanup and tracking
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Clear timer
  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Fetch order status
  const fetchStatus = useCallback(async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      const info = await bridgeProvider.getOrderStatus(orderId);

      if (!isMountedRef.current) return;

      setOrderInfo(info);
      setError(null);

      // Check if terminal
      if (isTerminalStatus(info.status)) {
        setIsTerminal(true);
        clearPollTimer();
        return;
      }

      // Check max polls
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_POLLS) {
        setError('Order tracking timed out. Check deBridge explorer for status.');
        clearPollTimer();
        return;
      }

      // Schedule next poll
      pollTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          fetchStatus();
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      if (!isMountedRef.current) return;

      const message = err instanceof Error ? err.message : 'Failed to fetch order status';
      setError(message);

      // Check max polls before scheduling retry
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_POLLS) {
        clearPollTimer();
        return;
      }

      // Continue polling - error might be transient
      pollTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          fetchStatus();
        }
      }, POLL_INTERVAL_MS);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [orderId, bridgeProvider, clearPollTimer]);

  // Effect to start polling when orderId changes
  useEffect(() => {
    isMountedRef.current = true;
    pollCountRef.current = 0;

    // Reset state
    setOrderInfo(null);
    setError(null);
    setIsTerminal(false);
    clearPollTimer();

    // Start polling if we have an orderId
    if (orderId) {
      setIsLoading(true);
      fetchStatus();
    }

    return () => {
      isMountedRef.current = false;
      clearPollTimer();
    };
  }, [orderId, fetchStatus, clearPollTimer]);

  return {
    orderInfo,
    isLoading,
    error,
    isTerminal,
  };
}
