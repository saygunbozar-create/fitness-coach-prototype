// Sentry'deki açık hataları terminale döker — kimsenin panele girmesi gerekmesin diye.
//
// Gerekli: .env içinde SENTRY_AUTH_TOKEN. Bu token DSN'den FARKLI: DSN sadece hata
// GÖNDERMEYE yarıyor, okumak için ayrı bir token gerekiyor. .env zaten .gitignore'da.
// Token nasıl alınır: Sentry → Settings → Custom Integrations (eski adıyla Developer
// Settings) → Create New Integration → Internal Integration → Permissions altında
// Issue & Event: Read → kaydet, en altta çıkan token'ı kopyala.
// Bu uç noktanın istediği yetki `event:read`.
//
// Kullanım:
//   node scripts/sentry-issues.js               son 14 gün, çözülmemiş, sıklığa göre
//   node scripts/sentry-issues.js --since 24h   son 24 saat
//   node scripts/sentry-issues.js --all         çözülmüşleri de göster
//   node scripts/sentry-issues.js --limit 50
const fs = require('fs');
const path = require('path');

// .env'i elle okuyoruz — projede dotenv yok, sırf bu script için bağımlılık eklemeye değmez.
function readEnvFile() {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = readEnvFile();
const cfg = (key, fallback) => process.env[key] || fileEnv[key] || fallback;

// Slug'lar 2026-07-19'daki kurulumdan geliyor. Sentry'de değişirlerse script 404 diyecek —
// o durumda kodu düzenlemek yerine .env'e SENTRY_ORG / SENTRY_PROJECT yazmak yeterli.
const ORG = cfg('SENTRY_ORG', 'coachbook');
const PROJECT = cfg('SENTRY_PROJECT', 'react-native');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

// statsPeriod belgelenmiş olarak sadece bu iki değeri kabul ediyor (ya da devre dışı için boş).
// "7d" gibi bir şey yazılırsa Sentry sessizce farklı davranabiliyor — baştan uyarmak daha iyi.
const SINCE_VALUES = ['24h', '14d'];
const since = arg('since', '14d');
const limit = arg('limit', '25');
const showAll = process.argv.includes('--all');

if (!SINCE_VALUES.includes(since)) {
  console.error(`--since sadece ${SINCE_VALUES.join(' veya ')} olabilir (Sentry API'sinin kabul ettiği değerler). Verilen: ${since}`);
  process.exitCode = 1;
  return;
}

// "2 saat önce" gibi okunur bir fark — ham ISO tarih tabloda gürültü yapıyor.
function ago(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const dk = Math.round(diff / 60000);
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.round(dk / 60);
  if (sa < 48) return `${sa} sa önce`;
  return `${Math.round(sa / 24)} gün önce`;
}

(async () => {
  const token = cfg('SENTRY_AUTH_TOKEN', null);
  if (!token) {
    console.error('SENTRY_AUTH_TOKEN yok.\n');
    console.error('Token nasıl alınır:');
    console.error(`  1. https://sentry.io/settings/${ORG}/developer-settings/`);
    console.error('     (sol menüde "Custom Integrations" ya da "Developer Settings" olarak geçiyor)');
    console.error('  2. Create New Integration → Internal Integration → İleri');
    console.error('  3. Bir isim ver, Permissions altında "Issue & Event" iznini Read yap');
    console.error('  4. Save Changes → sayfanın en altındaki Tokens bölümünden token\'ı kopyala\n');
    console.error('Sonra fitness-coach-mobile/.env dosyasına şu satırı ekle:');
    console.error('  SENTRY_AUTH_TOKEN=<kopyaladığın token>');
    process.exitCode = 1;
    return;
  }

  const url =
    `https://sentry.io/api/0/projects/${ORG}/${PROJECT}/issues/` +
    `?query=${encodeURIComponent(showAll ? '' : 'is:unresolved')}` +
    `&statsPeriod=${encodeURIComponent(since)}&sort=freq&limit=${encodeURIComponent(limit)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  // Gövde HER durumda okunuyor: okunmazsa soket açık kalıyor ve Windows'ta process.exit()
  // ile birleşince Node libuv assertion'ıyla çöküyor. Aynı sebeple aşağıda process.exit()
  // yerine process.exitCode kullanılıyor — Node kendi kapanışını tamamlasın.
  const bodyText = await res.text();

  if (!res.ok) {
    if (res.status === 401) console.error('401 — token geçersiz ya da süresi dolmuş.');
    else if (res.status === 403) console.error("403 — token'da project:read / event:read yetkisi yok.");
    else if (res.status === 404) console.error(`404 — ${ORG}/${PROJECT} bulunamadı. Sentry'deki org/proje slug'ını kontrol et.`);
    else console.error(`Sentry ${res.status}: ${bodyText.slice(0, 300)}`);
    process.exitCode = 1;
    return;
  }

  const issues = JSON.parse(bodyText);
  const baslik = showAll ? 'TÜM HATALAR' : 'ÇÖZÜLMEMİŞ HATALAR';
  console.log(`\n${baslik} · son ${since} · ${ORG}/${PROJECT}\n`);

  if (issues.length === 0) {
    console.log('  Kayıt yok — bu aralıkta hiç hata gelmemiş.\n');
    return;
  }

  for (const i of issues) {
    const kisi = Number(i.userCount) || 0;
    console.log(`  ${String(i.count).padStart(5)} kez · ${String(kisi).padStart(3)} kişi · ${ago(i.lastSeen)}`);
    console.log(`        ${i.title}`);
    if (i.culprit) console.log(`        ${i.culprit}`);
    console.log(`        ${i.permalink}\n`);
  }

  const toplam = issues.reduce((a, i) => a + Number(i.count), 0);
  console.log(`  ${issues.length} ayrı hata, toplam ${toplam} olay.\n`);
})().catch((e) => {
  console.error('Beklenmeyen hata:', e.message);
  process.exitCode = 1;
});
