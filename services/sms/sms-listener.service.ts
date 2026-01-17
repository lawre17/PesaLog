/**
 * SMS Listener Service
 * Main entry point for SMS processing pipeline
 * Handles background SMS listening and processing
 */

import { eq } from 'drizzle-orm';
import { db, rawSms, transactions, type NewTransaction, type NewRawSms } from '@/db';
import { smsFilter } from './sms-filter.service';
import { smsParser, type ParseResult } from './sms-parser.service';
import { referenceLinker } from './reference-linker.service';
import { debtService } from '../debt.service';
import type { ParsedSms, ParsedFuliza, ParsedFulizaRepayment } from '@/types';

export interface SmsProcessingResult {
  success: boolean;
  rawSmsId?: number;
  transactionId?: number;
  isDuplicate?: boolean;
  needsClassification?: boolean;
  isPerson?: boolean;
  error?: string;
}

export class SmsListenerService {
  private static instance: SmsListenerService;
  private isListening: boolean = false;

  private constructor() {}

  static getInstance(): SmsListenerService {
    if (!SmsListenerService.instance) {
      SmsListenerService.instance = new SmsListenerService();
    }
    return SmsListenerService.instance;
  }

  /**
   * Process an incoming SMS message
   * This is the main entry point called when SMS is received
   */
  async processIncomingSms(
    sender: string,
    body: string,
    timestamp: Date = new Date()
  ): Promise<SmsProcessingResult> {
    try {
      // 1. Check if this is a financial SMS
      if (!smsFilter.shouldProcess(sender, body)) {
        return { success: false, error: 'Not a financial SMS' };
      }

      // 2. Skip failed/rejected transactions
      if (smsFilter.isFailedTransaction(body)) {
        return { success: false, error: 'Failed transaction - skipped' };
      }

      // 2. Store raw SMS
      const [rawSmsRecord] = await db
        .insert(rawSms)
        .values({
          sender,
          body,
          receivedAt: timestamp,
          parseStatus: 'pending',
        })
        .returning();

      // 3. Parse the message
      const parseResult = smsParser.parseMessage(body);

      if (!parseResult.success || !parseResult.data) {
        // Update parse status to failed
        await db
          .update(rawSms)
          .set({
            parseStatus: 'failed',
            parseError: parseResult.error || 'Unknown parse error',
            parsedAt: new Date(),
          })
          .where(eq(rawSms.id, rawSmsRecord.id));

        return {
          success: false,
          rawSmsId: rawSmsRecord.id,
          error: parseResult.error,
        };
      }

      // 4. Check for duplicate/related transaction
      const existingTransaction = await this.findExistingTransaction(
        parseResult.data.refCode
      );

      if (existingTransaction) {
        // Link related messages
        await referenceLinker.processAndLink(rawSmsRecord.id, body);

        // If this is a bank confirmation and M-Pesa transaction exists,
        // update with better business name but don't create duplicate
        if (
          parseResult.patternType === 'bank_confirmation' &&
          existingTransaction.source === 'mpesa'
        ) {
          const parsed = parseResult.data;
          if (parsed.type === 'bank_confirmation' && parsed.business) {
            // Bank confirmations often have better business names
            await db
              .update(transactions)
              .set({
                counterparty: parsed.business,
                counterpartyAccount: parsed.account || existingTransaction.counterpartyAccount,
                updatedAt: new Date(),
              })
              .where(eq(transactions.id, existingTransaction.id));
          }
        }

        await db
          .update(rawSms)
          .set({
            parseStatus: 'parsed',
            parsedAt: new Date(),
            linkedRefCode: parseResult.data.refCode,
          })
          .where(eq(rawSms.id, rawSmsRecord.id));

        return {
          success: true,
          rawSmsId: rawSmsRecord.id,
          isDuplicate: true,
        };
      }

      // 5. Try to link related messages
      const linked = await referenceLinker.processAndLink(rawSmsRecord.id, body);

      // 6. Handle Fuliza specially - use debt service
      if (parseResult.patternType === 'fuliza') {
        await debtService.processFulizaMessage(
          parseResult.data as ParsedFuliza,
          rawSmsRecord.id
        );

        // Update raw SMS status
        await db
          .update(rawSms)
          .set({
            parseStatus: 'parsed',
            parsedAt: new Date(),
            linkedRefCode: parseResult.data.refCode,
          })
          .where(eq(rawSms.id, rawSmsRecord.id));

        return {
          success: true,
          rawSmsId: rawSmsRecord.id,
          needsClassification: false, // Auto-classified as Fuliza
        };
      }

      // 7. Handle Fuliza repayment specially
      if (parseResult.patternType === 'fuliza_repayment') {
        await debtService.processFulizaRepayment(
          parseResult.data as ParsedFulizaRepayment,
          rawSmsRecord.id
        );

        // Update raw SMS status
        await db
          .update(rawSms)
          .set({
            parseStatus: 'parsed',
            parsedAt: new Date(),
            linkedRefCode: parseResult.data.refCode,
          })
          .where(eq(rawSms.id, rawSmsRecord.id));

        return {
          success: true,
          rawSmsId: rawSmsRecord.id,
          needsClassification: false, // Auto-classified as Fuliza repayment
        };
      }

      // 8. Create regular transaction
      const transaction = await this.createTransaction(
        parseResult,
        rawSmsRecord.id,
        linked?.merged
      );

      // 9. Update raw SMS status
      await db
        .update(rawSms)
        .set({
          parseStatus: 'parsed',
          parsedAt: new Date(),
          linkedRefCode: parseResult.data.refCode,
        })
        .where(eq(rawSms.id, rawSmsRecord.id));

      // 10. Check if this is a person-to-person transfer
      const isPerson = smsParser.isPerson(parseResult.data);

      return {
        success: true,
        rawSmsId: rawSmsRecord.id,
        transactionId: transaction.id,
        needsClassification: transaction.status === 'pending_classification',
        isPerson,
      };
    } catch (error) {
      console.error('Error processing SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a transaction record from parsed SMS
   */
  private async createTransaction(
    parseResult: ParseResult,
    rawSmsId: number,
    merged?: { counterparty: string; account?: string }
  ): Promise<{ id: number; status: 'pending_classification' | 'classified' | 'archived' | 'duplicate' | null }> {
    const parsed = parseResult.data!;
    const counterparty = merged?.counterparty || smsParser.getCounterparty(parsed);
    const phone = smsParser.getPhone(parsed);

    const transactionData: NewTransaction = {
      primaryRefCode: parsed.refCode,
      type: parseResult.transactionType!,
      source: this.getSource(parsed),
      amount: parsed.amount,
      currency: parsed.currency,
      fee: this.getFee(parsed),
      counterparty,
      counterpartyPhone: phone,
      counterpartyAccount: merged?.account || this.getAccount(parsed),
      transactionDate: parsed.transactionDate,
      balanceAfter: this.getBalance(parsed),
      rawSmsId,
      status: 'pending_classification',
      isAutoClassified: false,
    };

    const [transaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning({ id: transactions.id, status: transactions.status });

    return transaction;
  }

  /**
   * Get source type from parsed SMS
   */
  private getSource(
    parsed: ParsedSms
  ): 'mpesa' | 'bank' | 'card' | 'cash_manual' {
    switch (parsed.type) {
      case 'mpesa_send':
      case 'mpesa_paybill':
      case 'mpesa_received':
      case 'fuliza':
      case 'fuliza_repayment':
        return 'mpesa';
      case 'bank_transfer':
      case 'bank_confirmation':
        return 'bank';
      case 'card_transaction':
        return 'card';
      default:
        return 'mpesa';
    }
  }

  /**
   * Get transaction fee from parsed SMS
   */
  private getFee(parsed: ParsedSms): number {
    if (
      parsed.type === 'mpesa_send' ||
      parsed.type === 'mpesa_paybill'
    ) {
      return parsed.fee || 0;
    }
    if (parsed.type === 'fuliza') {
      return parsed.fee;
    }
    return 0;
  }

  /**
   * Get account number from parsed SMS
   */
  private getAccount(parsed: ParsedSms): string | undefined {
    if (parsed.type === 'mpesa_paybill') {
      return parsed.account;
    }
    if (parsed.type === 'bank_confirmation') {
      return parsed.account;
    }
    return undefined;
  }

  /**
   * Find existing transaction by reference code
   */
  private async findExistingTransaction(refCode: string): Promise<{
    id: number;
    source: 'mpesa' | 'bank' | 'card' | 'cash_manual';
    counterpartyAccount: string | null;
  } | null> {
    const [existing] = await db
      .select({
        id: transactions.id,
        source: transactions.source,
        counterpartyAccount: transactions.counterpartyAccount,
      })
      .from(transactions)
      .where(eq(transactions.primaryRefCode, refCode))
      .limit(1);

    return existing || null;
  }

  /**
   * Get balance from parsed SMS
   */
  private getBalance(parsed: ParsedSms): number | undefined {
    if (parsed.type === 'mpesa_send' || parsed.type === 'mpesa_paybill') {
      return parsed.balance;
    }
    if (parsed.type === 'card_transaction') {
      return parsed.balance;
    }
    if (parsed.type === 'mshwari_transfer') {
      return parsed.mpesaBalance; // Return M-Pesa balance after transfer
    }
    return undefined;
  }

  /**
   * Import historical SMS messages
   * Used during onboarding to process existing SMS
   */
  async importHistoricalSms(
    messages: Array<{ sender: string; body: string; timestamp: Date }>
  ): Promise<{
    total: number;
    processed: number;
    failed: number;
    duplicates: number;
  }> {
    const results = {
      total: messages.length,
      processed: 0,
      failed: 0,
      duplicates: 0,
    };

    // Sort by timestamp (oldest first)
    const sorted = [...messages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    for (const msg of sorted) {
      const result = await this.processIncomingSms(
        msg.sender,
        msg.body,
        msg.timestamp
      );

      if (result.success) {
        if (result.isDuplicate) {
          results.duplicates++;
        } else {
          results.processed++;
        }
      } else {
        results.failed++;
      }
    }

    return results;
  }
}

// Singleton export
export const smsListener = SmsListenerService.getInstance();
