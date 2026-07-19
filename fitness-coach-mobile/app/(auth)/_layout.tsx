import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';

export default function AuthLayout() {
  const { session, profile } = useAuth();

  if (session && profile) return <Redirect href={profile.role === 'trainer' ? '/(app)/panel' : '/(app)/antrenman'} />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}
