import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../lib/theme';

export function Panel({ title, right, children }: { title: string; right?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.dot} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {right ? <Text style={styles.right}>{right}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card2,
    borderBottomWidth: 1,
    borderBottomColor: C.edge,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.lime },
  title: { fontSize: 13, fontWeight: '700', color: C.white },
  right: { fontSize: 11, color: C.grey },
  body: { padding: 14 },
});
