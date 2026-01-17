import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { useDebts, useDebtSummary, useFulizaFees } from '@/hooks/use-debts';
import { formatCurrency } from '@/utils/currency';
import { formatDate, getDaysUntilDue, isOverdue } from '@/utils/date';
import type { Debt } from '@/types';

export default function DebtsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const { debts, isLoading, refetch } = useDebts();
  const { summary } = useDebtSummary();
  const { totalFees } = useFulizaFees();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const fulizaDebt = debts.find((d) => d.type === 'fuliza');
  const personalDebts = debts.filter(
    (d) => d.type === 'owed_by_person' || d.type === 'owed_to_person'
  );

  const DebtCard = ({ debt }: { debt: Debt }) => {
    const daysUntil = debt.dueDate ? getDaysUntilDue(debt.dueDate) : null;
    const overdue = debt.dueDate ? isOverdue(debt.dueDate) : false;

    let statusColor = colors.primary;
    let statusText = '';

    if (debt.status === 'paid') {
      statusColor = colors.success;
      statusText = 'Paid';
    } else if (overdue) {
      statusColor = colors.error;
      statusText = 'Overdue';
    } else if (daysUntil !== null && daysUntil <= 3) {
      statusColor = colors.warning;
      statusText = `Due in ${daysUntil} days`;
    }

    return (
      <Pressable
        onPress={() => router.push(`/debts/${debt.id}` as never)}
      >
        <Card variant="outlined" style={styles.debtCard}>
          <View style={styles.debtHeader}>
            <View>
              <Text style={[styles.debtTitle, { color: colors.text }]}>
                {debt.type === 'fuliza'
                  ? 'Fuliza M-Pesa'
                  : debt.counterparty || 'Unknown'}
              </Text>
              <Text style={[styles.debtType, { color: colors.textSecondary }]}>
                {debt.type === 'owed_by_person'
                  ? 'Owes you'
                  : debt.type === 'owed_to_person'
                  ? 'You owe'
                  : 'Overdraft'}
              </Text>
            </View>
            <View style={styles.debtAmountContainer}>
              <Text style={[styles.debtAmount, { color: colors.debt }]}>
                {formatCurrency(debt.totalOutstanding)}
              </Text>
              {statusText && (
                <View
                  style={[styles.statusBadge, { backgroundColor: statusColor }]}
                >
                  <Text style={styles.statusText}>{statusText}</Text>
                </View>
              )}
            </View>
          </View>
          {debt.dueDate && (
            <Text style={[styles.dueDate, { color: colors.textSecondary }]}>
              Due: {formatDate(debt.dueDate, 'medium')}
            </Text>
          )}
        </Card>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Debts' }} />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Summary Card */}
          {summary && (
            <Card
              variant="elevated"
              style={[styles.summaryCard, { backgroundColor: colors.debt }]}
            >
              <Text style={styles.summaryTitle}>Total Outstanding</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(
                  summary.fuliza.outstanding +
                    summary.owedToOthers.total
                )}
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>Owed to you</Text>
                  <Text style={styles.summaryItemValue}>
                    {formatCurrency(summary.owedByOthers.total)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>You owe</Text>
                  <Text style={styles.summaryItemValue}>
                    {formatCurrency(
                      summary.fuliza.outstanding + summary.owedToOthers.total
                    )}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Fuliza Section */}
          {fulizaDebt && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Fuliza
              </Text>
              <DebtCard debt={fulizaDebt} />
              {totalFees > 0 && (
                <Text style={[styles.feesNote, { color: colors.textSecondary }]}>
                  Total fees paid: {formatCurrency(totalFees)}
                </Text>
              )}
            </>
          )}

          {/* Personal Debts Section */}
          {personalDebts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Personal Debts
              </Text>
              {personalDebts.map((debt) => (
                <DebtCard key={debt.id} debt={debt} />
              ))}
            </>
          )}

          {/* Empty State */}
          {debts.length === 0 && !isLoading && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No active debts
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Fuliza overdrafts and money you lend will appear here
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
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
  summaryCard: {
    marginBottom: 24,
  },
  summaryTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  summaryAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  summaryItemValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  debtCard: {
    marginBottom: 12,
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  debtTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  debtType: {
    fontSize: 13,
    marginTop: 2,
  },
  debtAmountContainer: {
    alignItems: 'flex-end',
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  dueDate: {
    fontSize: 13,
    marginTop: 8,
  },
  feesNote: {
    fontSize: 13,
    marginTop: -4,
    marginBottom: 16,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
