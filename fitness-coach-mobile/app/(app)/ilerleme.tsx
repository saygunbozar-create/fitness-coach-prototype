import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { LineChart } from '../../components/LineChart';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Stepper } from '../../components/Stepper';
import { useAuth } from '../../lib/auth';
import {
  useAddInjuryLog,
  useCardioLogs,
  useClient,
  useDeleteInjuryLog,
  useDeleteProgressPhoto,
  useInjuryLogs,
  useLatestCheckin,
  useLogCardio,
  useLogMeasurement,
  useMeasurements,
  useProgressPhotos,
  useSaveCheckin,
  useUploadProgressPhoto,
  useWeightLogs,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';

const WEEKS = 12;
const FIELDS: { key: 'uyku' | 'enerji' | 'aclik' | 'stres' | 'motivasyon'; label: string }[] = [
  { key: 'uyku', label: 'Uyku' },
  { key: 'enerji', label: 'Enerji' },
  { key: 'aclik', label: 'Açlık' },
  { key: 'stres', label: 'Stres' },
  { key: 'motivasyon', label: 'Motivasyon' },
];

const MEASURE_FIELDS: { key: 'chest' | 'waist' | 'hip' | 'arm' | 'thigh' | 'calf'; label: string }[] = [
  { key: 'chest', label: 'Göğüs (cm)' },
  { key: 'waist', label: 'Bel (cm)' },
  { key: 'hip', label: 'Kalça (cm)' },
  { key: 'arm', label: 'Kol (cm)' },
  { key: 'thigh', label: 'Bacak (cm)' },
  { key: 'calf', label: 'Baldır (cm)' },
];

export default function IlerlemeScreen() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const weightLogsQuery = useWeightLogs(selectedClientId ?? undefined);
  const checkinQuery = useLatestCheckin(selectedClientId ?? undefined);
  const saveCheckin = useSaveCheckin(selectedClientId ?? undefined);
  const measurementsQuery = useMeasurements(selectedClientId ?? undefined);
  const logMeasurement = useLogMeasurement(selectedClientId ?? undefined);
  const photosQuery = useProgressPhotos(selectedClientId ?? undefined);
  const uploadPhoto = useUploadProgressPhoto(selectedClientId ?? undefined);
  const deletePhoto = useDeleteProgressPhoto(selectedClientId ?? undefined);
  const cardioQuery = useCardioLogs(selectedClientId ?? undefined);
  const logCardio = useLogCardio(selectedClientId ?? undefined);
  const injuryQuery = useInjuryLogs(selectedClientId ?? undefined);
  const addInjury = useAddInjuryLog(selectedClientId ?? undefined);
  const deleteInjury = useDeleteInjuryLog(selectedClientId ?? undefined);

  const [draft, setDraft] = useState({ uyku: 5, enerji: 5, aclik: 5, stres: 5, motivasyon: 5 });
  const [measureDraft, setMeasureDraft] = useState({ chest: '', waist: '', hip: '', arm: '', thigh: '', calf: '' });
  const [cardioDraft, setCardioDraft] = useState({ cardio_type: '', duration_minutes: '', distance_km: '', steps: '', calories: '' });
  const [injuryDraft, setInjuryDraft] = useState({ body_part: '', severity: 3, note: '' });

  const client = clientQuery.data;

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

  const checkin = checkinQuery.data;
  const entries = checkin ? FIELDS.map((f) => [f.label, checkin[f.key]] as const) : [];
  const avg = entries.length ? entries.reduce((a, [, v]) => a + v, 0) / entries.length : 0;
  const low = entries.some(([, v]) => v <= 4);
  const weeklyDelta = proj.length > 1 ? proj[1] - proj[0] : 0;

  const measurements = measurementsQuery.data ?? [];
  const latestMeasurement = measurements[measurements.length - 1];
  const prevMeasurement = measurements[measurements.length - 2];

  const cardioWeek = [...(cardioQuery.data ?? [])].reverse();
  const maxSteps = Math.max(1, ...cardioWeek.map((c) => c.steps));
  const avgSteps = cardioWeek.length ? Math.round(cardioWeek.reduce((a, c) => a + c.steps, 0) / cardioWeek.length) : 0;

  async function pickPhoto() {
    if (!selectedClientId) {
      Alert.alert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf eklemek için galeri izni vermen gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    uploadPhoto.mutate(
      { uri: asset.uri, mimeType: asset.mimeType },
      { onError: (e: any) => Alert.alert('Yüklenemedi', e.message ?? 'Fotoğraf yüklenirken bir hata oldu.') }
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="İlerleme" clientName={client.name} showPill={profile?.role === 'trainer'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Haftalık Check-in" right={checkin ? `Ortalama ${nf(avg, 1)} / 10` : 'Henüz kayıt yok'}>
          {checkin && (
            <View style={styles.ciBars}>
              {entries.map(([k, v]) => (
                <View key={k} style={styles.ciCol}>
                  <Text style={styles.ciValue}>{v}</Text>
                  <View style={[styles.ciBar, { height: `${v * 10}%`, backgroundColor: v <= 4 ? C.red : C.lime }]} />
                  <Text style={styles.ciLabel}>{k}</Text>
                </View>
              ))}
            </View>
          )}
          {checkin && (
            <View style={styles.note}>
              <Text style={styles.noteText}>
                {low ? 'Düşük skor tespit edildi — danışanla görüşme öner.' : 'Tüm skorlar sağlıklı aralıkta.'}
              </Text>
            </View>
          )}

          {!isTrainer && (
            <>
              <View style={styles.formGrid}>
                {FIELDS.map((f) => (
                  <View key={f.key} style={styles.formItem}>
                    <Stepper
                      label={f.label}
                      value={draft[f.key]}
                      onChange={(d) => setDraft((s) => ({ ...s, [f.key]: Math.min(10, Math.max(1, s[f.key] + d)) }))}
                      step={1}
                    />
                  </View>
                ))}
              </View>
              <PrimaryButton
                label="Bugünün check-in'ini kaydet"
                loading={saveCheckin.isPending}
                onPress={() =>
                  saveCheckin.mutate(draft, {
                    onError: (e: any) => Alert.alert('Kaydedilemedi', e.message ?? 'Check-in kaydedilemedi.'),
                  })
                }
              />
            </>
          )}
          {isTrainer && !checkin && <Text style={styles.noteText}>Danışan henüz check-in göndermedi.</Text>}
        </Panel>

        <Panel title="Sakatlık & Mobilite" right={`${(injuryQuery.data ?? []).length} kayıt`}>
          {(injuryQuery.data ?? []).length === 0 ? (
            <Text style={styles.noteText}>Henüz kayıt yok.</Text>
          ) : (
            (injuryQuery.data ?? []).map((log) => (
              <View key={log.id} style={styles.injuryRow}>
                <View style={[styles.severityDot, { backgroundColor: log.severity >= 7 ? C.red : log.severity >= 4 ? C.orange : C.lime }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listName}>
                    {log.body_part} · {log.severity}/10
                  </Text>
                  {log.note ? <Text style={styles.listMeta}>{log.note}</Text> : null}
                  <Text style={styles.listMeta}>{log.date}</Text>
                </View>
                <Pressable
                  onPress={() => deleteInjury.mutate(log.id, { onError: (e: any) => Alert.alert('Silinemedi', e.message ?? 'Kayıt silinemedi.') })}
                  hitSlop={8}
                >
                  <Text style={styles.listDelete}>Sil</Text>
                </Pressable>
              </View>
            ))
          )}

          <AuthField
            label="Bölge"
            value={injuryDraft.body_part}
            onChangeText={(v) => setInjuryDraft((s) => ({ ...s, body_part: v }))}
            placeholder="Ör. Sol Diz"
          />
          <View style={styles.severityRow}>
            <Stepper
              label="Ağrı Şiddeti"
              value={injuryDraft.severity}
              onChange={(d) => setInjuryDraft((s) => ({ ...s, severity: Math.min(10, Math.max(1, s.severity + d)) }))}
              step={1}
            />
          </View>
          <AuthField
            label="Not"
            value={injuryDraft.note}
            onChangeText={(v) => setInjuryDraft((s) => ({ ...s, note: v }))}
            placeholder="Ör. Squat sırasında ağrı"
          />
          <PrimaryButton
            label="Kaydet"
            loading={addInjury.isPending}
            disabled={!injuryDraft.body_part.trim()}
            onPress={() => {
              if (!selectedClientId) {
                Alert.alert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.');
                return;
              }
              addInjury.mutate(
                { body_part: injuryDraft.body_part.trim(), severity: injuryDraft.severity, note: injuryDraft.note.trim() },
                {
                  onSuccess: () => setInjuryDraft({ body_part: '', severity: 3, note: '' }),
                  onError: (e: any) => Alert.alert('Kaydedilemedi', e.message ?? 'Kayıt eklenemedi.'),
                }
              );
            }}
          />
        </Panel>

        <Panel title="Kilo Projeksiyonu" right="7700 kcal ≈ 1 kg">
          {proj.length > 0 && <LineChart proj={proj} actual={actual} />}
          <View style={styles.chips}>
            {[
              [`${nf(weeklyDelta * WEEKS, 1)} kg`, `${WEEKS} haftada`],
              [`${nf(weeklyDelta, 2)} kg`, 'haftalık'],
              [`${nf(client.kcal_target - client.tdee)} kcal`, 'günlük fark'],
            ].map(([v, l]) => (
              <View key={l} style={styles.chip}>
                <Text style={styles.chipValue}>{v}</Text>
                <Text style={styles.chipLabel}>{l}</Text>
              </View>
            ))}
          </View>
        </Panel>

        <Panel title="Kardiyo & Adım" right={cardioWeek.length ? `Ort. ${nf(avgSteps)} adım` : 'Henüz kayıt yok'}>
          {cardioWeek.length > 0 && (
            <View style={styles.ciBars}>
              {cardioWeek.map((c) => (
                <View key={c.id} style={styles.ciCol}>
                  <Text style={styles.stepValue}>{c.steps > 999 ? `${(c.steps / 1000).toFixed(1)}k` : c.steps}</Text>
                  <View style={[styles.ciBar, { height: `${Math.max(4, (c.steps / maxSteps) * 100)}%`, backgroundColor: C.blue }]} />
                  <Text style={styles.ciLabel}>{c.date.slice(5)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.formGrid}>
            <View style={styles.measureFormItem}>
              <AuthField
                label="Adım Sayısı"
                value={cardioDraft.steps}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, steps: v }))}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.measureFormItem}>
              <AuthField
                label="Kardiyo Türü"
                value={cardioDraft.cardio_type}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, cardio_type: v }))}
                placeholder="Ör. Koşu"
              />
            </View>
            <View style={styles.measureFormItem}>
              <AuthField
                label="Süre (dk)"
                value={cardioDraft.duration_minutes}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, duration_minutes: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.measureFormItem}>
              <AuthField
                label="Mesafe (km)"
                value={cardioDraft.distance_km}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, distance_km: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.measureFormItem}>
              <AuthField
                label="Kalori"
                value={cardioDraft.calories}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, calories: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>
          <PrimaryButton
            label="Bugünün kardiyosunu kaydet"
            loading={logCardio.isPending}
            onPress={() => {
              if (!selectedClientId) {
                Alert.alert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.');
                return;
              }
              const n = (s: string) => parseFloat(s.replace(',', '.')) || 0;
              logCardio.mutate(
                {
                  cardio_type: cardioDraft.cardio_type.trim(),
                  duration_minutes: n(cardioDraft.duration_minutes),
                  distance_km: n(cardioDraft.distance_km),
                  steps: Math.round(n(cardioDraft.steps)),
                  calories: n(cardioDraft.calories),
                },
                {
                  onSuccess: () => setCardioDraft({ cardio_type: '', duration_minutes: '', distance_km: '', steps: '', calories: '' }),
                  onError: (e: any) => Alert.alert('Kaydedilemedi', e.message ?? 'Kardiyo kaydı kaydedilemedi.'),
                }
              );
            }}
          />
        </Panel>

        <Panel title="Ölçümler" right={latestMeasurement ? `Son: ${latestMeasurement.date}` : 'Henüz kayıt yok'}>
          {latestMeasurement && (
            <View style={styles.measureGrid}>
              {MEASURE_FIELDS.map((f) => {
                const cur = latestMeasurement[f.key];
                const prev = prevMeasurement?.[f.key] ?? null;
                const diff = cur != null && prev != null ? cur - prev : null;
                return (
                  <View key={f.key} style={styles.measureChip}>
                    <Text style={styles.measureLabel}>{f.label}</Text>
                    <Text style={styles.measureValue}>{cur != null ? nf(cur, 1) : '—'}</Text>
                    {diff != null && (
                      <Text style={[styles.measureDiff, { color: diff <= 0 ? C.lime : C.orange }]}>
                        {diff > 0 ? '+' : ''}
                        {nf(diff, 1)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.formGrid}>
            {MEASURE_FIELDS.map((f) => (
              <View key={f.key} style={styles.measureFormItem}>
                <AuthField
                  label={f.label}
                  value={measureDraft[f.key]}
                  onChangeText={(v) => setMeasureDraft((s) => ({ ...s, [f.key]: v }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
            ))}
          </View>
          <PrimaryButton
            label="Bugünün ölçümünü kaydet"
            loading={logMeasurement.isPending}
            onPress={() => {
              if (!selectedClientId) {
                Alert.alert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.');
                return;
              }
              const n = (s: string) => parseFloat(s.replace(',', '.')) || 0;
              logMeasurement.mutate(
                {
                  chest: n(measureDraft.chest),
                  waist: n(measureDraft.waist),
                  hip: n(measureDraft.hip),
                  arm: n(measureDraft.arm),
                  thigh: n(measureDraft.thigh),
                  calf: n(measureDraft.calf),
                },
                {
                  onSuccess: () => setMeasureDraft({ chest: '', waist: '', hip: '', arm: '', thigh: '', calf: '' }),
                  onError: (e: any) => Alert.alert('Kaydedilemedi', e.message ?? 'Ölçüm kaydedilemedi.'),
                }
              );
            }}
          />
        </Panel>

        <Panel title="İlerleme Fotoğrafları" right={`${(photosQuery.data ?? []).length} fotoğraf`}>
          <Pressable style={styles.addPhotoBtn} onPress={pickPhoto} disabled={uploadPhoto.isPending}>
            <Text style={styles.addPhotoText}>{uploadPhoto.isPending ? 'Yükleniyor…' : '+ Fotoğraf Ekle'}</Text>
          </Pressable>
          <View style={styles.photoGrid}>
            {(photosQuery.data ?? []).map((p: any) => (
              <Pressable
                key={p.id}
                style={styles.photoWrap}
                onLongPress={() => deletePhoto.mutate(p, { onError: (e: any) => Alert.alert('Silinemedi', e.message ?? 'Fotoğraf silinemedi.') })}
              >
                {p.url ? <Image source={{ uri: p.url }} style={styles.photo} /> : <View style={[styles.photo, styles.photoFallback]} />}
                <Text style={styles.photoDate}>{p.date}</Text>
              </Pressable>
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
  ciBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 150, marginBottom: 8 },
  ciCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  ciValue: { fontSize: 12, fontWeight: '700', color: C.white, marginBottom: 4 },
  ciBar: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  ciLabel: { fontSize: 9, color: C.grey, marginTop: 5, textAlign: 'center' },
  stepValue: { fontSize: 10, fontWeight: '700', color: C.white, marginBottom: 4 },
  note: { backgroundColor: C.card2, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14 },
  noteText: { fontSize: 11, color: C.grey },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  formItem: { width: '31%' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { flex: 1, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge, borderRadius: 12, padding: 8, alignItems: 'center' },
  chipValue: { fontSize: 13, fontWeight: '800', color: C.lime },
  chipLabel: { fontSize: 10, color: C.grey },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  measureChip: { width: '31%', backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge, borderRadius: 12, padding: 8, alignItems: 'center' },
  measureLabel: { fontSize: 9, color: C.grey, textAlign: 'center' },
  measureValue: { fontSize: 15, fontWeight: '800', color: C.white, marginTop: 2 },
  measureDiff: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  measureFormItem: { width: '31%' },
  addPhotoBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 12 },
  addPhotoText: { fontSize: 13, color: C.greyD, fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { width: '31%' },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: C.card2 },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  photoDate: { fontSize: 9, color: C.greyD, marginTop: 3, textAlign: 'center' },
  injuryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  severityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  listName: { color: C.white, fontWeight: '700', fontSize: 13 },
  listMeta: { color: C.greyD, fontSize: 11, marginTop: 2 },
  listDelete: { color: C.red, fontSize: 11, fontWeight: '700' },
  severityRow: { width: '48%', marginBottom: 14 },
});
