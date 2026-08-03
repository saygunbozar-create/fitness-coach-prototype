import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { AuthField } from '../../components/AuthField';
import { DateField } from '../../components/DateField';
import { EmptyClientState } from '../../components/EmptyClientState';
import { HBar } from '../../components/HBar';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Stepper } from '../../components/Stepper';
import { TrendChart } from '../../components/TrendChart';
import { LineChart } from '../../components/LineChart';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import {
  useAddInjuryLog,
  useCardioLogForDate,
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
import { C, checkinWeekStart, localDateStr, monthPeriodStr, nf } from '../../lib/theme';
import { monthLabelTr } from '../../lib/wellnessSurvey';

const WEEKS = 12;
const FIELDS: { key: 'uyku' | 'enerji' | 'aclik' | 'stres' | 'motivasyon'; labelKey: string }[] = [
  { key: 'uyku', labelKey: 'ilerleme.field_sleep' },
  { key: 'enerji', labelKey: 'ilerleme.field_energy' },
  { key: 'aclik', labelKey: 'ilerleme.field_hunger' },
  { key: 'stres', labelKey: 'ilerleme.field_stress' },
  { key: 'motivasyon', labelKey: 'ilerleme.field_motivation' },
];

const MEASURE_FIELDS: { key: 'chest' | 'waist' | 'hip' | 'shoulder' | 'arm_left' | 'arm_right' | 'thigh_left' | 'thigh_right' | 'calf'; labelKey: string }[] = [
  { key: 'chest', labelKey: 'ilerleme.measure_chest' },
  { key: 'waist', labelKey: 'ilerleme.measure_waist' },
  { key: 'hip', labelKey: 'ilerleme.measure_hip' },
  { key: 'shoulder', labelKey: 'ilerleme.measure_shoulder' },
  { key: 'arm_left', labelKey: 'ilerleme.measure_arm_left' },
  { key: 'arm_right', labelKey: 'ilerleme.measure_arm_right' },
  { key: 'thigh_left', labelKey: 'ilerleme.measure_thigh_left' },
  { key: 'thigh_right', labelKey: 'ilerleme.measure_thigh_right' },
  { key: 'calf', labelKey: 'ilerleme.measure_calf' },
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
  const t = useT();
  const fields = FIELDS.map((f) => ({ key: f.key, label: t(f.labelKey) }));
  const measureFields = MEASURE_FIELDS.map((f) => ({ key: f.key, label: t(f.labelKey) }));
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
  const [cardioDateInput, setCardioDateInput] = useState('');
  const [injuryDraft, setInjuryDraft] = useState({ body_part: '', severity: 3, note: '' });
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string | null; date: string } | null>(null);
  // Fotoğraf karşılaştırma: iki fotoğrafı yan yana koymak. Danışanı en çok motive eden şey
  // 8 hafta öncesiyle bugünü aynı anda görmek; tek tek listede bu hiç mümkün değildi.
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Üçüncüye basınca en eski seçim düşüyor — "önce ikisini kaldır" demek zorunda kalmasın.
  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? [prev[1], id] : [...prev, id]
    );
  }

  // O tarihte veya ondan önce girilmiş EN YAKIN kilo. Fotoğrafın çekildiği gün tartıya
  // çıkılmamış olabilir; en yakın önceki kayıt pratikte doğru cevap.
  function weightAt(dateStr: string): number | null {
    const logs = (weightLogsQuery.data ?? []).filter((w) => w.date <= dateStr);
    if (!logs.length) return null;
    const en = logs.reduce((a, b) => (a.date >= b.date ? a : b));
    return Number(en.weight);
  }

  const comparePair = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const photos = (photosQuery.data ?? []) as any[];
    const secilen = compareIds.map((id) => photos.find((p) => p.id === id)).filter(Boolean);
    if (secilen.length !== 2) return null;
    // Her zaman eskiden yeniye — hangi sırayla seçildiğinden bağımsız olarak solda "önce".
    return secilen.sort((a, b) => a.date.localeCompare(b.date));
  }, [compareIds, photosQuery.data]);

  const compareSummary = useMemo(() => {
    if (!comparePair) return null;
    const [a, b] = comparePair;
    const gun = Math.round((new Date(b.date).getTime() - new Date(a.date).getTime()) / 86400000);
    const wa = weightAt(a.date);
    const wb = weightAt(b.date);
    if (wa === null || wb === null) return t('ilerleme.compare_days', { days: gun });
    const fark = wb - wa;
    return t('ilerleme.compare_days_weight', {
      days: gun,
      delta: `${fark > 0 ? '+' : ''}${nf(fark, 1)}`,
    });
  }, [comparePair, weightLogsQuery.data, t]);

  // Boş tarih alanı = bugün, doluysa girilen (geçmişe dönük olabilir) tarih.
  const weightDateIso = weightDateInput.trim() ? parseTrDate(weightDateInput) : localDateStr();
  const measureDateIso = measureDateInput.trim() ? parseTrDate(measureDateInput) : localDateStr();
  const cardioDateIso = cardioDateInput.trim() ? parseTrDate(cardioDateInput) : localDateStr();

  // Kardiyo/Ölçüm/Kilo kayıtları client_id+date üzerinden upsert ediliyor (o günün TÜM satırını
  // değiştiriyor) — form boş bir alanla açılıp öyle kaydedilirse, o tarihte zaten girilmiş diğer
  // alanlar sessizce 0'a düşerdi. Seçili tarihe ait bir kayıt varsa formu onunla dolduruyoruz,
  // böylece sadece değiştirilen alan güncellenmiş, diğerleri korunmuş olur. Bu artık SADECE
  // bugün için değil, geçmişe dönük seçilen herhangi bir tarih için de çalışıyor.
  // cardioQuery sadece son 7 günü kapsıyor (grafik için) — form geçmişe dönük herhangi bir tarihe
  // ayarlanabildiği için o tarihi noktasal olarak ayrıca sorguluyoruz.
  const cardioForDateQuery = useCardioLogForDate(selectedClientId ?? undefined, cardioDateIso ?? undefined);
  const selectedCardio = cardioForDateQuery.data ?? undefined;
  const selectedMeasurement = measureDateIso ? (measurementsQuery.data ?? []).find((m) => m.date === measureDateIso) : undefined;
  const selectedWeightLog = weightDateIso ? (weightLogsQuery.data ?? []).find((w) => w.date === weightDateIso) : undefined;

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

  // Kardiyo formu da artık geçmişe dönük tarih kabul ediyor — yukarıdaki ölçüm/kilo mantığının
  // aynısı. Upsert client_id+date üzerinden çalıştığı için, seçili tarihte kayıt varsa formu
  // onunla dolduruyoruz; aksi halde sadece adımı girip kaydetmek o günün mesafe/kalori
  // değerlerini sessizce 0'a düşürürdü.
  const prevClientCardioRef = useRef(selectedClientId);
  useEffect(() => {
    const clientSwitched = prevClientCardioRef.current !== selectedClientId;
    prevClientCardioRef.current = selectedClientId;
    if (cardioDateInput.trim() && !cardioDateIso) return;
    if (selectedCardio) {
      setCardioDraft({
        cardio_type: selectedCardio.cardio_type ?? '',
        duration_minutes: selectedCardio.duration_minutes ? String(selectedCardio.duration_minutes) : '',
        distance_km: selectedCardio.distance_km ? String(selectedCardio.distance_km) : '',
        steps: selectedCardio.steps ? String(selectedCardio.steps) : '',
        calories: selectedCardio.calories ? String(selectedCardio.calories) : '',
      });
    } else if (clientSwitched) {
      setCardioDraft({ cardio_type: '', duration_minutes: '', distance_km: '', steps: '', calories: '' });
      setCardioDateInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardioDateIso, selectedCardio?.date, selectedClientId]);

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
        <ScreenHeader title={t('nav.ilerleme')} />
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
  const entries = checkin ? fields.map((f) => [f.label, checkin[f.key]] as const) : [];
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
      showAlert(t('beslenme.wait_title'), t('beslenme.client_not_loaded'));
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert(t('ilerleme.permission_needed_title'), t('ilerleme.permission_needed_body'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    uploadPhoto.mutate(
      { uri: asset.uri, mimeType: asset.mimeType },
      { onError: (e: any) => showAlert(t('ilerleme.err_photo_upload_title'), e.message ?? t('ilerleme.err_photo_upload_body')) }
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('nav.ilerleme')} clientName={client.name} showPill={profile?.role === 'trainer'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title={t('ilerleme.checkin_title')} right={checkin ? t('ilerleme.avg_label', { avg: nf(avg, 1) }) : t('ilerleme.no_records')}>
          {checkin && (
            <Text style={[styles.noteText, !checkedInThisWeek && { color: C.orange }]}>
              {(() => {
                const [y, m, d] = checkin.date.split('-');
                const dateStr = `${d}.${m}.${y}`;
                if (checkedInThisWeek) return t('ilerleme.this_week_from', { date: dateStr });
                const weeksAgo = Math.max(1, Math.round((Date.now() - new Date(checkin.date).getTime()) / (7 * 24 * 60 * 60 * 1000)));
                return t('ilerleme.last_checkin', { date: dateStr, weeks: weeksAgo });
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
                {low ? t('ilerleme.low_score_note') : t('ilerleme.healthy_note')}
              </Text>
            </View>
          )}

          <Pressable style={styles.historyBtn} onPress={() => router.push({ pathname: '/(app)/ilerleme-gecmis', params: { type: 'checkin' } })}>
            <Text style={styles.historyBtnText}>{t('ilerleme.history_btn')}</Text>
          </Pressable>

          {!isTrainer &&
            (checkedInThisWeek ? (
              <Text style={styles.noteText}>
                {t('ilerleme.submitted_this_week')}
                {daysUntilNextSaturday === 1 ? t('ilerleme.next_checkin_tomorrow') : t('ilerleme.next_checkin_days', { days: daysUntilNextSaturday })}
              </Text>
            ) : (
              <>
                <View style={styles.formGrid}>
                  {fields.map((f) => (
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
                  label={t('ilerleme.save_checkin_btn')}
                  loading={saveCheckin.isPending}
                  onPress={() =>
                    saveCheckin.mutate(draft, {
                      onError: (e: any) => showAlert(t('antrenman.err_save_title'), e.message ?? t('ilerleme.err_checkin_save')),
                    })
                  }
                />
              </>
            ))}
          {isTrainer && !checkin && <Text style={styles.noteText}>{t('ilerleme.client_no_checkin')}</Text>}
        </Panel>

        <Panel title={t('ilerleme.injury_title')} right={t('ilerleme.records_count', { count: (injuryQuery.data ?? []).length })}>
          {(injuryQuery.data ?? []).length === 0 ? (
            <Text style={styles.noteText}>{t('ilerleme.no_records_yet')}</Text>
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
                  onPress={() => deleteInjury.mutate(log.id, { onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('common.delete_failed_body')) })}
                  hitSlop={8}
                >
                  <Text style={styles.listDelete}>{t('common.delete')}</Text>
                </Pressable>
              </View>
            ))
          )}

          <AuthField
            label={t('ilerleme.body_part_label')}
            value={injuryDraft.body_part}
            onChangeText={(v) => setInjuryDraft((s) => ({ ...s, body_part: v }))}
            placeholder={t('ilerleme.body_part_placeholder')}
          />
          <View style={styles.severityRow}>
            <Stepper
              label={t('ilerleme.pain_severity_label')}
              value={injuryDraft.severity}
              onChange={(d) => setInjuryDraft((s) => ({ ...s, severity: Math.min(10, Math.max(1, s.severity + d)) }))}
              step={1}
            />
          </View>
          <AuthField
            label={t('ilerleme.note_label')}
            value={injuryDraft.note}
            onChangeText={(v) => setInjuryDraft((s) => ({ ...s, note: v }))}
            placeholder={t('ilerleme.note_placeholder')}
          />
          <PrimaryButton
            label={t('common.save')}
            loading={addInjury.isPending}
            disabled={!injuryDraft.body_part.trim()}
            onPress={() => {
              if (!selectedClientId) {
                showAlert(t('beslenme.wait_title'), t('beslenme.client_not_loaded'));
                return;
              }
              addInjury.mutate(
                { body_part: injuryDraft.body_part.trim(), severity: injuryDraft.severity, note: injuryDraft.note.trim() },
                {
                  onSuccess: () => setInjuryDraft({ body_part: '', severity: 3, note: '' }),
                  onError: (e: any) => showAlert(t('antrenman.err_save_title'), e.message ?? t('ilerleme.err_injury_save')),
                }
              );
            }}
          />
        </Panel>

        <Panel title={t('ilerleme.weight_proj_title')} right={t('ilerleme.kcal_per_kg')}>
          {proj.length > 0 && <LineChart proj={proj} actual={actual} />}
          <Pressable style={styles.historyBtn} onPress={() => router.push({ pathname: '/(app)/ilerleme-gecmis', params: { type: 'weight' } })}>
            <Text style={styles.historyBtnText}>{t('ilerleme.weight_history_btn')}</Text>
          </Pressable>
          <View style={styles.chips}>
            {[
              [`${nf(weeklyDelta * WEEKS, 1)} kg`, t('ilerleme.in_weeks', { weeks: WEEKS })],
              [`${nf(weeklyDelta, 2)} kg`, t('ilerleme.weekly')],
              [`${nf(client.kcal_target - client.tdee)} kcal`, t('ilerleme.daily_diff')],
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
                label={t('ilerleme.weight_label')}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="Ör. 79.5"
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateField
                label={t('ilerleme.date_empty_today')}
                value={weightDateInput}
                onChangeText={setWeightDateInput}
                placeholder={t('placeholder.date_format')}
              />
            </View>
          </View>
          {weightDateInput.trim() && !weightDateIso && <Text style={styles.dateError}>{t('ilerleme.date_format_err')}</Text>}
          <PrimaryButton
            label={t('common.save')}
            loading={logWeight.isPending}
            disabled={!weightInput || (!!weightDateInput.trim() && !weightDateIso)}
            onPress={() => {
              const v = parseFloat(weightInput.replace(',', '.'));
              if (!Number.isNaN(v) && weightDateIso) {
                logWeight.mutate(
                  { weight: v, date: weightDateIso },
                  { onError: (e: any) => showAlert(t('antrenman.err_save_title'), e.message ?? t('ilerleme.err_weight_save')) }
                );
              }
            }}
          />
        </Panel>

        <Panel title={t('ilerleme.cardio_title')} right={cardioWeek.length ? t('ilerleme.avg_steps', { count: nf(avgSteps) }) : t('ilerleme.no_records')}>
          {cardioTrendPoints.length > 0 ? (
            <TrendChart points={cardioTrendPoints} color={C.blue} formatValue={(v) => nf(v)} h={130} />
          ) : (
            <Text style={styles.noteText}>{t('ilerleme.no_records_yet')}</Text>
          )}

          <Pressable style={styles.historyBtn} onPress={() => router.push({ pathname: '/(app)/ilerleme-gecmis', params: { type: 'cardio' } })}>
            <Text style={styles.historyBtnText}>{t('ilerleme.history_btn')}</Text>
          </Pressable>

          <DateField
            label={t('ilerleme.date_empty_today')}
            value={cardioDateInput}
            onChangeText={setCardioDateInput}
            placeholder={t('placeholder.date_format')}
          />
          {cardioDateInput.trim() && !cardioDateIso && <Text style={styles.dateError}>{t('ilerleme.date_format_err')}</Text>}
          <View style={styles.formGrid}>
            <View style={styles.measureFormItem}>
              <AuthField
                label={t('ilerleme.steps_label')}
                value={cardioDraft.steps}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, steps: v }))}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.measureFormItem}>
              <AuthField
                label={t('ilerleme.cardio_type_label')}
                value={cardioDraft.cardio_type}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, cardio_type: v }))}
                placeholder={t('ilerleme.cardio_type_placeholder')}
              />
            </View>
            <View style={styles.measureFormItem}>
              <AuthField
                label={t('ilerleme.duration_label')}
                value={cardioDraft.duration_minutes}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, duration_minutes: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.measureFormItem}>
              <AuthField
                label={t('ilerleme.distance_label')}
                value={cardioDraft.distance_km}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, distance_km: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.measureFormItem}>
              <AuthField
                label={t('ilerleme.calories_label')}
                value={cardioDraft.calories}
                onChangeText={(v) => setCardioDraft((s) => ({ ...s, calories: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>
          <PrimaryButton
            label={t('ilerleme.save_cardio_btn')}
            loading={logCardio.isPending}
            disabled={
              (!cardioDraft.cardio_type.trim() &&
                !cardioDraft.duration_minutes &&
                !cardioDraft.distance_km &&
                !cardioDraft.steps &&
                !cardioDraft.calories) ||
              (!!cardioDateInput.trim() && !cardioDateIso)
            }
            onPress={() => {
              if (!selectedClientId) {
                showAlert(t('beslenme.wait_title'), t('beslenme.client_not_loaded'));
                return;
              }
              if (!cardioDateIso) return;
              const n = (s: string) => parseFloat(s.replace(',', '.')) || 0;
              logCardio.mutate(
                {
                  cardio_type: cardioDraft.cardio_type.trim(),
                  duration_minutes: n(cardioDraft.duration_minutes),
                  distance_km: n(cardioDraft.distance_km),
                  steps: Math.round(n(cardioDraft.steps)),
                  calories: n(cardioDraft.calories),
                  date: cardioDateIso,
                },
                {
                  // Formu BİLEREK boşaltmıyoruz (Ölçüm formundaki davranışın aynısı): bu bir
                  // upsert, kaydedilen değerlerin ekranda kalması doğru geri bildirim. Ayrıca
                  // boşaltmak, yukarıdaki hidrasyon efekti kaydı yeniden yükleyince titremeye
                  // yol açardı.
                  onError: (e: any) => showAlert(t('antrenman.err_save_title'), e.message ?? t('ilerleme.err_cardio_save')),
                }
              );
            }}
          />
        </Panel>

        <Panel title={t('ilerleme.measurements_title')} right={latestMeasurement ? t('ilerleme.last_measurement', { date: latestMeasurement.date }) : t('ilerleme.no_records')}>
          {latestMeasurement && (
            <View style={styles.measureGrid}>
              {measureFields.map((f) => {
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
            <Text style={styles.historyBtnText}>{t('ilerleme.history_btn')}</Text>
          </Pressable>

          <DateField
            label={t('ilerleme.date_empty_today')}
            value={measureDateInput}
            onChangeText={setMeasureDateInput}
            placeholder={t('placeholder.date_format')}
          />
          {measureDateInput.trim() && !measureDateIso && <Text style={styles.dateError}>{t('ilerleme.date_format_err')}</Text>}
          <View style={styles.formGrid}>
            {measureFields.map((f) => (
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
            label={t('ilerleme.save_measurement_btn')}
            loading={logMeasurement.isPending}
            disabled={MEASURE_FIELDS.every((f) => !measureDraft[f.key]) || (!!measureDateInput.trim() && !measureDateIso)}
            onPress={() => {
              if (!selectedClientId) {
                showAlert(t('beslenme.wait_title'), t('beslenme.client_not_loaded'));
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
                  onError: (e: any) => showAlert(t('antrenman.err_save_title'), e.message ?? t('ilerleme.err_measurement_save')),
                }
              );
            }}
          />
        </Panel>

        <Panel title={t('ilerleme.photos_title')} right={t('ilerleme.photos_count', { count: (photosQuery.data ?? []).length })}>
          <View style={styles.photoActions}>
            <Pressable style={[styles.addPhotoBtn, { flex: 1 }]} onPress={pickPhoto} disabled={uploadPhoto.isPending}>
              <Text style={styles.addPhotoText}>{uploadPhoto.isPending ? t('ilerleme.uploading') : t('ilerleme.add_photo_btn')}</Text>
            </Pressable>
            {(photosQuery.data ?? []).length >= 2 && (
              <Pressable
                style={[styles.compareBtn, compareMode && styles.compareBtnOn]}
                onPress={() => {
                  setCompareMode((v) => !v);
                  setCompareIds([]);
                }}
              >
                <Text style={[styles.compareBtnText, compareMode && styles.compareBtnTextOn]}>
                  {compareMode ? t('common.cancel') : t('ilerleme.compare_btn')}
                </Text>
              </Pressable>
            )}
          </View>

          {compareMode && <Text style={styles.compareHint}>{t('ilerleme.compare_hint')}</Text>}

          {comparePair && (
            <View style={styles.compareRow}>
              {comparePair.map((p, i) => (
                <View key={p.id} style={styles.compareCol}>
                  <Text style={styles.compareCaption}>{i === 0 ? t('ilerleme.compare_before') : t('ilerleme.compare_after')}</Text>
                  {p.url ? <Image source={{ uri: p.url }} style={styles.comparePhoto} resizeMode="cover" /> : <View style={[styles.comparePhoto, styles.photoFallback]} />}
                  <Text style={styles.compareDate}>{p.date}</Text>
                  {weightAt(p.date) !== null && <Text style={styles.compareWeight}>{nf(weightAt(p.date)!, 1)} kg</Text>}
                </View>
              ))}
            </View>
          )}
          {compareSummary && <Text style={styles.compareSummary}>{compareSummary}</Text>}

          <View style={styles.photoGrid}>
            {(photosQuery.data ?? []).map((p: any) => {
              const secim = compareIds.indexOf(p.id);
              return (
              <Pressable
                key={p.id}
                style={[styles.photoWrap, secim >= 0 && styles.photoWrapOn]}
                onPress={() => (compareMode ? toggleCompare(p.id) : setViewingPhoto({ url: p.url, date: p.date }))}
                onLongPress={() =>
                  showAlert(t('ilerleme.delete_photo_title'), t('ilerleme.delete_photo_body', { date: p.date }), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: () => deletePhoto.mutate(p, { onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('ilerleme.err_photo_delete')) }),
                    },
                  ])
                }
              >
                {p.url ? <Image source={{ uri: p.url }} style={styles.photo} /> : <View style={[styles.photo, styles.photoFallback]} />}
                {secim >= 0 && (
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>{secim + 1}</Text>
                  </View>
                )}
                <Text style={styles.photoDate}>{p.date}</Text>
              </Pressable>
              );
            })}
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

        <Panel title={t('ilerleme.monthly_survey_title')} right={monthLabelTr(thisMonthPeriod)}>
          {surveysQuery.isLoading ? (
            <Text style={styles.noteText}>{t('ilerleme.loading')}</Text>
          ) : (
            <>
              <Text style={styles.noteText}>
                {isTrainer
                  ? t('ilerleme.months_completed', { count: surveys.length })
                  : thisMonthSurvey
                    ? t('ilerleme.survey_done_this_month')
                    : t('ilerleme.survey_not_done_this_month')}
              </Text>
              <Pressable style={styles.historyBtn} onPress={() => router.push({ pathname: '/(app)/anket', params: { period: thisMonthPeriod } })}>
                <Text style={styles.historyBtnText}>
                  {isTrainer ? t('ilerleme.view_surveys_btn') : thisMonthSurvey ? t('ilerleme.view_edit_survey_btn') : t('ilerleme.fill_survey_btn')}
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
  photoWrapOn: { opacity: 1 },
  photoActions: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  compareBtn: {
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  compareBtnOn: { backgroundColor: C.lime, borderColor: C.lime },
  compareBtnText: { fontSize: 12, fontWeight: '800', color: C.grey },
  compareBtnTextOn: { color: C.bg },
  compareHint: { fontSize: 11.5, color: C.greyD, fontStyle: 'italic', marginBottom: 12 },
  compareRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  compareCol: { flex: 1, minWidth: 0 },
  compareCaption: { fontSize: 10, fontWeight: '800', color: C.greyD, letterSpacing: 0.4, marginBottom: 5 },
  comparePhoto: { width: '100%', aspectRatio: 0.75, borderRadius: 12, backgroundColor: C.card2 },
  compareDate: { fontSize: 11, color: C.grey, marginTop: 5, fontWeight: '600' },
  compareWeight: { fontSize: 13, fontWeight: '800', color: C.lime, marginTop: 1 },
  compareSummary: {
    fontSize: 12.5,
    fontWeight: '700',
    color: C.white,
    backgroundColor: C.card2,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  photoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadgeText: { fontSize: 11, fontWeight: '900', color: C.bg },
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
