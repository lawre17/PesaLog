import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { useCategories, useCategoriesGrouped } from '@/hooks/use-categories';
import type { Category } from '@/types';

export default function CategoriesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const { refetch } = useCategories();
  const { grouped } = useCategoriesGrouped();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAddCategory = () => {
    router.push('/categories/add' as never);
  };

  const handleEditCategory = (category: Category) => {
    if (category.isSystem) {
      Alert.alert(
        'System Category',
        'System categories cannot be edited. You can create custom categories instead.'
      );
      return;
    }
    router.push(`/categories/edit/${category.id}` as never);
  };

  const CategoryCard = ({ category }: { category: Category }) => (
    <Pressable
      style={[styles.categoryCard, { backgroundColor: colors.card }]}
      onPress={() => handleEditCategory(category)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
        <Text style={styles.categoryIconText}>
          {category.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, { color: colors.text }]}>
          {category.name}
        </Text>
        {category.isSystem && (
          <Text style={[styles.systemBadge, { color: colors.textSecondary }]}>
            System
          </Text>
        )}
      </View>
      {!category.isSystem && (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Categories' }} />
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
          {/* Income Categories */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Income
          </Text>
          <Card variant="outlined" style={styles.section}>
            {grouped.income.map((cat, idx) => (
              <View key={cat.id}>
                <CategoryCard category={cat} />
                {idx < grouped.income.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </Card>

          {/* Expense Categories */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Expenses
          </Text>
          <Card variant="outlined" style={styles.section}>
            {grouped.expense.map((cat, idx) => (
              <View key={cat.id}>
                <CategoryCard category={cat} />
                {idx < grouped.expense.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </Card>

          {/* Transfer Categories */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Transfers
          </Text>
          <Card variant="outlined" style={styles.section}>
            {grouped.transfer.map((cat, idx) => (
              <View key={cat.id}>
                <CategoryCard category={cat} />
                {idx < grouped.transfer.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </Card>
        </ScrollView>

        {/* Add Category FAB */}
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleAddCategory}
        >
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
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
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    padding: 0,
    overflow: 'hidden',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  categoryName: {
    fontSize: 16,
  },
  systemBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
