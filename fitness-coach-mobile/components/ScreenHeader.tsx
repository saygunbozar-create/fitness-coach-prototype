import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';

export function ScreenHeader({ title, clientName, showPill }: { title: string; clientName?: string; showPill?: boolean }) {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + 12 }]}>
      <View>
        <Text style={styles.brand}>FITNESS COACH</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.right}>
        {showPill && clientName ? (
          <Pressable style={styles.pill} onPress={() => router.push('/(app)/danisan')}>
            <Text style={styles.pillText}>{clientName}</Text>
          </Pressable>
        ) : clientName ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{clientName}</Text>
          </View>
        ) : null}
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={styles.logout}>Çıkış</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  brand: { fontSize: 10, fontWeight: '700', letterSpacing: 3, color: C.greyD },
  title: { fontSize: 19, fontWeight: '800', color: C.white },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { backgroundColor: C.card, borderWidth: 1, borderColor: C.edge, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7 },
  pillText: { fontSize: 12, fontWeight: '700', color: C.lime },
  logout: { fontSize: 11, fontWeight: '700', color: C.greyD },
});
