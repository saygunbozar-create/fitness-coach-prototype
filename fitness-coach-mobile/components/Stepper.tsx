import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '../lib/theme';

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
  step?: number;
}) {
  return (
    <View style={styles.stp}>
      <Pressable onPress={() => onChange(-step)} hitSlop={8}>
        <Text style={[styles.btn, { color: C.grey }]}>−</Text>
      </Pressable>
      <View style={styles.mid}>
        <Text style={styles.midValue}>{value}</Text>
        <Text style={styles.midLabel}>{label}</Text>
      </View>
      <Pressable onPress={() => onChange(step)} hitSlop={8}>
        <Text style={[styles.btn, { color: C.lime }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 9,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  btn: { fontSize: 18, fontWeight: '900', width: 26, textAlign: 'center' },
  mid: { alignItems: 'center' },
  midValue: { fontSize: 13, fontWeight: '700', color: C.white },
  midLabel: { fontSize: 11, color: C.greyD },
});
