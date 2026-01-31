/**
 * Hook to fetch and auto-refresh quotes from the bridge provider
 * Automatically fetches when all required params are present
 * Auto-refreshes every 25 seconds (5s before 30s expiry)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBridgeProvider } from './useBridgeProvider';
import type { Quote, QuoteRequest } from '@/services/bridge/types';
import type { CreateOrderError } from '@/services/bridge/IBridgeProvider';

// Refresh quote 5 seconds before it expires (30s expiry - 5s buffer = 25s)
const REFRESH_INTERVAL_MS = 25_000;
// Debounce time after param changes before fetching
const DEBOUNCE_MS = 500;

export interface UseQuoteParams {
  sourceToken: string | null;
  destinationChain: string | null;
  destinationToken: string | null;
  amount: string;
  sourceTokenDecimals: number;
  senderAddress: string | null;
  recipientAddress: string;
  slippage?: number;
}

export interface UseQuoteResult {
  quote: Quote | null;
  isLoading: boolean;
  error: CreateOrderError | null;
  secondsUntilExpiry: number | null;
  refresh: () => void;
  /** Pause auto-refresh (e.g., during transaction execution) */
  pause: () => void;
  /** Resume auto-refresh after pausing */
  resume: () => void;
  /** Whether auto-refresh is currently paused */
  isPaused: boolean;
}

/**
 * Check if all required params are present for a valid quote request
 * Exported for testing
 */
export function isValidQuoteParams(params: UseQuoteParams | null): params is UseQuoteParams & {
  sourceToken: string;
  destinationChain: string;
  destinationToken: string;
  senderAddress: string;
} {
  if (!params) return false;
  return (
    params.sourceToken !== null &&
    params.destinationChain !== null &&
    params.destinationToken !== null &&
    params.senderAddress !== null &&
    params.amount !== '' &&
    params.recipientAddress !== '' &&
    // Basic validation: amount should be a positive number
    !isNaN(parseFloat(params.amount)) &&
    parseFloat(params.amount) > 0
  );
}

export function useQuote(params: UseQuoteParams | null): UseQuoteResult {
  const bridgeProvider = useBridgeProvider();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CreateOrderError | null>(null);
  const [secondsUntilExpiry, setSecondsUntilExpiry] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Refs for cleanup
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const isPausedRef = useRef(false);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (expiryIntervalRef.current) {
      clearInterval(expiryIntervalRef.current);
      expiryIntervalRef.current = null;
    }
  }, []);

  // Fetch quote function
  const fetchQuote = useCallback(async () => {
    if (!isValidQuoteParams(params)) {
      return;
    }

    // Clear any existing timers to prevent race conditions on auto-refresh
    clearTimers();

    // Convert amount from human-readable to smallest units (e.g., 1000 USDC -> 1000000000)
    const amountInSmallestUnits = (
      parseFloat(params.amount) * Math.pow(10, params.sourceTokenDecimals)
    ).toFixed(0);

    const request: QuoteRequest = {
      sourceChainId: 'solana', // Always Solana as source for MVP
      destinationChainId: params.destinationChain,
      sourceTokenAddress: params.sourceToken,
      destinationTokenAddress: params.destinationToken,
      amount: amountInSmallestUnits,
      senderAddress: params.senderAddress,
      recipientAddress: params.recipientAddress,
      slippageTolerance: params.slippage,
    };

    setIsLoading(true);
    setError(null);

    try {
      const result = await bridgeProvider.createOrder(request);

      if (!isMountedRef.current) return;

      if (result.success) {
        setQuote(result.quote);
        setError(null);

        // Start expiry countdown
        const expiresAt = result.quote.expiresAt;
        const updateExpiry = () => {
          const now = new Date();
          const secondsLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
          setSecondsUntilExpiry(secondsLeft);
        };
        updateExpiry();
        expiryIntervalRef.current = setInterval(updateExpiry, 1000);

        // Schedule next refresh (unless paused)
        refreshTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && !isPausedRef.current) {
            fetchQuote();
          }
        }, REFRESH_INTERVAL_MS);
      } else {
        setQuote(null);
        setError(result.error);
        setSecondsUntilExpiry(null);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      setQuote(null);
      setSecondsUntilExpiry(null);
      // Map network errors to a generic error format
      setError({
        code: 'INSUFFICIENT_LIQUIDITY',
        message: err instanceof Error ? err.message : 'Failed to fetch quote',
      });
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [params, bridgeProvider, clearTimers]);

  // Manual refresh function
  const refresh = useCallback(() => {
    clearTimers();
    fetchQuote();
  }, [clearTimers, fetchQuote]);

  // Pause auto-refresh (e.g., during transaction execution)
  const pause = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    // Clear the scheduled refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Resume auto-refresh after pausing
  const resume = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    // Trigger a fresh quote fetch
    if (isValidQuoteParams(params)) {
      fetchQuote();
    }
  }, [params, fetchQuote]);

  // Effect to handle param changes with debounce
  useEffect(() => {
    isMountedRef.current = true;

    // Clear existing state and timers
    clearTimers();
    setQuote(null);
    setError(null);
    setSecondsUntilExpiry(null);

    // If params are valid, debounce and fetch
    if (isValidQuoteParams(params)) {
      debounceTimerRef.current = setTimeout(() => {
        fetchQuote();
      }, DEBOUNCE_MS);
    }

    return () => {
      isMountedRef.current = false;
      clearTimers();
    };
  }, [
    // Only re-run when actual param values change
    params?.sourceToken,
    params?.destinationChain,
    params?.destinationToken,
    params?.amount,
    params?.senderAddress,
    params?.recipientAddress,
    params?.slippage,
    clearTimers,
    fetchQuote,
  ]);

  return {
    quote,
    isLoading,
    error,
    secondsUntilExpiry,
    refresh,
    pause,
    resume,
    isPaused,
  };
}
