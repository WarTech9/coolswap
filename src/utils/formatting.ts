/**
 * Formatting utilities for token amounts
 * Uses string manipulation to avoid floating-point precision issues
 */

/**
 * Format token amount from smallest units to human-readable
 * Uses string manipulation to avoid floating-point precision issues
 */
export function formatTokenAmount(
  amount: string,
  decimals: number,
  maxDecimals: number = 6
): string {
  try {
    if (!amount || amount === '0') return '0';

    const paddedAmount = amount.padStart(decimals + 1, '0');
    const integerPart = paddedAmount.slice(0, -decimals) || '0';
    const decimalPart = paddedAmount.slice(-decimals);
    const trimmedDecimal = decimalPart.replace(/0+$/, '');
    const limitedDecimal = trimmedDecimal.slice(0, maxDecimals);

    const numericString = limitedDecimal
      ? `${integerPart}.${limitedDecimal}`
      : integerPart;

    const num = Number(numericString);
    if (!Number.isFinite(num)) return '0';

    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: limitedDecimal.length,
    });
  } catch {
    return '0';
  }
}

export function formatSolAmount(lamports: string, maxDecimals: number = 6): string {
  return formatTokenAmount(lamports, 9, maxDecimals);
}

/**
 * Convert human-readable amount to smallest units
 * Uses string manipulation to avoid floating-point precision issues
 */
export function toSmallestUnits(amount: string, decimals: number): string {
  try {
    const [integerPart, decimalPart = ''] = amount.split('.');
    const paddedDecimals = decimalPart.padEnd(decimals, '0');
    const trimmedDecimals = paddedDecimals.slice(0, decimals);
    const fullInteger = integerPart + trimmedDecimals;
    return fullInteger.replace(/^0+/, '') || '0';
  } catch {
    return '0';
  }
}
