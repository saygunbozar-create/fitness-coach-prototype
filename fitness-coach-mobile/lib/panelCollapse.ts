import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Hangi panellerin KAPALI olduğunu tutar. Kapalı olanları saklıyoruz, açık olanları değil —
// yeni eklenen bir panel varsayılan olarak açık gelsin diye (kayıtta yoksa = açık).
//
// Modül seviyesinde store + useSyncExternalStore: [[mobileDrawer]] ve [[preLoginLang]] ile
// aynı desen. Panel bileşeni her ekranda ayrı ayrı mount olduğu için Context'e bağlamak
// mount sırasına bağımlılık yaratırdı.
const KEY = 'coachbook.panels.collapsed';

let collapsed = new Set<string>();
const listeners = new Set<() => void>();
// useSyncExternalStore aynı referansı görmek zorunda, yoksa sonsuz render döngüsüne girer.
// Her değişimde yeni bir dizi üretip onu sabit tutuyoruz.
let snapshot: string[] = [];

function emitChange() {
  snapshot = Array.from(collapsed);
  listeners.forEach((l) => l());
}

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        collapsed = new Set(list.filter((x) => typeof x === 'string'));
        emitChange();
      }
    } catch {
      // Bozuk kayıt: yok say, hepsi açık başlasın.
    }
  })
  .catch(() => {});

export function togglePanel(id: string) {
  if (collapsed.has(id)) collapsed.delete(id);
  else collapsed.add(id);
  emitChange();
  AsyncStorage.setItem(KEY, JSON.stringify(Array.from(collapsed))).catch(() => {});
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return snapshot;
}

export function useCollapsedPanels(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
