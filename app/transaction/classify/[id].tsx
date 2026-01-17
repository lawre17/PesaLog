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
import { Ionicons } from '@expo/vector-icons';
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

type DebtType = 'none' | 'lending' | 'borrowing';

export default function ClassifyTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [debtType, setDebtType] = useState<DebtType>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { grouped, isLoading: categoriesLoading } = useCategoriesGrouped();

  // Detect if this is a person-to-person transfer
  const isPerson = transaction?.counterpartyPhone != null;
  const isIncome = transaction?.type === 'income';
  const isExpense = transaction?.type === 'expense' || transaction?.type === 'transfer';

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
    // Reset debt type when selecting a regular category
    setDebtType('none');
  };

  // Handle marking as lending (money you gave to someone)
  const handleMarkAsLending = () => {
    const lendingCategory = grouped.transfer.find((c) => c.name === 'Lending');
    if (lendingCategory) {
      setSelectedCategory(lendingCategory.id);
      setDebtType('lending');
    }
  };

  // Handle marking as borrowing (money you received from someone as a loan)
  const handleMarkAsBorrowing = () => {
    const borrowingCategory = grouped.transfer.find((c) => c.name === 'Borrowing');
    if (borrowingCategory) {
      setSelectedCategory(borrowingCategory.id);
      setDebtType('borrowing');
    } else {
      // Fallback if no Borrowing category exists
      setDebtType('borrowing');
    }
  };

  // Save classification
  const handleSave = async () => {
    if (!transaction || (!selectedCategory && debtType === 'none')) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setIsSaving(true);

    try {
      // Classify the transaction
      const isDebtRelated = debtType !== 'none';
      await autoClassifier.userClassify(
        transaction.id,
        selectedCategory || 0,
        isDebtRelated
      );

      // If marked as lending (money you gave), create a debt entry - they owe you
      if (debtType === 'lending' && transaction.counterparty) {
        await debtService.createPersonalDebt(
          'owed_by_person', // They owe us
          transaction.id,
          transaction.amount,
          transaction.counterparty,
          transaction.counterpartyPhone || undefined,
          `Money lent on ${formatDate(transaction.transactionDate, 'medium')}`
        );
      }

      // If marked as borrowing (money you received), create a debt entry - you owe them
      if (debtType === 'borrowing' && transaction.counterparty) {
        await debtService.createPersonalDebt(
          'owed_to_person', // You owe them
          transaction.id,
          transaction.amount,
          transaction.counterparty,
          transaction.counterpartyPhone || undefined,
          `Money borrowed on ${formatDate(transaction.transactionDate, 'medium')}`
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
          <View style={styles.amountRow}>
            <Ionicons
              name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={28}
              color={isIncome ? colors.income : colors.expense}
            />
            <Text
              style={[
                styles.amount,
                { color: isIncome ? colors.income : colors.expense },
              ]}
            >
              {formatCurrency(transaction.amount, transaction.currency || 'KES')}
            </Text>
          </View>
          <Text style={[styles.counterparty, { color: colors.text }]}>
            {isIncome ? 'From: ' : 'To: '}
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

        {/* Person-to-Person Lending Option (for outgoing money) */}
        {isPerson && isExpense && (
          <Card
            variant="outlined"
            style={[
              styles.debtCard,
              debtType === 'lending' && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            <View style={styles.debtHeader}>
              <Ionicons name="arrow-redo" size={24} color={colors.primary} />
              <Text style={[styles.debtTitle, { color: colors.text }]}>
                Is this money you lent?
              </Text>
            </View>
            <Text style={[styles.debtSubtitle, { color: colors.textSecondary }]}>
              Track this as a debt owed to you by {transaction.counterparty}
            </Text>
            <View style={styles.debtButtons}>
              <Pressable
                style={[
                  styles.debtButton,
                  {
                    backgroundColor: debtType === 'lending'
                      ? colors.primary
                      : colors.backgroundSecondary,
                  },
                ]}
                onPress={handleMarkAsLending}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={debtType === 'lending' ? 'white' : colors.text}
                />
                <Text
                  style={[
                    styles.debtButtonText,
                    { color: debtType === 'lending' ? 'white' : colors.text },
                  ]}
                >
                  Yes, I lent this
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.debtButton,
                  {
                    backgroundColor: debtType !== 'lending'
                      ? colors.backgroundSecondary
                      : 'transparent',
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setDebtType('none')}
              >
                <Text style={[styles.debtButtonText, { color: colors.text }]}>
                  No, regular expense
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Person-to-Person Borrowing Option (for incoming money) */}
        {isPerson && isIncome && (
          <Card
            variant="outlined"
            style={[
              styles.debtCard,
              debtType === 'borrowing' && { borderColor: colors.debt, borderWidth: 2 },
            ]}
          >
            <View style={styles.debtHeader}>
              <Ionicons name="arrow-undo" size={24} color={colors.debt} />
              <Text style={[styles.debtTitle, { color: colors.text }]}>
                Is this money you borrowed?
              </Text>
            </View>
            <Text style={[styles.debtSubtitle, { color: colors.textSecondary }]}>
              Track this as money you owe to {transaction.counterparty}
            </Text>
            <View style={styles.debtButtons}>
              <Pressable
                style={[
                  styles.debtButton,
                  {
                    backgroundColor: debtType === 'borrowing'
                      ? colors.debt
                      : colors.backgroundSecondary,
                  },
                ]}
                onPress={handleMarkAsBorrowing}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={debtType === 'borrowing' ? 'white' : colors.text}
                />
                <Text
                  style={[
                    styles.debtButtonText,
                    { color: debtType === 'borrowing' ? 'white' : colors.text },
                  ]}
                >
                  Yes, I borrowed this
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.debtButton,
                  {
                    backgroundColor: debtType !== 'borrowing'
                      ? colors.backgroundSecondary
                      : 'transparent',
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setDebtType('none')}
              >
                <Text style={[styles.debtButtonText, { color: colors.text }]}>
                  No, regular income
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Category Selection - Always show for income, show for expense when not lending */}
        {isIncome && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {debtType === 'borrowing' ? 'Or categorize as income:' : 'Income Categories'}
            </Text>
            <View style={styles.categoryGrid}>
              {grouped.income.map((cat) => (
                <CategoryButton key={cat.id} category={cat} />
              ))}
            </View>
          </>
        )}

        {isExpense && debtType !== 'lending' && (
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
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Pressable
          style={[
            styles.saveButton,
            {
              backgroundColor:
                selectedCategory || debtType !== 'none'
                  ? debtType === 'borrowing'
                    ? colors.debt
                    : colors.primary
                  : colors.border,
            },
          ]}
          onPress={handleSave}
          disabled={(!selectedCategory && debtType === 'none') || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>
              {debtType === 'lending'
                ? 'Save as Money Lent'
                : debtType === 'borrowing'
                ? 'Save as Money Borrowed'
                : 'Save Category'}
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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  debtCard: {
    marginBottom: 16,
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  debtTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  debtSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  debtButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  debtButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  debtButtonText: {
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
