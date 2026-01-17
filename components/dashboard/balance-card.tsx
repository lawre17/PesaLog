import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currency';

interface BalanceCardProps {
  balance: number;
  change?: number;
  changeLabel?: string;
}

export function BalanceCard({
  balance,
  change,
  changeLabel = 'this week',
}: BalanceCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isPositiveChange = (change || 0) >= 0;

  return (
    <Card
      variant="elevated"
      style={[styles.card, { backgroundColor: colors.primary }]}
    >
      <Text style={styles.label}>Current Balance</Text>
      <Text style={styles.balance}>
        {formatCurrency(balance, 'KES')}
      </Text>
      {change !== undefined && (
        <View style={styles.changeContainer}>
          <Text style={styles.changeIcon}>
            {isPositiveChange ? '\u25B2' : '\u25BC'}
          </Text>
          <Text style={styles.changeText}>
            {isPositiveChange ? '+' : ''}
            {formatCurrency(change, 'KES', { compact: true })} {changeLabel}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  balance: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  changeIcon: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginRight: 4,
  },
  changeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
});
