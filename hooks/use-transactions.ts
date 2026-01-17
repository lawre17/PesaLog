/**
 * Transactions Hook
 * Query and manage transactions
 */

import { useState, useEffect, useCallback } from 'react';
import { eq, desc, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { db, transactions, categories } from '@/db';
import { getPeriodBounds } from '@/utils/date';
import type { Transaction, Category, PeriodStats } from '@/types';

interface UseTransactionsOptions {
  limit?: number;
  type?: Transaction['type'];
  status?: Transaction['status'];
  categoryId?: number;
  startDate?: Date;
  endDate?: Date;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const [data, setData] = useState<Array<Transaction & { category?: Category }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);

      const conditions = [];

      if (options.type) {
        conditions.push(eq(transactions.type, options.type));
      }

      if (options.status) {
        conditions.push(eq(transactions.status, options.status));
      }

      if (options.categoryId) {
        conditions.push(eq(transactions.categoryId, options.categoryId));
      }

      if (options.startDate) {
        conditions.push(gte(transactions.transactionDate, options.startDate));
      }

      if (options.endDate) {
        conditions.push(lte(transactions.transactionDate, options.endDate));
      }

      let query = db
        .select()
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .orderBy(desc(transactions.transactionDate));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      if (options.limit) {
        query = query.limit(options.limit) as typeof query;
      }

      const results = await query;

      const mapped = results.map((r) => ({
        ...r.transactions,
        category: r.categories || undefined,
      }));

      setData(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [
    options.type,
    options.status,
    options.categoryId,
    options.startDate,
    options.endDate,
    options.limit,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { data, isLoading, error, refetch: fetchTransactions };
}

export function useRecentTransactions(limit: number = 10) {
  return useTransactions({ limit });
}

export function usePendingTransactions() {
  return useTransactions({ status: 'pending_classification' });
}

export function usePeriodStats(period: 'day' | 'week' | 'month' | 'year' = 'month') {
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);

      const { start, end } = getPeriodBounds(period);

      // Get all transactions in period
      const periodTransactions = await db
        .select()
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            gte(transactions.transactionDate, start),
            lte(transactions.transactionDate, end)
          )
        );

      // Calculate totals
      let totalIncome = 0;
      let totalExpenses = 0;
      const categoryTotals = new Map<number, { amount: number; name: string; color: string }>();

      for (const row of periodTransactions) {
        const txn = row.transactions;
        const cat = row.categories;

        if (txn.type === 'income') {
          totalIncome += txn.amount;
        } else if (txn.type === 'expense' || txn.type === 'debt') {
          totalExpenses += txn.amount;

          if (cat) {
            const existing = categoryTotals.get(cat.id) || {
              amount: 0,
              name: cat.name,
              color: cat.color,
            };
            existing.amount += txn.amount;
            categoryTotals.set(cat.id, existing);
          }
        }
      }

      // Build category breakdown
      const categoryBreakdown = Array.from(categoryTotals.entries())
        .map(([categoryId, data]) => ({
          categoryId,
          categoryName: data.name,
          amount: data.amount,
          percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
          color: data.color,
        }))
        .sort((a, b) => b.amount - a.amount);

      setStats({
        period,
        startDate: start,
        endDate: end,
        totalIncome,
        totalExpenses,
        netFlow: totalIncome - totalExpenses,
        transactionCount: periodTransactions.length,
        categoryBreakdown,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

export function useLatestBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        // Get most recent transaction with balance
        const [latest] = await db
          .select({ balance: transactions.balanceAfter })
          .from(transactions)
          .where(sql`${transactions.balanceAfter} IS NOT NULL`)
          .orderBy(desc(transactions.transactionDate))
          .limit(1);

        setBalance(latest?.balance ?? null);
      } catch (err) {
        console.error('Failed to fetch balance:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetch();
  }, []);

  return { balance, isLoading };
}
