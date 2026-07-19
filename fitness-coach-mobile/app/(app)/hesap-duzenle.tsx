import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthField } from '../../components/AuthField';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../lib/auth';
import { useUpdateOwnName } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

function onErr(title: string) {
  return (e: any) => showAlert(title, e.message ?? 'Bir hata oluştu.');
}

export default function HesapDuzenleScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const updateName = useUpdateOwnName(profile?.id);

  const [nameDraft, setNameDraft] = useState(profile?.name ?? '');
  const [emailDraft, setEmailDraft] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const insets = useSafeAreaInsets();

  async function saveEmail() {
    if (!emailDraft.trim()) return;
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: emailDraft.trim() });
    setEmailSaving(false);
    if (error) {
      showAlert('Değiştirilemedi', error.message);
    } else {
      showAlert('Onay gerekli', 'Yeni e-posta adresine bir onay bağlantısı gönderildi. Onaylayana kadar eski e-postan geçerli kalır.');
      setEmailDraft('');
    }
  }

  async function savePassword() {
    if (passwordDraft.length < 6) {
      showAlert('Şifre çok kısa', 'Şifre en az 6 karakter olmalı.');
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordDraft });
    setPasswordSaving(false);
    if (error) {
      showAlert('Değiştirilemedi', error.message);
    } else {
      showAlert('Başarılı', 'Şifren güncellendi.');
      setPasswordDraft('');
    }
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Geri</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Hesap Bilgilerini Düzenle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Hesap Bilgilerini Düzenle" right="hesabın">
          <AuthField label="Ad Soyad" value={nameDraft} onChangeText={setNameDraft} placeholder="Ör. Mert K." />
          <PrimaryButton
            label="Adı Kaydet"
            loading={updateName.isPending}
            disabled={!nameDraft.trim() || nameDraft.trim() === profile?.name}
            onPress={() =>
              updateName.mutate(nameDraft.trim(), {
                onSuccess: () => refreshProfile(),
                onError: onErr('Kaydedilemedi'),
              })
            }
          />

          <View style={styles.divider} />

          <AuthField label="Yeni E-posta" value={emailDraft} onChangeText={setEmailDraft} keyboardType="email-address" placeholder={session?.user.email ?? ''} />
          <PrimaryButton label="E-postayı Değiştir" loading={emailSaving} disabled={!emailDraft.trim()} onPress={saveEmail} />

          <View style={styles.divider} />

          <AuthField label="Yeni Şifre" value={passwordDraft} onChangeText={setPasswordDraft} secureTextEntry placeholder="En az 6 karakter" />
          <PrimaryButton label="Şifreyi Değiştir" loading={passwordSaving} disabled={!passwordDraft.trim()} onPress={savePassword} />
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.edge,
  },
  back: { fontSize: 13, fontWeight: '700', color: C.grey },
  headerTitle: { fontSize: 14, fontWeight: '800', color: C.white },
  content: { padding: 16, paddingTop: 12 },
  divider: { height: 1, backgroundColor: C.edge, marginVertical: 16 },
});
