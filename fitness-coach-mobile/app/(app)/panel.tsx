import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Ring } from '../../components/Ring';
import { LineChart } from '../../components/LineChart';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AuthField } from '../../components/AuthField';
import { useAuth } from '../../lib/auth';
import { disableWaterReminder, enableWaterReminder, getWaterReminderPrefs, type WaterReminderPrefs } from '../../lib/notifications';
import {
  useCheckinsInRange,
  useClient,
  useLogWeight,
  useMeals,
  usePayments,
  usePrLogs,
  useSessionLogs,
  useWeightLogs,
  useWorkout,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, localDateStr, nf } from '../../lib/theme';

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
        <Text style={styles.waterLabel}>{prefs.enabled ? `Her ${prefs.intervalHours} saatte bir hatırlatılıyor` : 'Kapalı'}</Text>
        <Switch
          value={prefs.enabled}
          onValueChange={toggle}
          disabled={busy}
          trackColor={{ false: C.edge, true: C.lime }}
          thumbColor={C.white}
        />
      </View>
      <View style={styles.periodRow}>
        {REMINDER_INTERVALS.map((h) => (
          <Pressable
            key={h}
            onPress={() => changeInterval(h)}
            disabled={busy}
            style={[styles.periodBtn, prefs.intervalHours === h && { backgroundColor: C.lime, borderColor: C.lime }]}
          >
            <Text style={[styles.periodBtnText, prefs.intervalHours === h && { color: C.bg }]}>{h} saat</Text>
          </Pressable>
        ))}
      </View>
      {notice && <Text style={styles.waterNotice}>{notice}</Text>}
      {Platform.OS === 'web' && !notice && <Text style={styles.waterNotice}>Gerçek bildirim için telefonda dene.</Text>}
    </Panel>
  );
}

const WEEKS = 12;
const REPORT_PERIODS = [
  { label: 'Haftalık', days: 7 },
  { label: 'Aylık', days: 30 },
  { label: 'Yıl Sonu', days: 365 },
];

export default function PanelScreen() {
  const { profile } = useAuth();
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const workoutQuery = useWorkout(selectedClientId ?? undefined);
  const mealsQuery = useMeals(selectedClientId ?? undefined);
  const weightLogsQuery = useWeightLogs(selectedClientId ?? undefined);
  const prLogsQuery = usePrLogs(selectedClientId ?? undefined);
  const paymentsQuery = usePayments(selectedClientId ?? undefined);
  const logWeight = useLogWeight(selectedClientId ?? undefined);
  const [weightInput, setWeightInput] = useState('');
  const [reportDays, setReportDays] = useState(7);
  const sessionLogsQuery = useSessionLogs(selectedClientId ?? undefined, reportDays);
  const checkinsRangeQuery = useCheckinsInRange(selectedClientId ?? undefined, reportDays);

  const client = clientQuery.data;

  const kpis = useMemo(() => {
    const days = workoutQuery.data ?? [];
    const sets = days.reduce((a, d) => a + d.exercises.reduce((x, r) => x + r.set_count, 0), 0);
    const vol = days.reduce((a, d) => a + d.exercises.reduce((x, r) => x + r.set_count * r.rep_count * r.kg, 0), 0);
    return { days: days.length, sets, vol };
  }, [workoutQuery.data]);

  const kcalToday = useMemo(() => {
    const meals = mealsQuery.data ?? [];
    return meals.reduce((a, m) => a + m.items.reduce((x, it) => x + it.kcal * it.todayQty, 0), 0);
  }, [mealsQuery.data]);

  const proj = useMemo(() => {
    if (!client) return [];
    const weeklyDelta = ((client.kcal_target - client.tdee) * 7) / 7700;
    return Array.from({ length: WEEKS + 1 }, (_, i) => client.start_weight + weeklyDelta * i);
  }, [client]);

  const actual = useMemo(() => {
    const logs = weightLogsQuery.data ?? [];
    if (!client) return [];
    return logs.length ? logs.map((l) => l.weight) : [client.start_weight];
  }, [weightLogsQuery.data, client]);

  const report = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - reportDays);
    const sinceStr = localDateStr(since);

    const weightsInRange = (weightLogsQuery.data ?? []).filter((l) => l.date >= sinceStr);
    const weightChange = weightsInRange.length >= 2 ? weightsInRange[weightsInRange.length - 1].weight - weightsInRange[0].weight : 0;

    const paymentsInRange = (paymentsQuery.data ?? []).filter((p) => p.date >= sinceStr);
    const totalPaid = paymentsInRange.reduce((a, p) => a + p.amount, 0);

    const prsInRange = (prLogsQuery.data ?? []).filter((p) => p.date >= sinceStr).length;

    const sessions = sessionLogsQuery.data ?? [];
    const completed = sessions.filter((s) => s.status === 'tamamlandi').length;
    const skipped = sessions.filter((s) => s.status === 'atlandi').length;

    const checkins = checkinsRangeQuery.data ?? [];
    const avgMood = checkins.length
      ? checkins.reduce((a, c) => a + (c.uyku + c.enerji + c.motivasyon - c.stres - c.aclik) / 5, 0) / checkins.length
      : null;

    return { weightChange, totalPaid, prsInRange, completed, skipped, avgMood, weightEntries: weightsInRange.length };
  }, [reportDays, weightLogsQuery.data, paymentsQuery.data, prLogsQuery.data, sessionLogsQuery.data, checkinsRangeQuery.data]);

  if (clientQuery.isLoading || !client) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  const currentWeight = actual[actual.length - 1] ?? client.start_weight;
  const diff = currentWeight - client.start_weight;
  const pct = client.kcal_target > 0 ? (kcalToday / client.kcal_target) * 100 : 0;
  const prLogs = prLogsQuery.data ?? [];
  const bestPr = prLogs.length ? Math.max(...prLogs.map((l) => l.weight)) : client.pr;

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Panel" clientName={client.name} showPill={profile?.role === 'trainer'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Kontrol Paneli" right={client.goal}>
          <View style={styles.kpiGrid}>
            {[
              ['Antrenman Günü', `${kpis.days} gün`],
              ['Toplam Set', String(kpis.sets)],
              ['Haftalık Hacim', `${nf(kpis.vol)} kg`],
              ['En Yüksek 1RM', `${nf(bestPr, 1)} kg`],
            ].map(([l, v]) => (
              <View key={l} style={styles.kpi}>
                <Text style={styles.kpiLabel}>{l}</Text>
                <Text style={styles.kpiValue}>{v}</Text>
              </View>
            ))}
          </View>
        </Panel>

        <Panel title="Bugünkü Kalori" right={`Hedef ${nf(client.kcal_target)} kcal`}>
          <View style={styles.calRow}>
            <Ring pct={pct} />
            <View style={styles.calInfo}>
              <Text style={styles.calValue}>{nf(kcalToday)} kcal alındı</Text>
              <Text style={[styles.calNote, pct > 105 && { color: C.orange }]}>
                {pct > 105 ? `Hedefin ${nf(kcalToday - client.kcal_target)} kcal üzerinde` : 'Hedef aralığında'}
              </Text>
              <Text style={styles.calTdee}>TDEE: {nf(client.tdee)} kcal · otomatik</Text>
            </View>
          </View>
        </Panel>

        <Panel title="Kilo Durumu" right={`${WEEKS} haftalık plan`}>
          <View style={styles.weightRow}>
            <Text style={styles.weightBig}>{nf(currentWeight, 1)} kg</Text>
            <Text style={[styles.weightDiff, { color: diff <= 0 ? C.lime : C.orange }]}>
              {diff > 0 ? '+' : ''}
              {nf(diff, 1)} kg
            </Text>
          </View>
          {proj.length > 0 && <LineChart proj={proj} actual={actual} />}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: C.lime }]} />
              <Text style={styles.legendText}>Gerçekleşen</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatchDashed]} />
              <Text style={styles.legendText}>Projeksiyon</Text>
            </View>
          </View>

          <View style={styles.logRow}>
            <View style={{ flex: 1 }}>
              <AuthField
                label="Bugünün kilosunu gir"
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="Ör. 79.5"
              />
            </View>
          </View>
          <PrimaryButton
            label="Kaydet"
            loading={logWeight.isPending}
            disabled={!weightInput}
            onPress={() => {
              const v = parseFloat(weightInput.replace(',', '.'));
              if (!Number.isNaN(v)) {
                logWeight.mutate(v, {
                  onSuccess: () => setWeightInput(''),
                  onError: (e: any) => Alert.alert('Kaydedilemedi', e.message ?? 'Kilo kaydedilemedi.'),
                });
              }
            }}
          />
        </Panel>

        {profile?.role !== 'trainer' && <WaterReminderCard />}

        <Panel title="Rapor" right={REPORT_PERIODS.find((p) => p.days === reportDays)?.label}>
          <View style={styles.periodRow}>
            {REPORT_PERIODS.map((p) => (
              <Pressable
                key={p.days}
                onPress={() => setReportDays(p.days)}
                style={[styles.periodBtn, reportDays === p.days && { backgroundColor: C.lime, borderColor: C.lime }]}
              >
                <Text style={[styles.periodBtnText, reportDays === p.days && { color: C.bg }]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.kpiGrid}>
            {[
              ['Kilo Değişimi', report.weightEntries >= 2 ? `${report.weightChange > 0 ? '+' : ''}${nf(report.weightChange, 1)} kg` : '—'],
              ['Tamamlanan Seans', String(report.completed)],
              ['Atlanan Seans', String(report.skipped)],
              ['Yeni PR', String(report.prsInRange)],
              ['Toplam Ödeme', `${nf(report.totalPaid)} ₺`],
              ['Ort. Ruh Hali', report.avgMood != null ? nf(report.avgMood, 1) : '—'],
            ].map(([l, v]) => (
              <View key={l} style={styles.kpi}>
                <Text style={styles.kpiLabel}>{l}</Text>
                <Text style={styles.kpiValue}>{v}</Text>
              </View>
            ))}
          </View>
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '47%', backgroundColor: C.card2, borderLeftWidth: 3, borderLeftColor: C.lime, borderRadius: 12, padding: 10 },
  kpiLabel: { fontSize: 11, color: C.grey, marginBottom: 4 },
  kpiValue: { fontSize: 17, fontWeight: '800', color: C.lime },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  calInfo: { flex: 1, gap: 3 },
  calValue: { color: C.white, fontWeight: '700', fontSize: 14 },
  calNote: { color: C.grey, fontSize: 12 },
  calTdee: { color: C.greyD, fontSize: 11 },
  weightRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 4 },
  weightBig: { fontSize: 28, fontWeight: '800', color: C.white },
  weightDiff: { fontSize: 13, fontWeight: '700' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 6, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 3 },
  legendSwatchDashed: { width: 16, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.greyD },
  legendText: { fontSize: 11, color: C.grey },
  logRow: { flexDirection: 'row', gap: 10 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  periodBtnText: { fontSize: 12, fontWeight: '700', color: C.grey },
  waterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  waterLabel: { fontSize: 13, color: C.white, fontWeight: '600', flex: 1, marginRight: 10 },
  waterNotice: { fontSize: 11, color: C.orange, marginTop: 8 },
});
