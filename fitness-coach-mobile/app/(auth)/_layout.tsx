import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';

export default function AuthLayout() {
  const { session, profile, recoveryMode } = useAuth();

  // Şifre sıfırlamadan gelindiyse ÖNCE bu kontrol: kurtarma oturumu da geçerli bir oturum
  // olduğu için aşağıdaki kural kullanıcıyı şifre ekranını hiç göstermeden uygulamaya atardı.
  if (recoveryMode) return <Redirect href="/reset-password" />;

  // Her iki rol de Panel'e gidiyor — danışanın da artık kendi özet ekranı var.
  if (session && profile) return <Redirect href="/(app)/panel" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}
