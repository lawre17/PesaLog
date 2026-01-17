/**
 * Debts Hook
 * Query and manage debts
 */

import { useState, useEffect, useCallback } from 'react';
import { debtService } from '@/services/debt.service';
import type { Debt, DebtSummary } from '@/types';

export function useDebts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDebts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await debtService.getActiveDebts();
      setDebts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  return { debts, isLoading, error, refetch: fetchDebts };
}

export function useDebtSummary() {
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await debtService.getDebtSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, isLoading, error, refetch: fetchSummary };
}

export function useDebtDetail(debtId: number) {
  const [data, setData] = useState<{
    debt: Debt;
    payments: Array<{
      id: number;
      amount: number;
      paymentDate: Date;
      notes: string | null;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await debtService.getDebtWithPayments(debtId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [debtId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, isLoading, error, refetch: fetchDetail };
}

export function useFulizaFees() {
  const [totalFees, setTotalFees] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const fees = await debtService.getTotalFulizaFees();
        setTotalFees(fees);
      } catch (err) {
        console.error('Failed to fetch Fuliza fees:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetch();
  }, []);

  return { totalFees, isLoading };
}
