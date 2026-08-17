import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';

export default function Index() {
  const { session, profile, loading, recoveryMode } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  // Şifre sıfırlama linki buraya (sitenin köküne) düşmüş olabilir: Supabase, istenen
  // yönlendirme adresi izin listesinde değilse onu yok sayıp Site URL'e atıyor. O durumda
  // kullanıcı şifre ekranı yerine giriş ekranında kalıyordu — bayrak varsa oraya taşıyoruz.
  if (recoveryMode) return <Redirect href="/reset-password" />;
  if (!session || !profile) return <Redirect href="/(auth)/login" />;
  return <Redirect href={'/(app)/panel'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
});
