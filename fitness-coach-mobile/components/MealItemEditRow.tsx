import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthField } from './AuthField';
import { C } from '../lib/theme';

export type MealItemFormValue = {
  food: string;
  unit: string;
  kcal: number;
  p: number;
  k: number;
  y: number;
  default_qty: number;
};

const empty: MealItemFormValue = { food: '', unit: 'porsiyon', kcal: 0, p: 0, k: 0, y: 0, default_qty: 1 };

export function MealItemEditRow({
  initial,
  onSave,
  onDelete,
  onCancel,
  saving,
}: {
  initial: MealItemFormValue | null;
  onSave: (value: MealItemFormValue) => void;
  onDelete?: () => void;
  onCancel?: () => void;
  saving?: boolean;
}) {
  const [form, setForm] = useState<MealItemFormValue>(initial ?? empty);

  function num(s: string) {
    const v = parseFloat(s.replace(',', '.'));
    return Number.isNaN(v) ? 0 : v;
  }

  return (
    <View style={styles.card}>
      <AuthField label="Besin" value={form.food} onChangeText={(v) => setForm((f) => ({ ...f, food: v }))} placeholder="Ör. Yulaf Ezmesi 60 g" />
      <View style={styles.row}>
        <View style={styles.half}>
          <AuthField label="Birim" value={form.unit} onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))} placeholder="porsiyon" />
        </View>
        <View style={styles.half}>
          <AuthField
            label="Varsayılan Miktar"
            value={String(form.default_qty)}
            onChangeText={(v) => setForm((f) => ({ ...f, default_qty: num(v) }))}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.quarter}>
          <AuthField label="kcal" value={String(form.kcal)} onChangeText={(v) => setForm((f) => ({ ...f, kcal: num(v) }))} keyboardType="decimal-pad" />
        </View>
        <View style={styles.quarter}>
          <AuthField label="P (g)" value={String(form.p)} onChangeText={(v) => setForm((f) => ({ ...f, p: num(v) }))} keyboardType="decimal-pad" />
        </View>
        <View style={styles.quarter}>
          <AuthField label="K (g)" value={String(form.k)} onChangeText={(v) => setForm((f) => ({ ...f, k: num(v) }))} keyboardType="decimal-pad" />
        </View>
        <View style={styles.quarter}>
          <AuthField label="Y (g)" value={String(form.y)} onChangeText={(v) => setForm((f) => ({ ...f, y: num(v) }))} keyboardType="decimal-pad" />
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: C.lime }]}
          onPress={() => onSave(form)}
          disabled={saving || !form.food.trim()}
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
  half: { flex: 1 },
  quarter: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '700' },
});
