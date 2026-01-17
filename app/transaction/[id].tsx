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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { eq } from 'drizzle-orm';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { useCategory } from '@/hooks/use-categories';
import { db, transactions, rawSms } from '@/db';
import { formatCurrency, getAmountSign } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import type { Transaction, RawSms, TransactionType } from '@/types';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [originalSms, setOriginalSms] = useState<RawSms | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { category } = useCategory(transaction?.categoryId ?? null);

  // Load transaction and SMS
  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        const [txn] = await db
          .select()
          .from(transactions)
          .where(eq(transactions.id, parseInt(id, 10)));

        setTransaction(txn);

        if (txn?.rawSmsId) {
          const [sms] = await db
            .select()
            .from(rawSms)
            .where(eq(rawSms.id, txn.rawSmsId));
          setOriginalSms(sms);
        }
      } catch (err) {
        console.error('Failed to load transaction:', err);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [id]);

  const handleClassify = () => {
    if (transaction) {
      router.push(`/transaction/classify/${transaction.id}` as never);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (transaction) {
              await db
                .delete(transactions)
                .where(eq(transactions.id, transaction.id));
              router.back();
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
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

  const sign = getAmountSign(transaction.type as TransactionType);
  const amountColor =
    transaction.type === 'income' ? colors.income : colors.expense;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Transaction',
          headerRight: () => (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Text style={{ color: colors.error, fontSize: 16 }}>Delete</Text>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Amount Card */}
          <Card variant="elevated" style={styles.amountCard}>
            <Text style={[styles.amount, { color: amountColor }]}>
              {sign}
              {formatCurrency(transaction.amount, transaction.currency || 'KES')}
            </Text>
            {transaction.fee && transaction.fee > 0 && (
              <Text style={[styles.fee, { color: colors.textSecondary }]}>
                Transaction fee: {formatCurrency(transaction.fee)}
              </Text>
            )}
          </Card>

          {/* Details Card */}
          <Card variant="outlined" style={styles.detailsCard}>
            <DetailRow
              label="To/From"
              value={transaction.counterparty || 'Unknown'}
              colors={colors}
            />
            {transaction.counterpartyPhone && (
              <DetailRow
                label="Phone"
                value={transaction.counterpartyPhone}
                colors={colors}
              />
            )}
            {transaction.counterpartyAccount && (
              <DetailRow
                label="Account"
                value={transaction.counterpartyAccount}
                colors={colors}
              />
            )}
            <DetailRow
              label="Date"
              value={formatDate(transaction.transactionDate, 'long')}
              colors={colors}
            />
            <DetailRow
              label="Reference"
              value={transaction.primaryRefCode}
              colors={colors}
            />
            <DetailRow
              label="Source"
              value={transaction.source.toUpperCase()}
              colors={colors}
            />
            <DetailRow
              label="Type"
              value={transaction.type.replace('_', ' ').toUpperCase()}
              colors={colors}
            />
            {transaction.balanceAfter !== null && (
              <DetailRow
                label="Balance After"
                value={formatCurrency(transaction.balanceAfter)}
                colors={colors}
              />
            )}
          </Card>

          {/* Category Card */}
          <Card variant="outlined" style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Category
              </Text>
              <Pressable onPress={handleClassify}>
                <Text style={[styles.changeButton, { color: colors.primary }]}>
                  {category ? 'Change' : 'Set Category'}
                </Text>
              </Pressable>
            </View>
            {category ? (
              <View style={styles.categoryInfo}>
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: category.color },
                  ]}
                />
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {category.name}
                </Text>
                {transaction.isAutoClassified && (
                  <View
                    style={[
                      styles.autoBadge,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    <Text style={[styles.autoBadgeText, { color: colors.textSecondary }]}>
                      Auto
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Pressable
                style={[
                  styles.classifyButton,
                  { backgroundColor: colors.pending },
                ]}
                onPress={handleClassify}
              >
                <Text style={styles.classifyButtonText}>Tap to classify</Text>
              </Pressable>
            )}
          </Card>

          {/* Original SMS Card */}
          {originalSms && (
            <Card variant="outlined" style={styles.smsCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Original Message
              </Text>
              <Text style={[styles.smsSender, { color: colors.textSecondary }]}>
                From: {originalSms.sender}
              </Text>
              <Text style={[styles.smsBody, { color: colors.text }]}>
                {originalSms.body}
              </Text>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
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
    paddingBottom: 32,
  },
  amountCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
  },
  fee: {
    fontSize: 14,
    marginTop: 4,
  },
  detailsCard: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  categoryCard: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  autoBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  autoBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  classifyButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  classifyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  smsCard: {
    marginBottom: 16,
  },
  smsSender: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
  },
  smsBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
