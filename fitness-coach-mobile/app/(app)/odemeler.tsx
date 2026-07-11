import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import {
  useAddPackage,
  useAddPayment,
  useAddSessionLog,
  useClient,
  useCompletedSessionsSince,
  useDeletePackage,
  useDeletePayment,
  useDeleteSessionLog,
  usePackages,
  usePayments,
  useSessionLogs,
  useTogglePaymentPaid,
  useUpdatePayment,
  useWorkout,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, localDateStr, nf } from '../../lib/theme';
import type { Payment } from '../../lib/types';

const todayStr = localDateStr;

function onErr(title: string) {
  return (e: any) => Alert.alert(title, e.message ?? 'Bir hata oluştu.');
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

// "2026-05-10" -> "10.05.2026"
function formatTrDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// "14:30" -> "14:30" (validated) | null
function parseTrTime(input: string): string | null {
  const m = input.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function formatTime(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function EditPaymentForm({ payment, onCancel, onSave, saving }: { payment: Payment; onCancel: () => void; onSave: (v: { date: string; amount: number; note: string }) => void; saving: boolean }) {
  const [date, setDate] = useState(formatTrDate(payment.date));
  const [amount, setAmount] = useState(String(payment.amount));
  const [note, setNote] = useState(payment.note);
  const [error, setError] = useState(false);

  return (
    <View style={styles.editCard}>
      <AuthField label="Tarih (GG.AA.YYYY)" value={date} onChangeText={(v) => { setDate(v); setError(false); }} placeholder="Ör. 10.05.2026" />
      {error && <Text style={styles.error}>Tarihi GG.AA.YYYY biçiminde gir</Text>}
      <AuthField label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <AuthField label="Not" value={note} onChangeText={setNote} />
      <View style={styles.editActions}>
        <Pressable
          style={[styles.editBtn, { backgroundColor: C.lime }]}
          disabled={saving}
          onPress={() => {
            const iso = parseTrDate(date);
            const v = parseFloat(amount.replace(',', '.'));
            if (!iso) { setError(true); return; }
            if (Number.isNaN(v)) return;
            onSave({ date: iso, amount: v, note });
          }}
        >
          <Text style={[styles.editBtnText, { color: C.bg }]}>Kaydet</Text>
        </Pressable>
        <Pressable style={[styles.editBtn, { backgroundColor: C.card }]} disabled={saving} onPress={onCancel}>
          <Text style={[styles.editBtnText, { color: C.grey }]}>Vazgeç</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function OdemelerScreen() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const paymentsQuery = usePayments(selectedClientId ?? undefined);
  const addPayment = useAddPayment(selectedClientId ?? undefined);
  const updatePayment = useUpdatePayment(selectedClientId ?? undefined);
  const togglePaid = useTogglePaymentPaid(selectedClientId ?? undefined);
  const deletePayment = useDeletePayment(selectedClientId ?? undefined);
  const packagesQuery = usePackages(selectedClientId ?? undefined);
  const addPackage = useAddPackage(selectedClientId ?? undefined);
  const deletePackage = useDeletePackage(selectedClientId ?? undefined);
  const workoutQuery = useWorkout(selectedClientId ?? undefined);
  const sessionLogsQuery = useSessionLogs(selectedClientId ?? undefined, 60);
  const addSessionLog = useAddSessionLog(selectedClientId ?? undefined);
  const deleteSessionLog = useDeleteSessionLog(selectedClientId ?? undefined);

  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dateError, setDateError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingPackage, setAddingPackage] = useState(false);
  const [packageDraft, setPackageDraft] = useState({ name: '', total_sessions: '', note: '' });
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [addingSession, setAddingSession] = useState(false);
  const [sessionDraft, setSessionDraft] = useState({ date: '', time: '', status: 'tamamlandi' as 'tamamlandi' | 'atlandi' });
  const [sessionError, setSessionError] = useState<string | null>(null);

  const payments = paymentsQuery.data ?? [];
  const totalPaid = useMemo(() => payments.filter((p) => p.paid).reduce((a, p) => a + p.amount, 0), [payments]);
  const totalPending = useMemo(() => payments.filter((p) => !p.paid).reduce((a, p) => a + p.amount, 0), [payments]);

  const upcoming = useMemo(
    () => payments.filter((p) => !p.paid).sort((a, b) => a.date.localeCompare(b.date)),
    [payments]
  );
  const history = useMemo(
    () => payments.filter((p) => p.paid).sort((a, b) => b.date.localeCompare(a.date)),
    [payments]
  );

  const packages = packagesQuery.data ?? [];
  const currentPackage = packages[0] ?? null;
  // Remaining sessions accumulate across every package ever bought (a new package tops up the pool
  // instead of replacing what's left of the old one).
  const totalPurchased = useMemo(() => packages.reduce((a, p) => a + p.total_sessions, 0), [packages]);
  const earliestStart = useMemo(
    () => packages.reduce((min: string | undefined, p) => (!min || p.start_date < min ? p.start_date : min), undefined as string | undefined),
    [packages]
  );
  const completedSessionsQuery = useCompletedSessionsSince(selectedClientId ?? undefined, earliestStart);
  const usedSessions = useMemo(() => completedSessionsQuery.data ?? [], [completedSessionsQuery.data]);
  const remaining = packages.length ? Math.max(0, totalPurchased - usedSessions.length) : 0;

  const days = workoutQuery.data ?? [];
  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0];

  const recentSessions = useMemo(
    () => [...(sessionLogsQuery.data ?? [])].sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? ''))),
    [sessionLogsQuery.data]
  );

  if (clientQuery.isLoading || !clientQuery.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  function submit() {
    const v = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(v)) return;
    const iso = date.trim() ? parseTrDate(date) : todayStr();
    if (!iso) {
      setDateError(true);
      return;
    }
    setDateError(false);
    addPayment.mutate(
      { date: iso, amount: v, note, paid: iso <= todayStr() },
      { onSuccess: () => { setDate(''); setAmount(''); setNote(''); }, onError: onErr('Ödeme eklenemedi') }
    );
  }

  function renderRow(p: Payment) {
    if (isTrainer && editingId === p.id) {
      return (
        <EditPaymentForm
          key={p.id}
          payment={p}
          saving={updatePayment.isPending}
          onCancel={() => setEditingId(null)}
          onSave={(v) => updatePayment.mutate({ id: p.id, ...v }, { onSuccess: () => setEditingId(null), onError: onErr('Kaydedilemedi') })}
        />
      );
    }
    return (
      <View key={p.id} style={styles.row}>
        <Pressable style={{ flex: 1 }} disabled={!isTrainer} onPress={() => setEditingId(p.id)}>
          <Text style={styles.rowAmount}>{nf(p.amount)} ₺</Text>
          {p.note ? <Text style={styles.rowNote}>{p.note}</Text> : null}
          {isTrainer && <Text style={styles.rowEditHint}>Düzenlemek için dokun</Text>}
        </Pressable>
        <View style={styles.rowRight}>
          <Text style={styles.rowDate}>{formatTrDate(p.date)}</Text>
          {isTrainer ? (
            <Pressable onPress={() => togglePaid.mutate({ id: p.id, paid: !p.paid }, { onError: onErr('Güncellenemedi') })}>
              <Text style={[styles.rowStatus, { color: p.paid ? C.lime : C.orange }]}>{p.paid ? 'Ödendi' : 'Bekliyor'}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.rowStatus, { color: p.paid ? C.lime : C.orange }]}>{p.paid ? 'Ödendi' : 'Bekliyor'}</Text>
          )}
          {isTrainer && (
            <Pressable onPress={() => deletePayment.mutate(p.id, { onError: onErr('Silinemedi') })} hitSlop={8}>
              <Text style={styles.rowDelete}>Sil</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Paket ve Ödemeler" clientName={clientQuery.data.name} showPill={isTrainer} />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Paket & Seanslar" right={packages.length ? `${packages.length} paket` : undefined}>
          {currentPackage ? (
            <View style={styles.packageSummary}>
              <Text style={styles.packageName}>
                {packages.length > 1 ? `Son alınan: ${currentPackage.name}` : currentPackage.name}
              </Text>
              <View style={styles.packageChips}>
                <View style={styles.packageChip}>
                  <Text style={styles.packageChipValue}>{totalPurchased}</Text>
                  <Text style={styles.packageChipLabel}>Toplam</Text>
                </View>
                <View style={styles.packageChip}>
                  <Text style={styles.packageChipValue}>{usedSessions.length}</Text>
                  <Text style={styles.packageChipLabel}>Kullanılan</Text>
                </View>
                <View style={styles.packageChip}>
                  <Text style={[styles.packageChipValue, { color: remaining === 0 ? C.orange : C.lime }]}>{remaining}</Text>
                  <Text style={styles.packageChipLabel}>Kalan</Text>
                </View>
              </View>
              {usedSessions.length > 0 && (
                <View style={styles.usedDates}>
                  <Text style={styles.usedDatesLabel}>Kullanılan seans tarihleri:</Text>
                  <Text style={styles.usedDatesValue}>{usedSessions.map((s) => s.date).join(', ')}</Text>
                </View>
              )}
              {isTrainer && (
                <Pressable onPress={() => deletePackage.mutate(currentPackage.id, { onError: onErr('Paket silinemedi') })} hitSlop={8}>
                  <Text style={styles.rowDelete}>Bu paketi sil</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Text style={styles.empty}>Henüz bir paket tanımlanmadı.</Text>
          )}

          {packages.length > 1 && (
            <View style={styles.oldPackages}>
              <Text style={styles.usedDatesLabel}>Geçmiş paketler:</Text>
              {packages.slice(1).map((p) => (
                <View key={p.id} style={styles.oldPackageRow}>
                  <Text style={styles.oldPackageText}>
                    {p.name} · {p.total_sessions} seans · {p.start_date}
                  </Text>
                  {isTrainer && (
                    <Pressable onPress={() => deletePackage.mutate(p.id, { onError: onErr('Paket silinemedi') })} hitSlop={8}>
                      <Text style={styles.rowDelete}>Sil</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          {isTrainer && !addingPackage && (
            <Pressable style={styles.addPackageBtn} onPress={() => setAddingPackage(true)}>
              <Text style={styles.addPackageBtnText}>+ Yeni Paket Ekle</Text>
            </Pressable>
          )}

          {isTrainer && addingPackage && (
            <View style={styles.packageForm}>
              <AuthField label="Paket Adı" value={packageDraft.name} onChangeText={(v) => setPackageDraft((s) => ({ ...s, name: v }))} placeholder="Ör. 12 Seanslık Paket" />
              <AuthField
                label="Toplam Seans"
                value={packageDraft.total_sessions}
                onChangeText={(v) => setPackageDraft((s) => ({ ...s, total_sessions: v }))}
                keyboardType="number-pad"
                placeholder="Ör. 12"
              />
              <AuthField label="Not" value={packageDraft.note} onChangeText={(v) => setPackageDraft((s) => ({ ...s, note: v }))} placeholder="Opsiyonel" />
              <PrimaryButton
                label="Paket Ekle"
                loading={addPackage.isPending}
                disabled={!packageDraft.name.trim() || !packageDraft.total_sessions}
                onPress={() => {
                  const total = parseInt(packageDraft.total_sessions, 10);
                  if (!total || total <= 0) return;
                  addPackage.mutate(
                    { name: packageDraft.name.trim(), total_sessions: total, note: packageDraft.note.trim() },
                    {
                      onSuccess: () => { setPackageDraft({ name: '', total_sessions: '', note: '' }); setAddingPackage(false); },
                      onError: onErr('Paket eklenemedi'),
                    }
                  );
                }}
              />
            </View>
          )}
        </Panel>

        <Panel title="Seans Kullan" right={`${recentSessions.length} kayıt`}>
          {isTrainer && !addingSession && (
            <Pressable style={styles.addPackageBtn} onPress={() => { setSessionDraft({ date: formatTrDate(todayStr()), time: nowTimeStr(), status: 'tamamlandi' }); setSessionError(null); setAddingSession(true); }}>
              <Text style={styles.addPackageBtnText}>+ Seans Ekle</Text>
            </Pressable>
          )}

          {isTrainer && addingSession && (
            <View style={styles.packageForm}>
              {days.length > 0 && (
                <>
                  <Text style={styles.dayPickLabel}>Hangi program uygulandı?</Text>
                  <View style={styles.dayPickRow}>
                    {days.map((d) => (
                      <Pressable
                        key={d.id}
                        onPress={() => setActiveDayId(d.id)}
                        style={[styles.dayPick, activeDay?.id === d.id && { backgroundColor: C.lime, borderColor: C.lime }]}
                      >
                        <Text style={[styles.dayPickText, activeDay?.id === d.id && { color: C.bg }]}>{d.day_key}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              <View style={styles.rowGap2}>
                <View style={{ flex: 1 }}>
                  <AuthField label="Tarih (GG.AA.YYYY)" value={sessionDraft.date} onChangeText={(v) => setSessionDraft((s) => ({ ...s, date: v }))} placeholder="Ör. 10.07.2026" />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthField label="Saat (SS:DD)" value={sessionDraft.time} onChangeText={(v) => setSessionDraft((s) => ({ ...s, time: v }))} placeholder="Ör. 14:30" />
                </View>
              </View>
              <View style={styles.dayPickRow}>
                {(['tamamlandi', 'atlandi'] as const).map((st) => (
                  <Pressable
                    key={st}
                    onPress={() => setSessionDraft((s) => ({ ...s, status: st }))}
                    style={[styles.dayPick, sessionDraft.status === st && { backgroundColor: st === 'tamamlandi' ? C.lime : C.red, borderColor: st === 'tamamlandi' ? C.lime : C.red }]}
                  >
                    <Text style={[styles.dayPickText, sessionDraft.status === st && { color: C.bg }]}>{st === 'tamamlandi' ? 'Tamamlandı' : 'Atlandı'}</Text>
                  </Pressable>
                ))}
              </View>
              {sessionError && <Text style={styles.error}>{sessionError}</Text>}
              <View style={styles.rowGap2}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Kaydet"
                    loading={addSessionLog.isPending}
                    onPress={() => {
                      const iso = parseTrDate(sessionDraft.date);
                      const time = sessionDraft.time.trim() ? parseTrTime(sessionDraft.time) : null;
                      if (!iso) { setSessionError('Tarihi GG.AA.YYYY biçiminde gir.'); return; }
                      if (sessionDraft.time.trim() && !time) { setSessionError('Saati SS:DD biçiminde gir (Ör. 14:30).'); return; }
                      setSessionError(null);
                      addSessionLog.mutate(
                        { date: iso, time, status: sessionDraft.status, workout_day_id: activeDay?.id ?? null },
                        { onSuccess: () => setAddingSession(false), onError: onErr('Kaydedilemedi') }
                      );
                    }}
                  />
                </View>
                <Pressable style={styles.cancelBtn} onPress={() => setAddingSession(false)}>
                  <Text style={styles.cancelBtnText}>Vazgeç</Text>
                </Pressable>
              </View>
            </View>
          )}

          {recentSessions.length === 0 ? (
            <Text style={styles.empty}>Henüz seans kaydı yok.</Text>
          ) : (
            recentSessions.slice(0, 20).map((s) => (
              <View key={s.id} style={styles.row}>
                <View>
                  <Text style={styles.rowAmount}>
                    {formatTrDate(s.date)}
                    {s.time ? ` · ${formatTime(s.time)}` : ''}
                  </Text>
                  <Text style={[styles.rowStatus, { color: s.status === 'tamamlandi' ? C.lime : C.orange, marginTop: 2 }]}>
                    {s.status === 'tamamlandi' ? 'Tamamlandı' : 'Atlandı'}
                  </Text>
                </View>
                {isTrainer && (
                  <Pressable onPress={() => deleteSessionLog.mutate(s.id, { onError: onErr('Silinemedi') })} hitSlop={8}>
                    <Text style={styles.rowDelete}>Sil</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </Panel>

        <Panel title="Toplam Tahsilat" right={clientQuery.data.name}>
          <Text style={styles.total}>{nf(totalPaid)} ₺</Text>
          {totalPending > 0 && <Text style={styles.pendingNote}>{nf(totalPending)} ₺ bekleyen ödeme</Text>}
        </Panel>

        {isTrainer && (
          <Panel title="Yeni Ödeme Ekle" right="geçmiş veya ileri tarihli olabilir">
            <AuthField
              label="Tarih (GG.AA.YYYY, boş = bugün)"
              value={date}
              onChangeText={(v) => { setDate(v); setDateError(false); }}
              placeholder="Ör. 10.05.2026"
            />
            {dateError && <Text style={styles.error}>Tarihi GG.AA.YYYY biçiminde gir (Ör. 10.05.2026)</Text>}
            <AuthField label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Ör. 3000" />
            <AuthField label="Not (paket, ay vb.)" value={note} onChangeText={setNote} placeholder="Ör. Haziran paketi" />
            <PrimaryButton label="Ödeme Ekle" loading={addPayment.isPending} disabled={!amount} onPress={submit} />
          </Panel>
        )}

        <Panel title="Yaklaşan Ödemeler" right={`${upcoming.length} kayıt`}>
          {upcoming.length === 0 ? <Text style={styles.empty}>Planlı ödeme yok.</Text> : upcoming.map(renderRow)}
        </Panel>

        <Panel title="Ödeme Geçmişi" right={`${history.length} kayıt`}>
          {history.length === 0 ? <Text style={styles.empty}>Henüz ödeme kaydı yok.</Text> : history.map(renderRow)}
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4 },
  total: { fontSize: 28, fontWeight: '800', color: C.lime },
  pendingNote: { fontSize: 12, color: C.orange, marginTop: 4 },
  empty: { color: C.greyD, fontSize: 12 },
  error: { color: C.red, fontSize: 11, marginTop: -8, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 8,
  },
  rowAmount: { color: C.white, fontWeight: '700', fontSize: 14 },
  rowNote: { color: C.greyD, fontSize: 11, marginTop: 2 },
  rowEditHint: { color: C.greyD, fontSize: 9, marginTop: 3, fontStyle: 'italic' },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowDate: { color: C.grey, fontSize: 11 },
  rowStatus: { fontSize: 11, fontWeight: '700' },
  rowDelete: { fontSize: 11, fontWeight: '700', color: C.red },
  editCard: { backgroundColor: C.card2, borderRadius: 12, borderWidth: 1, borderColor: C.edge, padding: 12, marginBottom: 8 },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  editBtnText: { fontSize: 12, fontWeight: '700' },
  packageSummary: { marginBottom: 12 },
  packageName: { color: C.white, fontWeight: '800', fontSize: 15, marginBottom: 10 },
  packageChips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  packageChip: { flex: 1, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge, borderRadius: 12, padding: 10, alignItems: 'center' },
  packageChipValue: { fontSize: 18, fontWeight: '800', color: C.lime },
  packageChipLabel: { fontSize: 10, color: C.grey, marginTop: 2 },
  usedDates: { backgroundColor: C.card2, borderRadius: 10, padding: 10, marginBottom: 10 },
  usedDatesLabel: { fontSize: 11, color: C.greyD, fontWeight: '700', marginBottom: 4 },
  usedDatesValue: { fontSize: 11, color: C.grey, lineHeight: 16 },
  oldPackages: { marginBottom: 12 },
  oldPackageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  oldPackageText: { fontSize: 11, color: C.grey, flexShrink: 1 },
  addPackageBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  addPackageBtnText: { fontSize: 13, color: C.greyD },
  packageForm: { marginTop: 4 },
  dayPickLabel: { fontSize: 11, color: C.greyD, marginBottom: 8 },
  dayPickRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  dayPick: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  dayPickText: { fontSize: 12, fontWeight: '700', color: C.grey },
  rowGap2: { flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'flex-start' },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: C.grey },
});
