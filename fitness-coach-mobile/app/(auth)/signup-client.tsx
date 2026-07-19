import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';

export default function SignupClient() {
  const { signUpClient } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const { error: err } = await signUpClient(email.trim().toLowerCase(), password, name.trim());
    setLoading(false);
    if (err) setError(err);
    else setDone(true);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>COACHBOOK</Text>
        <Text style={styles.title}>Danışan Kaydı</Text>
        <Text style={styles.hint}>
          Antrenörünün seni eklediği e-posta adresiyle kayıt ol — hesabın otomatik olarak antrenörüne bağlanır.
        </Text>

        {done ? (
          <>
            <Text style={styles.success}>Kayıt tamamlandı. E-postanı onayladıktan sonra giriş yapabilirsin.</Text>
            <PrimaryButton label="Girişe dön" onPress={() => router.replace('/(auth)/login')} />
          </>
        ) : (
          <>
            <AuthField label="Ad Soyad" value={name} onChangeText={setName} placeholder="Ör. Mert K." />
            <AuthField
              label="E-posta (antrenörünün eklediği)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="ornek@eposta.com"
            />
            <AuthField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 6 karakter" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Kayıt Ol" onPress={onSubmit} loading={loading} disabled={!name || !email || !password} />
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
  title: { fontSize: 26, fontWeight: '800', color: C.white, marginBottom: 10 },
  hint: { fontSize: 12, color: C.grey, marginBottom: 20, lineHeight: 18 },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
  success: { color: C.lime, fontSize: 14, marginBottom: 20, lineHeight: 20 },
  link: { color: C.lime, fontSize: 13, fontWeight: '600', marginTop: 20, textAlign: 'center' },
});
