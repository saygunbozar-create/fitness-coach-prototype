import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { initNotificationChannel } from '../lib/notifications';
import { queryClient } from '../lib/queryClient';
import { SelectedClientProvider } from '../lib/selectedClient';
import { C } from '../lib/theme';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web') initNotificationChannel();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SelectedClientProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
          </SelectedClientProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
