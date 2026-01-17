/**
 * Category Learning Service
 * Learns from user classifications to auto-categorize future transactions
 */

import { eq, and, desc } from 'drizzle-orm';
import { db, merchantMappings, transactions, categories } from '@/db';
import type { ClassificationResult } from '@/types';

export class CategoryLearningService {
  /**
   * Learn a new category mapping from user classification
   */
  async learnFromClassification(
    transactionId: number,
    categoryId: number,
    merchantName: string
  ): Promise<void> {
    // Normalize the merchant name for matching
    const normalizedPattern = this.normalizeForMatching(merchantName);

    if (!normalizedPattern) {
      return; // Skip empty patterns
    }

    // Check if mapping already exists
    const existing = await db
      .select()
      .from(merchantMappings)
      .where(eq(merchantMappings.merchantPattern, normalizedPattern))
      .limit(1);

    if (existing.length > 0) {
      // Update existing mapping
      await db
        .update(merchantMappings)
        .set({
          categoryId,
          timesMatched: existing[0].timesMatched + 1,
          lastMatchedAt: new Date(),
        })
        .where(eq(merchantMappings.id, existing[0].id));
    } else {
      // Create new mapping
      await db.insert(merchantMappings).values({
        merchantPattern: normalizedPattern,
        matchType: 'contains',
        categoryId,
        learnedFromTransactionId: transactionId,
        isUserCreated: true,
      });
    }

    // Update the transaction
    await db
      .update(transactions)
      .set({
        categoryId,
        status: 'classified',
        isAutoClassified: false,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));
  }

  /**
   * Find matching category for a merchant name
   */
  async findCategoryForMerchant(
    merchantName: string
  ): Promise<ClassificationResult | null> {
    const normalized = this.normalizeForMatching(merchantName);

    if (!normalized) {
      return null;
    }

    // Try exact match first (highest confidence)
    const exactMatch = await db
      .select()
      .from(merchantMappings)
      .where(
        and(
          eq(merchantMappings.matchType, 'exact'),
          eq(merchantMappings.merchantPattern, normalized),
          eq(merchantMappings.isActive, true)
        )
      )
      .limit(1);

    if (exactMatch.length > 0) {
      return {
        categoryId: exactMatch[0].categoryId,
        confidence: 1.0,
        mappingId: exactMatch[0].id,
        isAutoClassified: true,
      };
    }

    // Try contains match - find all active mappings
    const allMappings = await db
      .select()
      .from(merchantMappings)
      .where(
        and(
          eq(merchantMappings.matchType, 'contains'),
          eq(merchantMappings.isActive, true)
        )
      )
      .orderBy(desc(merchantMappings.timesMatched)); // Prioritize frequently matched

    for (const mapping of allMappings) {
      if (normalized.includes(mapping.merchantPattern)) {
        // Calculate confidence based on match quality
        const confidence = Math.min(
          (mapping.merchantPattern.length / normalized.length) * 1.2,
          0.95
        );

        return {
          categoryId: mapping.categoryId,
          confidence,
          mappingId: mapping.id,
          isAutoClassified: true,
        };
      }
    }

    return null;
  }

  /**
   * Get all merchant mappings for a category
   */
  async getMappingsForCategory(categoryId: number) {
    return await db
      .select()
      .from(merchantMappings)
      .where(eq(merchantMappings.categoryId, categoryId))
      .orderBy(desc(merchantMappings.timesMatched));
  }

  /**
   * Update merchant mapping usage stats
   */
  async updateMappingUsage(mappingId: number): Promise<void> {
    const [mapping] = await db
      .select()
      .from(merchantMappings)
      .where(eq(merchantMappings.id, mappingId));

    if (mapping) {
      await db
        .update(merchantMappings)
        .set({
          timesMatched: mapping.timesMatched + 1,
          lastMatchedAt: new Date(),
        })
        .where(eq(merchantMappings.id, mappingId));
    }
  }

  /**
   * Deactivate a merchant mapping
   */
  async deactivateMapping(mappingId: number): Promise<void> {
    await db
      .update(merchantMappings)
      .set({ isActive: false })
      .where(eq(merchantMappings.id, mappingId));
  }

  /**
   * Normalize text for pattern matching
   */
  normalizeForMatching(text: string): string {
    return text
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get suggested categories based on partial merchant name
   */
  async getSuggestedCategories(
    partialName: string,
    limit: number = 3
  ): Promise<Array<{ categoryId: number; categoryName: string; confidence: number }>> {
    const normalized = this.normalizeForMatching(partialName);

    if (!normalized || normalized.length < 2) {
      return [];
    }

    // Find mappings that match
    const mappings = await db
      .select({
        categoryId: merchantMappings.categoryId,
        pattern: merchantMappings.merchantPattern,
        timesMatched: merchantMappings.timesMatched,
      })
      .from(merchantMappings)
      .where(eq(merchantMappings.isActive, true))
      .orderBy(desc(merchantMappings.timesMatched));

    const suggestions: Map<
      number,
      { categoryId: number; confidence: number }
    > = new Map();

    for (const mapping of mappings) {
      if (
        normalized.includes(mapping.pattern) ||
        mapping.pattern.includes(normalized)
      ) {
        const existing = suggestions.get(mapping.categoryId);
        const confidence = Math.min(
          (mapping.pattern.length / Math.max(normalized.length, 1)) * 0.8,
          0.9
        );

        if (!existing || existing.confidence < confidence) {
          suggestions.set(mapping.categoryId, {
            categoryId: mapping.categoryId,
            confidence,
          });
        }
      }
    }

    // Get category names
    const categoryIds = Array.from(suggestions.keys()).slice(0, limit);
    const categoryRecords = await db
      .select()
      .from(categories);

    return categoryIds.map((id) => {
      const cat = categoryRecords.find((c) => c.id === id);
      const sugg = suggestions.get(id)!;
      return {
        categoryId: id,
        categoryName: cat?.name || 'Unknown',
        confidence: sugg.confidence,
      };
    });
  }
}

// Singleton instance
export const categoryLearning = new CategoryLearningService();
