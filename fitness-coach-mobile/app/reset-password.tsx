import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../components/AuthField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { C } from '../lib/theme';

// Bu ekran BİLEREK (auth) grubunun dışında, kök seviyede — (auth)/_layout.tsx "session varsa
// uygulamaya yönlendir" kuralı burada da çalışırsa, şifre sıfırlama linkine tıklayınca kurulan
// geçici "recovery" oturumu bu sayfayı hiç göstermeden kullanıcıyı uygulamaya atardı.
export default function ResetPassword() {
  const t = useT();
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
      setError(t('hesap.password_too_short_body'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.err_passwords_mismatch'));
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
          <Text style={styles.title}>{t('auth.link_invalid_title')}</Text>
          <Text style={styles.info}>
            {t('auth.link_invalid_body')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>COACHBOOK</Text>
        <Text style={styles.title}>{t('auth.reset_password_title')}</Text>

        {done ? (
          <>
            <Text style={styles.info}>{t('auth.password_updated_info')}</Text>
            <PrimaryButton label={t('auth.go_to_app_btn')} onPress={() => router.replace('/')} />
          </>
        ) : (
          <>
            <AuthField label={t('hesap.new_password_label')} value={password} onChangeText={setPassword} secureTextEntry placeholder={t('hesap.new_password_placeholder')} />
            <AuthField label={t('auth.new_password_repeat_label')} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={t('auth.update_password_btn')} onPress={onSubmit} loading={loading} disabled={!password || !confirm} />
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
