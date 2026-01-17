import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { smsFilter } from './sms-filter.service';
import { smsListener, SmsProcessingResult } from './sms-listener.service';

export interface RawSmsMessage {
  _id: string;
  address: string; // sender
  body: string;
  date: number; // timestamp in ms
  date_sent: number;
  type: number; // 1 = inbox, 2 = sent
  read: number;
  seen: number;
}

export interface SmsReadResult {
  totalRead: number;
  financialSms: number;
  processed: number;
  duplicates: number;
  errors: number;
  stats: {
    mpesa: number;
    bank: number;
    card: number;
    fuliza: number;
  };
}

export type ImportPeriod = '1month' | '3months' | '6months' | '1year' | 'all';

function getPeriodTimestamp(period: ImportPeriod): number {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  switch (period) {
    case '1month':
      return now - (30 * dayMs);
    case '3months':
      return now - (90 * dayMs);
    case '6months':
      return now - (180 * dayMs);
    case '1year':
      return now - (365 * dayMs);
    case 'all':
      return 0; // Beginning of time
  }
}

class SmsReaderService {
  private static instance: SmsReaderService;

  private constructor() {}

  static getInstance(): SmsReaderService {
    if (!SmsReaderService.instance) {
      SmsReaderService.instance = new SmsReaderService();
    }
    return SmsReaderService.instance;
  }

  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );
    return granted;
  }

  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission Required',
          message: 'PesaLog needs access to read your SMS messages to import M-Pesa, bank, and card transactions.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        // Show alert with option to open settings
        return new Promise((resolve) => {
          Alert.alert(
            'Permission Required',
            'SMS permission was permanently denied. Please enable it in your device Settings to import transactions.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings();
                  resolve(false);
                },
              },
            ]
          );
        });
      }

      return false;
    } catch (err) {
      console.error('SMS permission error:', err);
      return false;
    }
  }

  private readSmsFromDevice(filter: object): Promise<RawSmsMessage[]> {
    return new Promise((resolve, reject) => {
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.error('Failed to read SMS:', fail);
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

  async readAllSms(
    period: ImportPeriod,
    onProgress?: (progress: number, result: Partial<SmsReadResult>) => void
  ): Promise<SmsReadResult> {
    if (Platform.OS !== 'android') {
      throw new Error('SMS reading is only available on Android');
    }

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('SMS permission is required to import transactions. Please grant permission in Settings and try again.');
      }
    }

    const minDate = getPeriodTimestamp(period);

    const result: SmsReadResult = {
      totalRead: 0,
      financialSms: 0,
      processed: 0,
      duplicates: 0,
      errors: 0,
      stats: {
        mpesa: 0,
        bank: 0,
        card: 0,
        fuliza: 0,
      },
    };

    try {
      // Read all inbox messages from the specified period
      const filter = {
        box: 'inbox',
        minDate: minDate > 0 ? minDate : undefined,
        maxCount: 10000, // Limit to prevent memory issues
      };

      onProgress?.(5, result);

      const allMessages = await this.readSmsFromDevice(filter);
      result.totalRead = allMessages.length;

      onProgress?.(15, result);

      // Filter for financial SMS only
      const financialMessages = allMessages.filter((msg) =>
        smsFilter.shouldProcess(msg.address, msg.body)
      );
      result.financialSms = financialMessages.length;

      onProgress?.(25, result);

      // Sort by date (oldest first for proper linking)
      financialMessages.sort((a, b) => a.date - b.date);

      // Process each message
      const totalToProcess = financialMessages.length;
      for (let i = 0; i < totalToProcess; i++) {
        const msg = financialMessages[i];

        try {
          const processResult: SmsProcessingResult = await smsListener.processIncomingSms(
            msg.address,
            msg.body,
            new Date(msg.date)
          );

          if (processResult.isDuplicate) {
            result.duplicates++;
          } else if (processResult.success) {
            result.processed++;

            // Update stats based on type
            const senderType = smsFilter.getSenderType(msg.address);
            if (senderType === 'mpesa') {
              // Check if it's Fuliza
              if (msg.body.toLowerCase().includes('fuliza')) {
                result.stats.fuliza++;
              } else {
                result.stats.mpesa++;
              }
            } else if (senderType === 'bank') {
              result.stats.bank++;
            } else if (senderType === 'card') {
              result.stats.card++;
            }
          } else {
            result.errors++;
          }
        } catch (err) {
          console.error('Error processing SMS:', err);
          result.errors++;
        }

        // Report progress every 5 messages or at the end
        if (i % 5 === 0 || i === totalToProcess - 1) {
          const progressPercent = 25 + Math.floor((i / totalToProcess) * 70);
          onProgress?.(progressPercent, result);
        }
      }

      onProgress?.(100, result);
      return result;
    } catch (err) {
      console.error('Error reading SMS:', err);
      throw err;
    }
  }

  async getSmsSummary(period: ImportPeriod): Promise<{
    total: number;
    financial: number;
  }> {
    if (Platform.OS !== 'android') {
      return { total: 0, financial: 0 };
    }

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      return { total: 0, financial: 0 };
    }

    const minDate = getPeriodTimestamp(period);

    try {
      const filter = {
        box: 'inbox',
        minDate: minDate > 0 ? minDate : undefined,
        maxCount: 10000,
      };

      const messages = await this.readSmsFromDevice(filter);
      const financialCount = messages.filter((msg) =>
        smsFilter.shouldProcess(msg.address, msg.body)
      ).length;

      return {
        total: messages.length,
        financial: financialCount,
      };
    } catch {
      return { total: 0, financial: 0 };
    }
  }
}

export const smsReader = SmsReaderService.getInstance();
