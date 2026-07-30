import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthField } from '../../components/AuthField';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { useUpdateBrandName, useUpdateOwnName } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

function useOnErr() {
  const t = useT();
  return (title: string) => (e: any) => showAlert(title, e.message ?? t('common.error'));
}

export default function HesapDuzenleScreen() {
  const t = useT();
  const onErr = useOnErr();
  const { profile, session, refreshProfile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const updateName = useUpdateOwnName(profile?.id);
  const updateBrandName = useUpdateBrandName(profile?.id);

  const [nameDraft, setNameDraft] = useState(profile?.name ?? '');
  const [brandNameDraft, setBrandNameDraft] = useState(profile?.brand_name ?? '');
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
      showAlert(t('hesap.err_change_title'), error.message);
    } else {
      showAlert(t('hesap.confirm_needed_title'), t('hesap.confirm_needed_body'));
      setEmailDraft('');
    }
  }

  async function savePassword() {
    if (passwordDraft.length < 6) {
      showAlert(t('hesap.password_too_short_title'), t('hesap.password_too_short_body'));
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordDraft });
    setPasswordSaving(false);
    if (error) {
      showAlert(t('hesap.err_change_title'), error.message);
    } else {
      showAlert(t('hesap.success_title'), t('hesap.password_updated_body'));
      setPasswordDraft('');
    }
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>{t('hesap.back')}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('hesap.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Panel title={t('hesap.title')} right={t('hesap.subtitle')}>
          <AuthField label={t('ayarlar.name')} value={nameDraft} onChangeText={setNameDraft} placeholder={t('placeholder.example_name')} />
          <PrimaryButton
            label={t('hesap.save_name_btn')}
            loading={updateName.isPending}
            disabled={!nameDraft.trim() || nameDraft.trim() === profile?.name}
            onPress={() =>
              updateName.mutate(nameDraft.trim(), {
                onSuccess: () => refreshProfile(),
                onError: onErr(t('antrenman.err_save_title')),
              })
            }
          />

          {isTrainer && (
            <>
              <View style={styles.divider} />
              <AuthField
                label={t('hesap.brand_name_label')}
                value={brandNameDraft}
                onChangeText={setBrandNameDraft}
                placeholder={t('hesap.brand_name_placeholder')}
              />
              <PrimaryButton
                label={t('hesap.save_brand_btn')}
                loading={updateBrandName.isPending}
                disabled={brandNameDraft.trim() === (profile?.brand_name ?? '')}
                onPress={() =>
                  updateBrandName.mutate(brandNameDraft.trim(), {
                    onSuccess: () => refreshProfile(),
                    onError: onErr(t('antrenman.err_save_title')),
                  })
                }
              />
            </>
          )}

          <View style={styles.divider} />

          <AuthField label={t('hesap.new_email_label')} value={emailDraft} onChangeText={setEmailDraft} keyboardType="email-address" placeholder={session?.user.email ?? ''} />
          <PrimaryButton label={t('hesap.change_email_btn')} loading={emailSaving} disabled={!emailDraft.trim()} onPress={saveEmail} />

          <View style={styles.divider} />

          <AuthField label={t('hesap.new_password_label')} value={passwordDraft} onChangeText={setPasswordDraft} secureTextEntry placeholder={t('hesap.new_password_placeholder')} />
          <PrimaryButton label={t('hesap.change_password_btn')} loading={passwordSaving} disabled={!passwordDraft.trim()} onPress={savePassword} />
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
