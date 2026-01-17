import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

type PermissionStatus = 'pending' | 'granted' | 'denied';

export default function PermissionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [smsPermission, setSmsPermission] = useState<PermissionStatus>('pending');
  const [notificationPermission, setNotificationPermission] =
    useState<PermissionStatus>('pending');

  // Request SMS permission (Android only)
  const requestSmsPermission = async () => {
    if (Platform.OS !== 'android') {
      // iOS doesn't support SMS reading
      Alert.alert(
        'Not Available',
        'SMS reading is only available on Android. On iOS, you can manually add transactions.',
        [{ text: 'OK' }]
      );
      setSmsPermission('denied');
      return;
    }

    // Note: Actual SMS permission requires native module
    // For now, we'll show instructions
    Alert.alert(
      'SMS Permission',
      'PesaLog needs access to read your SMS messages to automatically track financial transactions.\n\nThis permission will be requested when the app starts tracking.',
      [
        {
          text: 'Grant Later',
          style: 'cancel',
          onPress: () => setSmsPermission('denied'),
        },
        {
          text: 'OK',
          onPress: () => setSmsPermission('granted'),
        },
      ]
    );
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      if (existingStatus === 'granted') {
        setNotificationPermission('granted');
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        setNotificationPermission('granted');
      } else {
        setNotificationPermission('denied');
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in Settings to get alerts for new transactions and debt reminders.'
        );
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      setNotificationPermission('denied');
    }
  };

  const handleContinue = () => {
    router.push('/onboarding/import' as never);
  };

  const handleSkip = () => {
    router.push('/onboarding/import' as never);
  };

  const allPermissionsHandled =
    smsPermission !== 'pending' && notificationPermission !== 'pending';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          App Permissions
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          PesaLog needs a few permissions to work its magic
        </Text>

        {/* Permission Cards */}
        <View style={styles.permissions}>
          {/* SMS Permission */}
          <PermissionCard
            icon="📱"
            title="SMS Access"
            description="Read financial SMS messages to automatically track your transactions"
            status={smsPermission}
            onRequest={requestSmsPermission}
            colors={colors}
            required={Platform.OS === 'android'}
          />

          {/* Notification Permission */}
          <PermissionCard
            icon="🔔"
            title="Notifications"
            description="Get alerts to categorize new transactions and debt reminders"
            status={notificationPermission}
            onRequest={requestNotificationPermission}
            colors={colors}
          />
        </View>

        {/* Privacy Note */}
        <View
          style={[styles.privacyNote, { backgroundColor: colors.backgroundSecondary }]}
        >
          <Text style={[styles.privacyIcon]}>🔒</Text>
          <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
            Your data never leaves your device. All SMS messages are processed
            locally and we only store financial transaction data.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {!allPermissionsHandled ? (
          <Pressable
            style={[styles.skipButton, { borderColor: colors.border }]}
            onPress={handleSkip}
          >
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
              Skip for now
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function PermissionCard({
  icon,
  title,
  description,
  status,
  onRequest,
  colors,
  required = false,
}: {
  icon: string;
  title: string;
  description: string;
  status: PermissionStatus;
  onRequest: () => void;
  colors: typeof Colors.light;
  required?: boolean;
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'granted':
        return colors.success;
      case 'denied':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Skipped';
      default:
        return 'Request';
    }
  };

  return (
    <View style={[styles.permissionCard, { backgroundColor: colors.card }]}>
      <View style={styles.permissionHeader}>
        <Text style={styles.permissionIcon}>{icon}</Text>
        <View style={styles.permissionInfo}>
          <View style={styles.permissionTitleRow}>
            <Text style={[styles.permissionTitle, { color: colors.text }]}>
              {title}
            </Text>
            {required && (
              <View
                style={[styles.requiredBadge, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.permissionDescription, { color: colors.textSecondary }]}
          >
            {description}
          </Text>
        </View>
      </View>
      <Pressable
        style={[
          styles.permissionButton,
          {
            backgroundColor:
              status === 'pending' ? colors.primary : getStatusColor(),
          },
        ]}
        onPress={onRequest}
        disabled={status !== 'pending'}
      >
        <Text style={styles.permissionButtonText}>{getStatusText()}</Text>
      </Pressable>
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
  },
  permissions: {
    marginTop: 32,
    gap: 16,
  },
  permissionCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  permissionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  requiredText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  permissionDescription: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  permissionButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  privacyNote: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  privacyIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  privacyText: {
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
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
