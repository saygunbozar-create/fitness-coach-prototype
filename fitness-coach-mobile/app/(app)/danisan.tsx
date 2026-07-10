import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { ClientCard } from '../../components/ClientCard';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { useAddClient, useClients, useDeleteClient, useUpdateClient } from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C } from '../../lib/theme';
import type { Client } from '../../lib/types';

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

function clientToForm(c: Client) {
  return {
    name: c.name,
    email: c.email,
    goal: c.goal,
    start_weight: String(c.start_weight),
    kcal_target: String(c.kcal_target),
    tdee: String(c.tdee),
    macro_p: String(c.macro_p),
    macro_k: String(c.macro_k),
    macro_y: String(c.macro_y),
    pr: String(c.pr),
  };
}

export default function DanisanScreen() {
  const { profile } = useAuth();
  const { selectedClientId, setSelectedClientId } = useSelectedClient();
  const clientsQuery = useClients(profile?.id);
  const addClient = useAddClient(profile?.id);
  const updateClient = useUpdateClient(profile?.id);
  const deleteClient = useDeleteClient(profile?.id);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);

  const clients = clientsQuery.data ?? [];

  if (profile && profile.role !== 'trainer') return <Redirect href="/(app)/panel" />;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setEdit<K extends keyof typeof editForm>(key: K, value: string) {
    setEditForm((f) => ({ ...f, [key]: value }));
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
        email: form.email.trim().toLowerCase(),
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

  function startEdit(c: Client) {
    setEditingClientId(c.id);
    setEditForm(clientToForm(c));
    setEditError(null);
    setShowForm(false);
  }

  async function onEditSubmit() {
    if (!editingClientId) return;
    setEditError(null);
    const n = (s: string) => parseFloat(s.replace(',', '.')) || 0;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditError('Ad ve e-posta zorunlu.');
      return;
    }
    try {
      await updateClient.mutateAsync({
        id: editingClientId,
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        goal: editForm.goal,
        start_weight: n(editForm.start_weight),
        kcal_target: n(editForm.kcal_target),
        tdee: n(editForm.tdee),
        macro_p: n(editForm.macro_p),
        macro_k: n(editForm.macro_k),
        macro_y: n(editForm.macro_y),
        pr: n(editForm.pr),
      });
      setEditingClientId(null);
    } catch (e: any) {
      setEditError(e.message ?? 'Danışan güncellenemedi.');
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Danışan" />
      <ScrollView contentContainerStyle={styles.content}>
        {clients.length > 0 && <Text style={styles.hint}>Bir danışanı silmek için karta uzun bas, düzenlemek için ✎ ikonuna dokun.</Text>}

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
              onEdit={() => startEdit(c)}
              onLongPress={() =>
                Alert.alert(
                  'Danışanı Sil',
                  `${c.name} silinsin mi? Tüm program, ölçüm ve ödeme geçmişi kalıcı olarak silinir.`,
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'Sil',
                      style: 'destructive',
                      onPress: () =>
                        deleteClient.mutate(c.id, {
                          onError: (e: any) => Alert.alert('Silinemedi', e.message ?? 'Danışan silinemedi.'),
                        }),
                    },
                  ]
                )
              }
            />
          ))
        )}

        {editingClientId ? (
          <Panel title="Danışanı Düzenle" right="bilgileri güncelle">
            <AuthField label="Ad Soyad" value={editForm.name} onChangeText={(v) => setEdit('name', v)} placeholder="Ör. Mert K." />
            <AuthField label="E-posta" value={editForm.email} onChangeText={(v) => setEdit('email', v)} keyboardType="email-address" placeholder="ornek@eposta.com" />

            <Text style={styles.label}>Hedef</Text>
            <View style={styles.goalRow}>
              {GOALS.map((g) => (
                <Pressable key={g} onPress={() => setEdit('goal', g)} style={[styles.goalPill, editForm.goal === g && styles.goalPillActive]}>
                  <Text style={[styles.goalPillText, editForm.goal === g && { color: C.bg }]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <AuthField label="Başlangıç Kilosu (kg)" value={editForm.start_weight} onChangeText={(v) => setEdit('start_weight', v)} keyboardType="decimal-pad" />
            <AuthField label="Kalori Hedefi (kcal)" value={editForm.kcal_target} onChangeText={(v) => setEdit('kcal_target', v)} keyboardType="decimal-pad" />
            <AuthField label="TDEE (kcal)" value={editForm.tdee} onChangeText={(v) => setEdit('tdee', v)} keyboardType="decimal-pad" />
            <AuthField label="Protein Hedefi (g)" value={editForm.macro_p} onChangeText={(v) => setEdit('macro_p', v)} keyboardType="decimal-pad" />
            <AuthField label="Karbonhidrat Hedefi (g)" value={editForm.macro_k} onChangeText={(v) => setEdit('macro_k', v)} keyboardType="decimal-pad" />
            <AuthField label="Yağ Hedefi (g)" value={editForm.macro_y} onChangeText={(v) => setEdit('macro_y', v)} keyboardType="decimal-pad" />
            <AuthField label="Mevcut PR (kg)" value={editForm.pr} onChangeText={(v) => setEdit('pr', v)} keyboardType="decimal-pad" />

            {editError ? <Text style={styles.error}>{editError}</Text> : null}
            <View style={styles.rowGap}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Kaydet" onPress={onEditSubmit} loading={updateClient.isPending} />
              </View>
              <Pressable style={styles.cancelBtn} onPress={() => setEditingClientId(null)}>
                <Text style={styles.cancelBtnText}>Vazgeç</Text>
              </Pressable>
            </View>
          </Panel>
        ) : showForm ? (
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
  hint: { fontSize: 11, color: C.greyD, marginBottom: 10, fontStyle: 'italic' },
  label: { fontSize: 12, fontWeight: '700', color: C.grey, marginBottom: 6 },
  goalRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  goalPill: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  goalPillActive: { backgroundColor: C.lime, borderColor: C.lime },
  goalPillText: { fontSize: 12, fontWeight: '700', color: C.grey },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
  rowGap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: C.grey },
});
