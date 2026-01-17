/**
 * SMS Filter Service
 * Filters incoming SMS to identify financial messages
 */

import {
  FINANCIAL_SENDERS,
  isFinancialSender,
  getSenderType,
} from '@/constants/sms-patterns';

// Keywords that indicate a failed/rejected transaction
const FAILED_KEYWORDS = [
  'failed',
  'not completed',
  'was not successful',
  'unsuccessful',
  'rejected',
  'cancelled',
  'canceled',
  'could not be processed',
  'insufficient balance',
  'insufficient funds',
  'limit exceeded',
  'wrong pin',
  'incorrect pin',
  'expired',
  'timed out',
  'declined',
];

export class SmsFilterService {
  /**
   * Check if an SMS is from a financial institution
   */
  isFinancialSms(sender: string): boolean {
    return isFinancialSender(sender);
  }

  /**
   * Check if the SMS indicates a failed/rejected transaction
   * Failed transactions should be skipped during import
   */
  isFailedTransaction(body: string): boolean {
    const lowerBody = body.toLowerCase();
    return FAILED_KEYWORDS.some((keyword) => lowerBody.includes(keyword));
  }

  /**
   * Get the type of sender (mpesa, bank, card, unknown)
   */
  getSenderType(sender: string): 'mpesa' | 'bank' | 'card' | 'unknown' {
    return getSenderType(sender);
  }

  /**
   * Get list of known financial senders
   */
  getKnownSenders(): readonly string[] {
    return FINANCIAL_SENDERS;
  }

  /**
   * Quick check if SMS body contains financial keywords
   * This is a preliminary filter before regex parsing
   */
  hasFinancialKeywords(body: string): boolean {
    const keywords = [
      'Confirmed',
      'Ksh',
      'KES',
      'sent to',
      'received',
      'transferred',
      'transaction',
      'balance',
      'M-PESA',
      'MPESA',
      'Fuliza',
      'card',
      'paybill',
    ];

    const upperBody = body.toUpperCase();
    return keywords.some((keyword) => upperBody.includes(keyword.toUpperCase()));
  }

  /**
   * Filter and prioritize SMS for processing
   * Returns true if the SMS should be processed
   */
  shouldProcess(sender: string, body: string): boolean {
    // First check if sender is known
    if (this.isFinancialSms(sender)) {
      return true;
    }

    // Even if sender is unknown, check for financial keywords
    // This catches SMS from new/unknown financial services
    if (this.hasFinancialKeywords(body)) {
      return true;
    }

    return false;
  }
}

// Singleton instance
export const smsFilter = new SmsFilterService();
