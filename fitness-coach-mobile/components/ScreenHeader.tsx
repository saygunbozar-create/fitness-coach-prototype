import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { useUnreadNotificationCount } from '../lib/queries';
import { C } from '../lib/theme';

export function ScreenHeader({ title, clientName, showPill }: { title: string; clientName?: string; showPill?: boolean }) {
  const { signOut, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const unreadQuery = useUnreadNotificationCount(profile?.id);
  const unread = unreadQuery.data ?? 0;
  return (
    <View style={[styles.row, { paddingTop: insets.top + 12 }]}>
      <View>
        <Text style={styles.brand}>COACHBOOK</Text>
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
        <Pressable style={styles.bell} onPress={() => router.push('/(app)/bildirimler')} hitSlop={8}>
          <Text style={styles.bellIcon}>🔔</Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
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
  bell: { position: 'relative' },
  bellIcon: { fontSize: 18 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: C.white },
});
