import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { AuthField } from '../../components/AuthField';
import { EmptyClientState } from '../../components/EmptyClientState';
import { HBar } from '../../components/HBar';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Stepper } from '../../components/Stepper';
import { TrendChart } from '../../components/TrendChart';
import { LineChart } from '../../components/LineChart';
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
  useLogWeight,
  useMeasurements,
  useProgressPhotos,
  useSaveCheckin,
  useUploadProgressPhoto,
  useWeightLogs,
  useWellnessSurveys,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, checkinWeekStart, formatDateInputTr, localDateStr, monthPeriodStr, nf } from '../../lib/theme';
import { monthLabelTr } from '../../lib/wellnessSurvey';

const WEEKS = 12;
const FIELDS: { key: 'uyku' | 'enerji' | 'aclik' | 'stres' | 'motivasyon'; label: string }[] = [
  { key: 'uyku', label: 'Uyku' },
  { key: 'enerji', label: 'Enerji' },
  { key: 'aclik', label: 'Açlık' },
  { key: 'stres', label: 'Stres' },
  { key: 'motivasyon', label: 'Motivasyon' },
];

const MEASURE_FIELDS: { key: 'chest' | 'waist' | 'hip' | 'shoulder' | 'arm_left' | 'arm_right' | 'thigh_left' | 'thigh_right' | 'calf'; label: string }[] = [
  { key: 'chest', label: 'Göğüs (cm)' },
  { key: 'waist', label: 'Bel (cm)' },
  { key: 'hip', label: 'Kalça (cm)' },
  { key: 'shoulder', label: 'Omuz (cm)' },
  { key: 'arm_left', label: 'Sol Kol (cm)' },
  { key: 'arm_right', label: 'Sağ Kol (cm)' },
  { key: 'thigh_left', label: 'Sol Bacak (cm)' },
  { key: 'thigh_right', label: 'Sağ Bacak (cm)' },
  { key: 'calf', label: 'Baldır (cm)' },
];

// "10.05.2026" -> "2026-05-10"
function parseTrDate(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = d.padStart(2, '0');
  const mm = mo.padStart(2, '0');
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12) return null;
  return `${y}-${mm}-${dd}`;
}

export default function IlerlemeScreen() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const weightLogsQuery = useWeightLogs(selectedClientId ?? undefined);
  const logWeight = useLogWeight(selectedClientId ?? undefined);
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
  const surveysQuery = useWellnessSurveys(selectedClientId ?? undefined);

  const [weightInput, setWeightInput] = useState('');
  const [weightDateInput, setWeightDateInput] = useState('');
  const [draft, setDraft] = useState({ uyku: 5, enerji: 5, aclik: 5, stres: 5, motivasyon: 5 });
  const [measureDraft, setMeasureDraft] = useState({
    chest: '',
    waist: '',
    hip: '',
    shoulder: '',
    arm_left: '',
    arm_right: '',
    thigh_left: '',
    thigh_right: '',
    calf: '',
  });
  const [measureDateInput, setMeasureDateInput] = useState('');
  const [cardioDraft, setCardioDraft] = useState({ cardio_type: '', duration_minutes: '', distance_km: '', steps: '', calories: '' });
  const [injuryDraft, setInjuryDraft] = useState({ body_part: '', severity: 3, note: '' });
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string | null; date: string } | null>(null);

  // Boş tarih alanı = bugün, doluysa girilen (geçmişe dönük olabilir) tarih.
  const weightDateIso = weightDateInput.trim() ? parseTrDate(weightDateInput) : localDateStr();
  const measureDateIso = measureDateInput.trim() ? parseTrDate(measureDateInput) : localDateStr();

  // Kardiyo/Ölçüm/Kilo kayıtları client_id+date üzerinden upsert ediliyor (o günün TÜM satırını
  // değiştiriyor) — form boş bir alanla açılıp öyle kaydedilirse, o tarihte zaten girilmiş diğer
  // alanlar sessizce 0'a düşerdi. Seçili tarihe ait bir kayıt varsa formu onunla dolduruyoruz,
  // böylece sadece değiştirilen alan güncellenmiş, diğerleri korunmuş olur. Bu artık SADECE
  // bugün için değil, geçmişe dönük seçilen herhangi bir tarih için de çalışıyor.
  const todayCardio = (cardioQuery.data ?? []).find((c) => c.date === localDateStr());
  const selectedMeasurement = measureDateIso ? (measurementsQuery.data ?? []).find((m) => m.date === measureDateIso) : undefined;
  const selectedWeightLog = weightDateIso ? (weightLogsQuery.data ?? []).find((w) => w.date === weightDateIso) : undefined;

  useEffect(() => {
    if (todayCardio) {
      setCardioDraft({
        cardio_type: todayCardio.cardio_type ?? '',
        duration_minutes: todayCardio.duration_minutes ? String(todayCardio.duration_minutes) : '',
        distance_km: todayCardio.distance_km ? String(todayCardio.distance_km) : '',
        steps: todayCardio.steps ? String(todayCardio.steps) : '',
        calories: todayCardio.calories ? String(todayCardio.calories) : '',
      });
    } else {
      setCardioDraft({ cardio_type: '', duration_minutes: '', distance_km: '', steps: '', calories: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayCardio?.date, selectedClientId]);

  // Ölçüm/kilo formunun önizlemesi iki farklı durumu AYIRIYOR:
  //  • Danışan değişti  → formu sıfırla + tarih alanını boşalt (bugüne dön). Aksi halde önceki
  //    danışanın taslağı sızardı.
  //  • Sadece tarih değişti → o tarihe ait KAYIT VARSA yükle. Kayıt yoksa forma DOKUNMA — böylece
  //    önce değeri girip sonra (kayıtsız) bir geçmiş tarih yazan kullanıcının değeri silinmez.
  //    (Tarih yarım/geçersizken de dokunma.)
  const prevClientMeasureRef = useRef(selectedClientId);
  useEffect(() => {
    const clientSwitched = prevClientMeasureRef.current !== selectedClientId;
    prevClientMeasureRef.current = selectedClientId;
    if (measureDateInput.trim() && !measureDateIso) return;
    if (selectedMeasurement) {
      setMeasureDraft({
        chest: selectedMeasurement.chest != null ? String(selectedMeasurement.chest) : '',
        waist: selectedMeasurement.waist != null ? String(selectedMeasurement.waist) : '',
        hip: selectedMeasurement.hip != null ? String(selectedMeasurement.hip) : '',
        shoulder: selectedMeasurement.shoulder != null ? String(selectedMeasurement.shoulder) : '',
        arm_left: selectedMeasurement.arm_left != null ? String(selectedMeasurement.arm_left) : '',
        arm_right: selectedMeasurement.arm_right != null ? String(selectedMeasurement.arm_right) : '',
        thigh_left: selectedMeasurement.thigh_left != null ? String(selectedMeasurement.thigh_left) : '',
        thigh_right: selectedMeasurement.thigh_right != null ? String(selectedMeasurement.thigh_right) : '',
        calf: selectedMeasurement.calf != null ? String(selectedMeasurement.calf) : '',
      });
    } else if (clientSwitched) {
      setMeasureDraft({ chest: '', waist: '', hip: '', shoulder: '', arm_left: '', arm_right: '', thigh_left: '', thigh_right: '', calf: '' });
      setMeasureDateInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureDateIso, selectedMeasurement?.date, selectedClientId]);

  const prevClientWeightRef = useRef(selectedClientId);
  useEffect(() => {
    const clientSwitched = prevClientWeightRef.current !== selectedClientId;
    prevClientWeightRef.current = selectedClientId;
    if (weightDateInput.trim() && !weightDateIso) return;
    if (selectedWeightLog) {
      setWeightInput(String(selectedWeightLog.weight));
    } else if (clientSwitched) {
      setWeightInput('');
      setWeightDateInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightDateIso, selectedWeightLog?.date, selectedClientId]);

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

  if (isTrainer && !selectedClientId) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="İlerleme" />
        <EmptyClientState />
      </View>
    );
  }

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

  const currentWeekStart = checkinWeekStart();
  const checkedInThisWeek = !!checkin && checkin.date >= currentWeekStart;
  const daysUntilNextSaturday = ((6 - new Date().getDay() + 7) % 7) || 7;

  const measurements = measurementsQuery.data ?? [];
  const latestMeasurement = measurements[measurements.length - 1];
  const prevMeasurement = measurements[measurements.length - 2];
  const measureTrendPoints = measurements.filter((m) => m.waist != null).map((m) => ({ date: m.date, value: m.waist as number }));

  const cardioWeek = [...(cardioQuery.data ?? [])].reverse();
  const cardioTrendPoints = cardioWeek.map((c) => ({ date: c.date, value: c.steps }));
  const avgSteps = cardioWeek.length ? Math.round(cardioWeek.reduce((a, c) => a + c.steps, 0) / cardioWeek.length) : 0;

  const surveys = surveysQuery.data ?? [];
  const thisMonthPeriod = monthPeriodStr();
  const thisMonthSurvey = surveys.find((s) => s.period === thisMonthPeriod);

  async function pickPhoto() {
    if (!selectedClientId) {
      showAlert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('İzin gerekli', 'Fotoğraf eklemek için galeri izni vermen gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    uploadPhoto.mutate(
      { uri: asset.uri, mimeType: asset.mimeType },
      { onError: (e: any) => showAlert('Yüklenemedi', e.message ?? 'Fotoğraf yüklenirken bir hata oldu.') }
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="İlerleme" clientName={client.name} showPill={profile?.role === 'trainer'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Haftalık Check-in" right={checkin ? `Ortalama ${nf(avg, 1)} / 10` : 'Henüz kayıt yok'}>
          {checkin && (
            <Text style={[styles.noteText, !checkedInThisWeek && { color: C.orange }]}>
              {(() => {
                const [y, m, d] = checkin.date.split('-');
                const dateStr = `${d}.${m}.${y}`;
                if (checkedInThisWeek) return `Bu haftadan: ${dateStr}`;
                const weeksAgo = Math.max(1, Math.round((Date.now() - new Date(checkin.date).getTime()) / (7 * 24 * 60 * 60 * 1000)));
                return `Son check-in: ${dateStr} (${weeksAgo} hafta önce — güncel değil)`;
              })()}
            </Text>
          )}
          {checkin && (
            <View style={styles.hBarGroup}>
              {entries.map(([k, v]) => (
                <HBar key={k} label={k} value={v} />
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

          <Pressable style={styles.historyBtn} onPress={() => router.push({ pathname: '/(app)/ilerleme-gecmis', params: { type: 'checkin' } })}>
            <Text style={styles.historyBtnText}>Geçmişi Gör</Text>
          </Pressable>

          {!isTrainer &&
            (checkedInThisWeek ? (
              <Text style={styles.noteText}>
                Bu haftanın check-in'ini gönderdin. Bir sonraki check-in Cumartesi günü açılacak
                {daysUntilNextSaturday === 1 ? ' (yarın).' : ` (${daysUntilNextSaturday} gün sonra).`}
              </Text>
            ) : (
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
                  label="Bu haftanın check-in'ini kaydet"
                  loading={saveCheckin.isPending}
                  onPress={() =>
                    saveCheckin.mutate(draft, {
                      onError: (e: any) => showAlert('Kaydedilemedi', e.message ?? 'Check-in kaydedilemedi.'),
                    })
                  }
                />
              </>
            ))}
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
                  onPress={() => deleteInjury.mutate(log.id, { onError: (e: any) => showAlert('Silinemedi', e.message ?? 'Kayıt silinemedi.') })}
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
                showAlert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.');
                return;
              }
              addInjury.mutate(
                { body_part: injuryDraft.body_part.trim(), severity: injuryDraft.severity, note: injuryDraft.note.trim() },
                {
                  onSuccess: () => setInjuryDraft({ body_part: '', severity: 3, note: '' }),
                  onError: (e: any) => showAlert('Kaydedilemedi', e.message ?? 'Kayıt eklenemedi.'),
                }
              );
            }}
          />
        </Panel>

        <Panel title="Kilo Projeksiyonu" right="7700 kcal ≈ 1 kg">
          {proj.length > 0 && <LineChart proj={proj} actual={actual} />}
          <Pressable style={styles.historyBtn} onPress={() => router.push({ pathname: '/(app)/ilerleme-gecmis', params: { type: 'weight' } })}>
            <Text style={styles.historyBtnText}>Kilo Geçmişini Gör</Text>
          </Pressable>
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

          <View style={styles.logRow}>
            <View style={{ flex: 1 }}>
              <AuthField
                label="Kilo (kg)"
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="Ör. 79.5"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AuthField
                label="Tarih (boş = bugün)"
                value={weightDateInput}
                onChangeText={(v) => setWeightDateInput((prev) => formatDateInputTr(v, prev))}
                placeholder="GG.AA.YYYY"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>
          {weightDateInput.trim() && !weightDateIso && <Text style={styles.dateError}>Tarihi GG.AA.YYYY biçiminde gir.</Text>}
          <PrimaryButton
            label="Kaydet"
            loading={logWeight.isPending}
            disabled={!weightInput || (!!weightDateInput.trim() && !weightDateIso)}
            onPress={() => {
              const v = parseFloat(weightInput.replace(',', '.'));
              if (!Number.isNaN(v) && weightDateIso) {
                logWeight.mutate(
                  { weight: v, date: weightDateIso },
                  { onError: (e: any) => showAlert('Kaydedilemedi', e.message ?? 'Kilo kaydedilemedi.') }
                );
              }
            }}
          />
        </Panel>

        <Panel title="Kardiyo & Adım" right={cardioWeek.length ? `Ort. ${nf(avgSteps)} adım` : 'Henüz kayıt yok'}>
          {cardioTrendPoints.length > 0 ? (
            <TrendChart points={cardioTrendPoints} color={C.blue} formatValue={(v) => nf(v)} h={130} />
          ) : (
            <Text style={styles.noteText}>Henüz kayıt yok.</Text>
          )}

          <Pressable style={styles.historyBtn} onPress={() => router.push({ pathname: '/(app)/ilerleme-gecmis', params: { type: 'cardio' } })}>
            <Text style={styles.historyBtnText}>Geçmişi Gör</Text>
          </Pressable>

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
            disabled={
              !cardioDraft.cardio_type.trim() &&
              !cardioDraft.duration_minutes &&
              !cardioDraft.distance_km &&
              !cardioDraft.steps &&
              !cardioDraft.calories
            }
            onPress={() => {
              if (!selectedClientId) {
                showAlert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.');
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
                  onError: (e: any) => showAlert('Kaydedilemedi', e.message ?? 'Kardiyo kaydı kaydedilemedi.'),
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

          {measureTrendPoints.length > 0 ? (
            <TrendChart points={measureTrendPoints} color={C.orange} formatValue={(v) => `${nf(v, 1)} cm`} h={130} />
          ) : null}

          <Pressable style={styles.historyBtn} onPress={() => router.push({ pathname: '/(app)/ilerleme-gecmis', params: { type: 'measurement' } })}>
            <Text style={styles.historyBtnText}>Geçmişi Gör</Text>
          </Pressable>

          <AuthField
            label="Tarih (boş = bugün)"
            value={measureDateInput}
            onChangeText={(v) => setMeasureDateInput((prev) => formatDateInputTr(v, prev))}
            placeholder="GG.AA.YYYY"
            keyboardType="number-pad"
            maxLength={10}
          />
          {measureDateInput.trim() && !measureDateIso && <Text style={styles.dateError}>Tarihi GG.AA.YYYY biçiminde gir.</Text>}
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
            label="Ölçümü Kaydet"
            loading={logMeasurement.isPending}
            disabled={MEASURE_FIELDS.every((f) => !measureDraft[f.key]) || (!!measureDateInput.trim() && !measureDateIso)}
            onPress={() => {
              if (!selectedClientId) {
                showAlert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.');
                return;
              }
              if (!measureDateIso) return;
              // Boş alan = null (0 değil) — böylece takip edilmeyen bölgeler özet/grafiklerde
              // "0,0 cm" gibi görünmez, "—" ve "veri yok" olur.
              const n = (s: string) => (s.trim() === '' ? null : parseFloat(s.replace(',', '.')) || 0);
              logMeasurement.mutate(
                {
                  chest: n(measureDraft.chest),
                  waist: n(measureDraft.waist),
                  hip: n(measureDraft.hip),
                  shoulder: n(measureDraft.shoulder),
                  arm_left: n(measureDraft.arm_left),
                  arm_right: n(measureDraft.arm_right),
                  thigh_left: n(measureDraft.thigh_left),
                  thigh_right: n(measureDraft.thigh_right),
                  calf: n(measureDraft.calf),
                  date: measureDateIso,
                },
                {
                  onError: (e: any) => showAlert('Kaydedilemedi', e.message ?? 'Ölçüm kaydedilemedi.'),
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
                onPress={() => setViewingPhoto({ url: p.url, date: p.date })}
                onLongPress={() =>
                  showAlert('Fotoğrafı Sil', `${p.date} tarihli fotoğraf silinsin mi?`, [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'Sil',
                      style: 'destructive',
                      onPress: () => deletePhoto.mutate(p, { onError: (e: any) => showAlert('Silinemedi', e.message ?? 'Fotoğraf silinemedi.') }),
                    },
                  ])
                }
              >
                {p.url ? <Image source={{ uri: p.url }} style={styles.photo} /> : <View style={[styles.photo, styles.photoFallback]} />}
                <Text style={styles.photoDate}>{p.date}</Text>
              </Pressable>
            ))}
          </View>
        </Panel>

        <Modal visible={!!viewingPhoto} transparent animationType="fade" onRequestClose={() => setViewingPhoto(null)}>
          <Pressable style={styles.photoViewerBackdrop} onPress={() => setViewingPhoto(null)}>
            {viewingPhoto?.url ? <Image source={{ uri: viewingPhoto.url }} style={styles.photoViewerImage} resizeMode="contain" /> : null}
            <Text style={styles.photoViewerDate}>{viewingPhoto?.date}</Text>
            <Pressable style={styles.photoViewerClose} onPress={() => setViewingPhoto(null)} hitSlop={12}>
              <Text style={styles.photoViewerCloseText}>✕</Text>
            </Pressable>
          </Pressable>
        </Modal>

        <Panel title="Aylık Değerlendirme Anketi" right={monthLabelTr(thisMonthPeriod)}>
          {surveysQuery.isLoading ? (
            <Text style={styles.noteText}>Yükleniyor…</Text>
          ) : (
            <>
              <Text style={styles.noteText}>
                {isTrainer
                  ? `${surveys.length} ay dolduruldu.`
                  : thisMonthSurvey
                    ? 'Bu ayın anketini doldurdun. İstersen düzenleyebilirsin.'
                    : 'Bu ayın anketini henüz doldurmadın.'}
              </Text>
              <Pressable style={styles.historyBtn} onPress={() => router.push({ pathname: '/(app)/anket', params: { period: thisMonthPeriod } })}>
                <Text style={styles.historyBtnText}>
                  {isTrainer ? 'Anketleri Gör' : thisMonthSurvey ? 'Anketi Görüntüle / Düzenle' : 'Anketi Doldur'}
                </Text>
              </Pressable>
            </>
          )}
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4 },
  hBarGroup: { marginBottom: 8 },
  historyBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 14,
  },
  historyBtnText: { fontSize: 11, fontWeight: '700', color: C.lime },
  logRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dateError: { color: C.red, fontSize: 11, marginBottom: 10 },
  trainerHint: { color: C.greyD, fontSize: 11, marginTop: 6, lineHeight: 16, fontStyle: 'italic' },
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
  photoViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  photoViewerImage: { width: '100%', height: '80%' },
  photoViewerDate: { color: C.grey, fontSize: 13, fontWeight: '700', marginTop: 14 },
  photoViewerClose: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  photoViewerCloseText: { color: C.white, fontSize: 16, fontWeight: '700' },
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
