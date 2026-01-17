/**
 * Auto Classifier Service
 * Automatically classifies transactions based on learned patterns
 */

import { eq } from 'drizzle-orm';
import { db, transactions, categories } from '@/db';
import { categoryLearning } from './category-learning.service';
import type { Transaction, ClassificationPrompt } from '@/types';

export interface ClassificationDecision {
  transactionId: number;
  shouldAutoClassify: boolean;
  categoryId?: number;
  categoryName?: string;
  confidence?: number;
  needsUserInput: boolean;
  isPerson: boolean;
  prompt?: ClassificationPrompt;
}

export class AutoClassifierService {
  private confidenceThreshold = 0.7;

  /**
   * Attempt to auto-classify a transaction
   */
  async classifyTransaction(
    transactionId: number
  ): Promise<ClassificationDecision> {
    // Get the transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Check if it's a person-to-person transfer (has phone number)
    const isPerson = !!transaction.counterpartyPhone;

    // For person-to-person transfers, always prompt the user
    if (isPerson) {
      return {
        transactionId,
        shouldAutoClassify: false,
        needsUserInput: true,
        isPerson: true,
        prompt: this.createPrompt(transaction),
      };
    }

    // Try to find a matching category
    const counterparty = transaction.counterparty || '';
    const match = await categoryLearning.findCategoryForMerchant(counterparty);

    if (match && match.confidence >= this.confidenceThreshold) {
      // Auto-classify with confidence
      await db
        .update(transactions)
        .set({
          categoryId: match.categoryId,
          isAutoClassified: true,
          confidence: match.confidence,
          status: 'classified',
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, transactionId));

      // Update mapping usage stats
      if (match.mappingId) {
        await categoryLearning.updateMappingUsage(match.mappingId);
      }

      // Get category name
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, match.categoryId));

      return {
        transactionId,
        shouldAutoClassify: true,
        categoryId: match.categoryId,
        categoryName: category?.name,
        confidence: match.confidence,
        needsUserInput: false,
        isPerson: false,
      };
    }

    // No confident match found - needs user input
    return {
      transactionId,
      shouldAutoClassify: false,
      needsUserInput: true,
      isPerson: false,
      prompt: this.createPrompt(transaction),
    };
  }

  /**
   * Create a classification prompt for user input
   */
  private createPrompt(transaction: Transaction): ClassificationPrompt {
    return {
      transactionId: transaction.id,
      amount: transaction.amount,
      counterparty: transaction.counterparty || 'Unknown',
      counterpartyPhone: transaction.counterpartyPhone || undefined,
      isPerson: !!transaction.counterpartyPhone,
    };
  }

  /**
   * User classifies a transaction
   */
  async userClassify(
    transactionId: number,
    categoryId: number,
    isLending: boolean = false
  ): Promise<void> {
    // Get the transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Learn from this classification
    const merchantName = transaction.counterparty || '';
    await categoryLearning.learnFromClassification(
      transactionId,
      categoryId,
      merchantName
    );

    // If this is a lending transaction, we'll handle debt creation separately
    // The debt service will be called by the UI after classification
  }

  /**
   * Get transactions pending classification
   */
  async getPendingClassifications(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.status, 'pending_classification'));
  }

  /**
   * Get recent auto-classified transactions for review
   */
  async getRecentAutoClassified(limit: number = 10): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.isAutoClassified, true))
      .orderBy(transactions.createdAt)
      .limit(limit);
  }

  /**
   * User corrects an auto-classification
   */
  async correctClassification(
    transactionId: number,
    correctCategoryId: number
  ): Promise<void> {
    // Get the transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Learn the correct classification
    const merchantName = transaction.counterparty || '';
    await categoryLearning.learnFromClassification(
      transactionId,
      correctCategoryId,
      merchantName
    );

    // Update transaction to mark as user-classified
    await db
      .update(transactions)
      .set({
        isAutoClassified: false,
        confidence: null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));
  }

  /**
   * Set the confidence threshold for auto-classification
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }
}

// Singleton instance
export const autoClassifier = new AutoClassifierService();
