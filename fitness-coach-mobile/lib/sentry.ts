import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// DSN ayarlanmadıysa Sentry'yi hiç başlatma — geliştirme ortamında (veya DSN henüz
// eklenmeden yapılan derlemelerde) sessizce no-op olur, hata fırlatmaz.
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  });
}

export { Sentry };
