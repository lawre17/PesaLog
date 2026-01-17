import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { usePeriodStats } from '@/hooks/use-transactions';
import { useFulizaFees } from '@/hooks/use-debts';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';

type Period = 'day' | 'week' | 'month' | 'year';

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [period, setPeriod] = useState<Period>('month');
  const { stats } = usePeriodStats(period);
  const { totalFees: fulizaFees } = useFulizaFees();

  const PeriodButton = ({ p, label }: { p: Period; label: string }) => (
    <Pressable
      style={[
        styles.periodButton,
        {
          backgroundColor:
            period === p ? colors.primary : colors.backgroundSecondary,
        },
      ]}
      onPress={() => setPeriod(p)}
    >
      <Text
        style={[
          styles.periodButtonText,
          { color: period === p ? 'white' : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Insights</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodContainer}>
          <PeriodButton p="day" label="Today" />
          <PeriodButton p="week" label="Week" />
          <PeriodButton p="month" label="Month" />
          <PeriodButton p="year" label="Year" />
        </View>

        {/* Summary Card */}
        <Card variant="elevated" style={styles.summaryCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Summary
          </Text>
          {stats && (
            <Text style={[styles.dateRange, { color: colors.textSecondary }]}>
              {formatDate(stats.startDate, 'short')} -{' '}
              {formatDate(stats.endDate, 'short')}
            </Text>
          )}

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Income
              </Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>
                +{formatCurrency(stats?.totalIncome || 0, 'KES', { compact: true })}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Expenses
              </Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>
                -{formatCurrency(stats?.totalExpenses || 0, 'KES', { compact: true })}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Net
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      (stats?.netFlow || 0) >= 0 ? colors.income : colors.expense,
                  },
                ]}
              >
                {formatCurrency(stats?.netFlow || 0, 'KES', {
                  compact: true,
                  showSign: true,
                })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Category Breakdown */}
        <Card variant="outlined" style={styles.breakdownCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Spending by Category
          </Text>

          {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
            stats.categoryBreakdown.map((cat) => (
              <View key={cat.categoryId} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: cat.color },
                    ]}
                  />
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {cat.categoryName}
                  </Text>
                </View>
                <View style={styles.categoryValues}>
                  <Text
                    style={[styles.categoryAmount, { color: colors.text }]}
                  >
                    {formatCurrency(cat.amount, 'KES', { compact: true })}
                  </Text>
                  <Text
                    style={[
                      styles.categoryPercent,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {cat.percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No spending data for this period
            </Text>
          )}
        </Card>

        {/* Fuliza Fees */}
        {fulizaFees > 0 && (
          <Card variant="outlined" style={styles.feesCard}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Fuliza Fees (All Time)
            </Text>
            <Text style={[styles.feesAmount, { color: colors.debt }]}>
              {formatCurrency(fulizaFees)}
            </Text>
            <Text style={[styles.feesNote, { color: colors.textSecondary }]}>
              Total access fees paid on Fuliza overdrafts
            </Text>
          </Card>
        )}

        {/* Transactions Count */}
        <Card variant="outlined" style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats?.transactionCount || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Transactions
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 13,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  breakdownCard: {
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 15,
  },
  categoryValues: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '500',
  },
  categoryPercent: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  feesCard: {
    marginBottom: 12,
  },
  feesAmount: {
    fontSize: 28,
    fontWeight: '700',
    marginVertical: 8,
  },
  feesNote: {
    fontSize: 13,
  },
  statsCard: {
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
});
