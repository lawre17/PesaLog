/**
 * Data Management Service
 * Handles data import/export and cleanup operations
 */

import { db, transactions, rawSms, debts, debtPayments, relatedMessages } from '@/db';
import { sql } from 'drizzle-orm';

export class DataManagementService {
  /**
   * Delete all imported transaction data
   * This clears transactions, raw SMS, debts, and related data
   */
  async clearAllData(): Promise<{
    transactions: number;
    rawSms: number;
    debts: number;
  }> {
    // Get counts before deletion
    const [txnCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions);
    const [smsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rawSms);
    const [debtCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(debts);

    // Delete in order (respecting foreign keys)
    await db.delete(debtPayments);
    await db.delete(relatedMessages);
    await db.delete(transactions);
    await db.delete(debts);
    await db.delete(rawSms);

    return {
      transactions: txnCount?.count || 0,
      rawSms: smsCount?.count || 0,
      debts: debtCount?.count || 0,
    };
  }

  /**
   * Delete only transactions (keep raw SMS for re-processing)
   */
  async clearTransactionsOnly(): Promise<number> {
    const [count] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions);

    await db.delete(debtPayments);
    await db.delete(relatedMessages);
    await db.delete(transactions);
    await db.delete(debts);

    // Reset raw SMS parse status so they can be re-processed
    await db
      .update(rawSms)
      .set({
        parseStatus: 'pending',
        parsedAt: null,
      });

    return count?.count || 0;
  }

  /**
   * Get data statistics
   */
  async getDataStats(): Promise<{
    transactions: number;
    rawSms: number;
    debts: number;
    categories: number;
  }> {
    const [txnCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions);
    const [smsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rawSms);
    const [debtCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(debts);

    return {
      transactions: txnCount?.count || 0,
      rawSms: smsCount?.count || 0,
      debts: debtCount?.count || 0,
      categories: 0, // Categories are predefined, not counted
    };
  }
}

export const dataManagement = new DataManagementService();
