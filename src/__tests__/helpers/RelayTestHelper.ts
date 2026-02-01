/**
 * Test helper for RelayProvider
 * Exposes private methods for unit testing
 */

import type { OrderStatus } from '@/services/bridge/types';

const RELAY_CHAIN_IDS: Record<string, string> = {
  solana: '792703809',
  ethereum: '1',
  arbitrum: '42161',
  base: '8453',
  polygon: '137',
  optimism: '10',
  avalanche: '43114',
  bnb: '56',
};

/**
 * Convert normalized chain ID to Relay chain ID
 * Mirrors RelayProvider.toRelayChainId logic
 */
export function toRelayChainId(normalizedId: string): number {
  const chainId = RELAY_CHAIN_IDS[normalizedId];
  if (!chainId) {
    throw new Error(`Unsupported chain ID: ${normalizedId}`);
  }
  return parseInt(chainId, 10);
}

/**
 * Convert Relay chain ID to normalized chain ID
 * Mirrors RelayProvider.toNormalizedChainId logic
 */
export function toNormalizedChainId(relayChainId: string | number): string {
  const id = String(relayChainId);
  const entry = Object.entries(RELAY_CHAIN_IDS).find(([, v]) => v === id);
  return entry ? entry[0] : id;
}

/**
 * Map Relay order status to normalized OrderStatus
 * Mirrors RelayProvider.mapOrderStatus logic
 */
export function mapOrderStatus(status: string): OrderStatus {
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case 'pending':
    case 'waiting':
      return 'pending' as OrderStatus;
    case 'processing':
    case 'created':
      return 'created' as OrderStatus;
    case 'success':
    case 'fulfilled':
      return 'fulfilled' as OrderStatus;
    case 'complete':
    case 'completed':
      return 'completed' as OrderStatus;
    case 'refunded':
    case 'cancelled':
      return 'cancelled' as OrderStatus;
    case 'failed':
    case 'expired':
      return 'failed' as OrderStatus;
    default:
      return 'pending' as OrderStatus;
  }
}
