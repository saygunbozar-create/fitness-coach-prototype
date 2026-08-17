import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env değişkenleri eksik. .env dosyasına EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY ekleyin.'
  );
}

// Şifre sıfırlama linkiyle mi gelindi? Bu kontrol createClient'TAN ÖNCE yapılmak zorunda:
// detectSessionInUrl, istemci kurulurken adresteki hash'i okuyup TEMİZLİYOR. React ağacı
// mount olup onAuthStateChange'e abone olduğunda 'PASSWORD_RECOVERY' olayı çoktan geçmiş
// oluyor — yani tek başına olaya güvenmek yarışı kaybediyor.
//
// Neden gerekli: Supabase, yönlendirme adresi izin listesinde değilse onu yok sayıp Site URL'e
// (sitenin köküne) atıyor. O durumda kullanıcı şifre ekranı yerine giriş/panel ekranında
// buluyordu. Bu bayrak sayesinde hangi adrese düşerse düşsün şifre ekranına yönlendiriyoruz.
export const initialUrlIsRecovery = (() => {
  try {
    if (typeof window === 'undefined' || !window.location) return false;
    return /[#&?]type=recovery\b/.test(`${window.location.hash}${window.location.search}`);
  } catch {
    return false;
  }
})();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // true olması sadece web derlemesinde bir şey yapar (Supabase JS bunu native'de
    // window/URL olmadığı için zaten no-op geçer) — şifre sıfırlama linkindeki
    // access_token'ı URL'den otomatik okuyup oturum açması için gerekli.
    detectSessionInUrl: true,
  },
});
