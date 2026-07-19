import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HBar } from '../../components/HBar';
import { TrendChart } from '../../components/TrendChart';
import { useCardioLogs, useCheckinsInRange, useMeasurements, useWeightLogs } from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';

type HistoryType = 'checkin' | 'cardio' | 'measurement' | 'weight';

const CARDIO_METRICS = [
  { key: 'steps', label: 'Adım', format: (v: number) => nf(v) },
  { key: 'duration_minutes', label: 'Süre', format: (v: number) => `${nf(v)} dk` },
  { key: 'distance_km', label: 'Mesafe', format: (v: number) => `${nf(v, 1)} km` },
  { key: 'calories', label: 'Kalori', format: (v: number) => `${nf(v)} kcal` },
] as const;

const MEASURE_FIELDS = [
  { key: 'chest', label: 'Göğüs' },
  { key: 'waist', label: 'Bel' },
  { key: 'hip', label: 'Kalça' },
  { key: 'shoulder', label: 'Omuz' },
  { key: 'arm_left', label: 'Sol Kol' },
  { key: 'arm_right', label: 'Sağ Kol' },
  { key: 'thigh_left', label: 'Sol Bacak' },
  { key: 'thigh_right', label: 'Sağ Bacak' },
  { key: 'calf', label: 'Baldır' },
] as const;

const CHECKIN_FIELDS = [
  { key: 'uyku', label: 'Uyku' },
  { key: 'enerji', label: 'Enerji' },
  { key: 'aclik', label: 'Açlık' },
  { key: 'stres', label: 'Stres' },
  { key: 'motivasyon', label: 'Motivasyon' },
] as const;

const TITLES: Record<HistoryType, string> = {
  checkin: 'Check-in Geçmişi',
  cardio: 'Kardiyo & Adım Geçmişi',
  measurement: 'Ölçüm Geçmişi',
  weight: 'Kilo Geçmişi',
};

export default function IlerlemeGecmisScreen() {
  const { type: rawType } = useLocalSearchParams<{ type: string }>();
  const type: HistoryType =
    rawType === 'cardio' ? 'cardio' : rawType === 'measurement' ? 'measurement' : rawType === 'weight' ? 'weight' : 'checkin';
  const insets = useSafeAreaInsets();
  const { selectedClientId } = useSelectedClient();

  const [cardioMetric, setCardioMetric] = useState<(typeof CARDIO_METRICS)[number]['key']>('steps');
  const [measureField, setMeasureField] = useState<(typeof MEASURE_FIELDS)[number]['key']>('waist');

  const checkinsQuery = useCheckinsInRange(type === 'checkin' ? selectedClientId ?? undefined : undefined, 365);
  const cardioQuery = useCardioLogs(type === 'cardio' ? selectedClientId ?? undefined : undefined, 365);
  const measurementsQuery = useMeasurements(type === 'measurement' ? selectedClientId ?? undefined : undefined);
  const weightQuery = useWeightLogs(type === 'weight' ? selectedClientId ?? undefined : undefined);

  const isLoading =
    (type === 'checkin' && checkinsQuery.isLoading) ||
    (type === 'cardio' && cardioQuery.isLoading) ||
    (type === 'measurement' && measurementsQuery.isLoading) ||
    (type === 'weight' && weightQuery.isLoading);

  const checkins = useMemo(() => [...(checkinsQuery.data ?? [])].sort((a, b) => a.date.localeCompare(b.date)), [checkinsQuery.data]);
  const cardioLogs = useMemo(() => [...(cardioQuery.data ?? [])].sort((a, b) => a.date.localeCompare(b.date)), [cardioQuery.data]);
  const measurements = measurementsQuery.data ?? [];
  const weightLogs = weightQuery.data ?? [];
  const weightChartPoints = useMemo(() => weightLogs.map((w) => ({ date: w.date, value: w.weight })), [weightLogs]);

  const checkinChartPoints = useMemo(
    () =>
      checkins.map((c) => ({
        date: c.date,
        value: (c.uyku + c.enerji + c.aclik + c.stres + c.motivasyon) / 5,
      })),
    [checkins]
  );

  const cardioMetricDef = CARDIO_METRICS.find((m) => m.key === cardioMetric)!;
  const cardioChartPoints = useMemo(
    () => cardioLogs.map((c) => ({ date: c.date, value: c[cardioMetric] })),
    [cardioLogs, cardioMetric]
  );

  const measureChartPoints = useMemo(
    () =>
      measurements
        .filter((m) => m[measureField] != null)
        .map((m) => ({ date: m.date, value: m[measureField] as number })),
    [measurements, measureField]
  );

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Geri</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{TITLES[type]}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={C.lime} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {type === 'checkin' && (
            <>
              {checkinChartPoints.length > 0 ? (
                <TrendChart points={checkinChartPoints} color={C.lime} formatValue={(v) => nf(v, 1)} />
              ) : (
                <Text style={styles.empty}>Henüz kayıt yok.</Text>
              )}
              {[...checkins].reverse().map((c) => (
                <View key={c.id} style={styles.card}>
                  <Text style={styles.cardDate}>{c.date}</Text>
                  {CHECKIN_FIELDS.map((f) => (
                    <HBar key={f.key} label={f.label} value={c[f.key]} />
                  ))}
                </View>
              ))}
            </>
          )}

          {type === 'cardio' && (
            <>
              <View style={styles.pillRow}>
                {CARDIO_METRICS.map((m) => (
                  <Pressable
                    key={m.key}
                    style={[styles.pill, cardioMetric === m.key && styles.pillOn]}
                    onPress={() => setCardioMetric(m.key)}
                  >
                    <Text style={[styles.pillText, cardioMetric === m.key && styles.pillTextOn]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>
              {cardioChartPoints.length > 0 ? (
                <TrendChart points={cardioChartPoints} color={C.blue} formatValue={cardioMetricDef.format} />
              ) : (
                <Text style={styles.empty}>Henüz kayıt yok.</Text>
              )}
              {[...cardioLogs].reverse().map((c) => (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardDate}>{c.date}</Text>
                    {c.cardio_type ? <Text style={styles.cardTag}>{c.cardio_type}</Text> : null}
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statText}>{nf(c.steps)} adım</Text>
                    <Text style={styles.statText}>{nf(c.duration_minutes)} dk</Text>
                    <Text style={styles.statText}>{nf(c.distance_km, 1)} km</Text>
                    <Text style={styles.statText}>{nf(c.calories)} kcal</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {type === 'weight' && (
            <>
              {weightChartPoints.length > 0 ? (
                <TrendChart points={weightChartPoints} color={C.lime} formatValue={(v) => `${nf(v, 1)} kg`} />
              ) : (
                <Text style={styles.empty}>Henüz kayıt yok.</Text>
              )}
              {[...weightLogs].reverse().map((w) => (
                <View key={w.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardDate}>{w.date}</Text>
                    <Text style={styles.cardTag}>{nf(w.weight, 1)} kg</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {type === 'measurement' && (
            <>
              <View style={styles.pillRow}>
                {MEASURE_FIELDS.map((f) => (
                  <Pressable
                    key={f.key}
                    style={[styles.pill, measureField === f.key && styles.pillOn]}
                    onPress={() => setMeasureField(f.key)}
                  >
                    <Text style={[styles.pillText, measureField === f.key && styles.pillTextOn]}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>
              {measureChartPoints.length > 0 ? (
                <TrendChart points={measureChartPoints} color={C.orange} formatValue={(v) => `${nf(v, 1)} cm`} />
              ) : (
                <Text style={styles.empty}>Bu bölge için henüz kayıt yok.</Text>
              )}
              {[...measurements].reverse().map((m) => (
                <View key={m.id} style={styles.card}>
                  <Text style={styles.cardDate}>{m.date}</Text>
                  <View style={styles.measureRow}>
                    {MEASURE_FIELDS.map((f) => (
                      <View key={f.key} style={styles.measureCell}>
                        <Text style={styles.measureLabel}>{f.label}</Text>
                        <Text style={styles.measureValue}>{m[f.key] != null ? nf(m[f.key] as number, 1) : '—'}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  headerTitle: { fontSize: 15, fontWeight: '800', color: C.white },
  content: { padding: 16, paddingTop: 12 },
  empty: { color: C.greyD, fontSize: 12, textAlign: 'center', marginVertical: 20 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pill: { borderWidth: 1, borderColor: C.edge, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.card },
  pillOn: { backgroundColor: C.lime, borderColor: C.lime },
  pillText: { fontSize: 11, fontWeight: '700', color: C.grey },
  pillTextOn: { color: C.bg },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.edge, borderRadius: 14, padding: 12, marginTop: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { fontSize: 12, fontWeight: '800', color: C.white, marginBottom: 8 },
  cardTag: { fontSize: 11, color: C.blue, fontWeight: '700' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statText: { fontSize: 11, color: C.grey },
  measureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  measureCell: { width: '31%', backgroundColor: C.card2, borderRadius: 10, padding: 8, alignItems: 'center' },
  measureLabel: { fontSize: 9, color: C.grey },
  measureValue: { fontSize: 13, fontWeight: '800', color: C.white, marginTop: 2 },
});
