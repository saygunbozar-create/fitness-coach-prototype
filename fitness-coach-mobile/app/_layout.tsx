import { Kalam_400Regular, Kalam_700Bold, useFonts } from '@expo-google-fonts/kalam';
import { QueryClientProvider } from '@tanstack/react-query';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { Stack, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { initNotificationChannel } from '../lib/notifications';
import { queryClient } from '../lib/queryClient';
import { useIsDesktopWeb } from '../lib/responsive';
import { SelectedClientProvider } from '../lib/selectedClient';
import { Sentry } from '../lib/sentry';
import { C } from '../lib/theme';

// Bu rotalarda (giriş, kayıt, şifre sıfırlama) masaüstünde bile her zaman dar/ortalı "telefon
// sütunu" gösteriliyor — sidebar'lı geniş yerleşim sadece giriş yapılmış (app) ekranlarına özel.
const ALWAYS_NARROW_PATHS = new Set(['/', '/login', '/signup-trainer', '/signup-client', '/forgot-password', '/reset-password']);

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Kalam_400Regular, Kalam_700Bold });
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const pathname = usePathname();
  const isDesktopWeb = useIsDesktopWeb();
  const wide = isDesktopWeb && !ALWAYS_NARROW_PATHS.has(pathname);

  useEffect(() => {
    if (Platform.OS !== 'web') initNotificationChannel();
  }, []);

  // Tam ekran (immersive) deneyim: Android'de alt gezinme çubuğunu da gizliyoruz — üst durum
  // çubuğu (saat/pil/bildirim) zaten aşağıdaki <StatusBar hidden> ile her iki platformda da
  // gizleniyor. "overlay-swipe": kenardan kaydırınca çubuk geçici olarak görünüp otomatik
  // kayboluyor (Android'in standart tam ekran davranışı), navigasyonu engellemiyor.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!fontsLoaded && !fontError && !fontTimedOut) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const app = (
    <>
      <StatusBar style="light" hidden={Platform.OS !== 'web'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
    </>
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SelectedClientProvider>
            {/* Web'de iki farklı sarmalayıcı: dar rotalarda (giriş/kayıt) veya dar ekranlarda
                hep "telefon sütunu" (ortalı, 480px) gösterilir — önceki davranış aynen korunur.
                Geniş ekranda (app) ekranları sarmalanmadan tam genişlik alır; sidebar'lı geniş
                yerleşimi (app)/_layout.tsx kendi içinde kuruyor. Dış View her durumda flex:1 +
                arkaplan veriyor ki hiçbir modda beyaz an bile görünmesin. Native'de hiçbiri
                render edilmiyor, mobil uygulama tamamen etkilenmiyor. */}
            {Platform.OS !== 'web' ? (
              app
            ) : (
              <View style={[styles.webOuter, wide && styles.webOuterWide]}>{wide ? app : <View style={styles.webInner}>{app}</View>}</View>
            )}
          </SelectedClientProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webOuter: { flex: 1, alignItems: 'center', backgroundColor: C.bgOuter },
  webOuterWide: { alignItems: 'stretch', backgroundColor: C.bg },
  webInner: { flex: 1, width: '100%', maxWidth: 480 },
});

export default Sentry.wrap(RootLayout);
