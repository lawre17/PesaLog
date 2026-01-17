/**
 * SMS Filter Service
 * Filters incoming SMS to identify financial messages
 */

import {
  FINANCIAL_SENDERS,
  isFinancialSender,
  getSenderType,
} from '@/constants/sms-patterns';

export class SmsFilterService {
  /**
   * Check if an SMS is from a financial institution
   */
  isFinancialSms(sender: string): boolean {
    return isFinancialSender(sender);
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
