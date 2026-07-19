import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

// Web'e yayınlanan sürümün adresi — şifre sıfırlama e-postasındaki link buraya döner
// (native tarafta bu link tarayıcıda açılır, oradan yeni şifre belirlenir).
const RESET_PASSWORD_URL = 'https://coachbook-roan.vercel.app/reset-password';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: RESET_PASSWORD_URL,
    });
    setLoading(false);
    // Hesap var mı yok mu bilgisini sızdırmamak için hata olsa bile aynı "gönderildi"
    // mesajını gösteriyoruz — Supabase da zaten bu davranışı öneriyor.
    if (err) {
      console.warn('resetPasswordForEmail:', err.message);
    }
    setSent(true);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>COACHBOOK</Text>
        <Text style={styles.title}>Şifremi Unuttum</Text>

        {sent ? (
          <>
            <Text style={styles.info}>
              {email.trim()} adresine bir şifre sıfırlama linki gönderdik. Gelen kutunu (ve spam klasörünü) kontrol et,
              linke tıklayıp yeni şifreni belirle.
            </Text>
            <Link href="/(auth)/login" style={styles.link}>
              Girişe dön
            </Link>
          </>
        ) : (
          <>
            <Text style={styles.info}>Hesabına kayıtlı e-posta adresini gir, sana bir şifre sıfırlama linki gönderelim.</Text>
            <AuthField label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="ornek@eposta.com" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Sıfırlama Linki Gönder" onPress={onSubmit} loading={loading} disabled={!email.trim()} />
            <Text style={styles.link} onPress={() => router.back()}>
              ‹ Girişe dön
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { fontSize: 10, fontWeight: '700', letterSpacing: 4, color: C.greyD, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: C.white, marginBottom: 16 },
  info: { fontSize: 13, color: C.grey, lineHeight: 19, marginBottom: 18 },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
  link: { color: C.lime, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 18 },
});
