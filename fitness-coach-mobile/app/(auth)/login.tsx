import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>FITNESS COACH</Text>
        <Text style={styles.title}>Giriş Yap</Text>

        <AuthField label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="ornek@eposta.com" />
        <AuthField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Giriş Yap" onPress={onSubmit} loading={loading} disabled={!email || !password} />

        <View style={styles.links}>
          <Link href="/(auth)/signup-trainer" style={styles.link}>
            Antrenör olarak kayıt ol
          </Link>
          <Link href="/(auth)/signup-client" style={styles.link}>
            Danışan olarak kayıt ol
          </Link>
        </View>
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
  links: { marginTop: 20, gap: 10, alignItems: 'center' },
  link: { color: C.lime, fontSize: 13, fontWeight: '600' },
});
