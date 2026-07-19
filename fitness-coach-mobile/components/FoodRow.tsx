import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, nf } from '../lib/theme';

export type MealItem = { food: string; unit: string; defaultQty: number; applied: boolean; kcal: number; p: number; k: number; y: number };

export function FoodRow({ item, onToggle, readOnly }: { item: MealItem; onToggle: () => void; readOnly?: boolean }) {
  return (
    <Pressable style={[styles.row, item.applied && styles.rowApplied]} onPress={readOnly ? undefined : onToggle} disabled={readOnly}>
      <View style={[styles.check, item.applied && styles.checkOn]}>{item.applied ? <Text style={styles.checkMark}>✓</Text> : null}</View>
      <View style={styles.info}>
        <Text style={[styles.name, item.applied && styles.nameApplied]} numberOfLines={1}>
          {item.food}
        </Text>
        <Text style={styles.detail}>
          {nf(item.defaultQty, item.defaultQty % 1 === 0 ? 0 : 1)} {item.unit} · {nf(item.kcal * item.defaultQty)} kcal · P {nf(item.p * item.defaultQty)} g
        </Text>
      </View>
      <Text style={[styles.status, { color: item.applied ? C.lime : C.greyD }]}>{item.applied ? 'Yendi' : 'Uygulanmadı'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.edge,
  },
  rowApplied: { borderColor: C.lime, backgroundColor: 'rgba(198,249,78,.06)' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.greyD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: C.lime, borderColor: C.lime },
  checkMark: { fontSize: 12, fontWeight: '900', color: C.bg },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '700', color: C.white },
  nameApplied: { color: C.lime },
  detail: { fontSize: 11, color: C.greyD, marginTop: 2 },
  status: { fontSize: 10, fontWeight: '700' },
});
