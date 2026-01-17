/**
 * Reference Linker Service
 * Links related SMS messages by reference codes (e.g., M-Pesa + Bank confirmation)
 */

import { eq, and, ne, inArray } from 'drizzle-orm';
import { db, rawSms, relatedMessages, transactions } from '@/db';
import { extractRefCodes } from '@/constants/sms-patterns';
import type { RawSms, RelatedMessageGroup, MergedTransactionData } from '@/types';
import { smsParser } from './sms-parser.service';

export class ReferenceLinkingService {
  /**
   * Extract all reference codes from an SMS body
   */
  extractRefCodes(body: string): string[] {
    return extractRefCodes(body);
  }

  /**
   * Find existing SMS messages with the same reference code
   */
  async findRelatedMessages(refCode: string, excludeId?: number): Promise<RawSms[]> {
    const conditions = [eq(rawSms.linkedRefCode, refCode)];

    if (excludeId) {
      conditions.push(ne(rawSms.id, excludeId));
    }

    return await db
      .select()
      .from(rawSms)
      .where(and(...conditions));
  }

  /**
   * Process a new SMS and link it to related messages
   */
  async processAndLink(smsId: number, body: string): Promise<RelatedMessageGroup | null> {
    const refCodes = this.extractRefCodes(body);

    if (refCodes.length === 0) {
      return null;
    }

    const primaryRefCode = refCodes[0];

    // Update the raw SMS with the primary ref code
    await db
      .update(rawSms)
      .set({ linkedRefCode: primaryRefCode })
      .where(eq(rawSms.id, smsId));

    // Find related messages
    const related = await this.findRelatedMessages(primaryRefCode, smsId);

    if (related.length === 0) {
      return null;
    }

    // Create link records
    for (const relatedSms of related) {
      // Check if link already exists
      const existingLink = await db
        .select()
        .from(relatedMessages)
        .where(
          and(
            eq(relatedMessages.refCode, primaryRefCode),
            eq(relatedMessages.primarySmsId, Math.min(smsId, relatedSms.id)),
            eq(relatedMessages.secondarySmsId, Math.max(smsId, relatedSms.id))
          )
        );

      if (existingLink.length === 0) {
        await db.insert(relatedMessages).values({
          primarySmsId: Math.min(smsId, relatedSms.id),
          secondarySmsId: Math.max(smsId, relatedSms.id),
          refCode: primaryRefCode,
        });
      }
    }

    // Get the current SMS
    const [currentSms] = await db
      .select()
      .from(rawSms)
      .where(eq(rawSms.id, smsId));

    // Merge data from all related messages
    return this.mergeRelatedMessages([currentSms, ...related]);
  }

  /**
   * Merge data from related SMS messages into enriched transaction data
   */
  mergeRelatedMessages(messages: RawSms[]): RelatedMessageGroup {
    const merged: MergedTransactionData = {
      refCode: '',
      amount: 0,
      counterparty: '',
      transactionDate: new Date(),
      sources: [],
    };

    // Sort messages by received time (earliest first)
    const sorted = [...messages].sort(
      (a, b) => a.receivedAt.getTime() - b.receivedAt.getTime()
    );

    for (const msg of sorted) {
      const parseResult = smsParser.parseMessage(msg.body);

      if (parseResult.success && parseResult.data) {
        const parsed = parseResult.data;

        // M-Pesa messages have authoritative transaction data
        if (
          parsed.type === 'mpesa_send' ||
          parsed.type === 'mpesa_paybill' ||
          parsed.type === 'mpesa_received'
        ) {
          merged.refCode = parsed.refCode;
          merged.amount = parsed.amount;
          merged.transactionDate = parsed.transactionDate;

          if (parsed.type === 'mpesa_send') {
            merged.counterparty = parsed.recipient;
            merged.fee = parsed.fee;
          } else if (parsed.type === 'mpesa_paybill') {
            merged.counterparty = parsed.paybillName;
            merged.account = parsed.account;
            merged.fee = parsed.fee;
          } else if (parsed.type === 'mpesa_received') {
            merged.counterparty = parsed.sender;
          }
        }

        // Bank confirmation messages often have more detailed business names
        if (parsed.type === 'bank_confirmation') {
          // Prefer bank's business name if M-Pesa only had paybill name
          if (parsed.business && parsed.business.length > merged.counterparty.length) {
            merged.counterparty = parsed.business;
          }
          merged.account = parsed.account || merged.account;
        }

        // Bank transfer messages
        if (parsed.type === 'bank_transfer') {
          merged.refCode = parsed.refCode || merged.refCode;
          merged.amount = merged.amount || parsed.amount;
          merged.counterparty = merged.counterparty || parsed.sender;
        }
      }

      merged.sources.push({
        smsId: msg.id,
        sender: msg.sender,
      });
    }

    return {
      merged,
      originalMessages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
      })),
    };
  }

  /**
   * Check if a transaction already exists for this reference code
   */
  async transactionExists(refCode: string): Promise<boolean> {
    const existing = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.primaryRefCode, refCode))
      .limit(1);

    return existing.length > 0;
  }

  /**
   * Update an existing transaction with merged data from related messages
   */
  async updateTransactionWithMergedData(
    transactionId: number,
    merged: MergedTransactionData
  ): Promise<void> {
    await db
      .update(transactions)
      .set({
        counterparty: merged.counterparty,
        counterpartyAccount: merged.account,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));

    // Link related messages to transaction
    await db
      .update(relatedMessages)
      .set({ transactionId })
      .where(eq(relatedMessages.refCode, merged.refCode));
  }
}

// Singleton instance
export const referenceLinker = new ReferenceLinkingService();
