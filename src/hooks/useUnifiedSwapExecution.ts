/**
 * Unified swap execution hook
 * Uses Relay execution with server wallet for zero-SOL swaps
 */

import { useBridgeContext } from '@/context/BridgeContext';
import { useRelaySwapExecution } from './useRelaySwapExecution';
import type { Quote } from '@/services/bridge/types';
import type { UseRelaySwapExecutionResult } from './useRelaySwapExecution';

export type ExecutionStatus = 'idle' | 'signing' | 'confirming' | 'completed' | 'error';
export type UseSwapExecutionResult = UseRelaySwapExecutionResult;

/**
 * Unified hook for executing swap transactions
 * Currently uses Relay execution flow with server wallet for fee payment
 *
 * @param quote - The current quote containing transaction data
 * @param sourceTokenAddress - Source token mint address
 * @param sourceTokenDecimals - Source token decimals (for gas conversion)
 * @param onPause - Callback to pause quote auto-refresh
 * @param onResume - Callback to resume quote auto-refresh
 */
export function useUnifiedSwapExecution(
  quote: Quote | null,
  sourceTokenAddress: string | null,
  sourceTokenDecimals: number,
  onPause?: () => void,
  onResume?: () => void
): UseSwapExecutionResult {
  const { providerType } = useBridgeContext();

  // Use Relay execution
  const relayExecution = useRelaySwapExecution(
    quote,
    sourceTokenAddress,
    sourceTokenDecimals,
    onPause,
    onResume
  );

  // Provider type check for future flexibility
  // Currently only supports Relay
  if (providerType !== 'relay') {
    console.warn(`Provider type "${providerType}" not supported. Using Relay execution.`);
  }

  return relayExecution;
}
