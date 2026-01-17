import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { smsReader, ImportPeriod } from '@/services/sms/sms-reader.service';

type ImportStatus = 'idle' | 'scanning' | 'complete' | 'error';

interface PeriodOption {
  value: ImportPeriod;
  label: string;
  description: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '1month', label: '1 Month', description: 'Last 30 days' },
  { value: '3months', label: '3 Months', description: 'Last 90 days' },
  { value: '6months', label: '6 Months', description: 'Last 180 days' },
  { value: '1year', label: '1 Year', description: 'Last 365 days' },
  { value: 'all', label: 'All Time', description: 'All available SMS' },
];

interface ImportStats {
  totalFound: number;
  mpesa: number;
  bank: number;
  card: number;
  fuliza: number;
  newTransactions: number;
  duplicates: number;
}

export default function ImportScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [selectedPeriod, setSelectedPeriod] = useState<ImportPeriod>('3months');
  const [stats, setStats] = useState<ImportStats>({
    totalFound: 0,
    mpesa: 0,
    bank: 0,
    card: 0,
    fuliza: 0,
    newTransactions: 0,
    duplicates: 0,
  });
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for scanning
  useEffect(() => {
    if (status === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  // Progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const handleStartImport = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Not Available',
        'SMS import is only available on Android. On iOS, you can manually add transactions.',
        [{ text: 'OK' }]
      );
      return;
    }

    setStatus('scanning');
    setProgress(0);
    setErrorMessage('');
    setStats({
      totalFound: 0,
      mpesa: 0,
      bank: 0,
      card: 0,
      fuliza: 0,
      newTransactions: 0,
      duplicates: 0,
    });

    try {
      const result = await smsReader.readAllSms(
        selectedPeriod,
        (progressPercent, partialResult) => {
          setProgress(progressPercent);
          if (partialResult.stats) {
            setStats({
              totalFound: partialResult.financialSms || 0,
              mpesa: partialResult.stats.mpesa || 0,
              bank: partialResult.stats.bank || 0,
              card: partialResult.stats.card || 0,
              fuliza: partialResult.stats.fuliza || 0,
              newTransactions: partialResult.processed || 0,
              duplicates: partialResult.duplicates || 0,
            });
          }
        }
      );

      setStats({
        totalFound: result.financialSms,
        mpesa: result.stats.mpesa,
        bank: result.stats.bank,
        card: result.stats.card,
        fuliza: result.stats.fuliza,
        newTransactions: result.processed,
        duplicates: result.duplicates,
      });
      setStatus('complete');
    } catch (err) {
      console.error('Import failed:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to read SMS messages');
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return 'cloud-download-outline';
      case 'scanning':
        return 'search';
      case 'complete':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return colors.primary;
      case 'scanning':
        return colors.primary;
      case 'complete':
        return colors.success;
      case 'error':
        return colors.error;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Import SMS' }} />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>
            {status === 'idle'
              ? 'Import SMS History'
              : status === 'scanning'
              ? 'Scanning Messages...'
              : status === 'complete'
              ? 'Import Complete!'
              : 'Import Failed'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {status === 'idle'
              ? 'Scan your SMS inbox for financial transactions'
              : status === 'scanning'
              ? 'Looking for M-Pesa, bank, and card transactions'
              : status === 'complete'
              ? `Found ${stats.newTransactions} new transactions`
              : errorMessage}
          </Text>

          {/* Animation Circle */}
          <View style={styles.animationContainer}>
            <Animated.View
              style={[
                styles.scanCircle,
                {
                  backgroundColor: getStatusColor(),
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Ionicons name={getStatusIcon()} size={48} color="white" />
            </Animated.View>

            {status === 'scanning' && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.backgroundSecondary },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { backgroundColor: colors.primary, width: progressWidth },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {progress}%
                </Text>
              </View>
            )}
          </View>

          {/* Stats */}
          {(status === 'scanning' || status === 'complete') && (
            <Card variant="outlined" style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <StatItem
                  icon="phone-portrait"
                  label="M-Pesa"
                  count={stats.mpesa}
                  colors={colors}
                />
                <StatItem
                  icon="business"
                  label="Bank"
                  count={stats.bank}
                  colors={colors}
                />
                <StatItem
                  icon="card"
                  label="Card"
                  count={stats.card}
                  colors={colors}
                />
                <StatItem
                  icon="flash"
                  label="Fuliza"
                  count={stats.fuliza}
                  colors={colors}
                />
              </View>

              {status === 'complete' && (
                <View style={[styles.summaryRow, { borderTopColor: colors.border }]}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="add-circle" size={20} color={colors.success} />
                    <Text style={[styles.summaryText, { color: colors.text }]}>
                      {stats.newTransactions} new
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="copy" size={20} color={colors.textSecondary} />
                    <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                      {stats.duplicates} skipped
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          )}

          {/* Period Selector */}
          {status === 'idle' && (
            <View style={styles.periodSection}>
              <Text style={[styles.periodTitle, { color: colors.text }]}>
                Import Period
              </Text>
              <View style={styles.periodOptions}>
                {PERIOD_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.periodOption,
                      {
                        backgroundColor:
                          selectedPeriod === option.value
                            ? colors.primary
                            : colors.backgroundSecondary,
                        borderColor:
                          selectedPeriod === option.value
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedPeriod(option.value)}
                  >
                    <Text
                      style={[
                        styles.periodLabel,
                        {
                          color:
                            selectedPeriod === option.value
                              ? 'white'
                              : colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.periodDescription, { color: colors.textSecondary }]}>
                {PERIOD_OPTIONS.find((o) => o.value === selectedPeriod)?.description}
              </Text>
            </View>
          )}

          {/* Info Note */}
          {status === 'idle' && (
            <Card
              variant="outlined"
              style={[styles.infoNote, { backgroundColor: colors.backgroundSecondary }]}
            >
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>
                  What gets imported?
                </Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  • M-Pesa transactions (send, receive, paybill){'\n'}
                  • Bank transfers and confirmations{'\n'}
                  • Card transactions{'\n'}
                  • Fuliza overdrafts
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {status === 'idle' && (
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleStartImport}
            >
              <Ionicons name="cloud-download" size={22} color="white" />
              <Text style={styles.buttonText}>Start Import</Text>
            </Pressable>
          )}

          {status === 'complete' && (
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Ionicons name="checkmark" size={22} color="white" />
              <Text style={styles.buttonText}>Done</Text>
            </Pressable>
          )}

          {status === 'error' && (
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleStartImport}
            >
              <Ionicons name="refresh" size={22} color="white" />
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

function StatItem({
  icon,
  label,
  count,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={[styles.statCount, { color: colors.text }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  animationContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  scanCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 24,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    marginTop: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  periodSection: {
    marginTop: 24,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  periodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  periodOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  periodDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  infoNote: {
    flexDirection: 'row',
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    padding: 24,
    paddingBottom: 16,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
