import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currency';
import { formatDate, getDaysUntilDue } from '@/utils/date';
import type { DebtSummary } from '@/types';

interface DebtWidgetProps {
  summary: DebtSummary;
  onPress?: () => void;
}

export function DebtWidget({ summary, onPress }: DebtWidgetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const hasFuliza = summary.fuliza.outstanding > 0;
  const hasOwedByOthers = summary.owedByOthers.total > 0;
  const hasOwedToOthers = summary.owedToOthers.total > 0;
  const hasAnyDebt = hasFuliza || hasOwedByOthers || hasOwedToOthers;

  if (!hasAnyDebt) {
    return null;
  }

  const daysUntilFulizaDue = summary.fuliza.dueDate
    ? getDaysUntilDue(summary.fuliza.dueDate)
    : null;

  return (
    <Pressable onPress={onPress}>
      <Card
        variant="elevated"
        style={[
          styles.card,
          {
            backgroundColor: summary.fuliza.isOverdue
              ? colors.error
              : colors.debt,
          },
        ]}
      >
        {hasFuliza && (
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.icon}>{'\u26A0\uFE0F'}</Text>
              <View style={styles.content}>
                <Text style={styles.label}>Fuliza Outstanding</Text>
                <Text style={styles.amount}>
                  {formatCurrency(summary.fuliza.outstanding)}
                </Text>
              </View>
            </View>
            {summary.fuliza.dueDate && (
              <Text style={styles.dueDate}>
                {summary.fuliza.isOverdue
                  ? 'Overdue!'
                  : daysUntilFulizaDue === 0
                  ? 'Due today'
                  : daysUntilFulizaDue === 1
                  ? 'Due tomorrow'
                  : `Due in ${daysUntilFulizaDue} days`}
                {' · '}
                {formatDate(summary.fuliza.dueDate, 'short')}
              </Text>
            )}
          </View>
        )}

        {hasOwedByOthers && (
          <View style={[styles.section, hasFuliza && styles.sectionBorder]}>
            <View style={styles.row}>
              <Text style={styles.icon}>{'\uD83D\uDCB0'}</Text>
              <View style={styles.content}>
                <Text style={styles.label}>
                  Owed to you ({summary.owedByOthers.count})
                </Text>
                <Text style={styles.amount}>
                  {formatCurrency(summary.owedByOthers.total)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {hasOwedToOthers && (
          <View
            style={[
              styles.section,
              (hasFuliza || hasOwedByOthers) && styles.sectionBorder,
            ]}
          >
            <View style={styles.row}>
              <Text style={styles.icon}>{'\uD83D\uDCB8'}</Text>
              <View style={styles.content}>
                <Text style={styles.label}>
                  You owe ({summary.owedToOthers.count})
                </Text>
                <Text style={styles.amount}>
                  {formatCurrency(summary.owedToOthers.total)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.tapHint}>Tap to manage debts</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
  },
  section: {
    paddingVertical: 4,
  },
  sectionBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: 8,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  amount: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  dueDate: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 32,
  },
  tapHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
