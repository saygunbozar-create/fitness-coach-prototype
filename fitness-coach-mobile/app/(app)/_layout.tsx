import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
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
  const { session, profile, loading } = useAuth();
  const { selectedClientId, setSelectedClientId } = useSelectedClient();
  const isTrainer = profile?.role === 'trainer';

  const clientsQuery = useClients(isTrainer ? profile?.id : undefined);
  const ownClientQuery = useClientByProfile(!isTrainer ? profile?.id : undefined);

  useEffect(() => {
    if (isTrainer && !selectedClientId && clientsQuery.data && clientsQuery.data.length > 0) {
      setSelectedClientId(clientsQuery.data[0].id);
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

  if (loading) {
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
});
