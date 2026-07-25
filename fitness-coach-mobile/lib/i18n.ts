import { useAuth } from './auth';

// Çoklu dil desteği — pilot aşaması, sadece Ayarlar ekranı kapsıyor (bkz. proje notları).
// Her kullanıcı kendi dilini bağımsız seçer (profiles.language), tek bir global ayar değil.
// Arapça şimdilik SADECE metin çevirisi içeriyor — sağdan sola (RTL) yerleşim mirror'lanmıyor,
// bu ayrı, daha büyük bir karar olarak bekliyor (bkz. proje notları).
export type Lang = 'tr' | 'en' | 'ar';

// Arapça çevirileri hazır (aşağıdaki `ar` sözlüğü) ama RTL (sağdan sola) yerleşim kararı
// verilene kadar dil seçicide GÖSTERİLMİYOR — trainer'ın kendi kararı: "şimdilik Arapçayı
// bekletelim, sadece TR/EN ile devam edelim" (2026-07-25). RTL netleşince ALL_LANGUAGES'tan
// kopyalayıp buraya eklemek yeterli, çeviri metinleri o zaman yeniden yazılmayacak.
export const LANGUAGES: { code: Lang; label: string; nativeLabel: string }[] = [
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
];

export const ALL_LANGUAGES: { code: Lang; label: string; nativeLabel: string }[] = [
  ...LANGUAGES,
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
];

export const RTL_LANGUAGES: Lang[] = ['ar'];

type Dict = Record<string, string>;

// Anahtarlar ekran adıyla önekleniyor (ör. "ayarlar.title") — her yeni ekran çevrildiğinde
// buraya kendi bölümü ekleniyor, tek dosyada kalması küçük ölçekte aramayı/tutarlılığı kolaylaştırıyor.
const tr: Dict = {
  'ayarlar.title': 'Ayarlar',
  'ayarlar.role_trainer': 'Antrenör',
  'ayarlar.role_client': 'Danışan',
  'ayarlar.membership_info': 'Üyelik Bilgileri',
  'ayarlar.name': 'Ad Soyad',
  'ayarlar.email': 'E-posta',
  'ayarlar.active_clients': 'Aktif Danışan Sayısı',
  'ayarlar.paused_clients': 'Pasif Danışan Sayısı',
  'ayarlar.trainer_label': 'Antrenör',
  'ayarlar.edit': '✎ Düzenle',
  'ayarlar.language': 'Dil',
  'ayarlar.water_reminder': 'Su İçme Hatırlatıcısı',
  'ayarlar.water_off': 'Kapalı',
  'ayarlar.water_on': '08:00–22:00 arası her {{hours}} saatte bir',
  'ayarlar.water_hours': '{{hours}} saat',
  'ayarlar.water_denied': 'Bildirim izni verilmedi. Telefon ayarlarından izin vermen gerekiyor.',
  'ayarlar.water_unsupported': 'Bildirimler web önizlemede desteklenmiyor, telefonda dene.',
  'ayarlar.water_web_hint': 'Gerçek bildirim için telefonda dene.',
  'ayarlar.about': 'Uygulama Hakkında',
  'ayarlar.about_sub': 'Antrenör ve danışanların antrenman, beslenme ve ilerleme takibini tek yerde yönetmesi için geliştirildi.',
  'ayarlar.legal': 'Yasal',
  'ayarlar.privacy_policy': 'Gizlilik Politikası',
  'ayarlar.terms': 'Kullanım Şartları',
  'ayarlar.kvkk': 'KVKK Aydınlatma Metni',
  'ayarlar.danger_zone': 'Tehlikeli Bölge',
  'ayarlar.delete_hint': 'Hesabını ve tüm verilerini kalıcı olarak siler. Bu işlem geri alınamaz.',
  'ayarlar.delete_btn': 'Hesabımı Sil',
  'ayarlar.deleting': 'Siliniyor...',
  'ayarlar.delete_confirm_title': 'Hesabını silmek istediğine emin misin?',
  'ayarlar.delete_confirm_body':
    'Bu işlem geri alınamaz. Hesabın ve tüm verilerin (antrenman, beslenme, ölçüm, ödeme geçmişi vb.) kalıcı olarak silinir.',
  'common.cancel': 'Vazgeç',
  'common.error': 'Bir hata oluştu.',
  'common.deleted_error': 'Hesap silinemedi.',
  'common.deleted_error_title': 'Silinemedi',
  'common.logout': 'Çıkış',

  'nav.panel': 'Panel',
  'nav.antrenman': 'Antrenman',
  'nav.beslenme': 'Beslenme',
  'nav.ilerleme': 'İlerleme',
  'nav.danisan': 'Danışan',
  'nav.odemeler': 'Ödemeler',
  'nav.randevu': 'Randevu',
  'nav.mesajlar': 'Mesajlar',
  'nav.account_section': 'Hesap',
  'nav.bildirimler': 'Bildirimler',
  'nav.role_trainer_panel': 'Antrenör Paneli',
  'nav.select_client': 'Danışan seç',
  'nav.active_clients_count': '{{count}} aktif danışan',
  'nav.logout_full': 'Çıkış Yap',

  'empty_client.title': 'Henüz bir danışanın yok',
  'empty_client.sub': 'Bu ekranı kullanabilmek için önce bir danışan eklemen gerekiyor.',
  'empty_client.cta': 'Danışan Ekle',
};

const en: Dict = {
  'ayarlar.title': 'Settings',
  'ayarlar.role_trainer': 'Trainer',
  'ayarlar.role_client': 'Client',
  'ayarlar.membership_info': 'Account Info',
  'ayarlar.name': 'Full Name',
  'ayarlar.email': 'Email',
  'ayarlar.active_clients': 'Active Clients',
  'ayarlar.paused_clients': 'Paused Clients',
  'ayarlar.trainer_label': 'Trainer',
  'ayarlar.edit': '✎ Edit',
  'ayarlar.language': 'Language',
  'ayarlar.water_reminder': 'Water Reminder',
  'ayarlar.water_off': 'Off',
  'ayarlar.water_on': 'Every {{hours}} hours between 08:00–22:00',
  'ayarlar.water_hours': '{{hours}}h',
  'ayarlar.water_denied': 'Notification permission denied. Enable it in your phone settings.',
  'ayarlar.water_unsupported': 'Notifications aren’t supported in the web preview — try it on your phone.',
  'ayarlar.water_web_hint': 'Try it on your phone for a real notification.',
  'ayarlar.about': 'About',
  'ayarlar.about_sub': 'Built for trainers and clients to manage workouts, nutrition, and progress in one place.',
  'ayarlar.legal': 'Legal',
  'ayarlar.privacy_policy': 'Privacy Policy',
  'ayarlar.terms': 'Terms of Service',
  'ayarlar.kvkk': 'KVKK Disclosure Notice',
  'ayarlar.danger_zone': 'Danger Zone',
  'ayarlar.delete_hint': 'Permanently deletes your account and all your data. This cannot be undone.',
  'ayarlar.delete_btn': 'Delete My Account',
  'ayarlar.deleting': 'Deleting...',
  'ayarlar.delete_confirm_title': 'Are you sure you want to delete your account?',
  'ayarlar.delete_confirm_body':
    'This cannot be undone. Your account and all your data (workouts, nutrition, measurements, payment history, etc.) will be permanently deleted.',
  'common.cancel': 'Cancel',
  'common.error': 'Something went wrong.',
  'common.deleted_error': 'Could not delete the account.',
  'common.deleted_error_title': 'Delete failed',
  'common.logout': 'Log out',

  'nav.panel': 'Dashboard',
  'nav.antrenman': 'Workout',
  'nav.beslenme': 'Nutrition',
  'nav.ilerleme': 'Progress',
  'nav.danisan': 'Clients',
  'nav.odemeler': 'Payments',
  'nav.randevu': 'Appointments',
  'nav.mesajlar': 'Messages',
  'nav.account_section': 'Account',
  'nav.bildirimler': 'Notifications',
  'nav.role_trainer_panel': 'Trainer Panel',
  'nav.select_client': 'Select a client',
  'nav.active_clients_count': '{{count}} active clients',
  'nav.logout_full': 'Log Out',

  'empty_client.title': 'You don’t have a client yet',
  'empty_client.sub': 'You need to add a client before you can use this screen.',
  'empty_client.cta': 'Add Client',
};

const ar: Dict = {
  'ayarlar.title': 'الإعدادات',
  'ayarlar.role_trainer': 'مدرب',
  'ayarlar.role_client': 'عميل',
  'ayarlar.membership_info': 'معلومات الحساب',
  'ayarlar.name': 'الاسم الكامل',
  'ayarlar.email': 'البريد الإلكتروني',
  'ayarlar.active_clients': 'العملاء النشطون',
  'ayarlar.paused_clients': 'العملاء الموقوفون',
  'ayarlar.trainer_label': 'المدرب',
  'ayarlar.edit': '✎ تعديل',
  'ayarlar.language': 'اللغة',
  'ayarlar.water_reminder': 'تذكير شرب الماء',
  'ayarlar.water_off': 'إيقاف',
  'ayarlar.water_on': 'كل {{hours}} ساعات بين 08:00–22:00',
  'ayarlar.water_hours': '{{hours}} س',
  'ayarlar.water_denied': 'تم رفض إذن الإشعارات. يرجى تفعيله من إعدادات هاتفك.',
  'ayarlar.water_unsupported': 'الإشعارات غير مدعومة في معاينة الويب — جرّبها على هاتفك.',
  'ayarlar.water_web_hint': 'جرّبها على هاتفك لإشعار حقيقي.',
  'ayarlar.about': 'حول التطبيق',
  'ayarlar.about_sub': 'صُمم للمدربين والعملاء لإدارة التمارين والتغذية والتقدم في مكان واحد.',
  'ayarlar.legal': 'قانوني',
  'ayarlar.privacy_policy': 'سياسة الخصوصية',
  'ayarlar.terms': 'شروط الاستخدام',
  'ayarlar.kvkk': 'إشعار الإفصاح (KVKK)',
  'ayarlar.danger_zone': 'منطقة الخطر',
  'ayarlar.delete_hint': 'يحذف حسابك وجميع بياناتك نهائيًا. لا يمكن التراجع عن هذا الإجراء.',
  'ayarlar.delete_btn': 'حذف حسابي',
  'ayarlar.deleting': 'جارٍ الحذف...',
  'ayarlar.delete_confirm_title': 'هل أنت متأكد أنك تريد حذف حسابك؟',
  'ayarlar.delete_confirm_body':
    'لا يمكن التراجع عن هذا الإجراء. سيتم حذف حسابك وجميع بياناتك (التمارين، التغذية، القياسات، سجل المدفوعات، إلخ) نهائيًا.',
  'common.cancel': 'إلغاء',
  'common.error': 'حدث خطأ ما.',
  'common.deleted_error': 'تعذر حذف الحساب.',
  'common.deleted_error_title': 'فشل الحذف',
  'common.logout': 'تسجيل الخروج',

  'nav.panel': 'الرئيسية',
  'nav.antrenman': 'التمارين',
  'nav.beslenme': 'التغذية',
  'nav.ilerleme': 'التقدم',
  'nav.danisan': 'العملاء',
  'nav.odemeler': 'المدفوعات',
  'nav.randevu': 'المواعيد',
  'nav.mesajlar': 'الرسائل',
  'nav.account_section': 'الحساب',
  'nav.bildirimler': 'الإشعارات',
  'nav.role_trainer_panel': 'لوحة المدرب',
  'nav.select_client': 'اختر عميلاً',
  'nav.active_clients_count': '{{count}} عملاء نشطون',
  'nav.logout_full': 'تسجيل الخروج',

  'empty_client.title': 'ليس لديك عميل بعد',
  'empty_client.sub': 'تحتاج إلى إضافة عميل قبل استخدام هذه الشاشة.',
  'empty_client.cta': 'إضافة عميل',
};

const DICTS: Record<Lang, Dict> = { tr, en, ar };

function normalizeLang(value: string | undefined | null): Lang {
  return value === 'en' || value === 'ar' ? value : 'tr';
}

export function useLanguage(): Lang {
  const { profile } = useAuth();
  return normalizeLang(profile?.language);
}

export function useIsRTL(): boolean {
  const lang = useLanguage();
  return RTL_LANGUAGES.includes(lang);
}

export function useT() {
  const lang = useLanguage();
  const dict = DICTS[lang];
  return function t(key: string, vars?: Record<string, string | number>): string {
    let str = dict[key] ?? tr[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.split(`{{${k}}}`).join(String(v));
      }
    }
    return str;
  };
}
