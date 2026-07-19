import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DesktopSidebar } from '../../components/DesktopSidebar';
import { useAuth } from '../../lib/auth';
import { registerPushToken } from '../../lib/notifications';
import { useClientByProfile, useClients } from '../../lib/queries';
import { useIsDesktopWeb } from '../../lib/responsive';
import { useSelectedClient } from '../../lib/selectedClient';
import { C } from '../../lib/theme';

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 16, color: focused ? C.lime : C.greyD }}>{glyph}</Text>;
}

function TabLabel({ text, focused }: { text: string; focused: boolean }) {
  return <Text style={{ fontSize: 10, fontWeight: '700', color: focused ? C.lime : C.greyD }}>{text}</Text>;
}

export default function AppLayout() {
  const { session, profile, loading, signOut } = useAuth();
  const { selectedClientId, setSelectedClientId } = useSelectedClient();
  const isTrainer = profile?.role === 'trainer';
  const isDesktopWeb = useIsDesktopWeb();

  const clientsQuery = useClients(isTrainer ? profile?.id : undefined);
  const ownClientQuery = useClientByProfile(!isTrainer ? profile?.id : undefined);

  useEffect(() => {
    if (!isTrainer || !clientsQuery.data) return;
    const stillExists = selectedClientId && clientsQuery.data.some((c) => c.id === selectedClientId);
    if (!stillExists) {
      // Handles both the initial pick and re-picking after the selected client got deleted.
      // Prefer an active client so the trainer doesn't land on a paused one by default.
      const active = clientsQuery.data.find((c) => c.is_active);
      setSelectedClientId((active ?? clientsQuery.data[0])?.id ?? null);
    }
  }, [isTrainer, selectedClientId, clientsQuery.data, setSelectedClientId]);

  useEffect(() => {
    if (!isTrainer && ownClientQuery.data && selectedClientId !== ownClientQuery.data.id) {
      setSelectedClientId(ownClientQuery.data.id);
    }
  }, [isTrainer, ownClientQuery.data, selectedClientId, setSelectedClientId]);

  useEffect(() => {
    if (profile?.id && Platform.OS !== 'web') {
      registerPushToken(profile.id).catch((e) => console.warn('Push token kaydı başarısız:', e?.message ?? e));
    }
  }, [profile?.id]);

  if (!isTrainer && profile && ownClientQuery.isError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>
          Hesabın henüz bir antrenöre bağlanmamış. Antrenörünün seni eklediği e-posta ile kayıt olduğundan emin ol,
          sonra çıkış yapıp tekrar giriş dene.
        </Text>
        <Pressable onPress={signOut} hitSlop={10}>
          <Text style={styles.signOutLink}>Çıkış yap</Text>
        </Pressable>
      </View>
    );
  }

  // Block rendering until the trainer's own client list has loaded at least once — otherwise a
  // trainer could land on a screen and tap "save" while selectedClientId is still null, which
  // every mutation rejects with a silent-looking "clientId eksik" error.
  const trainerNotReady = isTrainer && clientsQuery.isLoading;

  if (loading || trainerNotReady || (!isTrainer && profile && !selectedClientId)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  if (!session || !profile) return <Redirect href="/(auth)/login" />;

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isDesktopWeb ? { display: 'none' } : { backgroundColor: C.card2, borderTopColor: C.edge, height: 64, paddingTop: 6 },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="panel"
        options={{
          title: 'Panel',
          href: isTrainer ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon glyph="▦" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Panel" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="antrenman"
        options={{
          title: 'Antrenman',
          tabBarIcon: ({ focused }) => <TabIcon glyph="⬢" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Antrenman" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="beslenme"
        options={{
          title: 'Beslenme',
          tabBarIcon: ({ focused }) => <TabIcon glyph="◈" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Beslenme" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ilerleme"
        options={{
          title: 'İlerleme',
          tabBarIcon: ({ focused }) => <TabIcon glyph="↗" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="İlerleme" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="danisan"
        options={{
          title: 'Danışan',
          href: isTrainer ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon glyph="◉" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Danışan" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="odemeler"
        options={{
          title: 'Ödemeler',
          tabBarIcon: ({ focused }) => <TabIcon glyph="₺" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Ödemeler" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ayarlar"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ focused }) => <TabIcon glyph="⚙" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Ayarlar" focused={focused} />,
        }}
      />
      <Tabs.Screen name="bildirimler" options={{ href: null }} />
      <Tabs.Screen name="ilerleme-gecmis" options={{ href: null }} />
      <Tabs.Screen name="anket" options={{ href: null }} />
      <Tabs.Screen name="hesap-duzenle" options={{ href: null }} />
    </Tabs>
  );

  // Geniş masaüstü web'de alttaki Tabs çubuğu gizlenip yerine sol sidebar konuyor — Tabs
  // navigator'ının kendisi (rota/ekran state'i) hiç değişmiyor, sadece görsel çubuğu gizli.
  if (!isDesktopWeb) return tabs;
  return (
    <View style={styles.desktopShell}>
      <DesktopSidebar />
      <View style={styles.desktopContent}>{tabs}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.grey, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  signOutLink: { color: C.lime, fontSize: 14, fontWeight: '700' },
  desktopShell: { flex: 1, flexDirection: 'row', backgroundColor: C.bg },
  desktopContent: { flex: 1, minWidth: 0 },
});
