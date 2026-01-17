import React from 'react';
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

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { useDebtDetail } from '@/hooks/use-debts';
import { debtService } from '@/services/debt.service';
import { formatCurrency } from '@/utils/currency';
import { formatDate, getDaysUntilDue, isOverdue } from '@/utils/date';

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const debtId = id ? parseInt(id, 10) : 0;
  const { data, isLoading, refetch } = useDebtDetail(debtId);

  const handleMarkAsPaid = () => {
    Alert.alert(
      'Mark as Paid',
      'Are you sure this debt has been fully repaid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            await debtService.markAsPaid(debtId);
            refetch();
          },
        },
      ]
    );
  };

  const handleWriteOff = () => {
    Alert.alert(
      'Write Off Debt',
      'Are you sure you want to write off this debt? This means you no longer expect to recover it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Write Off',
          style: 'destructive',
          onPress: async () => {
            await debtService.writeOff(debtId);
            router.back();
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

  if (!data) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Debt not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { debt, payments } = data;
  const overdue = debt.dueDate ? isOverdue(debt.dueDate) : false;
  const daysUntil = debt.dueDate ? getDaysUntilDue(debt.dueDate) : null;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const progress =
    debt.principalAmount > 0
      ? ((debt.principalAmount - debt.totalOutstanding) / debt.principalAmount) *
        100
      : 0;

  return (
    <>
      <Stack.Screen
        options={{
          title:
            debt.type === 'fuliza'
              ? 'Fuliza'
              : debt.counterparty || 'Debt Details',
        }}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Amount Card */}
          <Card
            variant="elevated"
            style={[
              styles.amountCard,
              {
                backgroundColor: overdue
                  ? colors.error
                  : debt.status === 'paid'
                  ? colors.success
                  : colors.debt,
              },
            ]}
          >
            <Text style={styles.amountLabel}>
              {debt.status === 'paid' ? 'Paid' : 'Outstanding'}
            </Text>
            <Text style={styles.amount}>
              {formatCurrency(debt.totalOutstanding)}
            </Text>
            {debt.dueDate && debt.status !== 'paid' && (
              <Text style={styles.dueText}>
                {overdue
                  ? 'Overdue!'
                  : daysUntil === 0
                  ? 'Due today'
                  : daysUntil === 1
                  ? 'Due tomorrow'
                  : `Due in ${daysUntil} days`}
              </Text>
            )}
          </Card>

          {/* Progress */}
          {debt.status !== 'paid' && (
            <Card variant="outlined" style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.text }]}>
                  Repayment Progress
                </Text>
                <Text
                  style={[styles.progressPercent, { color: colors.primary }]}
                >
                  {progress.toFixed(0)}%
                </Text>
              </View>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary, width: `${progress}%` },
                  ]}
                />
              </View>
              <View style={styles.progressFooter}>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  Paid: {formatCurrency(totalPaid)}
                </Text>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  Original: {formatCurrency(debt.principalAmount)}
                </Text>
              </View>
            </Card>
          )}

          {/* Details Card */}
          <Card variant="outlined" style={styles.detailsCard}>
            <DetailRow
              label="Type"
              value={
                debt.type === 'fuliza'
                  ? 'Fuliza Overdraft'
                  : debt.type === 'owed_by_person'
                  ? 'Money Lent'
                  : debt.type === 'owed_to_person'
                  ? 'Money Borrowed'
                  : 'Loan'
              }
              colors={colors}
            />
            {debt.counterparty && (
              <DetailRow
                label={debt.type === 'owed_by_person' ? 'Owes You' : 'You Owe'}
                value={debt.counterparty}
                colors={colors}
              />
            )}
            {debt.counterpartyPhone && (
              <DetailRow
                label="Phone"
                value={debt.counterpartyPhone}
                colors={colors}
              />
            )}
            <DetailRow
              label="Created"
              value={formatDate(debt.createdDate, 'medium')}
              colors={colors}
            />
            {debt.dueDate && (
              <DetailRow
                label="Due Date"
                value={formatDate(debt.dueDate, 'medium')}
                colors={colors}
              />
            )}
            {debt.feesCharged && debt.feesCharged > 0 && (
              <DetailRow
                label="Fees Charged"
                value={formatCurrency(debt.feesCharged)}
                colors={colors}
              />
            )}
            <DetailRow
              label="Status"
              value={debt.status.replace('_', ' ').toUpperCase()}
              colors={colors}
            />
          </Card>

          {/* Payment History */}
          {payments.length > 0 && (
            <Card variant="outlined" style={styles.paymentsCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Payment History
              </Text>
              {payments.map((payment) => (
                <View
                  key={payment.id}
                  style={[
                    styles.paymentRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View>
                    <Text style={[styles.paymentDate, { color: colors.text }]}>
                      {formatDate(payment.paymentDate, 'medium')}
                    </Text>
                    {payment.notes && (
                      <Text
                        style={[
                          styles.paymentNotes,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {payment.notes}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.paymentAmount, { color: colors.success }]}>
                    -{formatCurrency(payment.amount)}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* Notes */}
          {debt.notes && (
            <Card variant="outlined" style={styles.notesCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Notes
              </Text>
              <Text style={[styles.notes, { color: colors.text }]}>
                {debt.notes}
              </Text>
            </Card>
          )}

          {/* Actions */}
          {debt.status !== 'paid' && debt.status !== 'written_off' && (
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={handleMarkAsPaid}
              >
                <Text style={styles.actionButtonText}>Mark as Paid</Text>
              </Pressable>
              {debt.type !== 'fuliza' && (
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.secondaryButton,
                    { borderColor: colors.error },
                  ]}
                  onPress={handleWriteOff}
                >
                  <Text style={[styles.actionButtonText, { color: colors.error }]}>
                    Write Off
                  </Text>
                </Pressable>
              )}
            </View>
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
  amountLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  amount: {
    color: 'white',
    fontSize: 36,
    fontWeight: '700',
    marginTop: 4,
  },
  dueText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 8,
  },
  progressCard: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
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
  },
  paymentsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paymentDate: {
    fontSize: 14,
  },
  paymentNotes: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  notesCard: {
    marginBottom: 16,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
