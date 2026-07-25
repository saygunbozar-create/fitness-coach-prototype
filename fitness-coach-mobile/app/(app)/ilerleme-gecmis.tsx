import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '../../lib/alert';
import { HBar } from '../../components/HBar';
import { TrendChart } from '../../components/TrendChart';
import { useT } from '../../lib/i18n';
import {
  useCardioLogs,
  useCheckinsInRange,
  useDeleteCardioLog,
  useDeleteCheckin,
  useDeleteMeasurement,
  useDeleteWeightLog,
  useMeasurements,
  useWeightLogs,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';

type HistoryType = 'checkin' | 'cardio' | 'measurement' | 'weight';

const CARDIO_METRICS = [
  { key: 'steps', labelKey: 'ilerleme_gecmis.metric_steps' },
  { key: 'duration_minutes', labelKey: 'ilerleme_gecmis.metric_duration' },
  { key: 'distance_km', labelKey: 'ilerleme_gecmis.metric_distance' },
  { key: 'calories', labelKey: 'ilerleme_gecmis.metric_calories' },
] as const;

const MEASURE_FIELDS = [
  { key: 'chest', labelKey: 'ilerleme_gecmis.measure_chest' },
  { key: 'waist', labelKey: 'ilerleme_gecmis.measure_waist' },
  { key: 'hip', labelKey: 'ilerleme_gecmis.measure_hip' },
  { key: 'shoulder', labelKey: 'ilerleme_gecmis.measure_shoulder' },
  { key: 'arm_left', labelKey: 'ilerleme_gecmis.measure_arm_left' },
  { key: 'arm_right', labelKey: 'ilerleme_gecmis.measure_arm_right' },
  { key: 'thigh_left', labelKey: 'ilerleme_gecmis.measure_thigh_left' },
  { key: 'thigh_right', labelKey: 'ilerleme_gecmis.measure_thigh_right' },
  { key: 'calf', labelKey: 'ilerleme_gecmis.measure_calf' },
] as const;

const CHECKIN_FIELDS = [
  { key: 'uyku', labelKey: 'ilerleme.field_sleep' },
  { key: 'enerji', labelKey: 'ilerleme.field_energy' },
  { key: 'aclik', labelKey: 'ilerleme.field_hunger' },
  { key: 'stres', labelKey: 'ilerleme.field_stress' },
  { key: 'motivasyon', labelKey: 'ilerleme.field_motivation' },
] as const;

export default function IlerlemeGecmisScreen() {
  const t = useT();
  const { type: rawType } = useLocalSearchParams<{ type: string }>();
  const type: HistoryType =
    rawType === 'cardio' ? 'cardio' : rawType === 'measurement' ? 'measurement' : rawType === 'weight' ? 'weight' : 'checkin';
  const insets = useSafeAreaInsets();
  const { selectedClientId } = useSelectedClient();

  const [cardioMetric, setCardioMetric] = useState<(typeof CARDIO_METRICS)[number]['key']>('steps');
  const [measureField, setMeasureField] = useState<(typeof MEASURE_FIELDS)[number]['key']>('waist');

  const titles: Record<HistoryType, string> = {
    checkin: t('ilerleme_gecmis.title_checkin'),
    cardio: t('ilerleme_gecmis.title_cardio'),
    measurement: t('ilerleme_gecmis.title_measurement'),
    weight: t('ilerleme_gecmis.title_weight'),
  };
  const cardioMetrics = CARDIO_METRICS.map((m) => ({ key: m.key, label: t(m.labelKey) }));
  const measureFields = MEASURE_FIELDS.map((f) => ({ key: f.key, label: t(f.labelKey) }));
  const checkinFields = CHECKIN_FIELDS.map((f) => ({ key: f.key, label: t(f.labelKey) }));
  function cardioFormatValue(v: number): string {
    if (cardioMetric === 'duration_minutes') return `${nf(v)} ${t('ilerleme_gecmis.unit_min_suffix')}`;
    if (cardioMetric === 'distance_km') return `${nf(v, 1)} km`;
    if (cardioMetric === 'calories') return `${nf(v)} kcal`;
    return nf(v);
  }

  const checkinsQuery = useCheckinsInRange(type === 'checkin' ? selectedClientId ?? undefined : undefined, 365);
  const cardioQuery = useCardioLogs(type === 'cardio' ? selectedClientId ?? undefined : undefined, 365);
  const measurementsQuery = useMeasurements(type === 'measurement' ? selectedClientId ?? undefined : undefined);
  const weightQuery = useWeightLogs(type === 'weight' ? selectedClientId ?? undefined : undefined);

  const deleteCheckin = useDeleteCheckin(selectedClientId ?? undefined);
  const deleteCardio = useDeleteCardioLog(selectedClientId ?? undefined);
  const deleteMeasurement = useDeleteMeasurement(selectedClientId ?? undefined);
  const deleteWeight = useDeleteWeightLog(selectedClientId ?? undefined);

  function confirmDelete(dateLabel: string, onConfirm: () => void) {
    showAlert(t('ilerleme_gecmis.delete_record_title'), t('ilerleme_gecmis.delete_record_body', { date: dateLabel }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: onConfirm },
    ]);
  }

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
          <Text style={styles.back}>{t('hesap.back')}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{titles[type]}</Text>
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
                <Text style={styles.empty}>{t('ilerleme.no_records_yet')}</Text>
              )}
              {[...checkins].reverse().map((c) => (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardDate}>{c.date}</Text>
                    <Pressable
                      onPress={() => confirmDelete(c.date, () => deleteCheckin.mutate(c.id, { onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('ilerleme_gecmis.err_record_delete')) }))}
                      hitSlop={8}
                    >
                      <Text style={styles.cardDelete}>{t('common.delete')}</Text>
                    </Pressable>
                  </View>
                  {checkinFields.map((f) => (
                    <HBar key={f.key} label={f.label} value={c[f.key]} />
                  ))}
                </View>
              ))}
            </>
          )}

          {type === 'cardio' && (
            <>
              <View style={styles.pillRow}>
                {cardioMetrics.map((m) => (
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
                <TrendChart points={cardioChartPoints} color={C.blue} formatValue={cardioFormatValue} />
              ) : (
                <Text style={styles.empty}>{t('ilerleme.no_records_yet')}</Text>
              )}
              {[...cardioLogs].reverse().map((c) => (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardDate}>{c.date}</Text>
                    <View style={styles.cardTopRight}>
                      {c.cardio_type ? <Text style={styles.cardTag}>{c.cardio_type}</Text> : null}
                      <Pressable
                        onPress={() => confirmDelete(c.date, () => deleteCardio.mutate(c.id, { onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('ilerleme_gecmis.err_record_delete')) }))}
                        hitSlop={8}
                      >
                        <Text style={styles.cardDelete}>{t('common.delete')}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statText}>{nf(c.steps)} {t('ilerleme_gecmis.unit_steps_suffix')}</Text>
                    <Text style={styles.statText}>{nf(c.duration_minutes)} {t('ilerleme_gecmis.unit_min_suffix')}</Text>
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
                <Text style={styles.empty}>{t('ilerleme.no_records_yet')}</Text>
              )}
              {[...weightLogs].reverse().map((w) => (
                <View key={w.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardDate}>{w.date}</Text>
                    <View style={styles.cardTopRight}>
                      <Text style={styles.cardTag}>{nf(w.weight, 1)} kg</Text>
                      <Pressable
                        onPress={() => confirmDelete(w.date, () => deleteWeight.mutate(w.id, { onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('ilerleme_gecmis.err_record_delete')) }))}
                        hitSlop={8}
                      >
                        <Text style={styles.cardDelete}>{t('common.delete')}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {type === 'measurement' && (
            <>
              <View style={styles.pillRow}>
                {measureFields.map((f) => (
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
                <Text style={styles.empty}>{t('ilerleme_gecmis.no_records_region')}</Text>
              )}
              {[...measurements].reverse().map((m) => (
                <View key={m.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardDate}>{m.date}</Text>
                    <Pressable
                      onPress={() => confirmDelete(m.date, () => deleteMeasurement.mutate(m.id, { onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('ilerleme_gecmis.err_record_delete')) }))}
                      hitSlop={8}
                    >
                      <Text style={styles.cardDelete}>{t('common.delete')}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.measureRow}>
                    {measureFields.map((f) => (
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
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardDate: { fontSize: 12, fontWeight: '800', color: C.white, marginBottom: 8 },
  cardTag: { fontSize: 11, color: C.blue, fontWeight: '700' },
  cardDelete: { fontSize: 11, fontWeight: '700', color: C.red },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statText: { fontSize: 11, color: C.grey },
  measureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  measureCell: { width: '31%', backgroundColor: C.card2, borderRadius: 10, padding: 8, alignItems: 'center' },
  measureLabel: { fontSize: 9, color: C.grey },
  measureValue: { fontSize: 13, fontWeight: '800', color: C.white, marginTop: 2 },
});
