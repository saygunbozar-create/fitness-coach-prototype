import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Client } from '../lib/types';
import { C, nf } from '../lib/theme';

export function ClientCard({
  client,
  active,
  onPress,
  onLongPress,
}: {
  client: Client;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const isActive = client.status === 'active';
  return (
    <Pressable style={[styles.card, active && { borderColor: C.lime }]} onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{client.name[0]}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{client.name}</Text>
        <Text style={styles.goal}>
          {client.goal} · {nf(client.start_weight, 1)} kg
        </Text>
      </View>
      <View style={[styles.status, { backgroundColor: isActive ? 'rgba(198,249,78,.12)' : 'rgba(251,176,64,.12)' }]}>
        <Text style={[styles.statusText, { color: isActive ? C.lime : C.orange }]}>{isActive ? 'Aktif' : 'Bekliyor'}</Text>
      </View>
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
  status: { borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
