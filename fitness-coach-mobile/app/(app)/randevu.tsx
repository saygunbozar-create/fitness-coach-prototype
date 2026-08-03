import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { AuthField } from '../../components/AuthField';
import { DateField } from '../../components/DateField';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import {
  useAddAvailabilityException,
  useAddAvailabilityRule,
  useAvailabilityExceptions,
  useAvailabilityRules,
  useBookAppointment,
  useClient,
  useDeleteAvailabilityException,
  useDeleteAvailabilityRule,
  useLessonSchedule,
  useApproveReschedule,
  useCancelRescheduleRequest,
  useMyUpcomingAppointments,
  useRejectReschedule,
  useRequestReschedule,
  useRescheduleRequests,
  useTakenSlots,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { addDaysToDateStr, C, formatTimeInputTr, localDateStr, monthNames, type TFn } from '../../lib/theme';
import type { AvailabilityException, AvailabilityRule } from '../../lib/types';

// Bu ekran her yerde ISO gramerini kullanıyor: 1=Pazartesi..7=Pazar.
const ISO_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7];
const dayFull = (iso: number, t: TFn) => t(`weekday.${ISO_DAY_KEYS[iso - 1]}`);
const dayShort = (iso: number, t: TFn) => t(`weekday.short.${ISO_DAY_KEYS[iso - 1]}`);
const DURATIONS = [30, 45, 60, 90];

// JS Date.getDay(): 0=Pazar..6=Cumartesi. Uygulamanın geri kalanının kullandığı ISO gramerine
// çeviriyoruz: 1=Pazartesi..7=Pazar (bkz. lib/theme.ts mondayOfWeek).
function isoWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 ? 7 : dow;
}

function parseTrTime(input: string): string | null {
  const m = input.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

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

function formatDateLong(dateStr: string, t: TFn): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return t('format.date_long', {
    day: d,
    month: monthNames(t)[m - 1],
    weekday: dayFull(isoWeekday(dateStr), t),
  });
}

function formatTrDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${m}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Bir kuraldan türeyen slotları, o güne ait kapatılmış (availability_exceptions) aralıklarla
// çakışanları eleyerek üretir — "Perşembe 12:00-16:00 vardiyam var" gibi geçici kapatmalar
// haftalık kuralı silmeden sadece o tarihte devre dışı bırakır.
function generateSlotsForDate(rules: AvailabilityRule[], exceptions: AvailabilityException[], dateStr: string): string[] {
  const dow = isoWeekday(dateStr);
  const applicable = rules.filter((r) => r.days_of_week.includes(dow) && dateStr >= r.start_date && dateStr <= r.end_date);
  const blocks = exceptions.filter((e) => e.date === dateStr).map((e) => ({ start: timeToMinutes(e.start_time), end: timeToMinutes(e.end_time) }));
  const set = new Set<string>();
  for (const r of applicable) {
    let cur = timeToMinutes(r.start_time);
    const end = timeToMinutes(r.end_time);
    while (cur + r.session_minutes <= end) {
      const slotEnd = cur + r.session_minutes;
      const blocked = blocks.some((b) => cur < b.end && slotEnd > b.start);
      if (!blocked) set.add(minutesToTime(cur));
      cur += r.session_minutes;
    }
  }
  return Array.from(set).sort();
}

// Bugün için geçmiş saatler randevuya kapalı olmalı — aksi halde saat 15:00'te bile sabah
// 09:00 slotu boş görünüp seçilebiliyordu. Sadece BUGÜNÜ filtreliyoruz; ileri tarihlerin
// tüm saatleri açık kalır.
function dropPastSlots(slots: string[], dateStr: string): string[] {
  if (dateStr !== localDateStr()) return slots;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((s) => timeToMinutes(s) > nowMinutes);
}

function hasAnyAvailability(rules: AvailabilityRule[], dateStr: string): boolean {
  const dow = isoWeekday(dateStr);
  return rules.some((r) => r.days_of_week.includes(dow) && dateStr >= r.start_date && dateStr <= r.end_date);
}

export default function RandevuScreen() {
  const t = useT();
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';

  if (isTrainer) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={t('randevu.availability_title')} />
        <ScrollView contentContainerStyle={styles.content}>
          <TrainerRescheduleRequestsPanel trainerId={profile?.id} />
          <TrainerDayPreviewPanel trainerId={profile?.id} />
          <TrainerAvailabilityPanel trainerId={profile?.id} />
          <TrainerExceptionsPanel trainerId={profile?.id} />
        </ScrollView>
      </View>
    );
  }

  return <ClientAppointmentScreen />;
}

// Antrenörün kendi gününü danışanın gördüğü gibi, somut saat saat görmesi için. Müsaitlik
// kuralları soyut ("Pzt-Cum 09:00-20:00, 60 dk"); bu panel o kuraldan hangi saatlerin
// çıktığını ve hangilerinin dolu olduğunu gösteriyor.
//
// Danışanın gördüğünden iki farkı var, ikisi de kasıtlı:
//   1. Dolu saatlerde DANIŞAN ADI yazıyor (antrenör zaten bu veriye sahip; danışan görmemeli).
//   2. Bugünün geçmiş saatleri elenmiyor, soluk gösteriliyor — danışan için geçmiş saat
//      seçilemez olduğu için gizleniyor, ama antrenör "bugün neler oldu"yu da görmek istiyor.
function TrainerDayPreviewPanel({ trainerId }: { trainerId: string | undefined }) {
  const t = useT();
  const { setSelectedClientId } = useSelectedClient();
  const rulesQuery = useAvailabilityRules(trainerId);
  const exceptionsQuery = useAvailabilityExceptions(trainerId);
  const upcomingDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysToDateStr(localDateStr(), i)), []);
  const [selectedDate, setSelectedDate] = useState(() => localDateStr());
  const lessonsQuery = useLessonSchedule(trainerId, selectedDate, selectedDate);

  const rules = rulesQuery.data ?? [];
  const exceptions = exceptionsQuery.data ?? [];
  const lessons = lessonsQuery.data ?? [];

  const byTime = new Map(lessons.map((l) => [l.time.slice(0, 5), l]));

  // Kuraldan türeyen saatler + elle eklenmiş dersler. Birleştirme ŞART: antrenör bir dersi
  // kuralların dışında bir saate (ör. 07:30) elle eklemiş olabilir; sadece kurala bakarsak
  // o ders hiç görünmez ve gün boşmuş gibi okunur.
  const rows = useMemo(() => {
    const times = new Set(generateSlotsForDate(rules, exceptions, selectedDate));
    for (const l of lessons) times.add(l.time.slice(0, 5));
    return Array.from(times).sort();
  }, [rules, exceptions, selectedDate, lessons]);

  const nowTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const isToday = selectedDate === localDateStr();
  const doluSayisi = rows.filter((r) => byTime.has(r)).length;

  function openClient(clientId: string) {
    setSelectedClientId(clientId);
    router.push('/(app)/antrenman');
  }

  return (
    <Panel
      title={t('randevu.day_preview_title')}
      right={rows.length ? t('randevu.day_preview_count', { taken: doluSayisi, total: rows.length }) : undefined}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip}>
        {upcomingDays.map((d) => {
          const on = d === selectedDate;
          const [, , dayNum] = d.split('-');
          return (
            <Pressable key={d} style={[styles.dateCard, on && styles.dateCardOn]} onPress={() => setSelectedDate(d)}>
              <Text style={[styles.dateDow, on && styles.dateDowOn]}>{dayShort(isoWeekday(d), t)}</Text>
              <Text style={[styles.dateNum, on && styles.dateNumOn]}>{parseInt(dayNum, 10)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>{formatDateLong(selectedDate, t)}</Text>

      {lessonsQuery.isLoading ? (
        <ActivityIndicator color={C.lime} />
      ) : rows.length === 0 ? (
        <Text style={styles.noteText}>{t('randevu.day_preview_empty')}</Text>
      ) : (
        rows.map((time) => {
          const lesson = byTime.get(time);
          const gecmis = isToday && time < nowTime;
          const satir = (
            <View style={[styles.slotRow, gecmis && styles.slotRowPast]}>
              <Text style={[styles.slotRowTime, lesson && styles.slotRowTimeTaken]}>{time}</Text>
              {lesson ? (
                <>
                  <Text style={styles.slotRowName} numberOfLines={1}>{lesson.clientName}</Text>
                  {lesson.booked_by_client && (
                    <View style={styles.bookedBadgeSm}>
                      <Text style={styles.bookedBadgeSmText}>{t('panel.booked_badge')}</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.slotRowFree}>{t('randevu.slot_free')}</Text>
              )}
            </View>
          );
          return lesson ? (
            <Pressable key={time} onPress={() => openClient(lesson.client_id)}>
              {satir}
            </Pressable>
          ) : (
            <View key={time}>{satir}</View>
          );
        })
      )}
    </Panel>
  );
}

// Danışanların gönderdiği randevu değişiklik talepleri. Antrenör onaylayana kadar randevu
// taşınmaz (bkz. migration 0066) — bu panel o onayın yapıldığı yer.
function TrainerRescheduleRequestsPanel({ trainerId }: { trainerId: string | undefined }) {
  const t = useT();
  const requestsQuery = useRescheduleRequests(trainerId);
  const approve = useApproveReschedule(trainerId);
  const reject = useRejectReschedule(trainerId);
  const requests = requestsQuery.data ?? [];

  return (
    <Panel title={t('randevu.requests_title')} right={t('randevu.requests_count', { count: requests.length })}>
      {requests.length === 0 ? (
        <Text style={styles.noteText}>{t('randevu.no_requests')}</Text>
      ) : (
        requests.map((r) => (
          <View key={r.id} style={styles.ruleCard}>
            <View style={[styles.ruleDot, { backgroundColor: C.orange }]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.ruleDays}>{r.client_name ?? '—'}</Text>
              <Text style={styles.ruleMeta}>
                {t('randevu.request_row', {
                  from: `${formatDateLong(r.date, t)} · ${r.time.slice(0, 5)}`,
                  to: `${formatDateLong(r.pending_date!, t)} · ${r.pending_time!.slice(0, 5)}`,
                })}
              </Text>
            </View>
            <Pressable
              style={styles.approveBtn}
              disabled={approve.isPending}
              onPress={() =>
                approve.mutate(
                  { id: r.id, pending_date: r.pending_date!, pending_time: r.pending_time! },
                  {
                    onError: (e: any) =>
                      showAlert(
                        t('randevu.err_approve_title'),
                        e.message === 'SLOT_TAKEN' ? t('randevu.err_approve_taken') : e.message ?? t('randevu.err_approve_generic')
                      ),
                  }
                )
              }
              hitSlop={6}
            >
              <Text style={styles.approveBtnText}>{t('randevu.approve_btn')}</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                showAlert(t('randevu.reject_confirm_title'), t('randevu.reject_confirm_body', { name: r.client_name ?? '—' }), [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('randevu.reject_btn'),
                    style: 'destructive',
                    onPress: () =>
                      reject.mutate(r.id, {
                        onError: (e: any) => showAlert(t('randevu.err_approve_title'), e.message ?? t('randevu.err_reject')),
                      }),
                  },
                ])
              }
              hitSlop={6}
            >
              <Text style={styles.ruleDelete}>{t('randevu.reject_btn')}</Text>
            </Pressable>
          </View>
        ))
      )}
    </Panel>
  );
}

function TrainerAvailabilityPanel({ trainerId }: { trainerId: string | undefined }) {
  const t = useT();
  const rulesQuery = useAvailabilityRules(trainerId);
  const addRule = useAddAvailabilityRule(trainerId);
  const deleteRule = useDeleteAvailabilityRule(trainerId);

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [duration, setDuration] = useState(45);
  const [endDateInput, setEndDateInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const rules = rulesQuery.data ?? [];

  function toggleDay(iso: number) {
    setSelectedDays((s) => (s.includes(iso) ? s.filter((d) => d !== iso) : [...s, iso].sort()));
  }

  function submit() {
    setFormError(null);
    if (selectedDays.length === 0) {
      setFormError(t('randevu.pick_at_least_one_day'));
      return;
    }
    const start = parseTrTime(startTime);
    const end = parseTrTime(endTime);
    if (!start || !end || start >= end) {
      setFormError(t('randevu.time_range_invalid'));
      return;
    }
    const endDate = parseTrDate(endDateInput);
    if (!endDate) {
      setFormError(t('randevu.end_date_format_err'));
      return;
    }
    addRule.mutate(
      {
        days_of_week: selectedDays,
        start_time: start,
        end_time: end,
        session_minutes: duration,
        start_date: localDateStr(),
        end_date: endDate,
      },
      {
        onSuccess: () => setEndDateInput(''),
        onError: (e: any) => showAlert(t('randevu.err_add_title'), e.message ?? t('randevu.err_add_rule')),
      }
    );
  }

  return (
    <Panel title={t('randevu.rules_title')} right={t('randevu.active_rules_count', { count: rules.length })}>
      <Text style={styles.fieldLabel}>{t('randevu.which_days')}</Text>
      <View style={styles.dayRow}>
        {ISO_DAYS.map((iso) => (
          <Pressable
            key={iso}
            style={[styles.dayChip, selectedDays.includes(iso) && styles.dayChipOn]}
            onPress={() => toggleDay(iso)}
          >
            <Text style={[styles.dayChipText, selectedDays.includes(iso) && styles.dayChipTextOn]}>{dayShort(iso, t)[0]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.rowGap}>
        <View style={{ flex: 1 }}>
          <AuthField
            label={t('randevu.start_time_label')}
            value={startTime}
            onChangeText={(v) => setStartTime((prev) => formatTimeInputTr(v, prev))}
            placeholder="09:00"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AuthField
            label={t('randevu.end_time_label')}
            value={endTime}
            onChangeText={(v) => setEndTime((prev) => formatTimeInputTr(v, prev))}
            placeholder="18:00"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
      </View>

      <Text style={styles.fieldLabel}>{t('randevu.session_duration')}</Text>
      <View style={styles.durRow}>
        {DURATIONS.map((d) => (
          <Pressable key={d} style={[styles.durChip, duration === d && styles.durChipOn]} onPress={() => setDuration(d)}>
            <Text style={[styles.durChipText, duration === d && styles.durChipTextOn]}>{t('randevu.duration_chip', { minutes: d })}</Text>
          </Pressable>
        ))}
      </View>

      <DateField
        label={t('randevu.rule_valid_until_label')}
        value={endDateInput}
        onChangeText={setEndDateInput}
        placeholder={t('randevu.rule_valid_until_placeholder')}
      />
      {formError && <Text style={styles.errorText}>{formError}</Text>}

      <PrimaryButton label={t('randevu.add_rule_btn')} loading={addRule.isPending} onPress={submit} />

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t('randevu.active_rules_label')}</Text>
      {rules.length === 0 ? (
        <Text style={styles.noteText}>{t('randevu.no_rules_yet')}</Text>
      ) : (
        rules.map((r) => (
          <View key={r.id} style={styles.ruleCard}>
            <View style={styles.ruleDot} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.ruleDays}>{r.days_of_week.map((d) => dayFull(d, t)).join(' · ')}</Text>
              <Text style={styles.ruleMeta}>
                {t('randevu.rule_meta', { start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5), minutes: r.session_minutes, date: formatTrDateShort(r.end_date) })}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                showAlert(t('randevu.delete_rule_title'), t('randevu.delete_rule_body'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('common.delete'), style: 'destructive', onPress: () => deleteRule.mutate(r.id, { onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('randevu.err_rule_delete')) }) },
                ])
              }
              hitSlop={8}
            >
              <Text style={styles.ruleDelete}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        ))
      )}
    </Panel>
  );
}

function TrainerExceptionsPanel({ trainerId }: { trainerId: string | undefined }) {
  const t = useT();
  const exceptionsQuery = useAvailabilityExceptions(trainerId);
  const addException = useAddAvailabilityException(trainerId);
  const deleteException = useDeleteAvailabilityException(trainerId);
  const exceptions = (exceptionsQuery.data ?? []).filter((e) => e.date >= localDateStr());

  const [dateInput, setDateInput] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('16:00');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const parsedDate = parseTrDate(dateInput);
  const conflictQuery = useTakenSlots(trainerId, parsedDate ?? undefined);

  function submit() {
    setFormError(null);
    if (!parsedDate) {
      setFormError(t('ilerleme.date_format_err'));
      return;
    }
    const start = parseTrTime(startTime);
    const end = parseTrTime(endTime);
    if (!start || !end || start >= end) {
      setFormError(t('randevu.time_range_invalid'));
      return;
    }
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    const conflicts = (conflictQuery.data ?? []).filter((time) => timeToMinutes(time) >= startMin && timeToMinutes(time) < endMin).length;

    const doSubmit = () =>
      addException.mutate(
        { date: parsedDate, start_time: start, end_time: end, note: note.trim() },
        {
          onSuccess: () => {
            setDateInput('');
            setNote('');
          },
          onError: (e: any) => showAlert(t('randevu.err_add_title'), e.message ?? t('randevu.err_add_exception')),
        }
      );

    if (conflicts > 0) {
      showAlert(
        t('randevu.conflict_title'),
        t('randevu.conflict_body', { date: formatDateLong(parsedDate, t), start, end, count: conflicts }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('randevu.close_anyway_btn'), onPress: doSubmit },
        ]
      );
    } else {
      doSubmit();
    }
  }

  return (
    <Panel title={t('randevu.exceptions_title')} right={t('randevu.exceptions_count', { count: exceptions.length })}>
      <Text style={styles.noteText}>
        {t('randevu.exceptions_hint')}
      </Text>
      <View style={{ height: 12 }} />
      <DateField
        label={t('randevu.date_label')}
        value={dateInput}
        onChangeText={setDateInput}
        placeholder={t('randevu.date_placeholder')}
      />
      <View style={styles.rowGap}>
        <View style={{ flex: 1 }}>
          <AuthField
            label={t('randevu.start_time_label')}
            value={startTime}
            onChangeText={(v) => setStartTime((prev) => formatTimeInputTr(v, prev))}
            placeholder="12:00"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AuthField
            label={t('randevu.end_time_label')}
            value={endTime}
            onChangeText={(v) => setEndTime((prev) => formatTimeInputTr(v, prev))}
            placeholder="16:00"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
      </View>
      <AuthField label={t('randevu.note_optional_label')} value={note} onChangeText={setNote} placeholder={t('randevu.note_optional_placeholder')} />
      {formError && <Text style={styles.errorText}>{formError}</Text>}

      <PrimaryButton label={t('randevu.close_hours_btn')} loading={addException.isPending} onPress={submit} />

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t('randevu.upcoming_closures_label')}</Text>
      {exceptions.length === 0 ? (
        <Text style={styles.noteText}>{t('randevu.no_closures')}</Text>
      ) : (
        exceptions.map((e) => (
          <View key={e.id} style={styles.ruleCard}>
            <View style={[styles.ruleDot, { backgroundColor: C.orange }]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.ruleDays}>{formatDateLong(e.date, t)}</Text>
              <Text style={styles.ruleMeta}>
                {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}
                {e.note ? ` · ${e.note}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => deleteException.mutate(e.id, { onError: (err: any) => showAlert(t('common.delete_failed_title'), err.message ?? t('randevu.err_exception_delete')) })}
              hitSlop={8}
            >
              <Text style={styles.ruleDelete}>{t('randevu.open_btn')}</Text>
            </Pressable>
          </View>
        ))
      )}
    </Panel>
  );
}

function ClientAppointmentScreen() {
  const t = useT();
  const { profile } = useAuth();
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const client = clientQuery.data;

  if (clientQuery.isLoading || !client) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('randevu.book_title')} />
      <ScrollView contentContainerStyle={styles.content}>
        <ClientBookingPanel trainerId={client.trainer_id} clientId={client.id} />
        <MyAppointmentsPanel trainerId={client.trainer_id} clientId={client.id} />
      </ScrollView>
    </View>
  );
}

// Tarih şeridi + boş saat ızgarası — hem ilk randevuyu alırken hem de mevcut bir randevuyu
// yeniden planlarken (bkz. MyAppointmentsPanel) aynı bileşen kullanılıyor.
function SlotPicker({
  trainerId,
  rules,
  exceptions,
  selectedDate,
  onSelectDate,
  onPickSlot,
  picking,
}: {
  trainerId: string;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPickSlot: (time: string) => void;
  picking?: boolean;
}) {
  const t = useT();
  const upcomingDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysToDateStr(localDateStr(), i)), []);
  const takenQuery = useTakenSlots(trainerId, selectedDate);
  const slots = useMemo(
    () => dropPastSlots(generateSlotsForDate(rules, exceptions, selectedDate), selectedDate),
    [rules, exceptions, selectedDate]
  );
  const taken = new Set(takenQuery.data ?? []);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip}>
        {upcomingDays.map((d) => {
          const available = hasAnyAvailability(rules, d);
          const on = d === selectedDate;
          const [, , dayNum] = d.split('-');
          return (
            <Pressable
              key={d}
              disabled={!available}
              style={[styles.dateCard, on && styles.dateCardOn, !available && styles.dateCardOff]}
              onPress={() => onSelectDate(d)}
            >
              <Text style={[styles.dateDow, on && styles.dateDowOn]}>{dayShort(isoWeekday(d), t)}</Text>
              <Text style={[styles.dateNum, on && styles.dateNumOn]}>{parseInt(dayNum, 10)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>{formatDateLong(selectedDate, t)} {t('randevu.empty_slots_suffix')}</Text>
      {takenQuery.isLoading ? (
        <ActivityIndicator color={C.lime} />
      ) : slots.length === 0 ? (
        <Text style={styles.noteText}>{t('randevu.no_slots_today')}</Text>
      ) : (
        <View style={styles.slotGrid}>
          {slots.map((s) => {
            const isTaken = taken.has(s);
            return (
              <Pressable key={s} disabled={isTaken || picking} style={[styles.slot, isTaken && styles.slotTaken]} onPress={() => onPickSlot(s)}>
                <Text style={[styles.slotText, isTaken && styles.slotTextTaken]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
}

function ClientBookingPanel({ trainerId, clientId }: { trainerId: string; clientId: string }) {
  const t = useT();
  const rulesQuery = useAvailabilityRules(trainerId);
  const exceptionsQuery = useAvailabilityExceptions(trainerId);
  const rules = rulesQuery.data ?? [];
  const exceptions = exceptionsQuery.data ?? [];

  const upcomingDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysToDateStr(localDateStr(), i)), []);
  const [selectedDate, setSelectedDate] = useState(() => upcomingDays.find((d) => hasAnyAvailability(rules, d)) ?? upcomingDays[0]);

  const bookAppointment = useBookAppointment(trainerId, clientId);

  function confirmBooking(time: string) {
    showAlert(t('randevu.confirm_booking_title'), t('randevu.confirm_booking_body', { date: formatDateLong(selectedDate, t), time }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('randevu.book_btn'),
        onPress: () =>
          bookAppointment.mutate(
            { date: selectedDate, time },
            { onError: (e: any) => showAlert(t('randevu.err_book_title'), e.message?.includes('duplicate') ? t('randevu.err_slot_taken') : e.message ?? t('randevu.err_book_generic')) }
          ),
      },
    ]);
  }

  return (
    <Panel title={t('randevu.book_title')} right={rulesQuery.isLoading ? undefined : t('randevu.open_slots_count', { count: rules.length })}>
      {!rulesQuery.isLoading && rules.length === 0 ? (
        <Text style={styles.noteText}>{t('randevu.no_rules_client')}</Text>
      ) : (
        <>
          <Text style={styles.fieldLabel}>{t('randevu.pick_date')}</Text>
          <SlotPicker
            trainerId={trainerId}
            rules={rules}
            exceptions={exceptions}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPickSlot={confirmBooking}
            picking={bookAppointment.isPending}
          />
        </>
      )}
    </Panel>
  );
}

function MyAppointmentsPanel({ trainerId, clientId }: { trainerId: string; clientId: string }) {
  const t = useT();
  const appointmentsQuery = useMyUpcomingAppointments(clientId);
  const rulesQuery = useAvailabilityRules(trainerId);
  const exceptionsQuery = useAvailabilityExceptions(trainerId);
  const requestReschedule = useRequestReschedule(trainerId, clientId);
  const cancelRequest = useCancelRescheduleRequest(trainerId, clientId);
  const appointments = appointmentsQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const exceptions = exceptionsQuery.data ?? [];

  const upcomingDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysToDateStr(localDateStr(), i)), []);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(upcomingDays[0]);

  function openReschedule(id: string) {
    setReschedulingId(id);
    setRescheduleDate(upcomingDays.find((d) => hasAnyAvailability(rules, d)) ?? upcomingDays[0]);
  }

  // Artık doğrudan taşımıyor: antrenörün onayına giden bir TALEP oluşturuyor.
  function confirmRescheduleRequest(id: string, oldLabel: string, time: string) {
    showAlert(t('randevu.request_change_title'), t('randevu.request_change_body', { old: oldLabel, date: formatDateLong(rescheduleDate, t), time }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('randevu.request_btn'),
        onPress: () =>
          requestReschedule.mutate(
            { id, date: rescheduleDate, time },
            {
              onSuccess: () => setReschedulingId(null),
              onError: (e: any) => showAlert(t('randevu.err_request_title'), e.message ?? t('randevu.err_request_generic')),
            }
          ),
      },
    ]);
  }

  return (
    <Panel title={t('randevu.my_appointments_title')} right={t('ilerleme.records_count', { count: appointments.length })}>
      {appointments.length === 0 ? (
        <Text style={styles.noteText}>{t('randevu.no_upcoming_appt')}</Text>
      ) : (
        appointments.map((a) => {
          const isPending = !!a.pending_date && !!a.pending_time;
          // Değişiklik talebi SADECE danışanın kendi aldığı randevularda mümkün:
          // lesson_schedule_client_reschedule politikası booked_by_client=true şartı koyuyor, yani
          // antrenörün elle eklediği bir derste güncelleme RLS tarafından sessizce 0 satır etkiler
          // (hata da dönmez). Butonu göstermek, danışanın saat seçip hiçbir şey olmadığını görmesine
          // yol açıyordu — o yüzden bu durumda hiç göstermiyoruz.
          const canRequestChange = a.booked_by_client;
          return (
            <View key={a.id} style={styles.apptBlock}>
              <View style={styles.apptRow}>
                <View>
                  <Text style={styles.apptDate}>{formatDateLong(a.date, t)}</Text>
                  <Text style={styles.apptTime}>{a.time.slice(0, 5)}</Text>
                </View>
                {/* Bekleyen bir talep varken yeni talep açtırmıyoruz — tek randevunun aynı anda
                    yalnızca bir bekleyen değişikliği olabilir. Onun yerine geri çekme sunuluyor. */}
                {!isPending && canRequestChange && (
                  <Pressable onPress={() => (reschedulingId === a.id ? setReschedulingId(null) : openReschedule(a.id))} hitSlop={8}>
                    <Text style={styles.apptChange}>{reschedulingId === a.id ? t('common.cancel') : t('randevu.change_btn')}</Text>
                  </Pressable>
                )}
                {!isPending && !canRequestChange && <Text style={styles.byTrainerNote}>{t('randevu.added_by_trainer')}</Text>}
              </View>

              {isPending && (
                <View style={styles.pendingRow}>
                  <Text style={styles.pendingText}>
                    {t('randevu.pending_badge', { date: formatDateLong(a.pending_date!, t), time: a.pending_time!.slice(0, 5) })}
                  </Text>
                  <Pressable
                    onPress={() =>
                      cancelRequest.mutate(a.id, {
                        onError: (e: any) => showAlert(t('randevu.err_request_title'), e.message ?? t('randevu.err_withdraw')),
                      })
                    }
                    hitSlop={8}
                  >
                    <Text style={styles.withdrawText}>{t('randevu.withdraw_request')}</Text>
                  </Pressable>
                </View>
              )}

              {reschedulingId === a.id && !isPending && canRequestChange && (
                <View style={styles.rescheduleBox}>
                  <Text style={styles.approvalHint}>{t('randevu.change_hint_needs_approval')}</Text>
                  <SlotPicker
                    trainerId={trainerId}
                    rules={rules}
                    exceptions={exceptions}
                    selectedDate={rescheduleDate}
                    onSelectDate={setRescheduleDate}
                    onPickSlot={(time) => confirmRescheduleRequest(a.id, `${formatDateLong(a.date, t)} · ${a.time.slice(0, 5)}`, time)}
                    picking={requestReschedule.isPending}
                  />
                </View>
              )}
            </View>
          );
        })
      )}
      <Text style={styles.trainerHint}>{t('randevu.cancel_hint')}</Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4 },
  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: C.greyD, marginBottom: 8 },
  noteText: { fontSize: 12, color: C.grey },
  errorText: { color: C.red, fontSize: 11, marginBottom: 10 },
  trainerHint: { color: C.greyD, fontSize: 11, marginTop: 10, lineHeight: 16, fontStyle: 'italic' },
  rowGap: { flexDirection: 'row', gap: 10, marginBottom: 14 },

  dayRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dayChip: { flex: 1, aspectRatio: 1, borderRadius: 10, borderWidth: 1, borderColor: C.edge, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  dayChipOn: { backgroundColor: C.lime, borderColor: C.lime },
  dayChipText: { fontSize: 12, fontWeight: '800', color: C.grey },
  dayChipTextOn: { color: C.bg },

  durRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  durChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: C.edge, backgroundColor: C.card2 },
  durChipOn: { backgroundColor: 'rgba(198,249,78,.12)', borderColor: C.lime },
  durChipText: { fontSize: 11, fontWeight: '700', color: C.grey },
  durChipTextOn: { color: C.lime },

  ruleCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  ruleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.lime },
  ruleDays: { fontSize: 12.5, fontWeight: '700', color: C.white },
  ruleMeta: { fontSize: 10.5, color: C.greyD, marginTop: 2 },
  ruleDelete: { fontSize: 11, fontWeight: '700', color: C.red },

  dateStrip: { marginBottom: 16 },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: C.edge,
  },
  slotRowPast: { opacity: 0.45 },
  slotRowTime: { fontSize: 13, fontWeight: '800', color: C.greyD, width: 52 },
  slotRowTimeTaken: { color: C.lime },
  slotRowName: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '700', color: C.white },
  slotRowFree: { flex: 1, fontSize: 12, color: C.greyD, fontStyle: 'italic' },
  bookedBadgeSm: { backgroundColor: 'rgba(198,249,78,0.14)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  bookedBadgeSmText: { fontSize: 8.5, fontWeight: '800', color: C.lime, letterSpacing: 0.3 },
  dateCard: { width: 50, marginRight: 7, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: C.edge, backgroundColor: C.card2, alignItems: 'center', gap: 4 },
  dateCardOn: { backgroundColor: C.lime, borderColor: C.lime },
  dateCardOff: { opacity: 0.35 },
  dateDow: { fontSize: 9, fontWeight: '700', color: C.greyD, textTransform: 'uppercase' },
  dateDowOn: { color: 'rgba(11,13,18,.6)' },
  dateNum: { fontSize: 14, fontWeight: '800', color: C.white },
  dateNumOn: { color: C.bg },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '31%', paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: C.edge, backgroundColor: C.card2, alignItems: 'center' },
  slotTaken: { opacity: 0.3 },
  slotText: { fontSize: 12.5, fontWeight: '700', color: C.white },
  slotTextTaken: { textDecorationLine: 'line-through', color: C.greyD },

  apptBlock: { borderBottomWidth: 1, borderBottomColor: C.edge, paddingVertical: 8 },
  apptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  apptDate: { fontSize: 12.5, color: C.white, fontWeight: '600' },
  apptTime: { fontSize: 12.5, color: C.lime, fontWeight: '800', marginTop: 2 },
  apptChange: { fontSize: 11, fontWeight: '700', color: C.lime },
  rescheduleBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.edge },
  approvalHint: { fontSize: 11, color: C.greyD, marginBottom: 10, fontStyle: 'italic' },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    backgroundColor: 'rgba(251,176,64,.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pendingText: { flex: 1, fontSize: 11.5, color: C.orange, fontWeight: '700' },
  byTrainerNote: { fontSize: 10.5, color: C.greyD, fontStyle: 'italic' },
  withdrawText: { fontSize: 11, color: C.grey, fontWeight: '700' },
  approveBtn: { backgroundColor: C.lime, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  approveBtnText: { fontSize: 11.5, fontWeight: '800', color: C.bg },
});
