import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { settingsService } from '@/services/settings.service';

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

function SettingsItem({
  title,
  subtitle,
  onPress,
  rightElement,
  destructive,
}: SettingsItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsItem,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemContent}>
        <Text
          style={[
            styles.settingsItemTitle,
            { color: destructive ? colors.error : colors.text },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.settingsItemSubtitle, { color: colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>
          {'\u203A'}
        </Text>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This feature will allow you to export all your transaction data.',
      [{ text: 'OK' }]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all your data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Will implement database reset
            Alert.alert('Data Cleared', 'All data has been deleted.');
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the onboarding flow. You will be taken through the setup again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await settingsService.resetOnboarding();
            router.replace('/onboarding' as never);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

        {/* SMS & Permissions */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          SMS & PERMISSIONS
        </Text>
        <Card variant="outlined" style={styles.section}>
          <SettingsItem
            title="Import Historical SMS"
            subtitle="Scan existing SMS for transactions"
            onPress={() => router.push('/import' as never)}
          />
        </Card>

        {/* Categories */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          CATEGORIES
        </Text>
        <Card variant="outlined" style={styles.section}>
          <SettingsItem
            title="Manage Categories"
            subtitle="Add, edit, or delete categories"
            onPress={() => router.push('/categories' as never)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsItem
            title="Merchant Mappings"
            subtitle="View learned merchant-category mappings"
            onPress={() => router.push('/merchants' as never)}
          />
        </Card>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          NOTIFICATIONS
        </Text>
        <Card variant="outlined" style={styles.section}>
          <SettingsItem
            title="Classification Prompts"
            subtitle="Get notified for new transactions"
            onPress={() => {}}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsItem
            title="Debt Reminders"
            subtitle="Get reminded before due dates"
            onPress={() => {}}
          />
        </Card>

        {/* Data */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          DATA
        </Text>
        <Card variant="outlined" style={styles.section}>
          <SettingsItem
            title="Export Data"
            subtitle="Download your transaction history"
            onPress={handleExportData}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsItem
            title="Clear All Data"
            subtitle="Delete all stored data"
            onPress={handleClearData}
            destructive
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsItem
            title="Reset Onboarding"
            subtitle="Go through the onboarding flow again"
            onPress={handleResetOnboarding}
          />
        </Card>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          ABOUT
        </Text>
        <Card variant="outlined" style={styles.section}>
          <SettingsItem
            title="Version"
            rightElement={
              <Text style={[styles.versionText, { color: colors.textSecondary }]}>
                1.0.0
              </Text>
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsItem title="Privacy Policy" onPress={() => {}} />
        </Card>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          PesaLog - Your personal finance companion{'\n'}
          All data is stored locally on your device
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
    padding: 0,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
  },
  settingsItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    marginLeft: 8,
  },
  versionText: {
    fontSize: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
  },
});
