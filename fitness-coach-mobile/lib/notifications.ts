import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const PREFS_KEY = 'water_reminder_prefs';
const NOTIFICATION_IDS_KEY = 'water_reminder_notification_ids';

export type WaterReminderPrefs = { enabled: boolean; intervalHours: number };

const DEFAULT_PREFS: WaterReminderPrefs = { enabled: false, intervalHours: 2 };

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
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Su içme zamanı 💧',
      body: 'Formunu korumak için bir bardak su içmeyi unutma.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(intervalHours * 3600)),
      repeats: true,
    },
  });
  await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify([id]));
  await setWaterReminderPrefs({ enabled: true, intervalHours });
  return 'ok';
}

export async function disableWaterReminder() {
  await cancelScheduled();
  const prefs = await getWaterReminderPrefs();
  await setWaterReminderPrefs({ ...prefs, enabled: false });
}
