import { useSyncExternalStore } from 'react';

// Tetikleyici (hamburger ikonu) her ekranın kendi ScreenHeader'ında, gerçek çekmece ise tek bir
// yerde ((app)/_layout.tsx) render ediliyor — ikisi farklı component ağaçlarında olduğu için
// açık/kapalı durumunu paylaşmaları gerekiyor. Bunu bir React Context/Provider yerine modül
// seviyesinde bir store ile yapıyoruz: Tabs navigator'ın ekranları lazy mount ederken/bir sekme
// ilk kez ziyaret edilirken oluşan mount sırası, bir Provider'a bağımlı olsaydı ekran bazen
// Provider'ın DIŞINDA render edilmiş gibi davranıp hataya yol açıyordu (çekmece kapanmadan
// ekranda takılı kalıyordu). Modül seviyesi store bu mount sırası sorunlarından tamamen bağımsız.
let open = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((l) => l());
}

export function openMobileDrawer() {
  open = true;
  emitChange();
}

export function closeMobileDrawer() {
  open = false;
  emitChange();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return open;
}

export function useMobileDrawerOpen() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
