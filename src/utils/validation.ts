/**
 * Address validation utilities
 */

/**
 * Validate EVM address format (0x + 40 hex chars)
 */
export function isValidEVMAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Get validation error message for recipient address
 * Returns null if valid or empty (don't show error for empty input)
 */
export function getAddressValidationError(
  address: string,
  chainId: string | null
): string | null {
  // Don't show error for empty address
  if (!address) return null;

  // Solana is source chain, not destination - no validation needed
  if (chainId === 'solana') return null;

  // For EVM chains, validate the address format
  if (!isValidEVMAddress(address)) {
    return 'Invalid address. Must be 0x followed by 40 hex characters.';
  }

  return null;
}
