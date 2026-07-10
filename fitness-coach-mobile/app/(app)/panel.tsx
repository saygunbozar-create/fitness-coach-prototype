import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Ring } from '../../components/Ring';
import { LineChart } from '../../components/LineChart';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AuthField } from '../../components/AuthField';
import { useAuth } from '../../lib/auth';
import { useClient, useLogWeight, useMeals, useWeightLogs, useWorkout } from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';

const WEEKS = 12;

export default function PanelScreen() {
  const { profile } = useAuth();
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const workoutQuery = useWorkout(selectedClientId ?? undefined);
  const mealsQuery = useMeals(selectedClientId ?? undefined);
  const weightLogsQuery = useWeightLogs(selectedClientId ?? undefined);
  const logWeight = useLogWeight(selectedClientId ?? undefined);
  const [weightInput, setWeightInput] = useState('');

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
              ['En Yüksek 1RM', `${nf(client.pr, 1)} kg`],
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
                logWeight.mutate(v, { onSuccess: () => setWeightInput('') });
              }
            }}
          />
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
});
