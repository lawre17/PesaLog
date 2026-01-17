/**
 * Categories Hook
 * Query and manage categories
 */

import { useState, useEffect, useCallback } from 'react';
import { eq } from 'drizzle-orm';
import { db, categories } from '@/db';
import type { Category } from '@/types';

export function useCategories() {
  const [data, setData] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await db.select().from(categories);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories: data, isLoading, error, refetch: fetchCategories };
}

export function useCategory(categoryId: number | null) {
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!categoryId) {
        setCategory(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [result] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, categoryId));
        setCategory(result || null);
      } catch (err) {
        console.error('Failed to fetch category:', err);
        setCategory(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetch();
  }, [categoryId]);

  return { category, isLoading };
}

// Group categories by type
export function useCategoriesGrouped() {
  const { categories: allCategories, isLoading, error, refetch } = useCategories();

  const grouped = {
    income: allCategories.filter((c) =>
      ['Salary', 'Business Income', 'Freelance', 'Gifts Received', 'Refund'].includes(
        c.name
      )
    ),
    expense: allCategories.filter(
      (c) =>
        ![
          'Salary',
          'Business Income',
          'Freelance',
          'Gifts Received',
          'Refund',
          'Personal Transfer',
          'Family Support',
          'Lending',
          'Loan Repayment',
          'Fuliza',
        ].includes(c.name)
    ),
    transfer: allCategories.filter((c) =>
      ['Personal Transfer', 'Family Support', 'Lending'].includes(c.name)
    ),
    debt: allCategories.filter((c) =>
      ['Loan Repayment', 'Fuliza'].includes(c.name)
    ),
  };

  return { grouped, allCategories, isLoading, error, refetch };
}
