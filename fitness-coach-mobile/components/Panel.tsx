import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCollapsedPanels, togglePanel } from '../lib/panelCollapse';
import { C } from '../lib/theme';

export function Panel({
  title,
  right,
  children,
  // Kapalı/açık durumu bu kimlikle diske yazılıyor. Verilmezse başlık kullanılıyor —
  // pratikte yeterli, tek yan etkisi kullanıcı dil değiştirirse o panelin bir kereliğine
  // açık gelmesi (başlık metni değiştiği için kayıt eşleşmiyor).
  id,
  // Ekranın tamamını kaplayan tek panelli yerlerde kapatmak anlamsız olabiliyor.
  collapsible = true,
}: {
  title: string;
  right?: string;
  children: ReactNode;
  id?: string;
  collapsible?: boolean;
}) {
  const collapsedList = useCollapsedPanels();
  const key = id ?? title;
  const isCollapsed = collapsible && collapsedList.includes(key);

  const header = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.dot} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.headerRight}>
        {right ? <Text style={styles.right}>{right}</Text> : null}
        {collapsible ? <Text style={styles.chevron}>{isCollapsed ? '▾' : '▴'}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      {collapsible ? (
        <Pressable
          onPress={() => togglePanel(key)}
          accessibilityRole="button"
          accessibilityState={{ expanded: !isCollapsed }}
          accessibilityLabel={title}
        >
          {header}
        </Pressable>
      ) : (
        header
      )}
      {/* Kapalıyken içerik hiç render EDİLMİYOR (gizlenmiyor) — böylece kapalı paneller
          ölçüm/render maliyeti de getirmiyor. Sorgular hook'larda olduğu için veri akışı
          etkilenmiyor, sadece görsel ağaç küçülüyor. */}
      {!isCollapsed && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.lime },
  title: { fontSize: 13, fontWeight: '700', color: C.white, flexShrink: 1 },
  right: { fontSize: 11, color: C.grey },
  // Panellerin dokunulabilir olduğunu gösteren tek ipucu bu, o yüzden bilerek soluk değil.
  chevron: { fontSize: 13, fontWeight: '700', color: C.lime, width: 14, textAlign: 'center' },
  body: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: C.edge,
  },
});
