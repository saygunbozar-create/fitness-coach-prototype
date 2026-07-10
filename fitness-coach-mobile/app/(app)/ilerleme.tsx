import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { LineChart } from '../../components/LineChart';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Stepper } from '../../components/Stepper';
import { useAuth } from '../../lib/auth';
import {
  useClient,
  useDeleteProgressPhoto,
  useLatestCheckin,
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

  const [draft, setDraft] = useState({ uyku: 5, enerji: 5, aclik: 5, stres: 5, motivasyon: 5 });
  const [measureDraft, setMeasureDraft] = useState({ chest: '', waist: '', hip: '', arm: '', thigh: '', calf: '' });

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

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    uploadPhoto.mutate({ uri: asset.uri, mimeType: asset.mimeType });
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
          <PrimaryButton label="Bugünün check-in'ini kaydet" loading={saveCheckin.isPending} onPress={() => saveCheckin.mutate(draft)} />
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
                { onSuccess: () => setMeasureDraft({ chest: '', waist: '', hip: '', arm: '', thigh: '', calf: '' }) }
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
              <Pressable key={p.id} style={styles.photoWrap} onLongPress={() => deletePhoto.mutate(p)}>
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
});
