import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { ConsentCheckbox } from '../../components/ConsentCheckbox';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';

export default function SignupTrainer() {
  const { signUpTrainer } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const { error: err } = await signUpTrainer(email.trim(), password, name.trim(), consent);
    setLoading(false);
    if (err) setError(err);
    else setDone(true);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>COACHBOOK</Text>
        <Text style={styles.title}>Antrenör Kaydı</Text>

        {done ? (
          <>
            <Text style={styles.success}>Kayıt tamamlandı. E-postanı onayladıktan sonra giriş yapabilirsin.</Text>
            <PrimaryButton label="Girişe dön" onPress={() => router.replace('/(auth)/login')} />
          </>
        ) : (
          <>
            <AuthField label="Ad Soyad" value={name} onChangeText={setName} placeholder="Ör. Ahmet Yılmaz" />
            <AuthField label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="ornek@eposta.com" />
            <AuthField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 6 karakter" />
            <ConsentCheckbox checked={consent} onToggle={() => setConsent((v) => !v)} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Kayıt Ol" onPress={onSubmit} loading={loading} disabled={!name || !email || !password || !consent} />
          </>
        )}

        <Link href="/(auth)/login" style={styles.link}>
          Zaten hesabın var mı? Giriş yap
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { fontSize: 10, fontWeight: '700', letterSpacing: 4, color: C.greyD, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: C.white, marginBottom: 24 },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
  success: { color: C.lime, fontSize: 14, marginBottom: 20, lineHeight: 20 },
  link: { color: C.lime, fontSize: 13, fontWeight: '600', marginTop: 20, textAlign: 'center' },
});
