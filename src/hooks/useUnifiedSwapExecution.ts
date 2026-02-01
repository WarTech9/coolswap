/**
 * Unified swap execution hook
 * Automatically selects between deBridge and Relay execution based on provider type
 *
 * - deBridge: Uses Kora to add payment instruction and submit
 * - Relay: Uses Kora-first signing with depositFeePayer for zero-SOL swaps
 */

import { useMemo } from 'react';
import { useBridgeContext } from '@/context/BridgeContext';
import { useSwapExecution } from './useSwapExecution';
import { useRelaySwapExecution } from './useRelaySwapExecution';
import type { Quote } from '@/services/bridge/types';
import type { ExecutionStatus, UseSwapExecutionResult } from './useSwapExecution';

export type { ExecutionStatus, UseSwapExecutionResult };

/**
 * Unified hook for executing swap transactions
 * Automatically uses the correct execution flow based on bridge provider
 *
 * @param quote - The current quote containing transaction data
 * @param sourceTokenAddress - Source token mint address (for deBridge Kora payment)
 * @param sourceTokenDecimals - Source token decimals (for Relay gas conversion)
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

  // Call both hooks (React requires all hooks to be called unconditionally)
  // The unused hook will be in idle state with minimal overhead
  const debridgeExecution = useSwapExecution(
    providerType === 'debridge' ? quote : null,
    sourceTokenAddress,
    providerType === 'debridge' ? onPause : undefined,
    providerType === 'debridge' ? onResume : undefined
  );

  const relayExecution = useRelaySwapExecution(
    providerType === 'relay' ? quote : null,
    sourceTokenAddress,
    sourceTokenDecimals,
    providerType === 'relay' ? onPause : undefined,
    providerType === 'relay' ? onResume : undefined
  );

  // Return the appropriate execution based on provider type
  return useMemo(() => {
    if (providerType === 'relay') {
      return relayExecution;
    }
    return debridgeExecution;
  }, [providerType, debridgeExecution, relayExecution]);
}
