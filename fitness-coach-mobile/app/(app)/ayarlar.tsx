import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { Panel } from '../../components/Panel';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { LANGUAGES, useT } from '../../lib/i18n';
import { disableWaterReminder, enableWaterReminder, getWaterReminderPrefs, type WaterReminderPrefs } from '../../lib/notifications';
import {
  useClientByProfile,
  useClients,
  useDeleteOwnAccount,
  usePlanTiers,
  useProfileById,
  useRegenerateCalendarToken,
  useUpdateLanguage,
} from '../../lib/queries';
import { C } from '../../lib/theme';
import type { Profile } from '../../lib/types';

const REMINDER_INTERVALS = [1, 2, 3, 4];
const LEGAL_BASE_URL = 'https://coachbook-roan.vercel.app/legal';

// Takvim aboneliği: kişiye özel gizli adres (bkz. migration 0067 + supabase/functions/calendar).
function CalendarPanel({ profile }: { profile: Profile }) {
  const t = useT();
  const { refreshProfile } = useAuth();
  const regenerate = useRegenerateCalendarToken();
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const feedUrl = `${base}/functions/v1/calendar?token=${profile.calendar_token}`;
  // webcal:// şeması iOS/macOS'ta doğrudan Takvim'i açar; Google ise https bekliyor.
  const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  async function copyLink() {
    try {
      // Web'de pano API'si; native'de Linking ile paylaşmak yerine kullanıcı adresi seçip
      // kopyalayabilsin diye metni de ekranda gösteriyoruz.
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(feedUrl);
        showAlert(t('takvim.title'), t('takvim.copied'));
        return;
      }
    } catch {
      /* pano kullanılamıyorsa aşağıdaki metinden elle kopyalanabilir */
    }
  }

  return (
    <Panel title={t('takvim.title')} right="📅">
      <Text style={styles.calIntro}>{t('takvim.intro')}</Text>

      <View style={styles.calBtnRow}>
        <Pressable style={styles.calBtn} onPress={() => Linking.openURL(webcalUrl)}>
          <Text style={styles.calBtnText}>{t('takvim.apple_btn')}</Text>
        </Pressable>
        <Pressable style={styles.calBtn} onPress={() => Linking.openURL(googleUrl)}>
          <Text style={styles.calBtnText}>{t('takvim.google_btn')}</Text>
        </Pressable>
      </View>

      <Text selectable style={styles.calUrl}>
        {feedUrl}
      </Text>
      <Pressable onPress={copyLink} hitSlop={8}>
        <Text style={styles.calCopy}>{t('takvim.copy_btn')}</Text>
      </Pressable>

      <Text style={styles.calWarning}>{t('takvim.warning')}</Text>
      <Pressable
        hitSlop={8}
        onPress={() =>
          showAlert(t('takvim.regenerate_confirm_title'), t('takvim.regenerate_confirm_body'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('takvim.regenerate_btn'),
              style: 'destructive',
              onPress: () =>
                regenerate.mutate(undefined, {
                  onSuccess: async () => {
                    await refreshProfile();
                    showAlert(t('takvim.title'), t('takvim.regenerated'));
                  },
                  onError: (e: any) => showAlert(t('takvim.title'), e.message ?? t('takvim.err_regenerate')),
                }),
            },
          ])
        }
      >
        <Text style={styles.calRegenerate}>{t('takvim.regenerate_btn')}</Text>
      </Pressable>
    </Panel>
  );
}

function PlanPanel({ profile, clientCount }: { profile: Profile; clientCount: number }) {
  const tiersQuery = usePlanTiers();
  const current = tiersQuery.data?.find((t) => t.tier === profile.plan_tier);
  const limit = current?.client_limit ?? null;

  return (
    <Panel title="Paketim" right="🚀">
      <View style={styles.row}>
        <Text style={styles.label}>Paket</Text>
        <Text style={styles.value}>{current?.label ?? '—'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Danışan Kullanımı</Text>
        <Text style={styles.value}>
          {clientCount} / {limit ?? 'Sınırsız'}
        </Text>
      </View>
      <Text style={styles.premiumSub}>Paketini yükseltmek için bize ulaş.</Text>
    </Panel>
  );
}

function LegalCard() {
  const t = useT();
  return (
    <Panel title={t('ayarlar.legal')} right="📄">
      <Pressable style={styles.legalRow} onPress={() => Linking.openURL(`${LEGAL_BASE_URL}/privacy-policy.html`)} hitSlop={4}>
        <Text style={styles.legalLink}>{t('ayarlar.privacy_policy')}</Text>
      </Pressable>
      <Pressable style={styles.legalRow} onPress={() => Linking.openURL(`${LEGAL_BASE_URL}/kullanim-sartlari.html`)} hitSlop={4}>
        <Text style={styles.legalLink}>{t('ayarlar.terms')}</Text>
      </Pressable>
      <Pressable style={[styles.legalRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL(`${LEGAL_BASE_URL}/kvkk-aydinlatma-metni.html`)} hitSlop={4}>
        <Text style={styles.legalLink}>{t('ayarlar.kvkk')}</Text>
      </Pressable>
    </Panel>
  );
}

function LanguagePanel({ profile }: { profile: Profile }) {
  const t = useT();
  const { refreshProfile } = useAuth();
  const updateLanguage = useUpdateLanguage(profile.id);

  return (
    <Panel title={t('ayarlar.language')} right="🌐">
      <View style={styles.waterPeriodRow}>
        {LANGUAGES.map((l) => (
          <Pressable
            key={l.code}
            onPress={() => updateLanguage.mutate(l.code, { onSuccess: () => refreshProfile() })}
            disabled={updateLanguage.isPending}
            style={[styles.waterPeriodBtn, profile.language === l.code && { backgroundColor: C.lime, borderColor: C.lime }]}
          >
            <Text style={[styles.waterPeriodBtnText, profile.language === l.code && { color: C.bg }]}>{l.nativeLabel}</Text>
          </Pressable>
        ))}
      </View>
    </Panel>
  );
}

function WaterReminderCard() {
  const t = useT();
  const [prefs, setPrefs] = useState<WaterReminderPrefs>({ enabled: false, intervalHours: 2 });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getWaterReminderPrefs().then(setPrefs);
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    setNotice(null);
    if (next) {
      const result = await enableWaterReminder(prefs.intervalHours);
      if (result === 'denied') {
        setNotice(t('ayarlar.water_denied'));
      } else if (result === 'unsupported') {
        setNotice(t('ayarlar.water_unsupported'));
      } else {
        setPrefs((p) => ({ ...p, enabled: true }));
      }
    } else {
      await disableWaterReminder();
      setPrefs((p) => ({ ...p, enabled: false }));
    }
    setBusy(false);
  }

  async function changeInterval(hours: number) {
    setPrefs((p) => ({ ...p, intervalHours: hours }));
    if (prefs.enabled) {
      setBusy(true);
      await enableWaterReminder(hours);
      setBusy(false);
    }
  }

  return (
    <Panel title={t('ayarlar.water_reminder')} right="💧">
      <View style={styles.waterRow}>
        <Text style={styles.waterLabel}>
          {prefs.enabled ? t('ayarlar.water_on', { hours: prefs.intervalHours }) : t('ayarlar.water_off')}
        </Text>
        <Switch
          value={prefs.enabled}
          onValueChange={toggle}
          disabled={busy}
          trackColor={{ false: C.edge, true: C.lime }}
          thumbColor={C.white}
        />
      </View>
      <View style={styles.waterPeriodRow}>
        {REMINDER_INTERVALS.map((h) => (
          <Pressable
            key={h}
            onPress={() => changeInterval(h)}
            disabled={busy}
            style={[styles.waterPeriodBtn, prefs.intervalHours === h && { backgroundColor: C.lime, borderColor: C.lime }]}
          >
            <Text style={[styles.waterPeriodBtnText, prefs.intervalHours === h && { color: C.bg }]}>{t('ayarlar.water_hours', { hours: h })}</Text>
          </Pressable>
        ))}
      </View>
      {notice && <Text style={styles.waterNotice}>{notice}</Text>}
      {Platform.OS === 'web' && !notice && <Text style={styles.waterNotice}>{t('ayarlar.water_web_hint')}</Text>}
    </Panel>
  );
}

function DeleteAccountCard() {
  const t = useT();
  const { signOut } = useAuth();
  const deleteAccount = useDeleteOwnAccount();

  function confirmDelete() {
    showAlert(t('ayarlar.delete_confirm_title'), t('ayarlar.delete_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('ayarlar.delete_btn'),
        style: 'destructive',
        onPress: () => {
          deleteAccount.mutate(undefined, {
            onSuccess: () => signOut(),
            onError: (e: any) => showAlert(t('common.deleted_error_title'), e.message ?? t('common.deleted_error')),
          });
        },
      },
    ]);
  }

  return (
    <Panel title={t('ayarlar.danger_zone')} right="⚠️">
      <Text style={styles.deleteHint}>{t('ayarlar.delete_hint')}</Text>
      <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={deleteAccount.isPending} hitSlop={4}>
        <Text style={styles.deleteBtnText}>{deleteAccount.isPending ? t('ayarlar.deleting') : t('ayarlar.delete_btn')}</Text>
      </Pressable>
    </Panel>
  );
}

export default function AyarlarScreen() {
  const t = useT();
  const { profile, session } = useAuth();
  const isTrainer = profile?.role === 'trainer';

  const ownClientQuery = useClientByProfile(!isTrainer ? profile?.id : undefined);
  const trainerProfileQuery = useProfileById(!isTrainer ? ownClientQuery.data?.trainer_id : undefined);
  const clientsQuery = useClients(isTrainer ? profile?.id : undefined);

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('ayarlar.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title={t('ayarlar.membership_info')} right={isTrainer ? t('ayarlar.role_trainer') : t('ayarlar.role_client')}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('ayarlar.name')}</Text>
            <Text style={styles.value}>{profile?.name ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('ayarlar.email')}</Text>
            <Text style={styles.value}>{session?.user.email ?? '—'}</Text>
          </View>
          {isTrainer ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>{t('ayarlar.active_clients')}</Text>
                <Text style={styles.value}>{clientsQuery.data?.filter((c) => c.is_active).length ?? 0}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>{t('ayarlar.paused_clients')}</Text>
                <Text style={styles.value}>{clientsQuery.data?.filter((c) => !c.is_active).length ?? 0}</Text>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>{t('ayarlar.trainer_label')}</Text>
              <Text style={styles.value}>{trainerProfileQuery.data?.name ?? '—'}</Text>
            </View>
          )}
          <Pressable style={styles.editBtn} onPress={() => router.push('/(app)/hesap-duzenle')} hitSlop={8}>
            <Text style={styles.editBtnText}>{t('ayarlar.edit')}</Text>
          </Pressable>
        </Panel>

        {profile && <LanguagePanel profile={profile} />}

        {profile && <CalendarPanel profile={profile} />}

        <WaterReminderCard />

        {/* Paket/limit sistemi taslak aşamasında, henüz yayında değil. Devreye almak için bu satırı geri aç: */}
        {/* {isTrainer && profile && <PlanPanel profile={profile} clientCount={clientsQuery.data?.length ?? 0} />} */}

        <Panel title={t('ayarlar.about')} right="v1.0.0">
          <Text style={styles.aboutText}>Coachbook</Text>
          <Text style={styles.aboutSub}>{t('ayarlar.about_sub')}</Text>
        </Panel>

        <LegalCard />

        <DeleteAccountCard />
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
  editBtn: { alignSelf: 'flex-start', marginTop: 14 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: C.lime },
  premiumText: { fontSize: 14, fontWeight: '700', color: C.lime, marginBottom: 4 },
  premiumSub: { fontSize: 12, color: C.grey, lineHeight: 18 },
  aboutText: { fontSize: 15, fontWeight: '800', color: C.white, marginBottom: 6 },
  aboutSub: { fontSize: 12, color: C.grey, lineHeight: 18 },
  calIntro: { fontSize: 12.5, color: C.grey, lineHeight: 18, marginBottom: 12 },
  calBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  calBtn: {
    flexGrow: 1,
    minWidth: 140,
    borderWidth: 1,
    borderColor: C.lime,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  calBtnText: { fontSize: 12, fontWeight: '700', color: C.lime },
  calUrl: {
    fontSize: 10.5,
    color: C.greyD,
    backgroundColor: C.card2,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  calCopy: { fontSize: 11.5, fontWeight: '700', color: C.lime, marginBottom: 12 },
  calWarning: { fontSize: 11, color: C.orange, lineHeight: 16, marginBottom: 10 },
  calRegenerate: { fontSize: 11.5, fontWeight: '700', color: C.red },
  waterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  waterLabel: { fontSize: 13, color: C.white, fontWeight: '600', flex: 1, marginRight: 10 },
  waterPeriodRow: { flexDirection: 'row', gap: 8 },
  waterPeriodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  waterPeriodBtnText: { fontSize: 12, fontWeight: '700', color: C.grey },
  waterNotice: { fontSize: 11, color: C.orange, marginTop: 8 },
  deleteHint: { fontSize: 11, color: C.grey, lineHeight: 16, marginBottom: 12 },
  deleteBtn: { borderWidth: 1, borderColor: C.red, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: C.red },
  legalRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.edge },
  legalLink: { fontSize: 13, fontWeight: '600', color: C.lime },
});
