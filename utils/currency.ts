/**
 * Currency formatting utilities for PesaLog
 */

/**
 * Parse amount string to cents (integer)
 * "330.00" -> 33000
 * "1,500.50" -> 150050
 */
export function parseAmountToCents(amountStr: string): number {
  // Remove commas and parse
  const cleaned = amountStr.replace(/,/g, '');
  const amount = parseFloat(cleaned);
  return Math.round(amount * 100);
}

/**
 * Convert cents to display amount
 * 33000 -> 330.00
 */
export function centsToAmount(cents: number): number {
  return cents / 100;
}

/**
 * Format amount for display with currency
 * formatCurrency(33000, 'KES') -> "KES 330.00"
 * formatCurrency(33000) -> "Ksh330.00"
 */
export function formatCurrency(
  cents: number,
  currency: string = 'KES',
  options: { compact?: boolean; showSign?: boolean } = {}
): string {
  const amount = centsToAmount(cents);
  const absAmount = Math.abs(amount);

  let formatted: string;

  if (options.compact && absAmount >= 1000000) {
    // 1M+
    formatted = `${(absAmount / 1000000).toFixed(1)}M`;
  } else if (options.compact && absAmount >= 1000) {
    // 1K+
    formatted = `${(absAmount / 1000).toFixed(1)}K`;
  } else {
    formatted = absAmount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Add currency prefix
  const prefix = currency === 'KES' ? 'Ksh' : currency + ' ';

  // Add sign if requested
  if (options.showSign) {
    const sign = cents >= 0 ? '+' : '-';
    return `${sign}${prefix}${formatted}`;
  }

  return `${prefix}${formatted}`;
}

/**
 * Format amount with color indication
 * Returns the sign for styling purposes
 */
export function getAmountSign(
  type: 'income' | 'expense' | 'debt' | 'transfer' | 'debt_repayment'
): '+' | '-' | '' {
  switch (type) {
    case 'income':
      return '+';
    case 'expense':
    case 'debt':
      return '-';
    case 'debt_repayment':
      return '-'; // Repaying is money out
    case 'transfer':
      return '';
  }
}

/**
 * Parse currency from SMS (handles KES, Ksh, USD, etc.)
 */
export function parseCurrency(text: string): string {
  const normalized = text.toUpperCase().trim();
  if (normalized.includes('USD') || normalized.includes('$')) {
    return 'USD';
  }
  if (normalized.includes('EUR')) {
    return 'EUR';
  }
  if (normalized.includes('GBP')) {
    return 'GBP';
  }
  return 'KES';
}
