import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { formatCurrency, getAmountSign } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import type { Transaction, TransactionType } from '@/types';

interface TransactionCardProps {
  transaction: Transaction;
  categoryName?: string;
  categoryColor?: string;
  onPress?: () => void;
}

export function TransactionCard({
  transaction,
  categoryName,
  categoryColor,
  onPress,
}: TransactionCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const sign = getAmountSign(transaction.type as TransactionType);
  const amountColor = getAmountColor(transaction.type as TransactionType, colors);

  const isPending = transaction.status === 'pending_classification';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.leftSection}>
        <View
          style={[
            styles.categoryIndicator,
            { backgroundColor: categoryColor || colors.textSecondary },
          ]}
        />
        <View style={styles.details}>
          <Text
            style={[styles.counterparty, { color: colors.text }]}
            numberOfLines={1}
          >
            {transaction.counterparty || 'Unknown'}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {categoryName || (isPending ? 'Tap to classify' : 'Uncategorized')}
            {' · '}
            {formatDate(transaction.transactionDate, 'relative')}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {sign}
          {formatCurrency(transaction.amount, transaction.currency || 'KES')}
        </Text>
        {transaction.fee != null && transaction.fee > 0 && (
          <Text style={[styles.fee, { color: colors.textSecondary }]}>
            Fee: {formatCurrency(transaction.fee)}
          </Text>
        )}
        {isPending && (
          <View style={[styles.pendingBadge, { backgroundColor: colors.pending }]}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function getAmountColor(
  type: TransactionType,
  colors: typeof Colors.light
): string {
  switch (type) {
    case 'income':
      return colors.income;
    case 'expense':
      return colors.expense;
    case 'debt':
      return colors.debt;
    case 'debt_repayment':
      return colors.expense;
    case 'transfer':
      return colors.transfer;
    default:
      return colors.text;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  counterparty: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  fee: {
    fontSize: 11,
    marginTop: 2,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  pendingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});
