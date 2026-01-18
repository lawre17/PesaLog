/**
 * SMS Polling Service
 * Periodically checks for new SMS messages and processes them.
 * Alternative to BroadcastReceiver for devices where that doesn't work.
 */

import { Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { smsFilter } from './sms-filter.service';
import { smsListener, type SmsProcessingResult } from './sms-listener.service';
import { settingsService } from '../settings.service';
import * as Notifications from 'expo-notifications';

const LAST_SMS_TIMESTAMP_KEY = 'last_sms_poll_timestamp';
const POLLING_INTERVAL_MS = 60000; // Check every 1 minute

interface RawSmsMessage {
  _id: string;
  address: string;
  body: string;
  date: number;
  date_sent: number;
  type: number;
  read: number;
  seen: number;
}

export interface PollingStats {
  lastPollTime: Date | null;
  newMessagesFound: number;
  processedCount: number;
  errorCount: number;
}

class SmsPollingService {
  private static instance: SmsPollingService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private stats: PollingStats = {
    lastPollTime: null,
    newMessagesFound: 0,
    processedCount: 0,
    errorCount: 0,
  };

  private constructor() {}

  static getInstance(): SmsPollingService {
    if (!SmsPollingService.instance) {
      SmsPollingService.instance = new SmsPollingService();
    }
    return SmsPollingService.instance;
  }

  /**
   * Get the last processed SMS timestamp
   */
  async getLastProcessedTimestamp(): Promise<number> {
    try {
      const value = await settingsService.get(LAST_SMS_TIMESTAMP_KEY);
      if (value) {
        return parseInt(value, 10);
      }
      // Default to 24 hours ago if no timestamp stored
      return Date.now() - (24 * 60 * 60 * 1000);
    } catch {
      return Date.now() - (24 * 60 * 60 * 1000);
    }
  }

  /**
   * Save the last processed SMS timestamp
   */
  async setLastProcessedTimestamp(timestamp: number): Promise<void> {
    try {
      await settingsService.set(LAST_SMS_TIMESTAMP_KEY, timestamp.toString());
    } catch (err) {
      console.error('[SmsPolling] Failed to save timestamp:', err);
    }
  }

  /**
   * Read SMS messages from device
   */
  private readSmsFromDevice(minDate: number): Promise<RawSmsMessage[]> {
    return new Promise((resolve, reject) => {
      const filter = {
        box: 'inbox',
        minDate: minDate,
        maxCount: 100,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.error('[SmsPolling] Failed to read SMS:', fail);
          reject(new Error(fail));
        },
        (count: number, smsList: string) => {
          try {
            const messages: RawSmsMessage[] = JSON.parse(smsList);
            resolve(messages);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Check for new SMS and process them
   */
  async checkForNewSms(): Promise<{
    found: number;
    processed: number;
    errors: number;
  }> {
    if (Platform.OS !== 'android') {
      return { found: 0, processed: 0, errors: 0 };
    }

    const result = { found: 0, processed: 0, errors: 0 };

    try {
      const lastTimestamp = await this.getLastProcessedTimestamp();
      console.log('[SmsPolling] Checking for SMS since:', new Date(lastTimestamp).toISOString());

      // Read SMS since last check
      const messages = await this.readSmsFromDevice(lastTimestamp);

      // Filter for financial SMS only
      const financialMessages = messages.filter((msg) =>
        smsFilter.shouldProcess(msg.address, msg.body)
      );

      result.found = financialMessages.length;
      console.log(`[SmsPolling] Found ${result.found} new financial SMS`);

      if (financialMessages.length === 0) {
        // Update timestamp even if no messages found
        if (messages.length > 0) {
          const maxTimestamp = Math.max(...messages.map((m) => m.date));
          await this.setLastProcessedTimestamp(maxTimestamp + 1);
        }
        return result;
      }

      // Sort by date (oldest first)
      financialMessages.sort((a, b) => a.date - b.date);

      let maxTimestamp = lastTimestamp;
      const processedTransactions: Array<{ id: number; counterparty?: string }> = [];

      // Process each message
      for (const msg of financialMessages) {
        try {
          const processResult: SmsProcessingResult = await smsListener.processIncomingSms(
            msg.address,
            msg.body,
            new Date(msg.date)
          );

          if (processResult.success && !processResult.isDuplicate) {
            result.processed++;
            if (processResult.transactionId) {
              processedTransactions.push({ id: processResult.transactionId });
            }
            console.log('[SmsPolling] Processed SMS:', {
              from: msg.address,
              transactionId: processResult.transactionId,
            });
          } else if (processResult.isDuplicate) {
            console.log('[SmsPolling] Skipped duplicate SMS');
          }

          maxTimestamp = Math.max(maxTimestamp, msg.date);
        } catch (err) {
          console.error('[SmsPolling] Error processing SMS:', err);
          result.errors++;
        }
      }

      // Update last processed timestamp
      await this.setLastProcessedTimestamp(maxTimestamp + 1);

      // Show notification if new transactions were processed
      if (result.processed > 0) {
        await this.showNewTransactionsNotification(result.processed);
      }

      // Update stats
      this.stats.lastPollTime = new Date();
      this.stats.newMessagesFound += result.found;
      this.stats.processedCount += result.processed;
      this.stats.errorCount += result.errors;

      return result;
    } catch (err) {
      console.error('[SmsPolling] Check failed:', err);
      result.errors++;
      return result;
    }
  }

  /**
   * Show notification for new transactions
   */
  private async showNewTransactionsNotification(count: number): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New Transactions',
          body: `${count} new transaction${count > 1 ? 's' : ''} imported from SMS`,
          data: { type: 'new_transactions' },
        },
        trigger: null, // Show immediately
      });
    } catch (err) {
      console.error('[SmsPolling] Failed to show notification:', err);
    }
  }

  /**
   * Start polling for new SMS
   */
  startPolling(intervalMs: number = POLLING_INTERVAL_MS): void {
    if (this.isPolling) {
      console.log('[SmsPolling] Already polling');
      return;
    }

    console.log(`[SmsPolling] Starting polling every ${intervalMs / 1000}s`);
    this.isPolling = true;

    // Check immediately
    this.checkForNewSms();

    // Then check periodically
    this.pollingInterval = setInterval(() => {
      this.checkForNewSms();
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('[SmsPolling] Polling stopped');
  }

  /**
   * Check if currently polling
   */
  isCurrentlyPolling(): boolean {
    return this.isPolling;
  }

  /**
   * Get polling statistics
   */
  getStats(): PollingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      lastPollTime: null,
      newMessagesFound: 0,
      processedCount: 0,
      errorCount: 0,
    };
  }
}

export const smsPolling = SmsPollingService.getInstance();
