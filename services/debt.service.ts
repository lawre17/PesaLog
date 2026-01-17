/**
 * Debt Service
 * Manages Fuliza overdrafts, loans, and personal debts
 */

import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { db, debts, debtPayments, transactions, categories } from '@/db';
import type {
  Debt,
  NewDebt,
  DebtSummary,
  ParsedFuliza,
  ParsedFulizaRepayment,
} from '@/types';
import { isOverdue, getDaysUntilDue } from '@/utils/date';

export class DebtService {
  /**
   * Process Fuliza overdraft from SMS
   */
  async processFulizaMessage(
    parsed: ParsedFuliza,
    rawSmsId: number
  ): Promise<void> {
    // Check for existing active Fuliza debt
    const [existingDebt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.type, 'fuliza'), eq(debts.status, 'active')));

    if (existingDebt) {
      // Update existing debt
      await db
        .update(debts)
        .set({
          totalOutstanding: parsed.totalOutstanding,
          lastUpdatedAmount: parsed.principal,
          feesCharged: (existingDebt.feesCharged || 0) + parsed.fee,
          dueDate: parsed.dueDate,
          updatedAt: new Date(),
        })
        .where(eq(debts.id, existingDebt.id));
    } else {
      // Create new Fuliza debt
      await db.insert(debts).values({
        type: 'fuliza',
        source: 'M-Pesa Fuliza',
        principalAmount: parsed.principal,
        feesCharged: parsed.fee,
        totalOutstanding: parsed.totalOutstanding,
        createdDate: new Date(),
        dueDate: parsed.dueDate,
        status: 'active',
      });
    }

    // Get Fuliza category ID
    const fulizaCategoryId = await this.getFulizaCategoryId();

    // Create transaction record
    await db.insert(transactions).values({
      primaryRefCode: parsed.refCode,
      type: 'debt',
      source: 'mpesa',
      amount: parsed.principal,
      fee: parsed.fee,
      counterparty: 'Fuliza M-Pesa',
      categoryId: fulizaCategoryId,
      transactionDate: new Date(),
      rawSmsId,
      isAutoClassified: true,
      confidence: 1.0,
      status: 'classified',
    });
  }

  /**
   * Process Fuliza repayment
   */
  async processFulizaRepayment(
    parsed: ParsedFulizaRepayment,
    rawSmsId: number
  ): Promise<void> {
    // Find active Fuliza debt
    const [activeDebt] = await db
      .select()
      .from(debts)
      .where(
        and(
          eq(debts.type, 'fuliza'),
          inArray(debts.status, ['active', 'partially_paid'])
        )
      );

    if (!activeDebt) {
      console.warn('No active Fuliza debt found for repayment');
      return;
    }

    // Record the payment
    await db.insert(debtPayments).values({
      debtId: activeDebt.id,
      amount: parsed.amountRepaid,
      paymentDate: new Date(),
      notes: 'Auto-detected Fuliza repayment',
    });

    // Update debt status
    const newOutstanding = Math.max(
      0,
      activeDebt.totalOutstanding - parsed.amountRepaid
    );

    await db
      .update(debts)
      .set({
        totalOutstanding: newOutstanding,
        status: newOutstanding <= 0 ? 'paid' : 'partially_paid',
        updatedAt: new Date(),
      })
      .where(eq(debts.id, activeDebt.id));

    // Create transaction record
    const fulizaCategoryId = await this.getFulizaCategoryId();

    await db.insert(transactions).values({
      primaryRefCode: parsed.refCode,
      type: 'debt_repayment',
      source: 'mpesa',
      amount: parsed.amountRepaid,
      counterparty: 'Fuliza M-Pesa',
      categoryId: fulizaCategoryId,
      transactionDate: new Date(),
      rawSmsId,
      isAutoClassified: true,
      confidence: 1.0,
      status: 'classified',
    });
  }

  /**
   * Create a personal debt (money lent or borrowed)
   */
  async createPersonalDebt(
    type: 'owed_to_person' | 'owed_by_person',
    transactionId: number,
    amount: number,
    counterparty: string,
    counterpartyPhone?: string,
    notes?: string
  ): Promise<number> {
    const [debt] = await db
      .insert(debts)
      .values({
        type,
        principalAmount: amount,
        totalOutstanding: amount,
        counterparty,
        counterpartyPhone,
        createdDate: new Date(),
        originalTransactionId: transactionId,
        status: 'active',
        notes,
      })
      .returning({ id: debts.id });

    return debt.id;
  }

  /**
   * Record a debt payment
   */
  async recordPayment(
    debtId: number,
    amount: number,
    transactionId?: number,
    notes?: string
  ): Promise<void> {
    // Get the debt
    const [debt] = await db
      .select()
      .from(debts)
      .where(eq(debts.id, debtId));

    if (!debt) {
      throw new Error(`Debt ${debtId} not found`);
    }

    // Record payment
    await db.insert(debtPayments).values({
      debtId,
      transactionId,
      amount,
      paymentDate: new Date(),
      notes,
    });

    // Update debt
    const newOutstanding = Math.max(0, debt.totalOutstanding - amount);

    await db
      .update(debts)
      .set({
        totalOutstanding: newOutstanding,
        status: newOutstanding <= 0 ? 'paid' : 'partially_paid',
        updatedAt: new Date(),
      })
      .where(eq(debts.id, debtId));
  }

  /**
   * Mark a debt as fully paid
   */
  async markAsPaid(debtId: number): Promise<void> {
    await db
      .update(debts)
      .set({
        totalOutstanding: 0,
        status: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(debts.id, debtId));
  }

  /**
   * Mark a debt as written off
   */
  async writeOff(debtId: number): Promise<void> {
    await db
      .update(debts)
      .set({
        status: 'written_off',
        updatedAt: new Date(),
      })
      .where(eq(debts.id, debtId));
  }

  /**
   * Get debt summary for dashboard
   */
  async getDebtSummary(): Promise<DebtSummary> {
    const activeDebts = await db
      .select()
      .from(debts)
      .where(inArray(debts.status, ['active', 'partially_paid', 'overdue']));

    const fulizaDebt = activeDebts.find((d) => d.type === 'fuliza');
    const owedByOthers = activeDebts.filter((d) => d.type === 'owed_by_person');
    const owedToOthers = activeDebts.filter((d) => d.type === 'owed_to_person');

    return {
      fuliza: {
        outstanding: fulizaDebt?.totalOutstanding || 0,
        dueDate: fulizaDebt?.dueDate || undefined,
        isOverdue: fulizaDebt?.dueDate
          ? isOverdue(fulizaDebt.dueDate)
          : false,
      },
      owedByOthers: {
        total: owedByOthers.reduce((sum, d) => sum + d.totalOutstanding, 0),
        count: owedByOthers.length,
        items: owedByOthers.map((d) => ({
          id: d.id,
          counterparty: d.counterparty || 'Unknown',
          amount: d.totalOutstanding,
        })),
      },
      owedToOthers: {
        total: owedToOthers.reduce((sum, d) => sum + d.totalOutstanding, 0),
        count: owedToOthers.length,
        items: owedToOthers.map((d) => ({
          id: d.id,
          counterparty: d.counterparty || 'Unknown',
          amount: d.totalOutstanding,
        })),
      },
    };
  }

  /**
   * Get all active debts
   */
  async getActiveDebts(): Promise<Debt[]> {
    return await db
      .select()
      .from(debts)
      .where(inArray(debts.status, ['active', 'partially_paid', 'overdue']))
      .orderBy(desc(debts.createdDate));
  }

  /**
   * Get debt by ID with payments
   */
  async getDebtWithPayments(debtId: number): Promise<{
    debt: Debt;
    payments: Array<{
      id: number;
      amount: number;
      paymentDate: Date;
      notes: string | null;
    }>;
  } | null> {
    const [debt] = await db
      .select()
      .from(debts)
      .where(eq(debts.id, debtId));

    if (!debt) {
      return null;
    }

    const payments = await db
      .select()
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debtId))
      .orderBy(desc(debtPayments.paymentDate));

    return { debt, payments };
  }

  /**
   * Get total interest/fees paid on Fuliza
   */
  async getTotalFulizaFees(): Promise<number> {
    const result = await db
      .select({
        total: sql<number>`SUM(${debts.feesCharged})`,
      })
      .from(debts)
      .where(eq(debts.type, 'fuliza'));

    return result[0]?.total || 0;
  }

  /**
   * Check and update overdue debts
   */
  async checkOverdueDebts(): Promise<Debt[]> {
    const activeDebts = await db
      .select()
      .from(debts)
      .where(
        and(
          inArray(debts.status, ['active', 'partially_paid']),
          sql`${debts.dueDate} IS NOT NULL`
        )
      );

    const overdueDebts: Debt[] = [];

    for (const debt of activeDebts) {
      if (debt.dueDate && isOverdue(debt.dueDate)) {
        await db
          .update(debts)
          .set({ status: 'overdue', updatedAt: new Date() })
          .where(eq(debts.id, debt.id));

        overdueDebts.push({ ...debt, status: 'overdue' });
      }
    }

    return overdueDebts;
  }

  /**
   * Get Fuliza category ID
   */
  private async getFulizaCategoryId(): Promise<number | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, 'Fuliza'));

    return category?.id;
  }

  /**
   * Get debts due soon (within days)
   */
  async getDebtsDueSoon(days: number = 7): Promise<Debt[]> {
    const activeDebts = await db
      .select()
      .from(debts)
      .where(
        and(
          inArray(debts.status, ['active', 'partially_paid']),
          sql`${debts.dueDate} IS NOT NULL`
        )
      );

    return activeDebts.filter((debt) => {
      if (!debt.dueDate) return false;
      const daysUntilDue = getDaysUntilDue(debt.dueDate);
      return daysUntilDue >= 0 && daysUntilDue <= days;
    });
  }
}

// Singleton instance
export const debtService = new DebtService();
