/**
 * SMS Broadcast Service
 * Handles real-time SMS listening via native Android BroadcastReceiver
 */

import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  EmitterSubscription,
  PermissionsAndroid,
} from 'react-native';
import { smsListener, type SmsProcessingResult } from './sms-listener.service';

interface SmsEvent {
  sender: string;
  body: string;
  timestamp: number;
}

interface PendingSms {
  sender: string;
  body: string;
  timestamp: number;
}

interface SmsBroadcastModuleType {
  isAvailable(): Promise<boolean>;
  getPendingSms(): Promise<PendingSms[]>;
  getPendingCount(): Promise<number>;
}

const SmsBroadcastModule =
  Platform.OS === 'android'
    ? (NativeModules.SmsBroadcastModule as SmsBroadcastModuleType)
    : null;

const eventEmitter =
  SmsBroadcastModule && Platform.OS === 'android'
    ? new NativeEventEmitter(NativeModules.SmsBroadcastModule)
    : null;

export interface SmsListenerStats {
  processed: number;
  duplicates: number;
  failed: number;
  lastProcessedAt: Date | null;
}

export class SmsBroadcastService {
  private static instance: SmsBroadcastService;
  private isListening: boolean = false;
  private subscription: EmitterSubscription | null = null;
  private stats: SmsListenerStats = {
    processed: 0,
    duplicates: 0,
    failed: 0,
    lastProcessedAt: null,
  };

  private constructor() {}

  static getInstance(): SmsBroadcastService {
    if (!SmsBroadcastService.instance) {
      SmsBroadcastService.instance = new SmsBroadcastService();
    }
    return SmsBroadcastService.instance;
  }

  /**
   * Check if SMS broadcast is available on this device
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android' || !SmsBroadcastModule) {
      return false;
    }

    try {
      return await SmsBroadcastModule.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Check if RECEIVE_SMS permission is granted
   */
  async hasReceiveSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    try {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
      );
    } catch {
      return false;
    }
  }

  /**
   * Request RECEIVE_SMS permission
   */
  async requestReceiveSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        {
          title: 'SMS Permission Required',
          message: 'PesaLog needs permission to receive SMS messages to automatically capture your M-Pesa, bank, and card transactions.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      console.log('[SmsBroadcast] Permission result:', result);
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[SmsBroadcast] RECEIVE_SMS permission GRANTED');
        return true;
      } else if (result === PermissionsAndroid.RESULTS.DENIED) {
        console.log('[SmsBroadcast] RECEIVE_SMS permission DENIED by user');
        return false;
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        console.log('[SmsBroadcast] RECEIVE_SMS permission NEVER_ASK_AGAIN - need to enable in Settings');
        return false;
      }
      return false;
    } catch (err) {
      console.error('[SmsBroadcast] Permission request error:', err);
      return false;
    }
  }

  /**
   * Start listening for incoming SMS
   */
  async startListening(): Promise<boolean> {
    if (Platform.OS !== 'android' || !eventEmitter) {
      console.log('[SmsBroadcast] Not available on this platform');
      return false;
    }

    if (this.isListening) {
      console.log('[SmsBroadcast] Already listening');
      return true;
    }

    try {
      // Check and request RECEIVE_SMS permission
      let hasPermission = await this.hasReceiveSmsPermission();
      if (!hasPermission) {
        console.log('[SmsBroadcast] Requesting RECEIVE_SMS permission');
        hasPermission = await this.requestReceiveSmsPermission();
        if (!hasPermission) {
          console.log('[SmsBroadcast] RECEIVE_SMS permission denied');
          return false;
        }
      }

      // Process any pending SMS that arrived while app was backgrounded/killed
      await this.processPendingSms();

      // Subscribe to SMS events
      this.subscription = eventEmitter.addListener(
        'onSmsReceived',
        this.handleSmsReceived.bind(this)
      );

      this.isListening = true;
      console.log('[SmsBroadcast] Listener started with permission');
      return true;
    } catch (error) {
      console.error('[SmsBroadcast] Failed to start listener:', error);
      return false;
    }
  }

  /**
   * Stop listening for SMS
   */
  stopListening(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isListening = false;
    console.log('[SmsBroadcast] Listener stopped');
  }

  /**
   * Process any pending SMS that arrived while app was backgrounded/killed
   */
  async processPendingSms(): Promise<number> {
    if (!SmsBroadcastModule) {
      return 0;
    }

    try {
      const pendingSms = await SmsBroadcastModule.getPendingSms();

      if (pendingSms.length === 0) {
        return 0;
      }

      console.log(`[SmsBroadcast] Processing ${pendingSms.length} pending SMS`);

      // Sort by timestamp (oldest first) for proper reference linking
      const sorted = pendingSms.sort((a, b) => a.timestamp - b.timestamp);

      let processedCount = 0;
      for (const sms of sorted) {
        const result = await this.handleSmsReceived(sms);
        if (result?.success && !result?.isDuplicate) {
          processedCount++;
        }
      }

      return processedCount;
    } catch (error) {
      console.error('[SmsBroadcast] Failed to process pending SMS:', error);
      return 0;
    }
  }

  /**
   * Get count of pending SMS without processing
   */
  async getPendingCount(): Promise<number> {
    if (!SmsBroadcastModule) {
      return 0;
    }

    try {
      return await SmsBroadcastModule.getPendingCount();
    } catch {
      return 0;
    }
  }

  /**
   * Handle incoming SMS event
   */
  private async handleSmsReceived(
    event: SmsEvent
  ): Promise<SmsProcessingResult | null> {
    console.log(`[SmsBroadcast] SMS received from: ${event.sender}`);

    try {
      const result: SmsProcessingResult = await smsListener.processIncomingSms(
        event.sender,
        event.body,
        new Date(event.timestamp)
      );

      if (result.success && !result.isDuplicate) {
        this.stats.processed++;
        this.stats.lastProcessedAt = new Date();
        console.log('[SmsBroadcast] SMS processed successfully:', {
          transactionId: result.transactionId,
          needsClassification: result.needsClassification,
        });
      } else if (result.isDuplicate) {
        this.stats.duplicates++;
        console.log('[SmsBroadcast] Duplicate SMS ignored');
      } else {
        this.stats.failed++;
        console.log('[SmsBroadcast] SMS not processed:', result.error);
      }

      return result;
    } catch (error) {
      this.stats.failed++;
      console.error('[SmsBroadcast] Error processing SMS:', error);
      return null;
    }
  }

  /**
   * Get listener status
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Get listener statistics
   */
  getStats(): SmsListenerStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      processed: 0,
      duplicates: 0,
      failed: 0,
      lastProcessedAt: null,
    };
  }
}

// Singleton export
export const smsBroadcast = SmsBroadcastService.getInstance();
