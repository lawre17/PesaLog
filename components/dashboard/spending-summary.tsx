import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currency';

interface SpendingSummaryProps {
  income: number;
  expenses: number;
  period?: string;
}

export function SpendingSummary({
  income,
  expenses,
  period = 'this month',
}: SpendingSummaryProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.row}>
        <View style={styles.column}>
          <View style={styles.header}>
            <View style={[styles.dot, { backgroundColor: colors.income }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Income
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.income }]}>
            +{formatCurrency(income, 'KES', { compact: true })}
          </Text>
          <Text style={[styles.period, { color: colors.textSecondary }]}>
            {period}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.column}>
          <View style={styles.header}>
            <View style={[styles.dot, { backgroundColor: colors.expense }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Expenses
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.expense }]}>
            -{formatCurrency(expenses, 'KES', { compact: true })}
          </Text>
          <Text style={[styles.period, { color: colors.textSecondary }]}>
            {period}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 4,
  },
  period: {
    fontSize: 12,
  },
  divider: {
    width: 1,
    marginHorizontal: 16,
  },
});
