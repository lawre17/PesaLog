import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DatabaseProvider, useDatabaseReady } from '@/contexts/database.context';
import { NotificationProvider } from '@/contexts/notification.context';
import { Colors } from '@/constants/theme';
import { settingsService } from '@/services/settings.service';

export const unstable_settings = {
  anchor: '(tabs)',
};

function LoadingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading PesaLog...
      </Text>
    </View>
  );
}

function ErrorScreen({ error }: { error: Error }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorText, { color: colors.error }]}>
        Failed to initialize database
      </Text>
      <Text style={[styles.errorDetail, { color: colors.textSecondary }]}>
        {error.message}
      </Text>
    </View>
  );
}

function RootNavigator() {
  const { isLoading: dbLoading, error } = useDatabaseReady();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string>('(tabs)');

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const completed = await settingsService.isOnboardingCompleted();
        setInitialRoute(completed ? '(tabs)' : 'onboarding');
      } catch (err) {
        console.error('Failed to check onboarding status:', err);
        setInitialRoute('(tabs)');
      } finally {
        setIsCheckingOnboarding(false);
      }
    }

    if (!dbLoading && !error) {
      checkOnboarding();
    }
  }, [dbLoading, error]);

  if (dbLoading || isCheckingOnboarding) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <Stack initialRouteName={initialRoute}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      <Stack.Screen
        name="transaction/[id]"
        options={{ presentation: 'card', title: 'Transaction' }}
      />
      <Stack.Screen
        name="transaction/classify/[id]"
        options={{ presentation: 'modal', title: 'Classify Transaction' }}
      />
      <Stack.Screen
        name="debts/index"
        options={{ presentation: 'card', title: 'Debts' }}
      />
      <Stack.Screen
        name="debts/[id]"
        options={{ presentation: 'card', title: 'Debt Details' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <DatabaseProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NotificationProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </NotificationProvider>
      </ThemeProvider>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorDetail: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
