import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { ClientCard } from '../../components/ClientCard';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { useAddClient, useClients } from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C } from '../../lib/theme';

const GOALS = ['Yağ Yakımı', 'Kas Kazanımı'];

const emptyForm = {
  name: '',
  email: '',
  goal: GOALS[0],
  start_weight: '',
  kcal_target: '',
  tdee: '',
  macro_p: '',
  macro_k: '',
  macro_y: '',
  pr: '',
};

export default function DanisanScreen() {
  const { profile } = useAuth();
  const { selectedClientId, setSelectedClientId } = useSelectedClient();
  const clientsQuery = useClients(profile?.id);
  const addClient = useAddClient(profile?.id);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const clients = clientsQuery.data ?? [];

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit() {
    setError(null);
    const n = (s: string) => parseFloat(s.replace(',', '.')) || 0;
    if (!form.name.trim() || !form.email.trim()) {
      setError('Ad ve e-posta zorunlu.');
      return;
    }
    try {
      await addClient.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        goal: form.goal,
        start_weight: n(form.start_weight),
        kcal_target: n(form.kcal_target),
        tdee: n(form.tdee),
        macro_p: n(form.macro_p),
        macro_k: n(form.macro_k),
        macro_y: n(form.macro_y),
        pr: n(form.pr),
      });
      setForm(emptyForm);
      setShowForm(false);
    } catch (e: any) {
      setError(e.message ?? 'Danışan eklenemedi.');
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Danışan" />
      <ScrollView contentContainerStyle={styles.content}>
        {clientsQuery.isLoading ? (
          <ActivityIndicator color={C.lime} />
        ) : (
          clients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              active={c.id === selectedClientId}
              onPress={() => {
                setSelectedClientId(c.id);
                router.push('/(app)/panel');
              }}
            />
          ))
        )}

        {showForm ? (
          <Panel title="Yeni Danışan" right="e-posta ile davet">
            <AuthField label="Ad Soyad" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Ör. Mert K." />
            <AuthField label="E-posta" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" placeholder="ornek@eposta.com" />

            <Text style={styles.label}>Hedef</Text>
            <View style={styles.goalRow}>
              {GOALS.map((g) => (
                <Pressable key={g} onPress={() => set('goal', g)} style={[styles.goalPill, form.goal === g && styles.goalPillActive]}>
                  <Text style={[styles.goalPillText, form.goal === g && { color: C.bg }]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <AuthField label="Başlangıç Kilosu (kg)" value={form.start_weight} onChangeText={(v) => set('start_weight', v)} keyboardType="decimal-pad" />
            <AuthField label="Kalori Hedefi (kcal)" value={form.kcal_target} onChangeText={(v) => set('kcal_target', v)} keyboardType="decimal-pad" />
            <AuthField label="TDEE (kcal)" value={form.tdee} onChangeText={(v) => set('tdee', v)} keyboardType="decimal-pad" />
            <AuthField label="Protein Hedefi (g)" value={form.macro_p} onChangeText={(v) => set('macro_p', v)} keyboardType="decimal-pad" />
            <AuthField label="Karbonhidrat Hedefi (g)" value={form.macro_k} onChangeText={(v) => set('macro_k', v)} keyboardType="decimal-pad" />
            <AuthField label="Yağ Hedefi (g)" value={form.macro_y} onChangeText={(v) => set('macro_y', v)} keyboardType="decimal-pad" />
            <AuthField label="Mevcut PR (kg)" value={form.pr} onChangeText={(v) => set('pr', v)} keyboardType="decimal-pad" />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Danışanı Ekle" onPress={onSubmit} loading={addClient.isPending} />
          </Panel>
        ) : (
          <Pressable style={styles.addCli} onPress={() => setShowForm(true)}>
            <Text style={styles.addCliText}>+ Yeni danışan ekle</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 4 },
  addCli: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 16, padding: 15, alignItems: 'center' },
  addCliText: { fontSize: 13, color: C.greyD },
  label: { fontSize: 12, fontWeight: '700', color: C.grey, marginBottom: 6 },
  goalRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  goalPill: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  goalPillActive: { backgroundColor: C.lime, borderColor: C.lime },
  goalPillText: { fontSize: 12, fontWeight: '700', color: C.grey },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
});
