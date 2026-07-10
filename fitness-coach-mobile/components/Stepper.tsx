import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  function commit() {
    setEditing(false);
    const parsed = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed !== value) onChange(parsed - value);
  }

  return (
    <View style={styles.stp}>
      <Pressable onPress={() => onChange(-step)} hitSlop={8}>
        <Text style={[styles.btn, { color: C.grey }]}>−</Text>
      </Pressable>
      <View style={styles.mid}>
        {editing ? (
          <TextInput
            style={styles.midInput}
            value={text}
            onChangeText={setText}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Pressable onPress={() => { setText(String(value)); setEditing(true); }}>
            <Text style={styles.midValue}>{value}</Text>
          </Pressable>
        )}
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
  mid: { alignItems: 'center', minWidth: 36 },
  midValue: { fontSize: 13, fontWeight: '700', color: C.white },
  midInput: {
    fontSize: 13,
    fontWeight: '700',
    color: C.white,
    padding: 0,
    minWidth: 36,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.lime,
  },
  midLabel: { fontSize: 11, color: C.greyD },
});
