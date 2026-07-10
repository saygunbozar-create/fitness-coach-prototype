import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAddPayment, useClient, useDeletePayment, usePayments, useTogglePaymentPaid, useUpdatePayment } from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';
import type { Payment } from '../../lib/types';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const paymentsQuery = usePayments(selectedClientId ?? undefined);
  const addPayment = useAddPayment(selectedClientId ?? undefined);
  const updatePayment = useUpdatePayment(selectedClientId ?? undefined);
  const togglePaid = useTogglePaymentPaid(selectedClientId ?? undefined);
  const deletePayment = useDeletePayment(selectedClientId ?? undefined);

  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dateError, setDateError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      { onSuccess: () => { setDate(''); setAmount(''); setNote(''); } }
    );
  }

  function renderRow(p: Payment) {
    if (editingId === p.id) {
      return (
        <EditPaymentForm
          key={p.id}
          payment={p}
          saving={updatePayment.isPending}
          onCancel={() => setEditingId(null)}
          onSave={(v) => updatePayment.mutate({ id: p.id, ...v }, { onSuccess: () => setEditingId(null) })}
        />
      );
    }
    return (
      <View key={p.id} style={styles.row}>
        <Pressable style={{ flex: 1 }} onPress={() => setEditingId(p.id)}>
          <Text style={styles.rowAmount}>{nf(p.amount)} ₺</Text>
          {p.note ? <Text style={styles.rowNote}>{p.note}</Text> : null}
          <Text style={styles.rowEditHint}>Düzenlemek için dokun</Text>
        </Pressable>
        <View style={styles.rowRight}>
          <Text style={styles.rowDate}>{formatTrDate(p.date)}</Text>
          <Pressable onPress={() => togglePaid.mutate({ id: p.id, paid: !p.paid })}>
            <Text style={[styles.rowStatus, { color: p.paid ? C.lime : C.orange }]}>{p.paid ? 'Ödendi' : 'Bekliyor'}</Text>
          </Pressable>
          <Pressable onPress={() => deletePayment.mutate(p.id)} hitSlop={8}>
            <Text style={styles.rowDelete}>Sil</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Ödemeler" clientName={clientQuery.data.name} showPill />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Toplam Tahsilat" right={clientQuery.data.name}>
          <Text style={styles.total}>{nf(totalPaid)} ₺</Text>
          {totalPending > 0 && <Text style={styles.pendingNote}>{nf(totalPending)} ₺ bekleyen ödeme</Text>}
        </Panel>

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
  rowDelete: { fontSize: 10, fontWeight: '700', color: C.red },
  editCard: { backgroundColor: C.card2, borderRadius: 12, borderWidth: 1, borderColor: C.edge, padding: 12, marginBottom: 8 },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  editBtnText: { fontSize: 12, fontWeight: '700' },
});
