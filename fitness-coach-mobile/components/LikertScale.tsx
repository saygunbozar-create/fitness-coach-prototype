import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '../lib/theme';

export function LikertScale({
  value,
  onChange,
  disabled,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={disabled}
          onPress={() => onChange(n)}
          style={[styles.dot, value === n && styles.dotOn, disabled && !( value === n) && styles.dotDisabled]}
          hitSlop={4}
        >
          <Text style={[styles.dotText, value === n && styles.dotTextOn]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  dot: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.edge,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: C.lime, borderColor: C.lime },
  dotDisabled: { opacity: 0.5 },
  dotText: { fontSize: 13, fontWeight: '700', color: C.grey },
  dotTextOn: { color: C.bg },
});
