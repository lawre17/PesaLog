import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'expo-router';
import {
  notificationService,
  NotificationPayload,
} from '@/services/notification.service';

interface NotificationContextType {
  isInitialized: boolean;
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();

  // Handle notification responses (when user taps notification)
  const handleNotificationResponse = useCallback(
    (data: NotificationPayload) => {
      switch (data.type) {
        case 'classify_transaction':
          if (data.transactionId) {
            // Navigate to classification screen
            router.push(`/transaction/classify/${data.transactionId}` as never);
          }
          break;

        case 'debt_due':
          if (data.debtId) {
            // Navigate to debt detail
            router.push(`/debts/${data.debtId}` as never);
          } else {
            // Navigate to debts list
            router.push('/debts' as never);
          }
          break;

        case 'budget_alert':
          // Navigate to insights
          router.push('/(tabs)/insights' as never);
          break;

        default:
          // Navigate to dashboard
          router.push('/(tabs)' as never);
      }
    },
    [router]
  );

  // Initialize notification service
  useEffect(() => {
    async function init() {
      const success = await notificationService.initialize();
      if (success) {
        notificationService.setResponseHandler(handleNotificationResponse);
        setIsInitialized(true);

        // Update badge count
        await notificationService.updateBadgeCount();

        // Get pending count
        const count = await notificationService.getPendingCount();
        setPendingCount(count);
      }
    }

    init();

    // Cleanup on unmount
    return () => {
      notificationService.cleanup();
    };
  }, [handleNotificationResponse]);

  // Refresh pending count
  const refreshPendingCount = useCallback(async () => {
    const count = await notificationService.getPendingCount();
    setPendingCount(count);
    await notificationService.updateBadgeCount();
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        isInitialized,
        pendingCount,
        refreshPendingCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }

  return context;
}
