import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useClient, useAddPayment, usePayments } from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';

export default function OdemelerScreen() {
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const paymentsQuery = usePayments(selectedClientId ?? undefined);
  const addPayment = useAddPayment(selectedClientId ?? undefined);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const payments = paymentsQuery.data ?? [];
  const total = useMemo(() => payments.reduce((a, p) => a + p.amount, 0), [payments]);

  if (clientQuery.isLoading || !clientQuery.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Ödemeler" clientName={clientQuery.data.name} showPill />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Toplam Tahsilat" right={clientQuery.data.name}>
          <Text style={styles.total}>{nf(total)} ₺</Text>
        </Panel>

        <Panel title="Yeni Ödeme Ekle">
          <AuthField label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Ör. 3000" />
          <AuthField label="Not (paket, ay vb.)" value={note} onChangeText={setNote} placeholder="Ör. Ocak paketi" />
          <PrimaryButton
            label="Ödeme Ekle"
            loading={addPayment.isPending}
            disabled={!amount}
            onPress={() => {
              const v = parseFloat(amount.replace(',', '.'));
              if (!Number.isNaN(v)) {
                addPayment.mutate({ amount: v, note }, { onSuccess: () => { setAmount(''); setNote(''); } });
              }
            }}
          />
        </Panel>

        <Panel title="Ödeme Geçmişi" right={`${payments.length} kayıt`}>
          {payments.length === 0 ? (
            <Text style={styles.empty}>Henüz ödeme kaydı yok.</Text>
          ) : (
            payments.map((p) => (
              <View key={p.id} style={styles.row}>
                <View>
                  <Text style={styles.rowAmount}>{nf(p.amount)} ₺</Text>
                  {p.note ? <Text style={styles.rowNote}>{p.note}</Text> : null}
                </View>
                <Text style={styles.rowDate}>{p.date}</Text>
              </View>
            ))
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
  total: { fontSize: 28, fontWeight: '800', color: C.lime },
  empty: { color: C.greyD, fontSize: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowAmount: { color: C.white, fontWeight: '700', fontSize: 14 },
  rowNote: { color: C.greyD, fontSize: 11, marginTop: 2 },
  rowDate: { color: C.grey, fontSize: 11 },
});
