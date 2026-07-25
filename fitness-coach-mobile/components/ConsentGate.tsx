import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useAcceptConsent } from '../lib/queries';
import { C } from '../lib/theme';
import { ConsentCheckbox } from './ConsentCheckbox';

// Bu hesap, KVKK onay kutusu uygulamaya eklenmeden (22 Temmuz 2026) önce oluşturulmuş —
// yani onay kaydı hiç alınmamış. Devam edebilmek için geriye dönük olarak burada isteniyor.
export function ConsentGate({ profileId }: { profileId: string }) {
  const { signOut, refreshProfile } = useAuth();
  const [checked, setChecked] = useState(false);
  const acceptConsent = useAcceptConsent(profileId);

  async function handleAccept() {
    await acceptConsent.mutateAsync();
    await refreshProfile();
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Gizlilik onayı gerekiyor</Text>
        <Text style={styles.body}>
          Hesabın, aşağıdaki metinler uygulamaya eklenmeden önce oluşturulmuş. Devam edebilmek için okuyup
          onaylaman gerekiyor.
        </Text>
        <ConsentCheckbox checked={checked} onToggle={() => setChecked((v) => !v)} />
        {acceptConsent.isError ? <Text style={styles.error}>Bir şeyler ters gitti, tekrar dener misin?</Text> : null}
        <Pressable
          style={[styles.button, (!checked || acceptConsent.isPending) && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={!checked || acceptConsent.isPending}
        >
          {acceptConsent.isPending ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Text style={styles.buttonText}>Kabul Ediyorum, Devam Et</Text>
          )}
        </Pressable>
        <Pressable onPress={signOut} hitSlop={10} style={styles.signOutRow}>
          <Text style={styles.signOutLink}>Çıkış yap</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, maxWidth: 480, alignSelf: 'center', width: '100%' },
  title: { color: C.white, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  body: { color: C.grey, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  error: { color: C.red, fontSize: 13, marginBottom: 12 },
  button: {
    backgroundColor: C.lime,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: C.bg, fontWeight: '800', fontSize: 15 },
  signOutRow: { alignItems: 'center', marginTop: 20 },
  signOutLink: { color: C.greyD, fontSize: 13, fontWeight: '600' },
});
