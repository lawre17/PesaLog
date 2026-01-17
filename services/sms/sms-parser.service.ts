/**
 * SMS Parser Service
 * Parses financial SMS messages from M-Pesa, banks, and card transactions
 */

import {
  PATTERNS,
  MPESA_SEND_PATTERN,
  MPESA_PAYBILL_PATTERN,
  MPESA_RECEIVED_PATTERN,
  BANK_TRANSFER_PATTERN,
  BANK_CONFIRMATION_PATTERN,
  CARD_TRANSACTION_PATTERN,
  FULIZA_PATTERN,
  FULIZA_REPAYMENT_PATTERN,
  MSHWARI_TRANSFER_PATTERN,
  type SmsPatternType,
} from '@/constants/sms-patterns';
import { parseAmountToCents, parseCurrency } from '@/utils/currency';
import { parseSmsDate, parseFulizaDueDate } from '@/utils/date';
import type {
  ParsedSms,
  ParsedMpesaSend,
  ParsedMpesaPaybill,
  ParsedMpesaReceived,
  ParsedBankTransfer,
  ParsedBankConfirmation,
  ParsedCardTransaction,
  ParsedFuliza,
  ParsedFulizaRepayment,
  ParsedMshwariTransfer,
} from '@/types';

export interface ParseResult {
  success: boolean;
  data?: ParsedSms;
  patternType: SmsPatternType;
  transactionType?: 'income' | 'expense' | 'debt' | 'debt_repayment' | 'transfer';
  error?: string;
}

export class SmsParserService {
  /**
   * Parse an SMS message and extract transaction data
   */
  parseMessage(body: string): ParseResult {
    // Try each pattern in order
    for (const { type, pattern, transactionType } of PATTERNS) {
      const match = body.match(pattern);
      if (match?.groups) {
        try {
          const parsed = this.extractData(type, match.groups, body);
          if (parsed) {
            return {
              success: true,
              data: parsed,
              patternType: type,
              transactionType,
            };
          }
        } catch (err) {
          console.warn(`Failed to parse ${type}:`, err);
        }
      }
    }

    return {
      success: false,
      patternType: 'unknown',
      error: 'No matching pattern found',
    };
  }

  /**
   * Extract structured data based on pattern type
   */
  private extractData(
    type: SmsPatternType,
    groups: Record<string, string>,
    rawBody: string
  ): ParsedSms | null {
    switch (type) {
      case 'mpesa_send':
        return this.parseMpesaSend(groups, rawBody);
      case 'mpesa_paybill':
        return this.parseMpesaPaybill(groups, rawBody);
      case 'mpesa_received':
        return this.parseMpesaReceived(groups, rawBody);
      case 'bank_transfer':
        return this.parseBankTransfer(groups, rawBody);
      case 'bank_confirmation':
        return this.parseBankConfirmation(groups, rawBody);
      case 'card_transaction':
        return this.parseCardTransaction(groups, rawBody);
      case 'fuliza':
        return this.parseFuliza(groups, rawBody);
      case 'fuliza_repayment':
        return this.parseFulizaRepayment(groups, rawBody);
      case 'mshwari_transfer':
        return this.parseMshwariTransfer(groups, rawBody);
      default:
        return null;
    }
  }

  private parseMpesaSend(
    groups: Record<string, string>,
    rawBody: string
  ): ParsedMpesaSend {
    return {
      type: 'mpesa_send',
      refCode: groups.refCode,
      amount: parseAmountToCents(groups.amount),
      currency: 'KES',
      recipient: groups.recipient.trim(),
      phone: groups.phone,
      transactionDate: parseSmsDate(groups.date, groups.time),
      balance: groups.balance ? parseAmountToCents(groups.balance) : undefined,
      fee: groups.fee ? parseAmountToCents(groups.fee) : undefined,
      rawBody,
    };
  }

  private parseMpesaPaybill(
    groups: Record<string, string>,
    rawBody: string
  ): ParsedMpesaPaybill {
    return {
      type: 'mpesa_paybill',
      refCode: groups.refCode,
      amount: parseAmountToCents(groups.amount),
      currency: 'KES',
      paybillName: groups.paybillName.trim(),
      account: groups.account,
      transactionDate: parseSmsDate(groups.date, groups.time),
      balance: groups.balance ? parseAmountToCents(groups.balance) : undefined,
      fee: groups.fee ? parseAmountToCents(groups.fee) : undefined,
      rawBody,
    };
  }

  private parseMpesaReceived(
    groups: Record<string, string>,
    rawBody: string
  ): ParsedMpesaReceived {
    return {
      type: 'mpesa_received',
      refCode: groups.refCode,
      amount: parseAmountToCents(groups.amount),
      currency: 'KES',
      sender: groups.sender.trim(),
      phone: groups.phone,
      transactionDate: parseSmsDate(groups.date, groups.time),
      rawBody,
    };
  }

  private parseBankTransfer(
    groups: Record<string, string>,
    rawBody: string
  ): ParsedBankTransfer {
    return {
      type: 'bank_transfer',
      refCode: groups.mpesaRef,
      amount: parseAmountToCents(groups.amount),
      currency: 'KES',
      sender: groups.sender.trim(),
      bankRef: groups.bankRef,
      transactionDate: new Date(), // Bank transfers don't always have date in SMS
      rawBody,
    };
  }

  private parseBankConfirmation(
    groups: Record<string, string>,
    rawBody: string
  ): ParsedBankConfirmation {
    return {
      type: 'bank_confirmation',
      refCode: groups.refCode,
      amount: parseAmountToCents(groups.amount),
      currency: 'KES',
      business: groups.business.trim(),
      account: groups.account,
      transactionDate: parseSmsDate(groups.date, groups.time),
      rawBody,
    };
  }

  private parseCardTransaction(
    groups: Record<string, string>,
    rawBody: string
  ): ParsedCardTransaction {
    return {
      type: 'card_transaction',
      refCode: `CARD-${Date.now()}`, // Generate ref for card transactions
      amount: parseAmountToCents(groups.amount),
      currency: parseCurrency(groups.currency),
      bank: groups.bank,
      cardMask: groups.cardMask,
      merchant: groups.merchant.trim(),
      transactionDate: parseSmsDate(groups.date, groups.time),
      balance: groups.balance ? parseAmountToCents(groups.balance) : undefined,
      balanceCurrency: groups.balanceCurrency,
      rawBody,
    };
  }

  private parseFuliza(
    groups: Record<string, string>,
    rawBody: string
  ): ParsedFuliza {
    return {
      type: 'fuliza',
      refCode: groups.refCode,
      amount: parseAmountToCents(groups.principal), // Total amount for transaction
      currency: 'KES',
      principal: parseAmountToCents(groups.principal),
      fee: parseAmountToCents(groups.fee),
      totalOutstanding: parseAmountToCents(groups.totalOutstanding),
      dueDate: parseFulizaDueDate(groups.dueDate),
      transactionDate: new Date(),
      rawBody,
    };
  }

  private parseFulizaRepayment(
    groups: Record<string, string>,
    rawBody: string
  ): ParsedFulizaRepayment {
    return {
      type: 'fuliza_repayment',
      refCode: groups.refCode,
      amount: parseAmountToCents(groups.amount),
      currency: 'KES',
      amountRepaid: parseAmountToCents(groups.amount),
      transactionDate: new Date(),
      rawBody,
    };
  }

  private parseMshwariTransfer(
    groups: Record<string, string>,
    rawBody: string
  ): ParsedMshwariTransfer {
    return {
      type: 'mshwari_transfer',
      refCode: groups.refCode,
      amount: parseAmountToCents(groups.amount),
      currency: 'KES',
      transactionDate: parseSmsDate(groups.date, groups.time),
      shwariBalance: groups.shwariBalance
        ? parseAmountToCents(groups.shwariBalance)
        : undefined,
      mpesaBalance: groups.mpesaBalance
        ? parseAmountToCents(groups.mpesaBalance)
        : undefined,
      rawBody,
    };
  }

  /**
   * Check if a recipient appears to be a person (has phone number)
   */
  isPerson(parsed: ParsedSms): boolean {
    if (parsed.type === 'mpesa_send') {
      return !!parsed.phone;
    }
    if (parsed.type === 'mpesa_received') {
      return !!parsed.phone;
    }
    return false;
  }

  /**
   * Get counterparty name from parsed SMS
   */
  getCounterparty(parsed: ParsedSms): string {
    switch (parsed.type) {
      case 'mpesa_send':
        return parsed.recipient;
      case 'mpesa_paybill':
        return parsed.paybillName;
      case 'mpesa_received':
        return parsed.sender;
      case 'bank_transfer':
        return parsed.sender;
      case 'bank_confirmation':
        return parsed.business;
      case 'card_transaction':
        return parsed.merchant;
      case 'fuliza':
        return 'Fuliza M-Pesa';
      case 'fuliza_repayment':
        return 'Fuliza M-Pesa';
      case 'mshwari_transfer':
        return 'M-Shwari';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get phone number from parsed SMS (if available)
   */
  getPhone(parsed: ParsedSms): string | undefined {
    if (parsed.type === 'mpesa_send') {
      return parsed.phone;
    }
    if (parsed.type === 'mpesa_received') {
      return parsed.phone;
    }
    return undefined;
  }
}

// Singleton instance
export const smsParser = new SmsParserService();
