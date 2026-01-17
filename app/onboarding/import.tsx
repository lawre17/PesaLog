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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { settingsService } from '@/services/settings.service';
import { smsReader, SmsReadResult, ImportPeriod } from '@/services/sms/sms-reader.service';

type ImportStatus = 'idle' | 'scanning' | 'complete';

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
  });
  const [progress, setProgress] = useState(0);

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
      // Skip import on iOS since we can't read SMS
      Alert.alert(
        'Not Available',
        'SMS import is only available on Android. You can manually add transactions.',
        [{ text: 'OK', onPress: completeOnboarding }]
      );
      return;
    }

    setStatus('scanning');
    setProgress(0);
    setStats({ totalFound: 0, mpesa: 0, bank: 0, card: 0, fuliza: 0 });

    try {
      const result = await smsReader.readAllSms(
        selectedPeriod,
        (progressPercent, partialResult) => {
          setProgress(progressPercent);
          if (partialResult.stats) {
            setStats({
              totalFound: partialResult.processed || 0,
              mpesa: partialResult.stats.mpesa || 0,
              bank: partialResult.stats.bank || 0,
              card: partialResult.stats.card || 0,
              fuliza: partialResult.stats.fuliza || 0,
            });
          }
        }
      );

      setStats({
        totalFound: result.processed,
        mpesa: result.stats.mpesa,
        bank: result.stats.bank,
        card: result.stats.card,
        fuliza: result.stats.fuliza,
      });
      setStatus('complete');
    } catch (err) {
      console.error('SMS import failed:', err);
      Alert.alert(
        'Import Failed',
        err instanceof Error ? err.message : 'Failed to read SMS messages. Please check permissions.',
        [
          { text: 'Skip', onPress: completeOnboarding },
          { text: 'Retry', onPress: handleStartImport },
        ]
      );
      setStatus('idle');
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const handleFinish = async () => {
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    await settingsService.completeOnboarding();
    router.replace('/(tabs)' as never);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {status === 'idle'
            ? 'Import History'
            : status === 'scanning'
            ? 'Scanning Messages...'
            : 'Import Complete!'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {status === 'idle'
            ? 'Import your existing financial SMS to get started with complete history'
            : status === 'scanning'
            ? 'Looking for M-Pesa, bank, and card transactions'
            : 'Your transactions have been imported successfully'}
        </Text>

        {/* Scanning Animation */}
        <View style={styles.animationContainer}>
          <Animated.View
            style={[
              styles.scanCircle,
              {
                backgroundColor: colors.primary,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Text style={styles.scanIcon}>
              {status === 'idle' ? '📥' : status === 'scanning' ? '🔍' : '✅'}
            </Text>
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
          <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>
              Transactions Found
            </Text>
            <Text style={[styles.statsTotal, { color: colors.primary }]}>
              {stats.totalFound}
            </Text>

            <View style={styles.statsGrid}>
              <StatItem
                icon="📱"
                label="M-Pesa"
                count={stats.mpesa}
                colors={colors}
              />
              <StatItem
                icon="🏦"
                label="Bank"
                count={stats.bank}
                colors={colors}
              />
              <StatItem
                icon="💳"
                label="Card"
                count={stats.card}
                colors={colors}
              />
              <StatItem
                icon="⚡"
                label="Fuliza"
                count={stats.fuliza}
                colors={colors}
              />
            </View>
          </View>
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

        {status === 'complete' && (
          <View
            style={[styles.successNote, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Text style={styles.infoIcon}>🎉</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Most transactions have been auto-categorized. You can review and
              adjust categories anytime.
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {status === 'idle' && (
          <>
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleStartImport}
            >
              <Text style={styles.buttonText}>Start Import</Text>
            </Pressable>
            <Pressable style={styles.skipButton} onPress={handleSkip}>
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                Skip and start fresh
              </Text>
            </Pressable>
          </>
        )}

        {status === 'complete' && (
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleFinish}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function StatItem({
  icon,
  label,
  count,
  colors,
}: {
  icon: string;
  label: string;
  count: number;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
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
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  animationContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  scanCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanIcon: {
    fontSize: 48,
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
    marginTop: 32,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsTotal: {
    fontSize: 48,
    fontWeight: '700',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statIcon: {
    fontSize: 24,
  },
  statCount: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  periodSection: {
    marginTop: 32,
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
  successNote: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
  },
});
