import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../../lib/queries';
import { C } from '../../lib/theme';
import type { AppNotification } from '../../lib/types';

function useOnErr() {
  const t = useT();
  return (title: string) => (e: any) => showAlert(title, e.message ?? t('common.error'));
}

function relativeTime(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('bildirimler.time_just_now');
  if (mins < 60) return t('bildirimler.time_minutes_ago', { mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('bildirimler.time_hours_ago', { hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('bildirimler.time_days_ago', { days });
  const [y, m, dd] = iso.slice(0, 10).split('-');
  return `${dd}.${m}.${y}`;
}

const TYPE_ICON: Record<string, string> = {
  checkin_submitted: '📋',
  checkin_reminder: '⏰',
  survey_reminder: '📝',
  session_completed: '✅',
  program_shared: '📤',
  lesson_reminder: '⏰',
  payment_due: '💰',
  payment_added: '💳',
  payment_paid: '🧾',
  lesson_completed: '📓',
  package_added: '📦',
  client_birthday: '🎉',
};

export default function BildirimlerScreen() {
  const t = useT();
  const onErr = useOnErr();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const notificationsQuery = useNotifications(profile?.id);
  const markRead = useMarkNotificationRead(profile?.id);
  const markAllRead = useMarkAllNotificationsRead(profile?.id);

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  function renderItem(n: AppNotification) {
    return (
      <Pressable
        key={n.id}
        style={[styles.row, !n.read && styles.rowUnread]}
        onPress={() => !n.read && markRead.mutate(n.id, { onError: onErr(t('bildirimler.err_mark_read')) })}
      >
        <Text style={styles.icon}>{TYPE_ICON[n.type] ?? '🔔'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{n.title}</Text>
          {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
          <Text style={styles.time}>{relativeTime(n.created_at, t)}</Text>
        </View>
        {!n.read && <View style={styles.dot} />}
      </Pressable>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>{t('hesap.back')}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('nav.bildirimler')}</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={() => markAllRead.mutate(undefined, { onError: onErr(t('bildirimler.err_mark_read')) })} hitSlop={8}>
            <Text style={styles.markAll}>{t('bildirimler.mark_all_read')}</Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {notifications.length === 0 ? (
          <Text style={styles.empty}>{t('bildirimler.empty')}</Text>
        ) : (
          notifications.map(renderItem)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.edge,
  },
  back: { fontSize: 13, fontWeight: '700', color: C.grey },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.white },
  markAll: { fontSize: 11, fontWeight: '700', color: C.lime },
  content: { padding: 16 },
  empty: { color: C.greyD, fontSize: 12, textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  rowUnread: { borderColor: C.lime, backgroundColor: C.card2 },
  icon: { fontSize: 20 },
  title: { fontSize: 13, fontWeight: '700', color: C.white },
  body: { fontSize: 12, color: C.grey, marginTop: 2 },
  time: { fontSize: 10, color: C.greyD, marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.lime, marginTop: 4 },
});
