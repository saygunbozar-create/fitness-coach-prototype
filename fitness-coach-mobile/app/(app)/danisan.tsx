import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { ClientCard } from '../../components/ClientCard';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import {
  useAddClient,
  useAddPackage,
  useClients,
  useCompletedSessionsSince,
  useDeleteClient,
  useDeletePackage,
  usePackages,
} from '../../lib/queries';
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
  const deleteClient = useDeleteClient(profile?.id);
  const packagesQuery = usePackages(selectedClientId ?? undefined);
  const addPackage = useAddPackage(selectedClientId ?? undefined);
  const deletePackage = useDeletePackage(selectedClientId ?? undefined);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [addingPackage, setAddingPackage] = useState(false);
  const [packageDraft, setPackageDraft] = useState({ name: '', total_sessions: '', note: '' });

  const clients = clientsQuery.data ?? [];
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const packages = packagesQuery.data ?? [];
  const currentPackage = packages[0] ?? null;
  const completedSessionsQuery = useCompletedSessionsSince(selectedClientId ?? undefined, currentPackage?.start_date);
  const usedSessions = useMemo(() => completedSessionsQuery.data ?? [], [completedSessionsQuery.data]);
  const remaining = currentPackage ? Math.max(0, currentPackage.total_sessions - usedSessions.length) : 0;

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
        {clients.length > 0 && <Text style={styles.hint}>Bir danışanı silmek için karta uzun bas.</Text>}

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
              onLongPress={() =>
                Alert.alert(
                  'Danışanı Sil',
                  `${c.name} silinsin mi? Tüm program, ölçüm ve ödeme geçmişi kalıcı olarak silinir.`,
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: () => deleteClient.mutate(c.id) },
                  ]
                )
              }
            />
          ))
        )}

        {selectedClient && (
          <Panel title={`Paket & Seanslar — ${selectedClient.name}`} right={packages.length ? `${packages.length} paket` : undefined}>
            {currentPackage ? (
              <View style={styles.packageSummary}>
                <Text style={styles.packageName}>{currentPackage.name}</Text>
                <View style={styles.packageChips}>
                  <View style={styles.packageChip}>
                    <Text style={styles.packageChipValue}>{currentPackage.total_sessions}</Text>
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
                <Pressable onPress={() => deletePackage.mutate(currentPackage.id)} hitSlop={8}>
                  <Text style={styles.packageDelete}>Bu paketi sil</Text>
                </Pressable>
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
                    <Pressable onPress={() => deletePackage.mutate(p.id)} hitSlop={8}>
                      <Text style={styles.packageDelete}>Sil</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {!addingPackage && (
              <Pressable style={styles.addCli} onPress={() => setAddingPackage(true)}>
                <Text style={styles.addCliText}>+ Yeni Paket Ekle</Text>
              </Pressable>
            )}

            {addingPackage && (
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
                      { onSuccess: () => { setPackageDraft({ name: '', total_sessions: '', note: '' }); setAddingPackage(false); } }
                    );
                  }}
                />
              </View>
            )}
          </Panel>
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
  hint: { fontSize: 11, color: C.greyD, marginBottom: 10, fontStyle: 'italic' },
  label: { fontSize: 12, fontWeight: '700', color: C.grey, marginBottom: 6 },
  goalRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  goalPill: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  goalPillActive: { backgroundColor: C.lime, borderColor: C.lime },
  goalPillText: { fontSize: 12, fontWeight: '700', color: C.grey },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
  empty: { color: C.greyD, fontSize: 12, marginBottom: 12 },
  packageSummary: { marginBottom: 12 },
  packageName: { color: C.white, fontWeight: '800', fontSize: 15, marginBottom: 10 },
  packageChips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  packageChip: { flex: 1, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge, borderRadius: 12, padding: 10, alignItems: 'center' },
  packageChipValue: { fontSize: 18, fontWeight: '800', color: C.lime },
  packageChipLabel: { fontSize: 10, color: C.grey, marginTop: 2 },
  usedDates: { backgroundColor: C.card2, borderRadius: 10, padding: 10, marginBottom: 10 },
  usedDatesLabel: { fontSize: 11, color: C.greyD, fontWeight: '700', marginBottom: 4 },
  usedDatesValue: { fontSize: 11, color: C.grey, lineHeight: 16 },
  packageDelete: { fontSize: 11, fontWeight: '700', color: C.red },
  oldPackages: { marginBottom: 12 },
  oldPackageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  oldPackageText: { fontSize: 11, color: C.grey, flexShrink: 1 },
  packageForm: { marginTop: 4 },
});
