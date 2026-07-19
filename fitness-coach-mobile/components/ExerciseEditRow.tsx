import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthField } from './AuthField';
import { C } from '../lib/theme';

export type ExerciseFormValue = { ex: string; grp: string; set_count: number; rep_count: number; kg: number };
export type ExerciseSuggestion = { name: string; grp: string };

const empty: ExerciseFormValue = { ex: '', grp: '', set_count: 3, rep_count: 10, kg: 0 };

export function ExerciseEditRow({
  initial,
  onSave,
  onDelete,
  onCancel,
  saving,
  suggestions,
}: {
  initial: ExerciseFormValue | null;
  onSave: (value: ExerciseFormValue) => void;
  onDelete?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  suggestions?: ExerciseSuggestion[];
}) {
  const [form, setForm] = useState<ExerciseFormValue>(initial ?? empty);

  function num(s: string) {
    const v = parseFloat(s.replace(',', '.'));
    return Number.isNaN(v) ? 0 : v;
  }

  const matches = useMemo(() => {
    if (initial || !suggestions) return [];
    const q = form.ex.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 8);
    return suggestions.filter((s) => s.name.toLowerCase().includes(q) && s.name.toLowerCase() !== q).slice(0, 8);
  }, [initial, suggestions, form.ex]);

  return (
    <View style={styles.card}>
      <AuthField label="Egzersiz" value={form.ex} onChangeText={(v) => setForm((f) => ({ ...f, ex: v }))} placeholder="Ör. Bench Press" />
      {matches.length > 0 && (
        <View style={styles.suggestBlock}>
          <Text style={styles.suggestLabel}>{form.ex.trim() ? 'Öneriler' : 'Kütüphaneden seç'}</Text>
          <View style={styles.suggestRow}>
            {matches.map((s) => (
              <Pressable key={s.name} style={styles.suggestChip} onPress={() => setForm((f) => ({ ...f, ex: s.name, grp: s.grp }))}>
                <Text style={styles.suggestText}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <AuthField label="Kas Grubu" value={form.grp} onChangeText={(v) => setForm((f) => ({ ...f, grp: v }))} placeholder="Ör. Göğüs" />
      <View style={styles.row}>
        <View style={styles.third}>
          <AuthField
            label="Set"
            value={String(form.set_count)}
            onChangeText={(v) => setForm((f) => ({ ...f, set_count: num(v) }))}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.third}>
          <AuthField
            label="Tekrar"
            value={String(form.rep_count)}
            onChangeText={(v) => setForm((f) => ({ ...f, rep_count: num(v) }))}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.third}>
          <AuthField label="kg" value={String(form.kg)} onChangeText={(v) => setForm((f) => ({ ...f, kg: num(v) }))} keyboardType="decimal-pad" />
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: C.lime }]}
          onPress={() => onSave(form)}
          disabled={saving || !form.ex.trim()}
        >
          <Text style={[styles.actionText, { color: C.bg }]}>Kaydet</Text>
        </Pressable>
        {onDelete && (
          <Pressable style={[styles.actionBtn, { backgroundColor: C.card }]} onPress={onDelete} disabled={saving}>
            <Text style={[styles.actionText, { color: C.red }]}>Sil</Text>
          </Pressable>
        )}
        {onCancel && (
          <Pressable style={[styles.actionBtn, { backgroundColor: C.card }]} onPress={onCancel} disabled={saving}>
            <Text style={[styles.actionText, { color: C.grey }]}>Vazgeç</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card2, borderRadius: 12, padding: 11, marginBottom: 10, borderWidth: 1, borderColor: C.edge },
  row: { flexDirection: 'row', gap: 8 },
  third: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '700' },
  suggestBlock: { marginTop: -8, marginBottom: 10 },
  suggestLabel: { fontSize: 10, color: C.greyD, marginBottom: 5, fontWeight: '700' },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestChip: { backgroundColor: C.card, borderWidth: 1, borderColor: C.edge, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  suggestText: { fontSize: 11, color: C.lime, fontWeight: '600' },
});
