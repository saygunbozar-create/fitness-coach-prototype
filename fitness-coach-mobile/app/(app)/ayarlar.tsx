import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { useClientByProfile, useClients, useProfileById, useUpdateOwnName } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

function onErr(title: string) {
  return (e: any) => Alert.alert(title, e.message ?? 'Bir hata oluştu.');
}

export default function AyarlarScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const isTrainer = profile?.role === 'trainer';

  const ownClientQuery = useClientByProfile(!isTrainer ? profile?.id : undefined);
  const trainerProfileQuery = useProfileById(!isTrainer ? ownClientQuery.data?.trainer_id : undefined);
  const clientsQuery = useClients(isTrainer ? profile?.id : undefined);
  const updateName = useUpdateOwnName(profile?.id);

  const [nameDraft, setNameDraft] = useState(profile?.name ?? '');
  const [emailDraft, setEmailDraft] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function saveEmail() {
    if (!emailDraft.trim()) return;
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: emailDraft.trim() });
    setEmailSaving(false);
    if (error) {
      Alert.alert('Değiştirilemedi', error.message);
    } else {
      Alert.alert('Onay gerekli', 'Yeni e-posta adresine bir onay bağlantısı gönderildi. Onaylayana kadar eski e-postan geçerli kalır.');
      setEmailDraft('');
    }
  }

  async function savePassword() {
    if (passwordDraft.length < 6) {
      Alert.alert('Şifre çok kısa', 'Şifre en az 6 karakter olmalı.');
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordDraft });
    setPasswordSaving(false);
    if (error) {
      Alert.alert('Değiştirilemedi', error.message);
    } else {
      Alert.alert('Başarılı', 'Şifren güncellendi.');
      setPasswordDraft('');
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Ayarlar" />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Üyelik Bilgileri" right={isTrainer ? 'Antrenör' : 'Danışan'}>
          <View style={styles.row}>
            <Text style={styles.label}>Ad Soyad</Text>
            <Text style={styles.value}>{profile?.name ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>E-posta</Text>
            <Text style={styles.value}>{session?.user.email ?? '—'}</Text>
          </View>
          {isTrainer ? (
            <View style={styles.row}>
              <Text style={styles.label}>Danışan Sayısı</Text>
              <Text style={styles.value}>{clientsQuery.data?.length ?? 0}</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Antrenör</Text>
              <Text style={styles.value}>{trainerProfileQuery.data?.name ?? '—'}</Text>
            </View>
          )}
        </Panel>

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

        <Panel title="Premium" right="🚀">
          <Text style={styles.premiumText}>Premium özellikler yakında burada olacak.</Text>
          <Text style={styles.premiumSub}>Gelişmiş raporlar, sınırsız danışan ve daha fazlası için çalışıyoruz.</Text>
        </Panel>

        <Panel title="Uygulama Hakkında" right="v1.0.0">
          <Text style={styles.aboutText}>Fitness Coach</Text>
          <Text style={styles.aboutSub}>
            Antrenör ve danışanların antrenman, beslenme ve ilerleme takibini tek yerde yönetmesi için geliştirildi.
          </Text>
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.edge,
  },
  label: { fontSize: 12, color: C.grey },
  value: { fontSize: 13, fontWeight: '700', color: C.white },
  divider: { height: 1, backgroundColor: C.edge, marginVertical: 16 },
  premiumText: { fontSize: 14, fontWeight: '700', color: C.lime, marginBottom: 4 },
  premiumSub: { fontSize: 12, color: C.grey, lineHeight: 18 },
  aboutText: { fontSize: 15, fontWeight: '800', color: C.white, marginBottom: 6 },
  aboutSub: { fontSize: 12, color: C.grey, lineHeight: 18 },
});
