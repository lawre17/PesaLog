/**
 * Settings Service
 * Manages app settings and onboarding state
 */

import { eq } from 'drizzle-orm';
import { db, userSettings } from '@/db';
import type { AppSettings } from '@/types';

const SETTINGS_KEYS = {
  ONBOARDING_COMPLETED: 'onboarding_completed',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  SMS_LISTENER_ENABLED: 'sms_listener_enabled',
  DARK_MODE_OVERRIDE: 'dark_mode_override',
  DEFAULT_CURRENCY: 'default_currency',
} as const;

export class SettingsService {
  private static instance: SettingsService;
  private cache: Map<string, string | null> = new Map();

  private constructor() {}

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  /**
   * Get a setting value
   */
  async get(key: string): Promise<string | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) ?? null;
    }

    const [setting] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.key, key));

    const value = setting?.value ?? null;
    this.cache.set(key, value);
    return value;
  }

  /**
   * Set a setting value
   */
  async set(key: string, value: string | null): Promise<void> {
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.key, key));

    if (existing.length > 0) {
      await db
        .update(userSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(userSettings.key, key));
    } else {
      await db.insert(userSettings).values({ key, value });
    }

    this.cache.set(key, value);
  }

  /**
   * Get boolean setting
   */
  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return defaultValue;
    return value === 'true';
  }

  /**
   * Set boolean setting
   */
  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.set(key, value ? 'true' : 'false');
  }

  /**
   * Check if onboarding is completed
   */
  async isOnboardingCompleted(): Promise<boolean> {
    return this.getBoolean(SETTINGS_KEYS.ONBOARDING_COMPLETED, false);
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<void> {
    await this.setBoolean(SETTINGS_KEYS.ONBOARDING_COMPLETED, true);
  }

  /**
   * Reset onboarding (for testing)
   */
  async resetOnboarding(): Promise<void> {
    await this.setBoolean(SETTINGS_KEYS.ONBOARDING_COMPLETED, false);
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    return this.getBoolean(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, true);
  }

  /**
   * Set notifications enabled
   */
  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await this.setBoolean(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, enabled);
  }

  /**
   * Check if SMS listener is enabled
   */
  async isSmsListenerEnabled(): Promise<boolean> {
    return this.getBoolean(SETTINGS_KEYS.SMS_LISTENER_ENABLED, true);
  }

  /**
   * Set SMS listener enabled
   */
  async setSmsListenerEnabled(enabled: boolean): Promise<void> {
    await this.setBoolean(SETTINGS_KEYS.SMS_LISTENER_ENABLED, enabled);
  }

  /**
   * Get all settings
   */
  async getAll(): Promise<AppSettings> {
    return {
      hasCompletedOnboarding: await this.isOnboardingCompleted(),
      notificationsEnabled: await this.areNotificationsEnabled(),
      smsListenerEnabled: await this.isSmsListenerEnabled(),
      darkModeOverride: (await this.get(SETTINGS_KEYS.DARK_MODE_OVERRIDE)) as
        | 'light'
        | 'dark'
        | 'system'
        | undefined,
      defaultCurrency: (await this.get(SETTINGS_KEYS.DEFAULT_CURRENCY)) || 'KES',
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton export
export const settingsService = SettingsService.getInstance();
