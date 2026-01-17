import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { BalanceCard } from '@/components/dashboard/balance-card';
import { SpendingSummary } from '@/components/dashboard/spending-summary';
import { DebtWidget } from '@/components/dashboard/debt-widget';
import { TransactionCard } from '@/components/transaction/transaction-card';
import {
  useRecentTransactions,
  usePeriodStats,
  useLatestBalance,
} from '@/hooks/use-transactions';
import { useDebtSummary } from '@/hooks/use-debts';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const { balance } = useLatestBalance();
  const { stats, refetch: refetchStats } = usePeriodStats('month');
  const { summary: debtSummary, refetch: refetchDebt } = useDebtSummary();
  const { data: transactions, isLoading: txnLoading, refetch: refetchTxn } = useRecentTransactions(5);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchDebt(), refetchTxn()]);
    setRefreshing(false);
  }, [refetchStats, refetchDebt, refetchTxn]);

  const weeklyChange = stats ? stats.netFlow : undefined;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>PesaLog</Text>
          <Pressable
            onPress={() => router.push('/settings' as never)}
            hitSlop={8}
          >
            <Text style={[styles.settingsIcon, { color: colors.icon }]}>
              {'\u2699\uFE0F'}
            </Text>
          </Pressable>
        </View>

        {/* Balance Card */}
        <BalanceCard
          balance={balance || 0}
          change={weeklyChange}
          changeLabel="this month"
        />

        {/* Spending Summary */}
        <SpendingSummary
          income={stats?.totalIncome || 0}
          expenses={stats?.totalExpenses || 0}
          period="this month"
        />

        {/* Debt Widget */}
        {debtSummary && (
          <DebtWidget
            summary={debtSummary}
            onPress={() => router.push('/debts' as never)}
          />
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Transactions
            </Text>
            <Pressable onPress={() => router.push('/transactions' as never)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                See All
              </Text>
            </Pressable>
          </View>

          {txnLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Loading...
            </Text>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No transactions yet
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.textSecondary }]}
              >
                Financial SMS messages will appear here
              </Text>
            </View>
          ) : (
            transactions.map((txn) => (
              <TransactionCard
                key={txn.id}
                transaction={txn}
                categoryName={txn.category?.name}
                categoryColor={txn.category?.color}
                onPress={() =>
                  router.push(`/transaction/${txn.id}` as never)
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  settingsIcon: {
    fontSize: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});
