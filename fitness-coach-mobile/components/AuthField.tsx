import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { C } from '../lib/theme';

export function AuthField({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.greyD}
        style={styles.input}
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: C.grey, marginBottom: 6 },
  input: {
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.white,
    fontSize: 14,
  },
});
