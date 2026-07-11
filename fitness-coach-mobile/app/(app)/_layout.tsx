import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../lib/auth';
import { registerPushToken } from '../../lib/notifications';
import { useClientByProfile, useClients } from '../../lib/queries';
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

  const clientsQuery = useClients(isTrainer ? profile?.id : undefined);
  const ownClientQuery = useClientByProfile(!isTrainer ? profile?.id : undefined);

  useEffect(() => {
    if (!isTrainer || !clientsQuery.data) return;
    const stillExists = selectedClientId && clientsQuery.data.some((c) => c.id === selectedClientId);
    if (!stillExists) {
      // Handles both the initial pick and re-picking after the selected client got deleted.
      setSelectedClientId(clientsQuery.data[0]?.id ?? null);
    }
  }, [isTrainer, selectedClientId, clientsQuery.data, setSelectedClientId]);

  useEffect(() => {
    if (!isTrainer && ownClientQuery.data && selectedClientId !== ownClientQuery.data.id) {
      setSelectedClientId(ownClientQuery.data.id);
    }
  }, [isTrainer, ownClientQuery.data, selectedClientId, setSelectedClientId]);

  useEffect(() => {
    if (profile?.id && Platform.OS !== 'web') registerPushToken(profile.id);
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card2, borderTopColor: C.edge, height: 64, paddingTop: 6 },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="panel"
        options={{
          title: 'Panel',
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.grey, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  signOutLink: { color: C.lime, fontSize: 14, fontWeight: '700' },
});
