import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, nf } from '../lib/theme';

export type MealItem = { food: string; qty: number; kcal: number; p: number; k: number; y: number };

export function FoodRow({ item, onChange }: { item: MealItem; onChange: (delta: number) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.food}
        </Text>
        <Text style={styles.detail}>
          {nf(item.kcal * item.qty)} kcal · P {nf(item.p * item.qty)} g
        </Text>
      </View>
      <View style={styles.qty}>
        <Pressable onPress={() => onChange(-0.5)} hitSlop={8}>
          <Text style={[styles.btn, { color: C.grey }]}>−</Text>
        </Pressable>
        <Text style={styles.qtyValue}>{item.qty}</Text>
        <Pressable onPress={() => onChange(0.5)} hitSlop={8}>
          <Text style={[styles.btn, { color: C.lime }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  info: { flexShrink: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '700', color: C.white },
  detail: { fontSize: 11, color: C.greyD },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  btn: {
    width: 27,
    height: 27,
    lineHeight: 27,
    textAlign: 'center',
    borderRadius: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    fontWeight: '900',
    fontSize: 15,
    overflow: 'hidden',
  },
  qtyValue: { fontSize: 13, fontWeight: '700', color: C.lime, minWidth: 26, textAlign: 'center' },
});
