import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { Panel } from '../../components/Panel';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { disableWaterReminder, enableWaterReminder, getWaterReminderPrefs, type WaterReminderPrefs } from '../../lib/notifications';
import { useClientByProfile, useClients, useDeleteOwnAccount, useProfileById } from '../../lib/queries';
import { C } from '../../lib/theme';

const REMINDER_INTERVALS = [1, 2, 3, 4];

function WaterReminderCard() {
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
        setNotice('Bildirim izni verilmedi. Telefon ayarlarından izin vermen gerekiyor.');
      } else if (result === 'unsupported') {
        setNotice('Bildirimler web önizlemede desteklenmiyor, telefonda dene.');
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
    <Panel title="Su İçme Hatırlatıcısı" right="💧">
      <View style={styles.waterRow}>
        <Text style={styles.waterLabel}>{prefs.enabled ? `08:00–22:00 arası her ${prefs.intervalHours} saatte bir` : 'Kapalı'}</Text>
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
            <Text style={[styles.waterPeriodBtnText, prefs.intervalHours === h && { color: C.bg }]}>{h} saat</Text>
          </Pressable>
        ))}
      </View>
      {notice && <Text style={styles.waterNotice}>{notice}</Text>}
      {Platform.OS === 'web' && !notice && <Text style={styles.waterNotice}>Gerçek bildirim için telefonda dene.</Text>}
    </Panel>
  );
}

function DeleteAccountCard() {
  const { signOut } = useAuth();
  const deleteAccount = useDeleteOwnAccount();

  function confirmDelete() {
    showAlert(
      'Hesabını silmek istediğine emin misin?',
      'Bu işlem geri alınamaz. Hesabın ve tüm verilerin (antrenman, beslenme, ölçüm, ödeme geçmişi vb.) kalıcı olarak silinir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabımı Sil',
          style: 'destructive',
          onPress: () => {
            deleteAccount.mutate(undefined, {
              onSuccess: () => signOut(),
              onError: (e: any) => showAlert('Silinemedi', e.message ?? 'Hesap silinemedi.'),
            });
          },
        },
      ]
    );
  }

  return (
    <Panel title="Tehlikeli Bölge" right="⚠️">
      <Text style={styles.deleteHint}>Hesabını ve tüm verilerini kalıcı olarak siler. Bu işlem geri alınamaz.</Text>
      <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={deleteAccount.isPending} hitSlop={4}>
        <Text style={styles.deleteBtnText}>{deleteAccount.isPending ? 'Siliniyor...' : 'Hesabımı Sil'}</Text>
      </Pressable>
    </Panel>
  );
}

export default function AyarlarScreen() {
  const { profile, session } = useAuth();
  const isTrainer = profile?.role === 'trainer';

  const ownClientQuery = useClientByProfile(!isTrainer ? profile?.id : undefined);
  const trainerProfileQuery = useProfileById(!isTrainer ? ownClientQuery.data?.trainer_id : undefined);
  const clientsQuery = useClients(isTrainer ? profile?.id : undefined);

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
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Aktif Danışan Sayısı</Text>
                <Text style={styles.value}>{clientsQuery.data?.filter((c) => c.is_active).length ?? 0}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Pasif Danışan Sayısı</Text>
                <Text style={styles.value}>{clientsQuery.data?.filter((c) => !c.is_active).length ?? 0}</Text>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Antrenör</Text>
              <Text style={styles.value}>{trainerProfileQuery.data?.name ?? '—'}</Text>
            </View>
          )}
          <Pressable style={styles.editBtn} onPress={() => router.push('/(app)/hesap-duzenle')} hitSlop={8}>
            <Text style={styles.editBtnText}>✎ Düzenle</Text>
          </Pressable>
        </Panel>

        <WaterReminderCard />

        {isTrainer && (
          <Panel title="Premium" right="🚀">
            <Text style={styles.premiumText}>Premium özellikler yakında burada olacak.</Text>
            <Text style={styles.premiumSub}>Gelişmiş raporlar, sınırsız danışan ve daha fazlası için çalışıyoruz.</Text>
          </Panel>
        )}

        <Panel title="Uygulama Hakkında" right="v1.0.0">
          <Text style={styles.aboutText}>Coachbook</Text>
          <Text style={styles.aboutSub}>
            Antrenör ve danışanların antrenman, beslenme ve ilerleme takibini tek yerde yönetmesi için geliştirildi.
          </Text>
        </Panel>

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
  waterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  waterLabel: { fontSize: 13, color: C.white, fontWeight: '600', flex: 1, marginRight: 10 },
  waterPeriodRow: { flexDirection: 'row', gap: 8 },
  waterPeriodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  waterPeriodBtnText: { fontSize: 12, fontWeight: '700', color: C.grey },
  waterNotice: { fontSize: 11, color: C.orange, marginTop: 8 },
  deleteHint: { fontSize: 11, color: C.grey, lineHeight: 16, marginBottom: 12 },
  deleteBtn: { borderWidth: 1, borderColor: C.red, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: C.red },
});
