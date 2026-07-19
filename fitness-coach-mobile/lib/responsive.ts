import { Platform, useWindowDimensions } from 'react-native';

// Masaüstü sidebar+kart-ızgara yerleşimi SADECE web'de ve bu genişlikten geniş ekranlarda
// devreye giriyor — native (telefon) tarafı bu dosyaya hiç dokunmadan aynen çalışmaya devam eder.
export const DESKTOP_BREAKPOINT = 900;

export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
}
