/**
 * Hook for managing SMS auto-capture listener
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  smsBroadcast,
  type SmsListenerStats,
} from '@/services/sms/sms-broadcast.service';

interface UseSmsListenerOptions {
  /** Whether to enable the listener (default: true) */
  enabled?: boolean;
  /** Callback when new SMS is processed */
  onSmsProcessed?: (stats: SmsListenerStats) => void;
}

interface UseSmsListenerReturn {
  /** Whether the listener is currently active */
  isListening: boolean;
  /** Whether SMS listening is available on this device */
  isAvailable: boolean;
  /** Current listener statistics */
  stats: SmsListenerStats;
  /** Manually start the listener */
  startListening: () => Promise<void>;
  /** Manually stop the listener */
  stopListening: () => void;
  /** Process any pending SMS from background */
  processPending: () => Promise<number>;
}

export function useSmsListener(
  options: UseSmsListenerOptions = {}
): UseSmsListenerReturn {
  const { enabled = true, onSmsProcessed } = options;

  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [stats, setStats] = useState<SmsListenerStats>({
    processed: 0,
    duplicates: 0,
    failed: 0,
    lastProcessedAt: null,
  });

  const onSmsProcessedRef = useRef(onSmsProcessed);
  onSmsProcessedRef.current = onSmsProcessed;

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      if (Platform.OS !== 'android') {
        setIsAvailable(false);
        return;
      }

      const available = await smsBroadcast.isAvailable();
      setIsAvailable(available);
    };

    checkAvailability();
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isAvailable || !enabled) {
      return;
    }

    const success = await smsBroadcast.startListening();
    setIsListening(success);

    if (success) {
      setStats(smsBroadcast.getStats());
    }
  }, [isAvailable, enabled]);

  // Stop listening
  const stopListening = useCallback(() => {
    smsBroadcast.stopListening();
    setIsListening(false);
  }, []);

  // Process pending SMS
  const processPending = useCallback(async () => {
    const count = await smsBroadcast.processPendingSms();
    const newStats = smsBroadcast.getStats();
    setStats(newStats);

    if (count > 0 && onSmsProcessedRef.current) {
      onSmsProcessedRef.current(newStats);
    }

    return count;
  }, []);

  // Handle app state changes
  useEffect(() => {
    if (!enabled || !isAvailable) {
      return;
    }

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - process any pending SMS
        console.log('[useSmsListener] App active, processing pending SMS');
        await processPending();

        // Update stats
        setStats(smsBroadcast.getStats());
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    // Start listening when hook mounts
    startListening();

    return () => {
      subscription.remove();
      // Don't stop listening on unmount - let it continue in background
      // stopListening();
    };
  }, [enabled, isAvailable, startListening, processPending]);

  // Periodically update stats while listening
  useEffect(() => {
    if (!isListening) {
      return;
    }

    const interval = setInterval(() => {
      const currentStats = smsBroadcast.getStats();
      setStats((prev) => {
        // Only update if stats changed
        if (
          prev.processed !== currentStats.processed ||
          prev.duplicates !== currentStats.duplicates ||
          prev.failed !== currentStats.failed
        ) {
          if (onSmsProcessedRef.current) {
            onSmsProcessedRef.current(currentStats);
          }
          return currentStats;
        }
        return prev;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isListening]);

  return {
    isListening,
    isAvailable,
    stats,
    startListening,
    stopListening,
    processPending,
  };
}
