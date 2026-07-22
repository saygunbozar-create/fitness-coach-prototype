import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpTrainer: (email: string, password: string, name: string, consent: boolean) => Promise<{ error: string | null }>;
  signUpClient: (email: string, password: string, name: string, consent: boolean) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Iki loadProfile çağrısı üst üste (hızlı ard arda çıkış/giriş) yarışırsa, geç dönen değil
  // SON BAŞLATILAN kazanmalı — yoksa eski kullanıcının profili ekranda kalabilir.
  const loadSeq = useRef(0);
  // profile'ı closure içinde güncel okumak için ayna ref (soğuk açılış yeniden-deneme kararı için).
  const profileRef = useRef<Profile | null>(null);
  const setProfileSafe = (p: Profile | null) => {
    profileRef.current = p;
    setProfile(p);
  };

  async function loadProfile(userId: string, attempt = 0) {
    const seq = ++loadSeq.current;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (seq !== loadSeq.current) return;
      if (error) throw error;
      setProfileSafe(data as Profile);
    } catch (e: any) {
      if (seq !== loadSeq.current) return;
      // Geçerli bir oturum için profil satırı HER ZAMAN vardır (handle_new_user trigger'ı
      // oluşturur). Dolayısıyla buradaki hata = geçici ağ/servis sorunu, "profil yok" DEĞİL.
      // 1) Mevcut profili SIFIRLAMA — aksi halde oturum ortasında token yenilenirken bir anlık
      //    hata kullanıcıyı giriş ekranına atardı.
      // 2) Profil henüz hiç yüklenmediyse (soğuk açılış / çevrimdışı) sınırlı sayıda yeniden dene;
      //    aksi halde kullanıcı elinde geçerli oturum varken giriş ekranında takılı kalırdı.
      console.warn('Profil yüklenemedi (geçici):', e?.message ?? e);
      if (!profileRef.current && attempt < 5) {
        setTimeout(() => {
          // Sadece bu yükleme hâlâ en güncelse ve profil hâlâ boşsa yeniden dene.
          if (seq === loadSeq.current && !profileRef.current) loadProfile(userId, attempt + 1);
        }, 3000);
      }
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        // Don't toggle `loading` here — this fires on routine events too (token refresh,
        // tab refocus), and flipping it would unmount the whole tab navigator each time.
        loadProfile(newSession.user.id);
      } else {
        // Çıkış: loadSeq'i artır ki önceki kullanıcının hâlâ uçuşta olan loadProfile'ı geri
        // dönüp profili yeniden set edemesin (bekleyen yeniden-denemeler de iptal olsun).
        loadSeq.current++;
        setProfileSafe(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUpTrainer(email: string, password: string, name: string, consent: boolean) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'trainer', name, consent } },
    });
    return { error: error?.message ?? null };
  }

  async function signUpClient(email: string, password: string, name: string, consent: boolean) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'client', name, consent } },
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUpTrainer, signUpClient, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
