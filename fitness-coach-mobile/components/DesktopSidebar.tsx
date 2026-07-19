import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useClient, useClientByProfile, useClients, useNotifications } from '../lib/queries';
import { useSelectedClient } from '../lib/selectedClient';
import { C } from '../lib/theme';

type NavItem = { path: string; label: string; glyph: string; trainerOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { path: '/(app)/panel', label: 'Panel', glyph: '▦', trainerOnly: true },
  { path: '/(app)/antrenman', label: 'Antrenman', glyph: '⬢' },
  { path: '/(app)/beslenme', label: 'Beslenme', glyph: '◈' },
  { path: '/(app)/ilerleme', label: 'İlerleme', glyph: '↗' },
  { path: '/(app)/danisan', label: 'Danışan', glyph: '◉', trainerOnly: true },
  { path: '/(app)/odemeler', label: 'Ödemeler', glyph: '₺' },
];

// Masaüstü web'e özel sol gezinme çubuğu — (app)/_layout.tsx içinde SADECE geniş web ekranında
// render edilir, mevcut alttaki Tabs çubuğunun yerini alır (native/telefon hiç etkilenmez).
export function DesktopSidebar() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const pathname = usePathname();
  const { selectedClientId } = useSelectedClient();

  const clientsQuery = useClients(isTrainer ? profile?.id : undefined);
  const ownClientQuery = useClientByProfile(!isTrainer ? profile?.id : undefined);
  const selectedClientQuery = useClient(isTrainer ? selectedClientId ?? undefined : undefined);
  const notificationsQuery = useNotifications(profile?.id);
  const unread = (notificationsQuery.data ?? []).filter((n) => !n.read).length;

  const activeClients = (clientsQuery.data ?? []).filter((c) => c.is_active).length;
  const contextClient = isTrainer ? selectedClientQuery.data : ownClientQuery.data;

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>CB</Text>
        </View>
        <View style={{ minWidth: 0 }}>
          <Text style={styles.brandName}>COACHBOOK</Text>
          <Text style={styles.brandRole}>{isTrainer ? 'Antrenör Paneli' : 'Danışan'}</Text>
        </View>
      </View>

      <View style={styles.nav}>
        {NAV_ITEMS.filter((item) => !item.trainerOnly || isTrainer).map((item) => {
          const active = pathname === item.path.replace('/(app)', '');
          return (
            <Pressable key={item.path} onPress={() => router.push(item.path as any)} style={[styles.navItem, active && styles.navItemActive]}>
              <Text style={[styles.navGlyph, active && styles.navGlyphActive]}>{item.glyph}</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}

        <Text style={styles.sectionLabel}>Hesap</Text>
        {(() => {
          const active = pathname === '/bildirimler';
          return (
            <Pressable onPress={() => router.push('/(app)/bildirimler')} style={[styles.navItem, active && styles.navItemActive]}>
              <Text style={[styles.navGlyph, active && styles.navGlyphActive]}>🔔</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>Bildirimler</Text>
              {unread > 0 && (
                <View style={[styles.badge, active && styles.badgeActive]}>
                  <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{unread}</Text>
                </View>
              )}
            </Pressable>
          );
        })()}
        {(() => {
          const active = pathname === '/ayarlar';
          return (
            <Pressable onPress={() => router.push('/(app)/ayarlar')} style={[styles.navItem, active && styles.navItemActive]}>
              <Text style={[styles.navGlyph, active && styles.navGlyphActive]}>⚙</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>Ayarlar</Text>
            </Pressable>
          );
        })()}
      </View>

      <View style={styles.foot}>
        {isTrainer && (
          <Pressable style={styles.clientSwitch} onPress={() => router.push('/(app)/danisan')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(contextClient?.name ?? '—').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={styles.whoName} numberOfLines={1}>
                {contextClient?.name ?? 'Danışan seç'}
              </Text>
              <Text style={styles.whoRole}>{activeClients} aktif danışan</Text>
            </View>
          </Pressable>
        )}
        <View style={styles.clientSwitch}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.name ?? '—').slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={styles.whoName} numberOfLines={1}>
              {profile?.name ?? '—'}
            </Text>
            <Text style={styles.whoRole}>{isTrainer ? 'Antrenör' : 'Danışan'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 250, backgroundColor: C.bgOuter, borderRightWidth: 1, borderRightColor: C.edge, paddingVertical: 22, paddingHorizontal: 14 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingBottom: 20, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: C.edge },
  brandMark: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { fontSize: 13, fontWeight: '900', color: C.bgOuter },
  brandName: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: C.white },
  brandRole: { fontSize: 10, color: C.greyD, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 },
  nav: { gap: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 9 },
  navItemActive: { backgroundColor: C.lime },
  navGlyph: { fontSize: 15, color: C.grey, width: 17, textAlign: 'center' },
  navGlyphActive: { color: C.bgOuter },
  navLabel: { fontSize: 13, fontWeight: '600', color: C.grey },
  navLabelActive: { color: C.bgOuter, fontWeight: '800' },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: C.greyD, paddingHorizontal: 12, paddingTop: 18, paddingBottom: 6 },
  badge: { marginLeft: 'auto', backgroundColor: C.red, borderRadius: 99, minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeActive: { backgroundColor: C.bgOuter },
  badgeText: { fontSize: 10, fontWeight: '800', color: C.white },
  badgeTextActive: { color: C.lime },
  foot: { marginTop: 'auto', paddingTop: 16, gap: 8 },
  clientSwitch: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderWidth: 1, borderColor: C.edge, borderRadius: 11, backgroundColor: C.card },
  avatar: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800', color: C.lime },
  whoName: { fontSize: 12.5, fontWeight: '700', color: C.white },
  whoRole: { fontSize: 10.5, color: C.greyD, marginTop: 1 },
});
