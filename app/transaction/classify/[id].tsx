import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { eq } from 'drizzle-orm';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { useCategoriesGrouped } from '@/hooks/use-categories';
import { db, transactions } from '@/db';
import { autoClassifier } from '@/services/auto-classifier.service';
import { debtService } from '@/services/debt.service';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import type { Transaction, Category } from '@/types';

export default function ClassifyTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isLending, setIsLending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { grouped, isLoading: categoriesLoading } = useCategoriesGrouped();

  // Detect if this is a person-to-person transfer
  const isPerson = transaction?.counterpartyPhone != null;

  // Load transaction
  useEffect(() => {
    async function loadTransaction() {
      if (!id) return;

      try {
        const [txn] = await db
          .select()
          .from(transactions)
          .where(eq(transactions.id, parseInt(id, 10)));

        setTransaction(txn);
      } catch (err) {
        console.error('Failed to load transaction:', err);
        Alert.alert('Error', 'Failed to load transaction');
      } finally {
        setIsLoading(false);
      }
    }

    loadTransaction();
  }, [id]);

  // Handle category selection
  const handleSelectCategory = (categoryId: number) => {
    setSelectedCategory(categoryId);
    // Reset lending state if not selecting a transfer category
    const category = [...grouped.expense, ...grouped.transfer, ...grouped.income].find(
      (c) => c.id === categoryId
    );
    if (category?.name !== 'Lending') {
      setIsLending(false);
    }
  };

  // Handle marking as lending
  const handleMarkAsLending = () => {
    const lendingCategory = grouped.transfer.find((c) => c.name === 'Lending');
    if (lendingCategory) {
      setSelectedCategory(lendingCategory.id);
      setIsLending(true);
    }
  };

  // Save classification
  const handleSave = async () => {
    if (!transaction || !selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setIsSaving(true);

    try {
      // Classify the transaction
      await autoClassifier.userClassify(transaction.id, selectedCategory, isLending);

      // If marked as lending, create a debt entry
      if (isLending && transaction.counterparty) {
        await debtService.createPersonalDebt(
          'owed_by_person', // They owe us
          transaction.id,
          transaction.amount,
          transaction.counterparty,
          transaction.counterpartyPhone || undefined,
          `Money lent on ${formatDate(transaction.transactionDate, 'medium')}`
        );
      }

      // Go back
      router.back();
    } catch (err) {
      console.error('Failed to classify:', err);
      Alert.alert('Error', 'Failed to save classification');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || categoriesLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Transaction not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const CategoryButton = ({ category }: { category: Category }) => {
    const isSelected = selectedCategory === category.id;

    return (
      <Pressable
        style={[
          styles.categoryButton,
          {
            backgroundColor: isSelected ? category.color : colors.backgroundSecondary,
            borderColor: isSelected ? category.color : colors.border,
          },
        ]}
        onPress={() => handleSelectCategory(category.id)}
      >
        <Text
          style={[
            styles.categoryButtonText,
            { color: isSelected ? 'white' : colors.text },
          ]}
        >
          {category.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Transaction Summary */}
        <Card variant="elevated" style={styles.summaryCard}>
          <Text style={[styles.amount, { color: colors.expense }]}>
            {formatCurrency(transaction.amount, transaction.currency || 'KES')}
          </Text>
          <Text style={[styles.counterparty, { color: colors.text }]}>
            {transaction.counterparty || 'Unknown'}
          </Text>
          {transaction.counterpartyPhone && (
            <Text style={[styles.phone, { color: colors.textSecondary }]}>
              {transaction.counterpartyPhone}
            </Text>
          )}
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDate(transaction.transactionDate, 'long')}
          </Text>
        </Card>

        {/* Person-to-Person Lending Option */}
        {isPerson && (
          <Card
            variant="outlined"
            style={[
              styles.lendingCard,
              isLending && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            <Text style={[styles.lendingTitle, { color: colors.text }]}>
              Is this money you lent?
            </Text>
            <Text style={[styles.lendingSubtitle, { color: colors.textSecondary }]}>
              Track this as a debt owed to you
            </Text>
            <View style={styles.lendingButtons}>
              <Pressable
                style={[
                  styles.lendingButton,
                  {
                    backgroundColor: isLending
                      ? colors.primary
                      : colors.backgroundSecondary,
                  },
                ]}
                onPress={handleMarkAsLending}
              >
                <Text
                  style={[
                    styles.lendingButtonText,
                    { color: isLending ? 'white' : colors.text },
                  ]}
                >
                  Yes, it&apos;s a loan
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.lendingButton,
                  {
                    backgroundColor: !isLending
                      ? colors.backgroundSecondary
                      : 'transparent',
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setIsLending(false)}
              >
                <Text style={[styles.lendingButtonText, { color: colors.text }]}>
                  No, regular expense
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Category Selection */}
        {!isLending && (
          <>
            {transaction.type === 'income' && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Income Categories
                </Text>
                <View style={styles.categoryGrid}>
                  {grouped.income.map((cat) => (
                    <CategoryButton key={cat.id} category={cat} />
                  ))}
                </View>
              </>
            )}

            {(transaction.type === 'expense' || transaction.type === 'transfer') && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Expense Categories
                </Text>
                <View style={styles.categoryGrid}>
                  {grouped.expense.map((cat) => (
                    <CategoryButton key={cat.id} category={cat} />
                  ))}
                </View>

                {isPerson && (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Transfers
                    </Text>
                    <View style={styles.categoryGrid}>
                      {grouped.transfer.map((cat) => (
                        <CategoryButton key={cat.id} category={cat} />
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Pressable
          style={[
            styles.saveButton,
            {
              backgroundColor:
                selectedCategory || isLending ? colors.primary : colors.border,
            },
          ]}
          onPress={handleSave}
          disabled={(!selectedCategory && !isLending) || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isLending ? 'Save as Loan' : 'Save Category'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
  },
  counterparty: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  phone: {
    fontSize: 14,
    marginTop: 2,
  },
  date: {
    fontSize: 14,
    marginTop: 8,
  },
  lendingCard: {
    marginBottom: 16,
  },
  lendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lendingSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  lendingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  lendingButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  lendingButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
