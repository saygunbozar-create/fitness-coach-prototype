import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const PREFS_KEY = 'water_reminder_prefs';
const NOTIFICATION_IDS_KEY = 'water_reminder_notification_ids';

export type WaterReminderPrefs = { enabled: boolean; intervalHours: number };

const DEFAULT_PREFS: WaterReminderPrefs = { enabled: false, intervalHours: 2 };

// Hatırlatmalar yalnızca bu saat aralığında gönderilir — gece rahatsız etmemesi için.
const WATER_WINDOW_START_HOUR = 8;
const WATER_WINDOW_END_HOUR = 22;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function initNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('water-reminder', {
      name: 'Su İçme Hatırlatıcısı',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function getWaterReminderPrefs(): Promise<WaterReminderPrefs> {
  const raw = await AsyncStorage.getItem(PREFS_KEY);
  if (!raw) return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

async function setWaterReminderPrefs(prefs: WaterReminderPrefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

async function cancelScheduled() {
  const raw = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
  if (raw) {
    const ids: string[] = JSON.parse(raw);
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }
  await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
}

export async function enableWaterReminder(intervalHours: number): Promise<'ok' | 'denied' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return 'denied';

  await cancelScheduled();

  // Tek bir "her X saatte tekrarla" bildirimi yerine, 08:00–22:00 aralığındaki her
  // saat için ayrı bir günlük (DAILY) bildirim kuruyoruz. Android'de tekrarlayan
  // TIME_INTERVAL bildirimleri güvenilir çalışmıyor; sabit saatli DAILY tetikleyiciler
  // her iki platformda da tutarlı çalışıyor, ve gece saatlerine hiç düşmüyor.
  const hours: number[] = [];
  for (let h = WATER_WINDOW_START_HOUR; h <= WATER_WINDOW_END_HOUR; h += intervalHours) {
    hours.push(h);
  }

  const ids = await Promise.all(
    hours.map((hour) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Su içme zamanı 💧',
          body: 'Formunu korumak için bir bardak su içmeyi unutma.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
          channelId: Platform.OS === 'android' ? 'water-reminder' : undefined,
        },
      })
    )
  );
  await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  await setWaterReminderPrefs({ enabled: true, intervalHours });
  return 'ok';
}

export async function disableWaterReminder() {
  await cancelScheduled();
  const prefs = await getWaterReminderPrefs();
  await setWaterReminderPrefs({ ...prefs, enabled: false });
}

export async function registerPushToken(profileId: string) {
  if (Platform.OS === 'web') return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  if (tokenResponse.data) {
    const { error } = await supabase.from('profiles').update({ push_token: tokenResponse.data }).eq('id', profileId);
    if (error) console.warn('Push token kaydedilemedi:', error.message);
  }
}
