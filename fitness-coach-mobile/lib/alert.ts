import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

// react-native-web'de Alert.alert() tamamen boş bir no-op'tur (RN Web kaynağında
// `static alert() {}`), yani web'de hiçbir onay/sil/bitir diyaloğu çalışmıyordu.
// Bu sarmalayıcı web'de window.confirm/alert kullanır, native'de gerçek Alert.alert'i çağırır.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }
  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const confirmBtn = buttons.find((b) => b !== cancelBtn);
  const ok = window.confirm(text);
  if (ok) confirmBtn?.onPress?.();
  else cancelBtn?.onPress?.();
}
