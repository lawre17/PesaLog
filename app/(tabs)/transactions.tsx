import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { TransactionCard } from '@/components/transaction/transaction-card';
import { useTransactions } from '@/hooks/use-transactions';
import type { Transaction, Category } from '@/types';

type FilterType = 'all' | 'income' | 'expense' | 'pending';

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: transactions, isLoading, refetch } = useTransactions();

  const filteredTransactions = React.useMemo(() => {
    let filtered = transactions;

    // Apply type filter
    if (filter === 'income') {
      filtered = filtered.filter((t) => t.type === 'income');
    } else if (filter === 'expense') {
      filtered = filtered.filter(
        (t) => t.type === 'expense' || t.type === 'debt'
      );
    } else if (filter === 'pending') {
      filtered = filtered.filter(
        (t) => t.status === 'pending_classification'
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.counterparty?.toLowerCase().includes(query) ||
          t.primaryRefCode.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, filter, searchQuery]);

  const renderItem = ({
    item,
  }: {
    item: Transaction & { category?: Category };
  }) => (
    <TransactionCard
      transaction={item}
      categoryName={item.category?.name}
      categoryColor={item.category?.color}
      onPress={() => router.push(`/transaction/${item.id}` as never)}
    />
  );

  const FilterButton = ({
    type,
    label,
  }: {
    type: FilterType;
    label: string;
  }) => (
    <Pressable
      style={[
        styles.filterButton,
        {
          backgroundColor:
            filter === type ? colors.primary : colors.backgroundSecondary,
        },
      ]}
      onPress={() => setFilter(type)}
    >
      <Text
        style={[
          styles.filterButtonText,
          { color: filter === type ? 'white' : colors.text },
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
            },
          ]}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FilterButton type="all" label="All" />
        <FilterButton type="income" label="Income" />
        <FilterButton type="expense" label="Expenses" />
        <FilterButton type="pending" label="Pending" />
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {isLoading ? 'Loading...' : 'No transactions found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
  },
});
