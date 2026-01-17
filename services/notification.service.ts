/**
 * Notification Service
 * Handles local notifications for transaction classification, debt reminders, etc.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { eq } from 'drizzle-orm';
import { db, notificationQueue, transactions, debts } from '@/db';
import { formatCurrency } from '@/utils/currency';
import { formatDate, getDaysUntilDue } from '@/utils/date';
import type { Transaction, Debt, NotificationType } from '@/types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPayload {
  type: NotificationType;
  transactionId?: number;
  debtId?: number;
  notificationId?: number;
}

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized: boolean = false;
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;

  // Callback for handling notification responses
  private onNotificationResponse:
    | ((data: NotificationPayload) => void)
    | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Set up notification listeners
      this.setupListeners();

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Notifications require a physical device');
      return false;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Set up Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('transactions', {
      name: 'Transactions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00BCD4',
    });

    await Notifications.setNotificationChannelAsync('debts', {
      name: 'Debt Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FF6961',
    });
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Listen for user interaction with notification
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as NotificationPayload;

        console.log('Notification response:', data);

        // Update notification status in database
        if (data.notificationId) {
          this.markAsActioned(data.notificationId);
        }

        // Call the response handler if set
        if (this.onNotificationResponse) {
          this.onNotificationResponse(data);
        }
      });
  }

  /**
   * Set callback for notification responses
   */
  setResponseHandler(handler: (data: NotificationPayload) => void): void {
    this.onNotificationResponse = handler;
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  /**
   * Send notification for transaction classification
   */
  async notifyClassification(transaction: Transaction): Promise<void> {
    const amount = formatCurrency(transaction.amount, transaction.currency || 'KES');
    const counterparty = transaction.counterparty || 'Unknown';
    const isPerson = !!transaction.counterpartyPhone;

    const title = isPerson ? 'New Transfer' : 'New Transaction';
    const body = isPerson
      ? `${amount} to ${counterparty}. Is this a loan or expense?`
      : `${amount} to ${counterparty}. Tap to categorize.`;

    // Store in database
    const [notif] = await db
      .insert(notificationQueue)
      .values({
        type: 'classify_transaction',
        title,
        body,
        data: JSON.stringify({
          transactionId: transaction.id,
          isPerson,
        }),
        transactionId: transaction.id,
        status: 'pending',
      })
      .returning();

    // Send local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'classify_transaction',
          transactionId: transaction.id,
          notificationId: notif.id,
          isPerson,
        } as NotificationPayload,
        sound: true,
      },
      trigger: null, // Immediate
    });

    // Update status
    await db
      .update(notificationQueue)
      .set({ sentAt: new Date(), status: 'sent' })
      .where(eq(notificationQueue.id, notif.id));
  }

  /**
   * Send notification for person-to-person transfer (loan prompt)
   */
  async notifyPersonTransfer(transaction: Transaction): Promise<void> {
    const amount = formatCurrency(transaction.amount, transaction.currency || 'KES');
    const counterparty = transaction.counterparty || 'Unknown';

    const title = 'Money Sent';
    const body = `${amount} sent to ${counterparty}. Is this a loan or regular expense?`;

    const [notif] = await db
      .insert(notificationQueue)
      .values({
        type: 'classify_transaction',
        title,
        body,
        data: JSON.stringify({
          transactionId: transaction.id,
          isPerson: true,
          isLoanPrompt: true,
        }),
        transactionId: transaction.id,
        status: 'pending',
      })
      .returning();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'classify_transaction',
          transactionId: transaction.id,
          notificationId: notif.id,
          isPerson: true,
          isLoanPrompt: true,
        } as NotificationPayload & { isPerson: boolean; isLoanPrompt: boolean },
        sound: true,
      },
      trigger: null,
    });

    await db
      .update(notificationQueue)
      .set({ sentAt: new Date(), status: 'sent' })
      .where(eq(notificationQueue.id, notif.id));
  }

  /**
   * Schedule debt due date reminder
   */
  async scheduleDebtReminder(debt: Debt, daysBefore: number = 3): Promise<void> {
    if (!debt.dueDate) {
      return;
    }

    const daysUntilDue = getDaysUntilDue(debt.dueDate);

    // Don't schedule if already past due or too far away
    if (daysUntilDue < 0 || daysUntilDue > daysBefore) {
      return;
    }

    const amount = formatCurrency(debt.totalOutstanding, 'KES');
    const dueDateStr = formatDate(debt.dueDate, 'short');

    const title =
      debt.type === 'fuliza' ? 'Fuliza Due Soon' : 'Debt Payment Due';
    const body =
      daysUntilDue === 0
        ? `${amount} is due today!`
        : daysUntilDue === 1
        ? `${amount} is due tomorrow (${dueDateStr})`
        : `${amount} is due in ${daysUntilDue} days (${dueDateStr})`;

    // Calculate reminder date
    const reminderDate = new Date(debt.dueDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    reminderDate.setHours(9, 0, 0, 0); // 9 AM

    // If reminder date is in the past, send immediately
    const trigger =
      reminderDate <= new Date()
        ? null
        : { date: reminderDate };

    const [notif] = await db
      .insert(notificationQueue)
      .values({
        type: 'debt_due',
        title,
        body,
        data: JSON.stringify({ debtId: debt.id }),
        debtId: debt.id,
        scheduledFor: reminderDate,
        status: 'pending',
      })
      .returning();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'debt_due',
          debtId: debt.id,
          notificationId: notif.id,
        } as NotificationPayload,
        sound: true,
      },
      trigger,
    });

    if (!trigger) {
      await db
        .update(notificationQueue)
        .set({ sentAt: new Date(), status: 'sent' })
        .where(eq(notificationQueue.id, notif.id));
    }
  }

  /**
   * Send immediate debt overdue notification
   */
  async notifyDebtOverdue(debt: Debt): Promise<void> {
    const amount = formatCurrency(debt.totalOutstanding, 'KES');

    const title =
      debt.type === 'fuliza' ? 'Fuliza Overdue!' : 'Payment Overdue!';
    const body =
      debt.type === 'fuliza'
        ? `Your Fuliza of ${amount} is overdue. Pay now to avoid extra charges.`
        : `${amount} owed to ${debt.counterparty || 'creditor'} is overdue.`;

    const [notif] = await db
      .insert(notificationQueue)
      .values({
        type: 'debt_due',
        title,
        body,
        data: JSON.stringify({ debtId: debt.id, isOverdue: true }),
        debtId: debt.id,
        status: 'pending',
      })
      .returning();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'debt_due',
          debtId: debt.id,
          notificationId: notif.id,
        } as NotificationPayload,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });

    await db
      .update(notificationQueue)
      .set({ sentAt: new Date(), status: 'sent' })
      .where(eq(notificationQueue.id, notif.id));
  }

  /**
   * Send budget alert notification
   */
  async notifyBudgetAlert(
    categoryName: string,
    spent: number,
    budget: number
  ): Promise<void> {
    const percentage = Math.round((spent / budget) * 100);
    const spentStr = formatCurrency(spent, 'KES');
    const budgetStr = formatCurrency(budget, 'KES');

    const title = percentage >= 100 ? 'Budget Exceeded!' : 'Budget Alert';
    const body =
      percentage >= 100
        ? `You've spent ${spentStr} on ${categoryName}, exceeding your ${budgetStr} budget.`
        : `You've spent ${percentage}% of your ${categoryName} budget (${spentStr}/${budgetStr}).`;

    await db.insert(notificationQueue).values({
      type: 'budget_alert',
      title,
      body,
      data: JSON.stringify({ categoryName, spent, budget, percentage }),
      status: 'pending',
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'budget_alert',
          categoryName,
        } as NotificationPayload & { categoryName: string },
        sound: true,
      },
      trigger: null,
    });
  }

  /**
   * Mark notification as actioned
   */
  private async markAsActioned(notificationId: number): Promise<void> {
    await db
      .update(notificationQueue)
      .set({ status: 'actioned' })
      .where(eq(notificationQueue.id, notificationId));
  }

  /**
   * Dismiss a notification
   */
  async dismiss(notificationId: number): Promise<void> {
    await db
      .update(notificationQueue)
      .set({ status: 'dismissed' })
      .where(eq(notificationQueue.id, notificationId));
  }

  /**
   * Get pending notifications count
   */
  async getPendingCount(): Promise<number> {
    const pending = await db
      .select()
      .from(notificationQueue)
      .where(eq(notificationQueue.status, 'pending'));

    return pending.length;
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count (pending classifications)
   */
  async updateBadgeCount(): Promise<void> {
    const pendingTxns = await db
      .select()
      .from(transactions)
      .where(eq(transactions.status, 'pending_classification'));

    await Notifications.setBadgeCountAsync(pendingTxns.length);
  }
}

// Singleton export
export const notificationService = NotificationService.getInstance();
