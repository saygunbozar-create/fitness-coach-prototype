import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';

export default function AuthLayout() {
  const { session, profile } = useAuth();

  // Her iki rol de Panel'e gidiyor — danışanın da artık kendi özet ekranı var.
  if (session && profile) return <Redirect href="/(app)/panel" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}
