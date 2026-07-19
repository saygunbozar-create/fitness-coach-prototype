import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Client } from '../lib/types';
import { C, nf } from '../lib/theme';

export function ClientCard({
  client,
  active,
  onPress,
  onLongPress,
  onEdit,
  onToggleActive,
}: {
  client: Client;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onEdit?: () => void;
  onToggleActive?: () => void;
}) {
  const isLinked = client.status === 'active';
  return (
    <Pressable
      style={[styles.card, active && { borderColor: C.lime }, !client.is_active && styles.cardPaused]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{client.name?.[0] ?? '?'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{client.name}</Text>
        <Text style={styles.goal}>
          {client.goal} · {nf(client.start_weight, 1)} kg
        </Text>
      </View>
      <View style={styles.badgeCol}>
        <View style={[styles.status, { backgroundColor: isLinked ? 'rgba(198,249,78,.12)' : 'rgba(251,176,64,.12)' }]}>
          <Text style={[styles.statusText, { color: isLinked ? C.lime : C.orange }]}>{isLinked ? 'Aktif' : 'Bekliyor'}</Text>
        </View>
        {!client.is_active && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedBadgeText}>Pasif</Text>
          </View>
        )}
      </View>
      {onToggleActive && (
        <Pressable style={styles.iconBtn} onPress={onToggleActive} hitSlop={8}>
          <Text style={styles.iconBtnText}>{client.is_active ? '⏸' : '▶'}</Text>
        </Pressable>
      )}
      {onEdit && (
        <Pressable style={styles.iconBtn} onPress={onEdit} hitSlop={8}>
          <Text style={styles.iconBtnText}>✎</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.lime, fontWeight: '800' },
  info: { flex: 1, minWidth: 0 },
  name: { fontWeight: '700', color: C.white, fontSize: 14 },
  goal: { fontSize: 11, color: C.grey },
  cardPaused: { opacity: 0.55 },
  badgeCol: { alignItems: 'flex-end', gap: 4 },
  status: { borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pausedBadge: { borderRadius: 99, paddingHorizontal: 11, paddingVertical: 3, backgroundColor: 'rgba(255,99,99,.12)' },
  pausedBadgeText: { fontSize: 10, fontWeight: '700', color: C.red },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 13, color: C.lime },
});
