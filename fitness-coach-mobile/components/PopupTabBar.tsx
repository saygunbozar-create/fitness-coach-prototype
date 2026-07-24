import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C } from '../lib/theme';

type TabConfig = { name: string; title: string; glyph: string; trainerOnly?: boolean };

const TAB_CONFIG: TabConfig[] = [
  { name: 'panel', title: 'Panel', glyph: '▦', trainerOnly: true },
  { name: 'antrenman', title: 'Antrenman', glyph: '⬢' },
  { name: 'beslenme', title: 'Beslenme', glyph: '◈' },
  { name: 'ilerleme', title: 'İlerleme', glyph: '↗' },
  { name: 'danisan', title: 'Danışan', glyph: '◉', trainerOnly: true },
  { name: 'odemeler', title: 'Ödemeler', glyph: '₺' },
  { name: 'ayarlar', title: 'Ayarlar', glyph: '⚙' },
];

// Sabit 7'li şeritin yerine tek bir kapsül geçiyor — o an açık olan bölümü gösterir, dokununca
// yukarı kayan bir seçim panosu açılır. Bildirimler/hesap-düzenle gibi href:null ekranlar
// TAB_CONFIG'te hiç yer almadığı için pano her zaman gerçek 7 bölümü listeler.
export function PopupTabBar({ state, navigation, insets, isTrainer }: BottomTabBarProps & { isTrainer: boolean }) {
  const [mounted, setMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const visibleTabs = TAB_CONFIG.filter((t) => !t.trainerOnly || isTrainer);
  const activeRouteName = state.routes[state.index]?.name;

  // Bildirimler gibi gizli ekranlar da aynı Tabs navigator'ının bir parçası; oraya geçildiğinde
  // state.index o gizli rotayı gösterir. Kapsülün etiketi o anda kaybolmasın diye, sadece
  // aktif rota görünür sekmelerden biriyse "gösterilen sekme"yi güncelliyoruz.
  const [displayedTabName, setDisplayedTabName] = useState(activeRouteName);
  useEffect(() => {
    if (visibleTabs.some((t) => t.name === activeRouteName)) {
      setDisplayedTabName(activeRouteName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRouteName]);

  const active = visibleTabs.find((t) => t.name === displayedTabName) ?? visibleTabs[0];

  function openSheet() {
    setMounted(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function closeSheet() {
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }

  function selectTab(route: (typeof state.routes)[number]) {
    const isFocused = route.name === activeRouteName;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
    closeSheet();
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <>
      <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={styles.trigger} onPress={openSheet}>
          <Text style={styles.triggerGlyph}>{active?.glyph}</Text>
          <Text style={styles.triggerLabel}>{active?.title}</Text>
          <Animated.View style={[styles.chev, { transform: [{ rotate }] }]}>
            <Text style={styles.chevGlyph}>▾</Text>
          </Animated.View>
        </Pressable>
      </View>

      <Modal visible={mounted} transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeSheet}>
            <Animated.View style={[StyleSheet.absoluteFillObject, styles.scrim, { opacity: progress }]} />
          </Pressable>
          <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 18, transform: [{ translateY }] }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>BİR BÖLÜM SEÇ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {visibleTabs.map((tab) => {
                const route = state.routes.find((r) => r.name === tab.name);
                if (!route) return null;
                const isActive = tab.name === displayedTabName;
                return (
                  <Pressable
                    key={tab.name}
                    onPress={() => selectTab(route)}
                    style={[styles.pill, isActive && styles.pillActive]}
                  >
                    <Text style={[styles.pillGlyph, isActive && styles.pillGlyphActive]}>{tab.glyph}</Text>
                    <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>{tab.title}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.card2, borderTopWidth: 1, borderTopColor: C.edge, paddingHorizontal: 14, paddingTop: 8 },
  trigger: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  triggerGlyph: { fontSize: 16, color: C.lime },
  triggerLabel: { fontSize: 14, fontWeight: '700', color: C.white, flex: 1 },
  chev: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  chevGlyph: { fontSize: 11, color: C.grey },
  modalRoot: { flex: 1 },
  scrim: { backgroundColor: 'rgba(4,6,10,0.72)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.card2,
    borderTopWidth: 1,
    borderTopColor: C.edge,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
  },
  handle: { width: 36, height: 4, borderRadius: 3, backgroundColor: C.edge, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.greyD, paddingHorizontal: 20, marginBottom: 12 },
  pillRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 6 },
  pill: {
    width: 76,
    alignItems: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.edge,
    backgroundColor: C.card,
  },
  pillActive: { borderColor: C.lime, backgroundColor: 'rgba(198,249,78,0.1)' },
  pillGlyph: { fontSize: 20, color: C.grey },
  pillGlyphActive: { color: C.lime },
  pillLabel: { fontSize: 10.5, fontWeight: '700', color: C.grey },
  pillLabelActive: { color: C.lime },
});
