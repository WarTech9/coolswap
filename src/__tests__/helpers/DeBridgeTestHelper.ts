/**
 * Test helper to expose DeBridgeProvider private methods for testing
 * These methods are accessed through a public API for testing purposes
 */

import { DEBRIDGE_CHAIN_IDS } from '@/config/chains';
import type { OrderStatus } from '@/services/bridge/types';
import type { CreateOrderError } from '@/services/bridge/IBridgeProvider';

// Re-implement the private methods for testing since TypeScript private methods
// cannot be accessed directly. These should match the implementation exactly.

export function toDeBridgeChainId(normalizedId: string): number {
  const chainId = DEBRIDGE_CHAIN_IDS[normalizedId as keyof typeof DEBRIDGE_CHAIN_IDS];
  if (!chainId) {
    throw new Error(`Unsupported chain ID: ${normalizedId}`);
  }
  return chainId;
}

export function toNormalizedChainId(deBridgeChainId: number): string | null {
  const entry = Object.entries(DEBRIDGE_CHAIN_IDS).find(
    ([, id]) => id === deBridgeChainId
  );
  return entry ? entry[0] : null;
}

interface DeBridgeErrorResponse {
  errorId: string;
  errorCode?: string;
  errorMessage: string;
  constraints?: {
    minAmount?: string;
    maxAmount?: string;
  };
}

export function mapToDeBridgeError(errorData: DeBridgeErrorResponse): CreateOrderError {
  const message = errorData.errorMessage;

  // Check for insufficient liquidity
  if (
    message.toLowerCase().includes('insufficient') ||
    message.toLowerCase().includes('liquidity')
  ) {
    return { code: 'INSUFFICIENT_LIQUIDITY', message };
  }

  // Check for amount too low
  if (
    message.toLowerCase().includes('minimum') ||
    message.toLowerCase().includes('too low')
  ) {
    return {
      code: 'AMOUNT_TOO_LOW',
      message,
      minimum: errorData.constraints?.minAmount ?? '0',
    };
  }

  // Check for amount too high
  if (
    message.toLowerCase().includes('maximum') ||
    message.toLowerCase().includes('too high')
  ) {
    return {
      code: 'AMOUNT_TOO_HIGH',
      message,
      maximum: errorData.constraints?.maxAmount ?? '0',
    };
  }

  // Check for unsupported pair
  if (
    message.toLowerCase().includes('unsupported') ||
    message.toLowerCase().includes('not supported')
  ) {
    return { code: 'UNSUPPORTED_PAIR', message };
  }

  // Default to unsupported pair for unknown errors
  return { code: 'UNSUPPORTED_PAIR', message };
}

export function mapOrderStatus(status: string): OrderStatus {
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case 'pending':
    case 'created':
      return 'created' as OrderStatus;
    case 'fulfilled':
      return 'fulfilled' as OrderStatus;
    case 'completed':
    case 'claimed':
      return 'completed' as OrderStatus;
    case 'cancelled':
      return 'cancelled' as OrderStatus;
    case 'failed':
      return 'failed' as OrderStatus;
    default:
      return 'pending' as OrderStatus;
  }
}
