import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../components/AuthField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { C } from '../lib/theme';

// Bu ekran BİLEREK (auth) grubunun dışında, kök seviyede — (auth)/_layout.tsx "session varsa
// uygulamaya yönlendir" kuralı burada da çalışırsa, şifre sıfırlama linkine tıklayınca kurulan
// geçici "recovery" oturumu bu sayfayı hiç göstermeden kullanıcıyı uygulamaya atardı.
export default function ResetPassword() {
  const { session } = useAuth();
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase, linkteki access_token'ı URL'den okuyup oturumu asenkron kuruyor —
    // ilk render'da session henüz null olabilir, kısa bir bekleme sonrası kontrol ediyoruz.
    const t = setTimeout(() => setChecked(true), 1500);
    return () => clearTimeout(t);
  }, []);

  async function onSubmit() {
    setError(null);
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  }

  if (!checked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.flex}>
        <View style={styles.content}>
          <Text style={styles.brand}>COACHBOOK</Text>
          <Text style={styles.title}>Link Geçersiz</Text>
          <Text style={styles.info}>
            Bu şifre sıfırlama linki geçersiz veya süresi dolmuş. Uygulamadaki "Şifremi unuttum" ile yeni bir link iste.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>COACHBOOK</Text>
        <Text style={styles.title}>Yeni Şifre Belirle</Text>

        {done ? (
          <>
            <Text style={styles.info}>Şifren güncellendi. Devam etmek için aşağıya dokun.</Text>
            <PrimaryButton label="Uygulamaya Git" onPress={() => router.replace('/')} />
          </>
        ) : (
          <>
            <AuthField label="Yeni Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 6 karakter" />
            <AuthField label="Yeni Şifre (Tekrar)" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Şifreyi Güncelle" onPress={onSubmit} loading={loading} disabled={!password || !confirm} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { fontSize: 10, fontWeight: '700', letterSpacing: 4, color: C.greyD, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: C.white, marginBottom: 16 },
  info: { fontSize: 13, color: C.grey, lineHeight: 19, marginBottom: 18 },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
});
