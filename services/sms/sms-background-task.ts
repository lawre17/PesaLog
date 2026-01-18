/**
 * SMS Background Task
 * Registers a background task to check for new SMS periodically
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { Platform } from 'react-native';
import { smsPolling } from './sms-polling.service';

export const SMS_BACKGROUND_TASK = 'SMS_BACKGROUND_TASK';

/**
 * Define the background task
 * This runs even when the app is closed
 */
TaskManager.defineTask(SMS_BACKGROUND_TASK, async () => {
  if (Platform.OS !== 'android') {
    return BackgroundTask.BackgroundTaskResult.NoData;
  }

  try {
    console.log('[BackgroundTask] Checking for new SMS...');
    const result = await smsPolling.checkForNewSms();

    if (result.processed > 0) {
      console.log(`[BackgroundTask] Processed ${result.processed} new transactions`);
      return BackgroundTask.BackgroundTaskResult.NewData;
    }

    return BackgroundTask.BackgroundTaskResult.NoData;
  } catch (error) {
    console.error('[BackgroundTask] Error:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Register the background task
 */
export async function registerBackgroundFetch(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    // Check if already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SMS_BACKGROUND_TASK);
    if (isRegistered) {
      console.log('[BackgroundTask] Already registered');
      return true;
    }

    await BackgroundTask.registerTaskAsync(SMS_BACKGROUND_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (minimum on Android)
    });

    console.log('[BackgroundTask] Registered successfully');
    return true;
  } catch (error) {
    console.error('[BackgroundTask] Registration failed:', error);
    return false;
  }
}

/**
 * Unregister the background task
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    await BackgroundTask.unregisterTaskAsync(SMS_BACKGROUND_TASK);
    console.log('[BackgroundTask] Unregistered');
  } catch (error) {
    console.error('[BackgroundTask] Unregister failed:', error);
  }
}

/**
 * Check background task status
 */
export async function getBackgroundFetchStatus(): Promise<BackgroundTask.BackgroundTaskStatus> {
  return await BackgroundTask.getStatusAsync();
}

/**
 * Check if task is registered
 */
export async function isBackgroundTaskRegistered(): Promise<boolean> {
  return await TaskManager.isTaskRegisteredAsync(SMS_BACKGROUND_TASK);
}
