import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { PARQ_QUESTIONS, WAIVER_TEXT } from '../lib/parq';
import { useSubmitIntakeForm } from '../lib/queries';
import { C } from '../lib/theme';

export function IntakeFormGate({ clientId }: { clientId: string }) {
  const { signOut, profile } = useAuth();
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [healthNotes, setHealthNotes] = useState('');
  const [signatureName, setSignatureName] = useState(profile?.name ?? '');
  const [waiverChecked, setWaiverChecked] = useState(false);
  const submit = useSubmitIntakeForm(clientId);

  const allAnswered = PARQ_QUESTIONS.every((q) => answers[q.key] === true || answers[q.key] === false);
  const canSubmit = allAnswered && waiverChecked && signatureName.trim().length > 1;

  async function handleSubmit() {
    if (!canSubmit) return;
    await submit.mutateAsync({
      parq_answers: answers as Record<string, boolean>,
      health_notes: healthNotes.trim(),
      waiver_signature_name: signatureName.trim(),
    });
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Sağlık Formu</Text>
        <Text style={styles.body}>
          Antrenmana başlamadan önce birkaç sağlık sorusunu yanıtlaman ve feragatnameyi onaylaman gerekiyor. Bu bilgiler
          sadece antrenörünle paylaşılır.
        </Text>

        {PARQ_QUESTIONS.map((q) => (
          <View key={q.key} style={styles.question}>
            <Text style={styles.questionText}>{q.text}</Text>
            <View style={styles.answerRow}>
              <Pressable
                style={[styles.answerBtn, answers[q.key] === true && styles.answerBtnActive]}
                onPress={() => setAnswers((a) => ({ ...a, [q.key]: true }))}
              >
                <Text style={[styles.answerBtnText, answers[q.key] === true && styles.answerBtnTextActive]}>Evet</Text>
              </Pressable>
              <Pressable
                style={[styles.answerBtn, answers[q.key] === false && styles.answerBtnActive]}
                onPress={() => setAnswers((a) => ({ ...a, [q.key]: false }))}
              >
                <Text style={[styles.answerBtnText, answers[q.key] === false && styles.answerBtnTextActive]}>Hayır</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.label}>Eklemek istediğin bir sağlık notu var mı? (opsiyonel)</Text>
        <TextInput
          style={styles.textarea}
          value={healthNotes}
          onChangeText={setHealthNotes}
          placeholder="Örn. geçirdiğin bir ameliyat, kronik bir rahatsızlık..."
          placeholderTextColor={C.greyD}
          multiline
        />

        <Text style={styles.waiverTitle}>Sorumluluk Feragatnamesi</Text>
        <Text style={styles.waiverText}>{WAIVER_TEXT}</Text>

        <Text style={styles.label}>E-imza olarak ad soyadını yaz</Text>
        <TextInput style={styles.input} value={signatureName} onChangeText={setSignatureName} placeholder="Ad Soyad" placeholderTextColor={C.greyD} />

        <Pressable style={styles.checkRow} onPress={() => setWaiverChecked((v) => !v)} hitSlop={8}>
          <View style={[styles.checkbox, waiverChecked && styles.checkboxOn]}>{waiverChecked ? <Text style={styles.checkMark}>✓</Text> : null}</View>
          <Text style={styles.checkLabel}>Yukarıdaki feragatnameyi okudum, kabul ediyorum.</Text>
        </Pressable>

        {submit.isError ? <Text style={styles.error}>Bir şeyler ters gitti, tekrar dener misin?</Text> : null}

        <Pressable style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={!canSubmit || submit.isPending}>
          {submit.isPending ? <ActivityIndicator color={C.bg} /> : <Text style={styles.submitBtnText}>Gönder ve Devam Et</Text>}
        </Pressable>
        <Pressable onPress={signOut} hitSlop={10} style={styles.signOutRow}>
          <Text style={styles.signOutLink}>Çıkış yap</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24, maxWidth: 520, alignSelf: 'center', width: '100%' },
  title: { color: C.white, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  body: { color: C.grey, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  question: { marginBottom: 16 },
  questionText: { color: C.white, fontSize: 13.5, lineHeight: 19, marginBottom: 8 },
  answerRow: { flexDirection: 'row', gap: 10 },
  answerBtn: { flex: 1, borderWidth: 1, borderColor: C.edge, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: C.card },
  answerBtnActive: { backgroundColor: C.lime, borderColor: C.lime },
  answerBtnText: { color: C.grey, fontWeight: '700', fontSize: 13 },
  answerBtnTextActive: { color: C.bg },
  label: { color: C.grey, fontSize: 12.5, marginBottom: 6, marginTop: 4 },
  textarea: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 12,
    padding: 12,
    color: C.white,
    fontSize: 13.5,
    minHeight: 70,
    marginBottom: 16,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 12,
    padding: 12,
    color: C.white,
    fontSize: 13.5,
    marginBottom: 14,
  },
  waiverTitle: { color: C.white, fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  waiverText: { color: C.grey, fontSize: 12.5, lineHeight: 19, marginBottom: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: C.greyD, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: C.lime, borderColor: C.lime },
  checkMark: { color: C.bg, fontSize: 12, fontWeight: '900' },
  checkLabel: { flex: 1, color: C.grey, fontSize: 13, lineHeight: 18 },
  error: { color: C.red, fontSize: 13, marginBottom: 12 },
  submitBtn: { backgroundColor: C.lime, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: C.bg, fontWeight: '800', fontSize: 15 },
  signOutRow: { alignItems: 'center', marginTop: 20 },
  signOutLink: { color: C.greyD, fontSize: 13, fontWeight: '600' },
});
