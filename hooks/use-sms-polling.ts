/**
 * Hook for SMS polling - checks for new SMS periodically
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform, PermissionsAndroid } from 'react-native';
import { smsPolling, type PollingStats } from '@/services/sms/sms-polling.service';

interface UseSmsPollingOptions {
  /** Whether to enable polling (default: true) */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 60000 = 1 minute) */
  intervalMs?: number;
  /** Callback when new transactions are found */
  onNewTransactions?: (count: number) => void;
}

interface UseSmsPollingReturn {
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Current polling statistics */
  stats: PollingStats;
  /** Manually trigger a check for new SMS */
  checkNow: () => Promise<void>;
  /** Start polling */
  startPolling: () => Promise<void>;
  /** Stop polling */
  stopPolling: () => void;
}

export function useSmsPolling(
  options: UseSmsPollingOptions = {}
): UseSmsPollingReturn {
  const { enabled = true, intervalMs = 60000, onNewTransactions } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [stats, setStats] = useState<PollingStats>({
    lastPollTime: null,
    newMessagesFound: 0,
    processedCount: 0,
    errorCount: 0,
  });

  const onNewTransactionsRef = useRef(onNewTransactions);
  onNewTransactionsRef.current = onNewTransactions;

  // Check if we have SMS permission
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return false;
    }
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      return granted;
    } catch {
      return false;
    }
  }, []);

  // Request SMS permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return false;
    }
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission Required',
          message: 'PesaLog needs access to read your SMS messages to automatically import M-Pesa, bank, and card transactions.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }, []);

  // Start polling
  const startPolling = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    // Check permission first
    let hasPermission = await checkPermission();
    if (!hasPermission) {
      hasPermission = await requestPermission();
      if (!hasPermission) {
        console.log('[useSmsPolling] Permission denied, cannot start polling');
        return;
      }
    }

    smsPolling.startPolling(intervalMs);
    setIsPolling(true);
  }, [checkPermission, requestPermission, intervalMs]);

  // Stop polling
  const stopPolling = useCallback(() => {
    smsPolling.stopPolling();
    setIsPolling(false);
  }, []);

  // Manual check
  const checkNow = useCallback(async () => {
    const result = await smsPolling.checkForNewSms();
    setStats(smsPolling.getStats());

    if (result.processed > 0 && onNewTransactionsRef.current) {
      onNewTransactionsRef.current(result.processed);
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      return;
    }

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[useSmsPolling] App became active, checking for new SMS');
        await checkNow();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Start polling when hook mounts
    startPolling();

    return () => {
      subscription.remove();
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling, checkNow]);

  // Update stats periodically
  useEffect(() => {
    if (!isPolling) {
      return;
    }

    const interval = setInterval(() => {
      const currentStats = smsPolling.getStats();
      setStats((prev) => {
        if (
          prev.processedCount !== currentStats.processedCount ||
          prev.newMessagesFound !== currentStats.newMessagesFound
        ) {
          if (
            currentStats.processedCount > prev.processedCount &&
            onNewTransactionsRef.current
          ) {
            const newCount = currentStats.processedCount - prev.processedCount;
            onNewTransactionsRef.current(newCount);
          }
          return currentStats;
        }
        return prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isPolling]);

  return {
    isPolling,
    stats,
    checkNow,
    startPolling,
    stopPolling,
  };
}
