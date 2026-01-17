import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { desc, eq } from 'drizzle-orm';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { db, merchantMappings, categories } from '@/db';

interface MerchantMapping {
  id: number;
  merchantPattern: string;
  matchType: string;
  categoryId: number | null;
  timesMatched: number;
  isActive: boolean;
  categoryName?: string;
  categoryColor?: string;
}

export default function MerchantMappingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [mappings, setMappings] = useState<MerchantMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMappings = async () => {
    try {
      const result = await db
        .select({
          id: merchantMappings.id,
          merchantPattern: merchantMappings.merchantPattern,
          matchType: merchantMappings.matchType,
          categoryId: merchantMappings.categoryId,
          timesMatched: merchantMappings.timesMatched,
          isActive: merchantMappings.isActive,
          categoryName: categories.name,
          categoryColor: categories.color,
        })
        .from(merchantMappings)
        .leftJoin(categories, eq(merchantMappings.categoryId, categories.id))
        .orderBy(desc(merchantMappings.timesMatched));

      setMappings(result);
    } catch (err) {
      console.error('Failed to load mappings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMappings();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMappings();
    setRefreshing(false);
  };

  const handleDeleteMapping = (mapping: MerchantMapping) => {
    Alert.alert(
      'Delete Mapping',
      `Delete the mapping for "${mapping.merchantPattern}"? Future transactions from this merchant will need to be classified again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db
                .delete(merchantMappings)
                .where(eq(merchantMappings.id, mapping.id));
              await loadMappings();
            } catch (err) {
              console.error('Failed to delete mapping:', err);
              Alert.alert('Error', 'Failed to delete mapping');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (mapping: MerchantMapping) => {
    try {
      await db
        .update(merchantMappings)
        .set({ isActive: !mapping.isActive })
        .where(eq(merchantMappings.id, mapping.id));
      await loadMappings();
    } catch (err) {
      console.error('Failed to toggle mapping:', err);
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Merchant Mappings' }} />
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Merchant Mappings' }} />
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
          {/* Info Card */}
          <Card
            variant="outlined"
            style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              PesaLog learns which categories to use based on merchant names.
              These mappings are created automatically when you classify transactions.
            </Text>
          </Card>

          {/* Mappings List */}
          {mappings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No mappings yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Classify some transactions and PesaLog will learn your preferences
              </Text>
            </View>
          ) : (
            <Card variant="outlined" style={styles.mappingsList}>
              {mappings.map((mapping, idx) => (
                <View key={mapping.id}>
                  <View
                    style={[
                      styles.mappingCard,
                      !mapping.isActive && styles.mappingDisabled,
                    ]}
                  >
                    <View style={styles.mappingLeft}>
                      <View
                        style={[
                          styles.categoryDot,
                          {
                            backgroundColor: mapping.categoryColor || colors.border,
                          },
                        ]}
                      />
                      <View style={styles.mappingInfo}>
                        <Text
                          style={[
                            styles.merchantName,
                            { color: mapping.isActive ? colors.text : colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {mapping.merchantPattern}
                        </Text>
                        <Text style={[styles.categoryName, { color: colors.textSecondary }]}>
                          {mapping.categoryName || 'Unknown'} • {mapping.timesMatched} matches
                        </Text>
                      </View>
                    </View>
                    <View style={styles.mappingActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleToggleActive(mapping)}
                      >
                        <Ionicons
                          name={mapping.isActive ? 'pause-circle' : 'play-circle'}
                          size={24}
                          color={mapping.isActive ? colors.warning : colors.success}
                        />
                      </Pressable>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleDeleteMapping(mapping)}
                      >
                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                  {idx < mappings.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </Card>
          )}

          {/* Stats */}
          {mappings.length > 0 && (
            <View style={styles.stats}>
              <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                {mappings.length} merchant{mappings.length !== 1 ? 's' : ''} learned •{' '}
                {mappings.reduce((sum, m) => sum + m.timesMatched, 0)} auto-classifications
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  mappingsList: {
    padding: 0,
    overflow: 'hidden',
  },
  mappingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mappingDisabled: {
    opacity: 0.5,
  },
  mappingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  mappingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '500',
  },
  categoryName: {
    fontSize: 13,
    marginTop: 2,
  },
  mappingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 40,
  },
  stats: {
    marginTop: 16,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 13,
  },
});
