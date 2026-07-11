import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Panel } from '../../components/Panel';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { useClientByProfile, useClients, useProfileById } from '../../lib/queries';
import { C } from '../../lib/theme';

export default function AyarlarScreen() {
  const { profile, session } = useAuth();
  const isTrainer = profile?.role === 'trainer';

  const ownClientQuery = useClientByProfile(!isTrainer ? profile?.id : undefined);
  const trainerProfileQuery = useProfileById(!isTrainer ? ownClientQuery.data?.trainer_id : undefined);
  const clientsQuery = useClients(isTrainer ? profile?.id : undefined);

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Ayarlar" />
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Üyelik Bilgileri" right={isTrainer ? 'Antrenör' : 'Danışan'}>
          <View style={styles.row}>
            <Text style={styles.label}>Ad Soyad</Text>
            <Text style={styles.value}>{profile?.name ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>E-posta</Text>
            <Text style={styles.value}>{session?.user.email ?? '—'}</Text>
          </View>
          {isTrainer ? (
            <View style={styles.row}>
              <Text style={styles.label}>Danışan Sayısı</Text>
              <Text style={styles.value}>{clientsQuery.data?.length ?? 0}</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Antrenör</Text>
              <Text style={styles.value}>{trainerProfileQuery.data?.name ?? '—'}</Text>
            </View>
          )}
        </Panel>

        <Panel title="Premium" right="🚀">
          <Text style={styles.premiumText}>Premium özellikler yakında burada olacak.</Text>
          <Text style={styles.premiumSub}>Gelişmiş raporlar, sınırsız danışan ve daha fazlası için çalışıyoruz.</Text>
        </Panel>

        <Panel title="Uygulama Hakkında" right="v1.0.0">
          <Text style={styles.aboutText}>Fitness Coach</Text>
          <Text style={styles.aboutSub}>
            Antrenör ve danışanların antrenman, beslenme ve ilerleme takibini tek yerde yönetmesi için geliştirildi.
          </Text>
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.edge,
  },
  label: { fontSize: 12, color: C.grey },
  value: { fontSize: 13, fontWeight: '700', color: C.white },
  premiumText: { fontSize: 14, fontWeight: '700', color: C.lime, marginBottom: 4 },
  premiumSub: { fontSize: 12, color: C.grey, lineHeight: 18 },
  aboutText: { fontSize: 15, fontWeight: '800', color: C.white, marginBottom: 6 },
  aboutSub: { fontSize: 12, color: C.grey, lineHeight: 18 },
});
