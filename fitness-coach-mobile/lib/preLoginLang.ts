import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { Lang } from './i18n';

// Oturum açmadan önce hangi dilin gösterileceği. Normalde cihaz dilinden türetiliyor
// (bkz. getDeviceLang), ama cihazın bildirdiği dil her zaman kullanıcının okumak istediği
// dil olmuyor — bu yüzden giriş ekranındaki TR/EN düğmesi buraya yazıyor ve elle yapılan
// seçim cihaz dilini eziyor. Oturum açıldıktan sonra `profiles.language` devralıyor, yani
// bu değer yalnızca login/signup/şifre sıfırlama ekranlarını etkiliyor.
//
// Modül seviyesinde store + useSyncExternalStore: [[mobileDrawer]] ile aynı desen. Bir
// Context'e gerek yok, çünkü seçim tek bir yerden yapılıp her yerden okunuyor.
const KEY = 'coachbook.prelogin.lang';

let override: Lang | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((l) => l());
}

// Uygulama açılırken diskteki seçimi geri yükle. Bilerek await edilmiyor: değer geldiğinde
// emitChange() zaten yeniden render tetikliyor. Auth oturumu da AsyncStorage'dan okunduğu
// için giriş ekranı pratikte bu okuma bittikten sonra görünüyor.
AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === 'tr' || v === 'en') {
      override = v;
      emitChange();
    }
  })
  .catch(() => {});

export function setPreLoginLang(lang: Lang) {
  override = lang;
  emitChange();
  AsyncStorage.setItem(KEY, lang).catch(() => {});
}

export function getPreLoginLang(): Lang | null {
  return override;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return override;
}

export function usePreLoginLang(): Lang | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
