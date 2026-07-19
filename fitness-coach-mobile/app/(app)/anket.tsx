import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthField } from '../../components/AuthField';
import { LikertScale } from '../../components/LikertScale';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../lib/auth';
import { useClient, useSaveWellnessSurvey, useWellnessSurveys } from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, monthPeriodStr } from '../../lib/theme';
import { monthLabelTr, SURVEY_SECTIONS } from '../../lib/wellnessSurvey';

export default function AnketScreen() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const insets = useSafeAreaInsets();
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const surveysQuery = useWellnessSurveys(selectedClientId ?? undefined);
  const saveSurvey = useSaveWellnessSurvey(selectedClientId ?? undefined);

  const { period: rawPeriod } = useLocalSearchParams<{ period: string }>();
  const currentPeriod = monthPeriodStr();
  const [period, setPeriod] = useState(rawPeriod || currentPeriod);

  const surveys = surveysQuery.data ?? [];
  const existing = surveys.find((s) => s.period === period);
  const isEditable = !isTrainer && period === currentPeriod;

  const [nameDraft, setNameDraft] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const hydrationKey = `${selectedClientId ?? ''}:${period}`;

  useEffect(() => {
    // Keyed by client+period (not existing?.updated_at): re-hydrating whenever the record's
    // updated_at changes would also fire right after this screen's own save succeeds and the
    // query refetches — clobbering any edit the user made in the moment between tapping
    // "save" and the request completing. Switching to a different period OR client still
    // re-hydrates (this screen stays mounted across trainer client switches).
    // Waiting on surveysQuery.isLoading (true only for the very first fetch) avoids hydrating
    // with a not-yet-resolved `existing` before the initial load finishes.
    if (hydratedFor === hydrationKey || !clientQuery.data || surveysQuery.isLoading) return;
    setNameDraft(existing?.name ?? clientQuery.data.name ?? '');
    setAnswers(existing?.answers ?? {});
    setComment(existing?.comment ?? '');
    setHydratedFor(hydrationKey);
  }, [hydrationKey, clientQuery.data, surveysQuery.isLoading, existing, hydratedFor]);

  const periods = Array.from(new Set([currentPeriod, ...surveys.map((s) => s.period)])).sort((a, b) => b.localeCompare(a));

  const totalQuestions = SURVEY_SECTIONS.reduce((a, s) => a + s.questions.length, 0);
  const answeredCount = Object.keys(answers).length;

  function submit() {
    saveSurvey.mutate(
      { period, name: nameDraft.trim(), answers, comment: comment.trim() },
      { onError: (e: any) => showAlert('Kaydedilemedi', e.message ?? 'Anket kaydedilemedi.') }
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Geri</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Aylık Değerlendirme Anketi</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.periodRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {periods.map((p) => {
            const filled = surveys.some((s) => s.period === p);
            return (
              <Pressable key={p} style={[styles.periodPill, period === p && styles.periodPillOn]} onPress={() => setPeriod(p)}>
                <Text style={[styles.periodPillText, period === p && styles.periodPillTextOn]}>
                  {monthLabelTr(p)}
                  {filled ? ' ✓' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {clientQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={C.lime} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!isEditable && !existing && (
            <Text style={styles.empty}>{isTrainer ? 'Bu ay için henüz anket doldurulmadı.' : 'Bu ay için anket doldurulmadı.'}</Text>
          )}

          {(isEditable || existing) && (
            <>
              <AuthField label="İsim" value={nameDraft} onChangeText={setNameDraft} editable={isEditable} placeholder="Ad Soyad" />

              {SURVEY_SECTIONS.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.questions.map((q) => (
                    <View key={q.id} style={styles.questionRow}>
                      <Text style={styles.questionLabel}>{q.label}</Text>
                      <LikertScale
                        value={answers[q.id]}
                        disabled={!isEditable}
                        onChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))}
                      />
                    </View>
                  ))}
                </View>
              ))}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Paylaşmak istedikleriniz ve önerileriniz</Text>
                <AuthField
                  label=""
                  value={comment}
                  onChangeText={setComment}
                  editable={isEditable}
                  multiline
                  numberOfLines={4}
                  placeholder="Opsiyonel"
                  style={styles.commentInput}
                />
              </View>

              {isEditable && (
                <>
                  <Text style={styles.progressText}>
                    {answeredCount}/{totalQuestions} soru yanıtlandı
                  </Text>
                  <PrimaryButton label={existing ? 'Güncelle' : 'Anketi Gönder'} loading={saveSurvey.isPending} onPress={submit} />
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.edge,
  },
  back: { fontSize: 13, fontWeight: '700', color: C.grey },
  headerTitle: { fontSize: 14, fontWeight: '800', color: C.white, flexShrink: 1, textAlign: 'center' },
  periodRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.edge },
  periodPill: { borderWidth: 1, borderColor: C.edge, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.card },
  periodPillOn: { backgroundColor: C.lime, borderColor: C.lime },
  periodPillText: { fontSize: 11, fontWeight: '700', color: C.grey },
  periodPillTextOn: { color: C.bg },
  content: { padding: 16, paddingTop: 12 },
  empty: { color: C.greyD, fontSize: 12, textAlign: 'center', marginTop: 30 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.lime, marginBottom: 10 },
  questionRow: { marginBottom: 14 },
  questionLabel: { fontSize: 12, color: C.grey, marginBottom: 8, lineHeight: 17 },
  commentInput: { minHeight: 90, textAlignVertical: 'top' },
  progressText: { fontSize: 11, color: C.greyD, textAlign: 'center', marginBottom: 10 },
});
