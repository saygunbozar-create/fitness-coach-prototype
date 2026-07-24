import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { AuthField } from '../../components/AuthField';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import {
  useAddAvailabilityRule,
  useAvailabilityRules,
  useBookAppointment,
  useClient,
  useDeleteAvailabilityRule,
  useMyUpcomingAppointments,
  useRescheduleAppointment,
  useTakenSlots,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { addDaysToDateStr, C, formatTimeInputTr, localDateStr, TR_MONTHS } from '../../lib/theme';
import type { AvailabilityRule } from '../../lib/types';

const DAY_CHIPS: { iso: number; short: string }[] = [
  { iso: 1, short: 'Pzt' },
  { iso: 2, short: 'Sal' },
  { iso: 3, short: 'Çar' },
  { iso: 4, short: 'Per' },
  { iso: 5, short: 'Cum' },
  { iso: 6, short: 'Cmt' },
  { iso: 7, short: 'Paz' },
];
const DAY_FULL: Record<number, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
  6: 'Cumartesi',
  7: 'Pazar',
};
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

function formatDateInputTr(value: string, prev: string): string {
  let v = value;
  if (v.length === prev.length - 1 && prev.endsWith('.') && v === prev.slice(0, -1)) v = v.slice(0, -1);
  const digits = v.replace(/\D/g, '').slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += '.' + digits.slice(2, 4);
  else if (digits.length === 2) out += '.';
  if (digits.length > 4) out += '.' + digits.slice(4, 8);
  else if (digits.length === 4) out += '.';
  return out;
}

function formatTrDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${TR_MONTHS[m - 1]} ${DAY_FULL[isoWeekday(dateStr)]}`;
}

function formatTrDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${m}`;
}

function generateSlotsForDate(rules: AvailabilityRule[], dateStr: string): string[] {
  const dow = isoWeekday(dateStr);
  const applicable = rules.filter((r) => r.days_of_week.includes(dow) && dateStr >= r.start_date && dateStr <= r.end_date);
  const set = new Set<string>();
  for (const r of applicable) {
    const [sh, sm] = r.start_time.slice(0, 5).split(':').map(Number);
    const [eh, em] = r.end_time.slice(0, 5).split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + r.session_minutes <= end) {
      const h = Math.floor(cur / 60);
      const min = cur % 60;
      set.add(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
      cur += r.session_minutes;
    }
  }
  return Array.from(set).sort();
}

function hasAnyAvailability(rules: AvailabilityRule[], dateStr: string): boolean {
  const dow = isoWeekday(dateStr);
  return rules.some((r) => r.days_of_week.includes(dow) && dateStr >= r.start_date && dateStr <= r.end_date);
}

export default function RandevuScreen() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';

  if (isTrainer) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Müsaitlik" />
        <ScrollView contentContainerStyle={styles.content}>
          <TrainerAvailabilityPanel trainerId={profile?.id} />
        </ScrollView>
      </View>
    );
  }

  return <ClientAppointmentScreen />;
}

function TrainerAvailabilityPanel({ trainerId }: { trainerId: string | undefined }) {
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
      setFormError('En az bir gün seç.');
      return;
    }
    const start = parseTrTime(startTime);
    const end = parseTrTime(endTime);
    if (!start || !end || start >= end) {
      setFormError('Saat aralığını kontrol et (başlangıç bitişten önce olmalı).');
      return;
    }
    const endDate = parseTrDate(endDateInput);
    if (!endDate) {
      setFormError('Bitiş tarihini GG.AA.YYYY biçiminde gir.');
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
        onError: (e: any) => showAlert('Eklenemedi', e.message ?? 'Müsaitlik kuralı eklenemedi.'),
      }
    );
  }

  return (
    <Panel title="Müsaitlik Kuralları" right={`${rules.length} aktif kural`}>
      <Text style={styles.fieldLabel}>Hangi günler</Text>
      <View style={styles.dayRow}>
        {DAY_CHIPS.map((d) => (
          <Pressable
            key={d.iso}
            style={[styles.dayChip, selectedDays.includes(d.iso) && styles.dayChipOn]}
            onPress={() => toggleDay(d.iso)}
          >
            <Text style={[styles.dayChipText, selectedDays.includes(d.iso) && styles.dayChipTextOn]}>{d.short[0]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.rowGap}>
        <View style={{ flex: 1 }}>
          <AuthField
            label="Başlangıç Saati"
            value={startTime}
            onChangeText={(v) => setStartTime((prev) => formatTimeInputTr(v, prev))}
            placeholder="09:00"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AuthField
            label="Bitiş Saati"
            value={endTime}
            onChangeText={(v) => setEndTime((prev) => formatTimeInputTr(v, prev))}
            placeholder="18:00"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
      </View>

      <Text style={styles.fieldLabel}>Seans süresi</Text>
      <View style={styles.durRow}>
        {DURATIONS.map((d) => (
          <Pressable key={d} style={[styles.durChip, duration === d && styles.durChipOn]} onPress={() => setDuration(d)}>
            <Text style={[styles.durChipText, duration === d && styles.durChipTextOn]}>{d} dk</Text>
          </Pressable>
        ))}
      </View>

      <AuthField
        label="Bu kural ne zamana kadar geçerli olsun (GG.AA.YYYY)"
        value={endDateInput}
        onChangeText={(v) => setEndDateInput((prev) => formatDateInputTr(v, prev))}
        placeholder="Ör. 31.08.2026"
        keyboardType="number-pad"
        maxLength={10}
      />
      {formError && <Text style={styles.errorText}>{formError}</Text>}

      <PrimaryButton label="+ Müsaitlik Kuralı Ekle" loading={addRule.isPending} onPress={submit} />

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Aktif kurallar</Text>
      {rules.length === 0 ? (
        <Text style={styles.noteText}>Henüz bir müsaitlik kuralı eklenmedi.</Text>
      ) : (
        rules.map((r) => (
          <View key={r.id} style={styles.ruleCard}>
            <View style={styles.ruleDot} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.ruleDays}>{r.days_of_week.map((d) => DAY_FULL[d]).join(' · ')}</Text>
              <Text style={styles.ruleMeta}>
                {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {r.session_minutes} dk seanslar · {formatTrDateShort(r.end_date)} tarihine kadar
              </Text>
            </View>
            <Pressable
              onPress={() =>
                showAlert('Kuralı Sil', 'Bu müsaitlik kuralı silinsin mi? Zaten alınmış randevular etkilenmez.', [
                  { text: 'Vazgeç', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: () => deleteRule.mutate(r.id, { onError: (e: any) => showAlert('Silinemedi', e.message ?? 'Kural silinemedi.') }) },
                ])
              }
              hitSlop={8}
            >
              <Text style={styles.ruleDelete}>Sil</Text>
            </Pressable>
          </View>
        ))
      )}
    </Panel>
  );
}

function ClientAppointmentScreen() {
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
      <ScreenHeader title="Randevu Al" />
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
  selectedDate,
  onSelectDate,
  onPickSlot,
  picking,
}: {
  trainerId: string;
  rules: AvailabilityRule[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPickSlot: (time: string) => void;
  picking?: boolean;
}) {
  const upcomingDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysToDateStr(localDateStr(), i)), []);
  const takenQuery = useTakenSlots(trainerId, selectedDate);
  const slots = useMemo(() => generateSlotsForDate(rules, selectedDate), [rules, selectedDate]);
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
              <Text style={[styles.dateDow, on && styles.dateDowOn]}>{DAY_FULL[isoWeekday(d)].slice(0, 3)}</Text>
              <Text style={[styles.dateNum, on && styles.dateNumOn]}>{parseInt(dayNum, 10)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>{formatTrDateLong(selectedDate)} — boş saatler</Text>
      {takenQuery.isLoading ? (
        <ActivityIndicator color={C.lime} />
      ) : slots.length === 0 ? (
        <Text style={styles.noteText}>Bu gün için açık saat yok.</Text>
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
  const rulesQuery = useAvailabilityRules(trainerId);
  const rules = rulesQuery.data ?? [];

  const upcomingDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysToDateStr(localDateStr(), i)), []);
  const [selectedDate, setSelectedDate] = useState(() => upcomingDays.find((d) => hasAnyAvailability(rules, d)) ?? upcomingDays[0]);

  const bookAppointment = useBookAppointment(trainerId, clientId);

  function confirmBooking(time: string) {
    showAlert('Randevuyu Onayla', `${formatTrDateLong(selectedDate)} · ${time} için randevu alınsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Randevu Al',
        onPress: () =>
          bookAppointment.mutate(
            { date: selectedDate, time },
            { onError: (e: any) => showAlert('Alınamadı', e.message?.includes('duplicate') ? 'Bu saat az önce başka biri tarafından alındı.' : e.message ?? 'Randevu alınamadı.') }
          ),
      },
    ]);
  }

  return (
    <Panel title="Randevu Al" right={rulesQuery.isLoading ? undefined : `${rules.length} açık kural`}>
      {!rulesQuery.isLoading && rules.length === 0 ? (
        <Text style={styles.noteText}>Antrenörün henüz randevuya açık bir saat aralığı yok.</Text>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Tarih seç</Text>
          <SlotPicker
            trainerId={trainerId}
            rules={rules}
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
  const appointmentsQuery = useMyUpcomingAppointments(clientId);
  const rulesQuery = useAvailabilityRules(trainerId);
  const reschedule = useRescheduleAppointment(trainerId, clientId);
  const appointments = appointmentsQuery.data ?? [];
  const rules = rulesQuery.data ?? [];

  const upcomingDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysToDateStr(localDateStr(), i)), []);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(upcomingDays[0]);

  function openReschedule(id: string) {
    setReschedulingId(id);
    setRescheduleDate(upcomingDays.find((d) => hasAnyAvailability(rules, d)) ?? upcomingDays[0]);
  }

  function confirmReschedule(id: string, oldLabel: string, time: string) {
    showAlert('Randevuyu Taşı', `${oldLabel} yerine ${formatTrDateLong(rescheduleDate)} · ${time} olsun mu?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Taşı',
        onPress: () =>
          reschedule.mutate(
            { id, date: rescheduleDate, time },
            {
              onSuccess: () => setReschedulingId(null),
              onError: (e: any) =>
                showAlert('Taşınamadı', e.message?.includes('duplicate') ? 'Bu saat az önce başka biri tarafından alındı.' : e.message ?? 'Randevu taşınamadı.'),
            }
          ),
      },
    ]);
  }

  return (
    <Panel title="Randevularım" right={`${appointments.length} kayıt`}>
      {appointments.length === 0 ? (
        <Text style={styles.noteText}>Yaklaşan randevun yok.</Text>
      ) : (
        appointments.map((a) => (
          <View key={a.id} style={styles.apptBlock}>
            <View style={styles.apptRow}>
              <View>
                <Text style={styles.apptDate}>{formatTrDateLong(a.date)}</Text>
                <Text style={styles.apptTime}>{a.time.slice(0, 5)}</Text>
              </View>
              <Pressable onPress={() => (reschedulingId === a.id ? setReschedulingId(null) : openReschedule(a.id))} hitSlop={8}>
                <Text style={styles.apptChange}>{reschedulingId === a.id ? 'Vazgeç' : 'Değiştir'}</Text>
              </Pressable>
            </View>
            {reschedulingId === a.id && (
              <View style={styles.rescheduleBox}>
                <SlotPicker
                  trainerId={trainerId}
                  rules={rules}
                  selectedDate={rescheduleDate}
                  onSelectDate={setRescheduleDate}
                  onPickSlot={(time) => confirmReschedule(a.id, `${formatTrDateLong(a.date)} · ${a.time.slice(0, 5)}`, time)}
                  picking={reschedule.isPending}
                />
              </View>
            )}
          </View>
        ))
      )}
      <Text style={styles.trainerHint}>İptal etmek için antrenörünle iletişime geç.</Text>
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
});
