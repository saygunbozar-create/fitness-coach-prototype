import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { AuthField } from '../../components/AuthField';
import { ClientCard } from '../../components/ClientCard';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { useAddClient, useClients, useDeleteClient, useToggleClientActive, useUpdateClient, useWeightLogs } from '../../lib/queries';
import { useIsDesktopWeb } from '../../lib/responsive';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, formatDateInputTr } from '../../lib/theme';
import type { Client } from '../../lib/types';

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Zayıf';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Fazla Kilolu';
  return 'Obez';
}

// "10.05" -> "2026-05-10" (yıl yok sayılır, sadece gün/ay geçerliliği kontrol edilir)
function parseBirthdayInput(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = d.padStart(2, '0');
  const mm = mo.padStart(2, '0');
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12) return null;
  return `${y}-${mm}-${dd}`;
}

function formatBirthday(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

const GOALS = ['Yağ Yakımı', 'Kas Kazanımı'];
const GENDERS = ['Erkek', 'Kadın'];

const NUMERIC_FIELDS: [keyof typeof emptyForm, string][] = [
  ['start_weight', 'Başlangıç Kilosu'],
  ['kcal_target', 'Hedef Kalori'],
  ['tdee', 'TDEE'],
  ['macro_p', 'Protein Hedefi'],
  ['macro_k', 'Karbonhidrat Hedefi'],
  ['macro_y', 'Yağ Hedefi'],
  ['pr', 'PR'],
  ['height', 'Boy'],
];

function parseNum(s: string): number | null {
  const t = s.trim();
  if (t === '') return 0;
  // parseFloat tek başına "18O" gibi bir girdiyi sessizce 18'e keser — tüm string'in
  // geçerli bir sayı olduğunu ayrıca doğruluyoruz.
  if (!/^-?\d+([.,]\d+)?$/.test(t)) return null;
  const v = parseFloat(t.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

// Boş olmayan ama sayıya çevrilemeyen bir alan varsa hata mesajı döner, yoksa null.
function findInvalidNumericField(form: Record<string, string>): string | null {
  for (const [key, label] of NUMERIC_FIELDS) {
    if (form[key].trim() !== '' && parseNum(form[key]) === null) return label;
  }
  return null;
}

const emptyForm = {
  name: '',
  email: '',
  goal: GOALS[0],
  gender: GENDERS[0],
  start_weight: '',
  kcal_target: '',
  tdee: '',
  macro_p: '',
  macro_k: '',
  macro_y: '',
  pr: '',
  birthday: '',
  height: '',
};

function clientToForm(c: Client) {
  return {
    name: c.name,
    email: c.email,
    goal: c.goal,
    gender: c.gender || GENDERS[0],
    start_weight: String(c.start_weight),
    kcal_target: String(c.kcal_target),
    tdee: String(c.tdee),
    macro_p: String(c.macro_p),
    macro_k: String(c.macro_k),
    macro_y: String(c.macro_y),
    pr: String(c.pr),
    birthday: c.birthday ? formatBirthday(c.birthday) : '',
    height: String(c.height),
  };
}

export default function DanisanScreen() {
  const { profile } = useAuth();
  const isDesktopWeb = useIsDesktopWeb();
  const { selectedClientId, setSelectedClientId } = useSelectedClient();
  const clientsQuery = useClients(profile?.id);
  const addClient = useAddClient(profile?.id);
  const updateClient = useUpdateClient(profile?.id);
  const deleteClient = useDeleteClient(profile?.id);
  const toggleActive = useToggleClientActive(profile?.id);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const editWeightLogsQuery = useWeightLogs(editingClientId ?? undefined);

  const clients = clientsQuery.data ?? [];
  const activeClients = clients.filter((c) => c.is_active);
  const pausedClients = clients.filter((c) => !c.is_active);

  if (profile && profile.role !== 'trainer') return <Redirect href="/(app)/antrenman" />;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setEdit<K extends keyof typeof editForm>(key: K, value: string) {
    setEditForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit() {
    setError(null);
    const n = (s: string) => parseNum(s) ?? 0;
    if (!form.name.trim() || !form.email.trim()) {
      setError('Ad ve e-posta zorunlu.');
      return;
    }
    const invalidField = findInvalidNumericField(form);
    if (invalidField) {
      setError(`${invalidField} alanı geçersiz bir sayı.`);
      return;
    }
    const birthday = form.birthday.trim() ? parseBirthdayInput(form.birthday) : null;
    if (form.birthday.trim() && !birthday) {
      setError('Doğum günü GG.AA.YYYY biçiminde olmalı.');
      return;
    }
    try {
      const result = await addClient.mutateAsync({
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
        birthday,
        height: n(form.height),
        gender: form.gender,
      });
      setForm(emptyForm);
      setShowForm(false);
      if (result.seedError) {
        showAlert(
          'Danışan eklendi',
          `Danışan oluşturuldu ama varsayılan antrenman/beslenme planı eklenemedi (${result.seedError}). Antrenman ve Beslenme ekranlarından elle ekleyebilirsin.`
        );
      }
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
    const n = (s: string) => parseNum(s) ?? 0;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditError('Ad ve e-posta zorunlu.');
      return;
    }
    const invalidField = findInvalidNumericField(editForm);
    if (invalidField) {
      setEditError(`${invalidField} alanı geçersiz bir sayı.`);
      return;
    }
    const birthday = editForm.birthday.trim() ? parseBirthdayInput(editForm.birthday) : null;
    if (editForm.birthday.trim() && !birthday) {
      setEditError('Doğum günü GG.AA.YYYY biçiminde olmalı.');
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
        birthday,
        height: n(editForm.height),
        gender: editForm.gender,
      });
      setEditingClientId(null);
    } catch (e: any) {
      setEditError(e.message ?? 'Danışan güncellenemedi.');
    }
  }

  function renderEditPanel() {
    const logs = editWeightLogsQuery.data ?? [];
    const latestWeight = logs.length ? logs[logs.length - 1].weight : parseNum(editForm.start_weight) ?? 0;
    const heightM = (parseNum(editForm.height) ?? 0) / 100;
    const bmi = heightM > 0 && latestWeight > 0 ? latestWeight / (heightM * heightM) : null;

    return (
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

        <Text style={styles.label}>Cinsiyet</Text>
        <View style={styles.goalRow}>
          {GENDERS.map((g) => (
            <Pressable key={g} onPress={() => setEdit('gender', g)} style={[styles.goalPill, editForm.gender === g && styles.goalPillActive]}>
              <Text style={[styles.goalPillText, editForm.gender === g && { color: C.bg }]}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <AuthField label="Boy (cm)" value={editForm.height} onChangeText={(v) => setEdit('height', v)} keyboardType="decimal-pad" />
        <AuthField label="Başlangıç Kilosu (kg)" value={editForm.start_weight} onChangeText={(v) => setEdit('start_weight', v)} keyboardType="decimal-pad" />
        {bmi != null && (
          <Text style={styles.bmiText}>
            BMI: {bmi.toFixed(1)} ({bmiCategory(bmi)})
          </Text>
        )}
        <AuthField label="Kalori Hedefi (kcal)" value={editForm.kcal_target} onChangeText={(v) => setEdit('kcal_target', v)} keyboardType="decimal-pad" />
        <AuthField label="TDEE (kcal)" value={editForm.tdee} onChangeText={(v) => setEdit('tdee', v)} keyboardType="decimal-pad" />
        <AuthField label="Protein Hedefi (g)" value={editForm.macro_p} onChangeText={(v) => setEdit('macro_p', v)} keyboardType="decimal-pad" />
        <AuthField label="Karbonhidrat Hedefi (g)" value={editForm.macro_k} onChangeText={(v) => setEdit('macro_k', v)} keyboardType="decimal-pad" />
        <AuthField label="Yağ Hedefi (g)" value={editForm.macro_y} onChangeText={(v) => setEdit('macro_y', v)} keyboardType="decimal-pad" />
        <AuthField
          label="Doğum Günü (GG.AA.YYYY, opsiyonel)"
          value={editForm.birthday}
          onChangeText={(v) => setEdit('birthday', formatDateInputTr(v, editForm.birthday))}
          placeholder="Ör. 14.07.1995"
          keyboardType="number-pad"
          maxLength={10}
        />

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
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Danışan" />
      <ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.contentDesktop]}>
        {clients.length > 0 && <Text style={styles.hint}>Bir danışanı silmek için karta uzun bas, düzenlemek için ✎ ikonuna dokun.</Text>}

        {clientsQuery.isLoading ? (
          <ActivityIndicator color={C.lime} />
        ) : (
          <>
            <View style={isDesktopWeb && styles.desktopGrid}>
            {activeClients.map((c) => (
              <View key={c.id} style={isDesktopWeb && styles.desktopGridCell}>
                <ClientCard
                  client={c}
                  active={c.id === selectedClientId}
                  onPress={() => {
                    setSelectedClientId(c.id);
                    router.push('/(app)/antrenman');
                  }}
                  onEdit={() => startEdit(c)}
                  onToggleActive={() =>
                    toggleActive.mutate({ clientId: c.id, active: false }, { onError: (e: any) => showAlert('Güncellenemedi', e.message ?? 'Durum değiştirilemedi.') })
                  }
                  onLongPress={() =>
                    showAlert(
                      'Danışanı Sil',
                      `${c.name} silinsin mi? Tüm program, ölçüm ve ödeme geçmişi kalıcı olarak silinir.`,
                      [
                        { text: 'Vazgeç', style: 'cancel' },
                        {
                          text: 'Sil',
                          style: 'destructive',
                          onPress: () =>
                            deleteClient.mutate(c.id, {
                              onError: (e: any) => showAlert('Silinemedi', e.message ?? 'Danışan silinemedi.'),
                            }),
                        },
                      ]
                    )
                  }
                />
                {editingClientId === c.id && renderEditPanel()}
              </View>
            ))}
            </View>

            {pausedClients.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Pasif Danışanlar</Text>
                <View style={isDesktopWeb && styles.desktopGrid}>
                {pausedClients.map((c) => (
                  <View key={c.id} style={isDesktopWeb && styles.desktopGridCell}>
                    <ClientCard
                      client={c}
                      active={c.id === selectedClientId}
                      onPress={() => {
                        setSelectedClientId(c.id);
                        router.push('/(app)/antrenman');
                      }}
                      onEdit={() => startEdit(c)}
                      onToggleActive={() =>
                        toggleActive.mutate({ clientId: c.id, active: true }, { onError: (e: any) => showAlert('Güncellenemedi', e.message ?? 'Durum değiştirilemedi.') })
                      }
                      onLongPress={() =>
                        showAlert(
                          'Danışanı Sil',
                          `${c.name} silinsin mi? Tüm program, ölçüm ve ödeme geçmişi kalıcı olarak silinir.`,
                          [
                            { text: 'Vazgeç', style: 'cancel' },
                            {
                              text: 'Sil',
                              style: 'destructive',
                              onPress: () =>
                                deleteClient.mutate(c.id, {
                                  onError: (e: any) => showAlert('Silinemedi', e.message ?? 'Danışan silinemedi.'),
                                }),
                            },
                          ]
                        )
                      }
                    />
                    {editingClientId === c.id && renderEditPanel()}
                  </View>
                ))}
                </View>
              </>
            )}
          </>
        )}

        {!editingClientId && (showForm ? (
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

            <Text style={styles.label}>Cinsiyet</Text>
            <View style={styles.goalRow}>
              {GENDERS.map((g) => (
                <Pressable key={g} onPress={() => set('gender', g)} style={[styles.goalPill, form.gender === g && styles.goalPillActive]}>
                  <Text style={[styles.goalPillText, form.gender === g && { color: C.bg }]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <AuthField label="Boy (cm)" value={form.height} onChangeText={(v) => set('height', v)} keyboardType="decimal-pad" />
            <AuthField label="Başlangıç Kilosu (kg)" value={form.start_weight} onChangeText={(v) => set('start_weight', v)} keyboardType="decimal-pad" />
            {(() => {
              const heightM = (parseNum(form.height) ?? 0) / 100;
              const weight = parseNum(form.start_weight) ?? 0;
              const bmi = heightM > 0 && weight > 0 ? weight / (heightM * heightM) : null;
              return bmi != null ? (
                <Text style={styles.bmiText}>
                  BMI: {bmi.toFixed(1)} ({bmiCategory(bmi)})
                </Text>
              ) : null;
            })()}
            <AuthField label="Kalori Hedefi (kcal)" value={form.kcal_target} onChangeText={(v) => set('kcal_target', v)} keyboardType="decimal-pad" />
            <AuthField label="TDEE (kcal)" value={form.tdee} onChangeText={(v) => set('tdee', v)} keyboardType="decimal-pad" />
            <AuthField label="Protein Hedefi (g)" value={form.macro_p} onChangeText={(v) => set('macro_p', v)} keyboardType="decimal-pad" />
            <AuthField label="Karbonhidrat Hedefi (g)" value={form.macro_k} onChangeText={(v) => set('macro_k', v)} keyboardType="decimal-pad" />
            <AuthField label="Yağ Hedefi (g)" value={form.macro_y} onChangeText={(v) => set('macro_y', v)} keyboardType="decimal-pad" />
            <AuthField label="Mevcut PR (kg)" value={form.pr} onChangeText={(v) => set('pr', v)} keyboardType="decimal-pad" />
            <AuthField
              label="Doğum Günü (GG.AA.YYYY, opsiyonel)"
              value={form.birthday}
              onChangeText={(v) => set('birthday', formatDateInputTr(v, form.birthday))}
              placeholder="Ör. 14.07.1995"
              keyboardType="number-pad"
              maxLength={10}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Danışanı Ekle" onPress={onSubmit} loading={addClient.isPending} />
          </Panel>
        ) : (
          <Pressable style={styles.addCli} onPress={() => setShowForm(true)}>
            <Text style={styles.addCliText}>+ Yeni danışan ekle</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 4 },
  contentDesktop: { padding: 28, paddingTop: 20 },
  desktopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  desktopGridCell: { width: '48%' },
  addCli: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 16, padding: 15, alignItems: 'center' },
  addCliText: { fontSize: 13, color: C.greyD },
  hint: { fontSize: 11, color: C.greyD, marginBottom: 10, fontStyle: 'italic' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.greyD, marginTop: 4, marginBottom: 8, textTransform: 'uppercase' },
  label: { fontSize: 12, fontWeight: '700', color: C.grey, marginBottom: 6 },
  goalRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  goalPill: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  goalPillActive: { backgroundColor: C.lime, borderColor: C.lime },
  goalPillText: { fontSize: 12, fontWeight: '700', color: C.grey },
  bmiText: { fontSize: 12, fontWeight: '700', color: C.lime, marginTop: -8, marginBottom: 14 },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
  rowGap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: C.grey },
});
