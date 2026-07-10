import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { AuthProvider } from '../lib/auth';
import { queryClient } from '../lib/queryClient';
import { SelectedClientProvider } from '../lib/selectedClient';
import { C } from '../lib/theme';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SelectedClientProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
        </SelectedClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
