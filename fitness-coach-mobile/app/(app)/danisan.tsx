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
import { LANGUAGES, useLanguage, useT } from '../../lib/i18n';
import { PARQ_QUESTIONS } from '../../lib/parq';
import { useAddClient, useClients, useDeleteClient, useIntakeForm, useToggleClientActive, useUpdateClient, useWeightLogs } from '../../lib/queries';
import { useIsDesktopWeb } from '../../lib/responsive';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, formatDateInputTr } from '../../lib/theme';
import type { Client } from '../../lib/types';

function IntakeFormSummary({ clientId }: { clientId: string }) {
  const t = useT();
  const formQuery = useIntakeForm(clientId);
  const form = formQuery.data;

  if (formQuery.isLoading) return null;

  if (!form) {
    return (
      <Panel title={t('danisan.health_form_title')} right="⚕">
        <Text style={styles.formEmpty}>{t('danisan.health_form_empty')}</Text>
      </Panel>
    );
  }

  const flagged = PARQ_QUESTIONS.filter((q) => form.parq_answers[q.key] === true);

  return (
    <Panel title={t('danisan.health_form_title')} right="⚕">
      {flagged.length > 0 ? (
        <>
          <Text style={styles.formWarning}>{t('danisan.health_form_flagged', { count: flagged.length })}</Text>
          {flagged.map((q) => (
            <Text key={q.key} style={styles.formFlaggedItem}>
              · {t(q.textKey)}
            </Text>
          ))}
        </>
      ) : (
        <Text style={styles.formOk}>{t('danisan.health_form_ok')}</Text>
      )}
      {form.health_notes ? (
        <>
          <Text style={[styles.label, { marginTop: 10 }]}>{t('danisan.health_note_label')}</Text>
          <Text style={styles.formNote}>{form.health_notes}</Text>
        </>
      ) : null}
      <Text style={styles.formSignature}>
        {t('danisan.signature_prefix')} {form.waiver_signature_name} · {new Date(form.submitted_at).toLocaleDateString('tr-TR')}
      </Text>
    </Panel>
  );
}

function bmiCategory(bmi: number, t: (key: string) => string): string {
  if (bmi < 18.5) return t('danisan.bmi_underweight');
  if (bmi < 25) return t('danisan.bmi_normal');
  if (bmi < 30) return t('danisan.bmi_overweight');
  return t('danisan.bmi_obese');
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
  ['start_weight', 'danisan.field_start_weight'],
  ['kcal_target', 'danisan.field_kcal'],
  ['tdee', 'danisan.field_tdee'],
  ['macro_p', 'danisan.field_protein'],
  ['macro_k', 'danisan.field_carb'],
  ['macro_y', 'danisan.field_fat'],
  ['pr', 'danisan.field_pr'],
  ['height', 'danisan.field_height'],
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
function findInvalidNumericField(form: Record<string, string>, t: (key: string) => string): string | null {
  for (const [key, labelKey] of NUMERIC_FIELDS) {
    if (form[key].trim() !== '' && parseNum(form[key]) === null) return t(labelKey);
  }
  return null;
}

const emptyForm = {
  name: '',
  email: '',
  goal: GOALS[0],
  gender: GENDERS[0],
  // Yeni danışan varsayılan olarak eğitmenin kendi dilini alır; eğitmen İngilizce konuşan bir
  // danışan eklerken bunu değiştirir. Sadece EKLEME formunda var — düzenleme formunda değil,
  // çünkü şablon zaten kurulmuş olur ve sonradan değiştirmek hiçbir şeyi güncellemez
  // (danışan kendi dilini Ayarlar'dan değiştirebilir).
  language: 'tr',
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
    language: c.language || 'tr',
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
  const t = useT();
  const { profile } = useAuth();
  const isDesktopWeb = useIsDesktopWeb();
  const { selectedClientId, setSelectedClientId } = useSelectedClient();
  const clientsQuery = useClients(profile?.id);
  const addClient = useAddClient(profile?.id);
  const updateClient = useUpdateClient(profile?.id);
  const deleteClient = useDeleteClient(profile?.id);
  const toggleActive = useToggleClientActive(profile?.id);
  const trainerLang = useLanguage();
  const [showForm, setShowForm] = useState(false);
  // Yeni danışan formu eğitmenin kendi diliyle açılır (çoğu danışan aynı dili konuşur).
  const [form, setForm] = useState({ ...emptyForm, language: trainerLang });
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
      setError(t('danisan.required_fields'));
      return;
    }
    const invalidField = findInvalidNumericField(form, t);
    if (invalidField) {
      setError(t('danisan.invalid_number', { field: invalidField }));
      return;
    }
    const birthday = form.birthday.trim() ? parseBirthdayInput(form.birthday) : null;
    if (form.birthday.trim() && !birthday) {
      setError(t('danisan.invalid_birthday'));
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
        language: form.language,
      });
      setForm({ ...emptyForm, language: trainerLang });
      setShowForm(false);
      if (result.seedError) {
        showAlert(t('danisan.add_client_toast_title'), t('danisan.add_client_seed_error', { error: result.seedError }));
      }
    } catch (e: any) {
      setError(e.message ?? t('danisan.add_client_failed'));
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
      setEditError(t('danisan.required_fields'));
      return;
    }
    const invalidField = findInvalidNumericField(editForm, t);
    if (invalidField) {
      setEditError(t('danisan.invalid_number', { field: invalidField }));
      return;
    }
    const birthday = editForm.birthday.trim() ? parseBirthdayInput(editForm.birthday) : null;
    if (editForm.birthday.trim() && !birthday) {
      setEditError(t('danisan.invalid_birthday'));
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
      setEditError(e.message ?? t('danisan.update_client_failed'));
    }
  }

  function renderEditPanel() {
    const logs = editWeightLogsQuery.data ?? [];
    const latestWeight = logs.length ? logs[logs.length - 1].weight : parseNum(editForm.start_weight) ?? 0;
    const heightM = (parseNum(editForm.height) ?? 0) / 100;
    const bmi = heightM > 0 && latestWeight > 0 ? latestWeight / (heightM * heightM) : null;

    return (
      <Panel title={t('danisan.edit_title')} right={t('danisan.edit_subtitle')}>
        <AuthField label={t('ayarlar.name')} value={editForm.name} onChangeText={(v) => setEdit('name', v)} placeholder="Ör. Mert K." />
        <AuthField label={t('ayarlar.email')} value={editForm.email} onChangeText={(v) => setEdit('email', v)} keyboardType="email-address" placeholder="ornek@eposta.com" />

        <Text style={styles.label}>{t('danisan.goal_label')}</Text>
        <View style={styles.goalRow}>
          {GOALS.map((g) => (
            <Pressable key={g} onPress={() => setEdit('goal', g)} style={[styles.goalPill, editForm.goal === g && styles.goalPillActive]}>
              <Text style={[styles.goalPillText, editForm.goal === g && { color: C.bg }]}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('danisan.gender_label')}</Text>
        <View style={styles.goalRow}>
          {GENDERS.map((g) => (
            <Pressable key={g} onPress={() => setEdit('gender', g)} style={[styles.goalPill, editForm.gender === g && styles.goalPillActive]}>
              <Text style={[styles.goalPillText, editForm.gender === g && { color: C.bg }]}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <AuthField label={t('danisan.height_label')} value={editForm.height} onChangeText={(v) => setEdit('height', v)} keyboardType="decimal-pad" />
        <AuthField label={t('danisan.start_weight_label')} value={editForm.start_weight} onChangeText={(v) => setEdit('start_weight', v)} keyboardType="decimal-pad" />
        {bmi != null && (
          <Text style={styles.bmiText}>
            BMI: {bmi.toFixed(1)} ({bmiCategory(bmi, t)})
          </Text>
        )}
        <AuthField label={t('danisan.kcal_label')} value={editForm.kcal_target} onChangeText={(v) => setEdit('kcal_target', v)} keyboardType="decimal-pad" />
        <AuthField label={t('danisan.tdee_label')} value={editForm.tdee} onChangeText={(v) => setEdit('tdee', v)} keyboardType="decimal-pad" />
        <AuthField label={t('danisan.protein_label')} value={editForm.macro_p} onChangeText={(v) => setEdit('macro_p', v)} keyboardType="decimal-pad" />
        <AuthField label={t('danisan.carb_label')} value={editForm.macro_k} onChangeText={(v) => setEdit('macro_k', v)} keyboardType="decimal-pad" />
        <AuthField label={t('danisan.fat_label')} value={editForm.macro_y} onChangeText={(v) => setEdit('macro_y', v)} keyboardType="decimal-pad" />
        <AuthField
          label={t('danisan.birthday_label')}
          value={editForm.birthday}
          onChangeText={(v) => setEdit('birthday', formatDateInputTr(v, editForm.birthday))}
          placeholder={t('danisan.birthday_placeholder')}
          keyboardType="number-pad"
          maxLength={10}
        />

        {editError ? <Text style={styles.error}>{editError}</Text> : null}
        <View style={styles.rowGap}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label={t('common.save')} onPress={onEditSubmit} loading={updateClient.isPending} />
          </View>
          <Pressable style={styles.cancelBtn} onPress={() => setEditingClientId(null)}>
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </Panel>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('nav.danisan')} />
      <ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.contentDesktop]}>
        {clients.length > 0 && <Text style={styles.hint}>{t('danisan.long_press_hint')}</Text>}

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
                    toggleActive.mutate({ clientId: c.id, active: false }, { onError: (e: any) => showAlert(t('common.update_failed_title'), e.message ?? t('danisan.update_failed_body')) })
                  }
                  onLongPress={() =>
                    showAlert(
                      t('danisan.delete_client_title'),
                      t('danisan.delete_client_body', { name: c.name }),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: () =>
                            deleteClient.mutate(c.id, {
                              onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('danisan.delete_client_failed')),
                            }),
                        },
                      ]
                    )
                  }
                />
                {editingClientId === c.id && (
                  <>
                    {renderEditPanel()}
                    <IntakeFormSummary clientId={c.id} />
                  </>
                )}
              </View>
            ))}
            </View>

            {pausedClients.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('danisan.paused_section')}</Text>
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
                        toggleActive.mutate({ clientId: c.id, active: true }, { onError: (e: any) => showAlert(t('common.update_failed_title'), e.message ?? t('danisan.update_failed_body')) })
                      }
                      onLongPress={() =>
                        showAlert(
                          t('danisan.delete_client_title'),
                          t('danisan.delete_client_body', { name: c.name }),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('common.delete'),
                              style: 'destructive',
                              onPress: () =>
                                deleteClient.mutate(c.id, {
                                  onError: (e: any) => showAlert(t('common.delete_failed_title'), e.message ?? t('danisan.delete_client_failed')),
                                }),
                            },
                          ]
                        )
                      }
                    />
                    {editingClientId === c.id && (
                  <>
                    {renderEditPanel()}
                    <IntakeFormSummary clientId={c.id} />
                  </>
                )}
                  </View>
                ))}
                </View>
              </>
            )}
          </>
        )}

        {!editingClientId && (showForm ? (
          <Panel title={t('danisan.new_client_title')} right={t('danisan.new_client_subtitle')}>
            <AuthField label={t('ayarlar.name')} value={form.name} onChangeText={(v) => set('name', v)} placeholder="Ör. Mert K." />
            <AuthField label={t('ayarlar.email')} value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" placeholder="ornek@eposta.com" />

            <Text style={styles.label}>{t('danisan.goal_label')}</Text>
            <View style={styles.goalRow}>
              {GOALS.map((g) => (
                <Pressable key={g} onPress={() => set('goal', g)} style={[styles.goalPill, form.goal === g && styles.goalPillActive]}>
                  <Text style={[styles.goalPillText, form.goal === g && { color: C.bg }]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('danisan.gender_label')}</Text>
            <View style={styles.goalRow}>
              {GENDERS.map((g) => (
                <Pressable key={g} onPress={() => set('gender', g)} style={[styles.goalPill, form.gender === g && styles.goalPillActive]}>
                  <Text style={[styles.goalPillText, form.gender === g && { color: C.bg }]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('danisan.language_label')}</Text>
            <View style={styles.goalRow}>
              {LANGUAGES.map((l) => (
                <Pressable key={l.code} onPress={() => set('language', l.code)} style={[styles.goalPill, form.language === l.code && styles.goalPillActive]}>
                  <Text style={[styles.goalPillText, form.language === l.code && { color: C.bg }]}>{l.nativeLabel}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.languageHint}>{t('danisan.language_hint')}</Text>

            <AuthField label={t('danisan.height_label')} value={form.height} onChangeText={(v) => set('height', v)} keyboardType="decimal-pad" />
            <AuthField label={t('danisan.start_weight_label')} value={form.start_weight} onChangeText={(v) => set('start_weight', v)} keyboardType="decimal-pad" />
            {(() => {
              const heightM = (parseNum(form.height) ?? 0) / 100;
              const weight = parseNum(form.start_weight) ?? 0;
              const bmi = heightM > 0 && weight > 0 ? weight / (heightM * heightM) : null;
              return bmi != null ? (
                <Text style={styles.bmiText}>
                  BMI: {bmi.toFixed(1)} ({bmiCategory(bmi, t)})
                </Text>
              ) : null;
            })()}
            <AuthField label={t('danisan.kcal_label')} value={form.kcal_target} onChangeText={(v) => set('kcal_target', v)} keyboardType="decimal-pad" />
            <AuthField label={t('danisan.tdee_label')} value={form.tdee} onChangeText={(v) => set('tdee', v)} keyboardType="decimal-pad" />
            <AuthField label={t('danisan.protein_label')} value={form.macro_p} onChangeText={(v) => set('macro_p', v)} keyboardType="decimal-pad" />
            <AuthField label={t('danisan.carb_label')} value={form.macro_k} onChangeText={(v) => set('macro_k', v)} keyboardType="decimal-pad" />
            <AuthField label={t('danisan.fat_label')} value={form.macro_y} onChangeText={(v) => set('macro_y', v)} keyboardType="decimal-pad" />
            <AuthField label={t('danisan.pr_label')} value={form.pr} onChangeText={(v) => set('pr', v)} keyboardType="decimal-pad" />
            <AuthField
              label={t('danisan.birthday_label')}
              value={form.birthday}
              onChangeText={(v) => set('birthday', formatDateInputTr(v, form.birthday))}
              placeholder={t('danisan.birthday_placeholder')}
              keyboardType="number-pad"
              maxLength={10}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={t('danisan.add_client_btn')} onPress={onSubmit} loading={addClient.isPending} />
          </Panel>
        ) : (
          <Pressable style={styles.addCli} onPress={() => setShowForm(true)}>
            <Text style={styles.addCliText}>{t('danisan.add_client_cta')}</Text>
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
  languageHint: { fontSize: 10.5, color: C.greyD, lineHeight: 15, marginTop: -8, marginBottom: 14 },
  formEmpty: { fontSize: 12.5, color: C.greyD, fontStyle: 'italic' },
  formWarning: { fontSize: 12.5, fontWeight: '700', color: C.orange, marginBottom: 6 },
  formFlaggedItem: { fontSize: 12, color: C.grey, lineHeight: 18, marginBottom: 2 },
  formOk: { fontSize: 12.5, color: C.grey },
  formNote: { fontSize: 12.5, color: C.grey, lineHeight: 18 },
  formSignature: { fontSize: 11, color: C.greyD, marginTop: 10, fontStyle: 'italic' },
  error: { color: C.red, fontSize: 12, marginBottom: 12 },
  rowGap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: C.grey },
});
