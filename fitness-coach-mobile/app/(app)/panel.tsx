import { Redirect } from 'expo-router';
import { useState } from 'react';
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
  useAddLessonEntry,
  useClients,
  useDeleteLessonEntry,
  useLessonSchedule,
  useLogSessionFromSchedule,
  useMonthlyPaymentsSummary,
  useSessionLogsForWeek,
  useUnlogSessionFromSchedule,
  useWeeklyCompletedSessionCount,
} from '../../lib/queries';
import { useIsDesktopWeb } from '../../lib/responsive';
import { addDaysToDateStr, C, formatTimeInputTr, localDateStr, mondayOfWeek, nf } from '../../lib/theme';

function formatTrDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${parseInt(d, 10)}.${m}`;
}

// "10.05.2026" -> "2026-05-10"
function parseTrDateFull(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = d.padStart(2, '0');
  const mm = mo.padStart(2, '0');
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12) return null;
  return `${y}-${mm}-${dd}`;
}

function parseTrTimeShort(input: string): string | null {
  const m = input.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function LessonScheduleCard() {
  const t = useT();
  const WEEKDAYS = [t('weekday.mon'), t('weekday.tue'), t('weekday.wed'), t('weekday.thu'), t('weekday.fri'), t('weekday.sat'), t('weekday.sun')];
  const { profile } = useAuth();
  const clientsQuery = useClients(profile?.id);
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek());
  const weekEnd = addDaysToDateStr(weekStart, 6);
  const lessonsQuery = useLessonSchedule(profile?.id, weekStart, weekEnd);
  const addLesson = useAddLessonEntry(profile?.id);
  const deleteLesson = useDeleteLessonEntry(profile?.id);
  const sessionLogsWeekQuery = useSessionLogsForWeek(profile?.id, weekStart, weekEnd);
  const logSession = useLogSessionFromSchedule(profile?.id);
  const unlogSession = useUnlogSessionFromSchedule(profile?.id);

  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonClientId, setLessonClientId] = useState<string | null>(null);
  const [lessonDate, setLessonDate] = useState('');
  const [lessonTime, setLessonTime] = useState('');
  const [lessonError, setLessonError] = useState<string | null>(null);

  const clients = clientsQuery.data ?? [];
  const lessons = lessonsQuery.data ?? [];
  const days = Array.from({ length: 7 }, (_, i) => addDaysToDateStr(weekStart, i));

  // "Seans Kullan" ile eklenen seans, dersin saatini de sakladığı için eşleştirmeyi
  // danışan+tarih+SAAT ile yapıyoruz. Böylece: (a) aynı gün birden fazla dersi olan danışanda
  // her ders bağımsız işaretlenir, (b) "Geri Al" sadece o dersin saatine ait seansı siler —
  // aynı gün Ödemeler'den elle girilmiş (farklı/saatsiz) bir seansı yanlışlıkla silmez.
  const sessionKey = (clientId: string, date: string, time: string | null) => `${clientId}:${date}:${(time ?? '').slice(0, 5)}`;
  const usedByKey = new Map((sessionLogsWeekQuery.data ?? []).map((s) => [sessionKey(s.client_id, s.date, s.time), s]));

  function submitLesson() {
    setLessonError(null);
    const isoDate = parseTrDateFull(lessonDate);
    const isoTime = parseTrTimeShort(lessonTime);
    if (!lessonClientId) {
      setLessonError(t('panel.err_pick_client'));
      return;
    }
    if (!isoDate) {
      setLessonError(t('panel.err_date_format'));
      return;
    }
    if (!isoTime) {
      setLessonError(t('panel.err_time_format'));
      return;
    }
    addLesson.mutate(
      { client_id: lessonClientId, date: isoDate, time: isoTime },
      {
        onSuccess: () => {
          setLessonClientId(null);
          setLessonDate('');
          setLessonTime('');
          setAddingLesson(false);
        },
        onError: (e: any) => showAlert(t('panel.add_lesson_failed_title'), e.message ?? t('panel.add_lesson_failed_body')),
      }
    );
  }

  return (
    <Panel title={t('panel.weekly_calendar')} right={`${formatTrDateShort(weekStart)} – ${formatTrDateShort(weekEnd)}`}>
      <View style={styles.weekNavRow}>
        <Pressable onPress={() => setWeekStart((s) => addDaysToDateStr(s, -7))} hitSlop={8}>
          <Text style={styles.weekNavBtn}>{t('panel.prev_week')}</Text>
        </Pressable>
        <Pressable onPress={() => setWeekStart(mondayOfWeek())} hitSlop={8}>
          <Text style={styles.weekNavToday}>{t('panel.this_week')}</Text>
        </Pressable>
        <Pressable onPress={() => setWeekStart((s) => addDaysToDateStr(s, 7))} hitSlop={8}>
          <Text style={styles.weekNavBtn}>{t('panel.next_week')}</Text>
        </Pressable>
      </View>

      {lessonsQuery.isLoading ? (
        <ActivityIndicator color={C.lime} />
      ) : (
        days.map((dayStr, i) => {
          const dayLessons = lessons.filter((l) => l.date === dayStr);
          return (
            <View key={dayStr} style={styles.dayBlock}>
              <Text style={styles.dayBlockTitle}>
                {WEEKDAYS[i]} · {formatTrDateShort(dayStr)}
              </Text>
              {dayLessons.length === 0 ? (
                <Text style={styles.dayBlockEmpty}>{t('panel.no_lesson')}</Text>
              ) : (
                dayLessons.map((l) => {
                  const used = usedByKey.get(sessionKey(l.client_id, l.date, l.time));
                  return (
                    <View key={l.id} style={styles.lessonRow}>
                      <View style={styles.lessonInfo}>
                        <Text style={styles.lessonText}>
                          {l.time.slice(0, 5)} · {l.clientName}
                        </Text>
                        {l.booked_by_client && (
                          <View style={styles.bookedBadge}>
                            <Text style={styles.bookedBadgeText}>{t('panel.booked_badge')}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.lessonActions}>
                        {used ? (
                          <Pressable
                            style={styles.useSessionBtnOn}
                            onPress={() =>
                              showAlert(t('panel.undo_session_title'), t('panel.undo_session_body', { name: l.clientName }), [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                  text: t('panel.undo'),
                                  style: 'destructive',
                                  onPress: () =>
                                    unlogSession.mutate(
                                      { id: used.id, client_id: l.client_id },
                                      { onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('panel.undo_failed_body')) }
                                    ),
                                },
                              ])
                            }
                          >
                            <Text style={styles.useSessionBtnOnText}>{t('panel.session_used')}</Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            style={styles.useSessionBtn}
                            onPress={() =>
                              logSession.mutate(
                                { client_id: l.client_id, date: l.date, time: l.time },
                                { onError: (e: any) => showAlert(t('panel.log_session_failed_title'), e.message ?? t('panel.log_session_failed_body')) }
                              )
                            }
                          >
                            <Text style={styles.useSessionBtnText}>{t('panel.use_session')}</Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() =>
                            deleteLesson.mutate(l.id, {
                              onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('common.delete_failed_body')),
                            })
                          }
                          hitSlop={8}
                        >
                          <Text style={styles.lessonDelete}>✕</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          );
        })
      )}

      {!addingLesson ? (
        <Pressable style={styles.addLessonBtn} onPress={() => setAddingLesson(true)}>
          <Text style={styles.addLessonBtnText}>{t('panel.add_lesson')}</Text>
        </Pressable>
      ) : (
        <View style={styles.addDayCard}>
          <Text style={styles.label}>{t('common.client_label')}</Text>
          <View style={styles.clientPickRow}>
            {clients.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.clientPick, lessonClientId === c.id && styles.clientPickOn]}
                onPress={() => setLessonClientId(c.id)}
              >
                <Text style={[styles.clientPickText, lessonClientId === c.id && styles.clientPickTextOn]}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <DateField
                label={t('panel.date_label')}
                value={lessonDate}
                onChangeText={setLessonDate}
                placeholder={t('panel.date_placeholder')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AuthField
                label={t('panel.time_label')}
                value={lessonTime}
                onChangeText={(v) => setLessonTime((prev) => formatTimeInputTr(v, prev))}
                placeholder={t('panel.time_placeholder')}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          </View>
          {lessonError && <Text style={styles.lessonErrorText}>{lessonError}</Text>}
          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={t('common.save')} loading={addLesson.isPending} onPress={submitLesson} />
            </View>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setAddingLesson(false);
                setLessonError(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Panel>
  );
}

function TrainerReportCard() {
  const t = useT();
  const { profile } = useAuth();
  const [amountHidden, setAmountHidden] = useState(false);

  const weekStart = mondayOfWeek();
  const weekEnd = addDaysToDateStr(weekStart, 6);
  const now = new Date();
  const monthStart = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = localDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const todayStr = localDateStr();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const weeklySessionsQuery = useWeeklyCompletedSessionCount(profile?.id, weekStart, weekEnd);
  const monthlyPaymentsQuery = useMonthlyPaymentsSummary(profile?.id, monthStart, monthEnd);
  const todayLessonsQuery = useLessonSchedule(profile?.id, todayStr, todayStr);

  const upcomingToday = (todayLessonsQuery.data ?? []).filter((l) => l.time.slice(0, 5) >= nowTime);
  const loading = weeklySessionsQuery.isLoading || monthlyPaymentsQuery.isLoading;

  return (
    <Panel title={t('panel.report_title')} right={t('panel.report_subtitle')}>
      {loading ? (
        <ActivityIndicator color={C.lime} />
      ) : (
        <>
          <View style={styles.reportGrid}>
            <View style={styles.reportStat}>
              <Text style={styles.reportStatValue}>{weeklySessionsQuery.data ?? 0}</Text>
              <Text style={styles.reportStatLabel}>{t('panel.completed_this_week')}</Text>
            </View>
            <View style={styles.reportStat}>
              <View style={styles.reportStatValueRow}>
                <Text style={styles.reportStatValue}>
                  {amountHidden ? '••••• ₺' : `${nf(monthlyPaymentsQuery.data?.total ?? 0)} ₺`}
                </Text>
                <Pressable onPress={() => setAmountHidden((h) => !h)} hitSlop={8}>
                  <Text style={[styles.eyeIcon, amountHidden && styles.eyeIconOff]}>👁</Text>
                </Pressable>
              </View>
              <Text style={styles.reportStatLabel}>{t('panel.total_payment_month')}</Text>
            </View>
          </View>
          {monthlyPaymentsQuery.data && !amountHidden && (
            <Text style={styles.reportSub}>
              {t('panel.paid_pending', { paid: nf(monthlyPaymentsQuery.data.paid), pending: nf(monthlyPaymentsQuery.data.pending) })}
            </Text>
          )}
        </>
      )}

      <Text style={styles.reportSectionTitle}>{t('panel.upcoming_today')}</Text>
      {todayLessonsQuery.isLoading ? (
        <ActivityIndicator color={C.lime} />
      ) : upcomingToday.length === 0 ? (
        <Text style={styles.dayBlockEmpty}>{t('panel.no_upcoming_today')}</Text>
      ) : (
        upcomingToday.map((l) => (
          <View key={l.id} style={styles.lessonRow}>
            <Text style={styles.lessonText}>
              {l.time.slice(0, 5)} · {l.clientName}
            </Text>
          </View>
        ))
      )}
    </Panel>
  );
}

export default function PanelScreen() {
  const t = useT();
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const isDesktopWeb = useIsDesktopWeb();

  if (profile && !isTrainer) return <Redirect href="/(app)/antrenman" />;

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('nav.panel')} />
      <ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.contentDesktop]}>
        {isDesktopWeb ? (
          // Geniş ekranda takvim + rapor yan yana — mobilde ikisi de tek sütun halinde alt alta kalır.
          <View style={styles.desktopRow}>
            <View style={styles.desktopColWide}>
              <LessonScheduleCard />
            </View>
            <View style={styles.desktopColNarrow}>
              <TrainerReportCard />
            </View>
          </View>
        ) : (
          <>
            <LessonScheduleCard />
            <TrainerReportCard />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4 },
  contentDesktop: { padding: 28, paddingTop: 20 },
  desktopRow: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  desktopColWide: { flex: 2, minWidth: 0 },
  desktopColNarrow: { flex: 1, minWidth: 0 },
  weekNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  weekNavBtn: { fontSize: 11, fontWeight: '700', color: C.grey },
  weekNavToday: { fontSize: 11, fontWeight: '700', color: C.lime },
  dayBlock: { marginBottom: 10 },
  dayBlockTitle: { fontSize: 11, fontWeight: '700', color: C.greyD, marginBottom: 4 },
  dayBlockEmpty: { fontSize: 11, color: C.greyD, fontStyle: 'italic', paddingLeft: 2 },
  lessonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  lessonText: { fontSize: 12, fontWeight: '600', color: C.white },
  lessonInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  bookedBadge: { backgroundColor: 'rgba(198,249,78,.12)', borderWidth: 1, borderColor: 'rgba(198,249,78,.4)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  bookedBadgeText: { fontSize: 9, fontWeight: '800', color: C.lime, textTransform: 'uppercase', letterSpacing: 0.3 },
  lessonActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lessonDelete: { fontSize: 12, color: C.red, paddingHorizontal: 4 },
  useSessionBtn: { backgroundColor: C.lime, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  useSessionBtnText: { fontSize: 10, fontWeight: '800', color: C.bg },
  useSessionBtnOn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.lime, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  useSessionBtnOnText: { fontSize: 10, fontWeight: '800', color: C.lime },
  addLessonBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  addLessonBtnText: { fontSize: 13, color: C.greyD, fontWeight: '600' },
  addDayCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.edge, padding: 14, marginTop: 8 },
  label: { fontSize: 12, fontWeight: '700', color: C.grey, marginBottom: 6 },
  clientPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  clientPick: { borderWidth: 1, borderColor: C.edge, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.card2 },
  clientPickOn: { backgroundColor: C.lime, borderColor: C.lime },
  clientPickText: { fontSize: 11, fontWeight: '700', color: C.grey },
  clientPickTextOn: { color: C.bg },
  rowGap: { flexDirection: 'row', gap: 8 },
  lessonErrorText: { color: C.red, fontSize: 11, marginBottom: 8 },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: C.grey },
  reportGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  reportStat: { flex: 1, backgroundColor: C.card2, borderLeftWidth: 3, borderLeftColor: C.lime, borderRadius: 12, padding: 10 },
  reportStatValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyeIcon: { fontSize: 13, opacity: 0.9 },
  eyeIconOff: { opacity: 0.4 },
  reportStatValue: { fontSize: 18, fontWeight: '800', color: C.lime },
  reportStatLabel: { fontSize: 11, color: C.grey, marginTop: 4 },
  reportSub: { fontSize: 11, color: C.greyD, marginBottom: 14 },
  reportSectionTitle: { fontSize: 12, fontWeight: '700', color: C.grey, marginTop: 4, marginBottom: 8 },
});
