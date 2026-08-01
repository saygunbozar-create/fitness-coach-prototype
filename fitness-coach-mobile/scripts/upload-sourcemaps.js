// Web derlemesinin kaynak haritalarını Sentry'ye yükler ki yığın izleri
// "app:///undefined:25" yerine gerçek dosya/satır göstersin.
//
// BİLEREK `npm run build:web` İÇİNE BAĞLANMADI. Sebebi: yükleme için derleme anında
// `project:releases` + `org:read` yetkili AYRI bir token gerekiyor ve o token Vercel'in
// ortam değişkenlerine eklenene kadar adımın hiçbir faydası yok. Derleme hattına şimdiden
// koymak, üretim dağıtımına faydasız bir kırılma riski eklerdi. Token Vercel'e eklendikten
// sonra build:web'in sonuna eklenebilir.
//
// Gerekli: SENTRY_UPLOAD_TOKEN (okuma için kullanılan SENTRY_AUTH_TOKEN'dan FARKLI —
// o token sadece event:read yetkisine sahip, yükleme yapamaz).
//
// Kullanım:
//   node scripts/upload-sourcemaps.js
//
// Ne yapıyor:
//   1. Haritalı yeniden derleme (expo export --source-maps)
//   2. sentry-cli sourcemaps inject → js ve map dosyalarına debug id gömer
//      (Expo çıktısında sourceMappingURL yorumu YOK, eşleştirme debug id ile yapılıyor)
//   3. sentry-cli sourcemaps upload
//   4. .map dosyalarını dist'ten SİLER — aksi halde Vercel onları herkese açık servis eder
//      ve kaynak kod dışarı sızar.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function readEnvFile() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = readEnvFile();
const cfg = (k, d) => process.env[k] || fileEnv[k] || d;

const TOKEN = cfg('SENTRY_UPLOAD_TOKEN', null);
const ORG = cfg('SENTRY_ORG', 'coachbook');
const PROJECT = cfg('SENTRY_PROJECT', 'react-native');

function findMaps(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findMaps(p));
    else if (entry.name.endsWith('.map')) out.push(p);
  }
  return out;
}

function deleteMaps() {
  if (!fs.existsSync(DIST)) return 0;
  const maps = findMaps(DIST);
  for (const m of maps) fs.unlinkSync(m);
  return maps.length;
}

if (!TOKEN) {
  console.error('SENTRY_UPLOAD_TOKEN yok — yükleme atlandı.\n');
  console.error('Bu, hataları OKUMAK için kullanılan token değil. Yükleme için ayrı yetkiler gerekiyor:');
  console.error('  https://sentry.io/settings/account/api/auth-tokens/ → Create New Token');
  console.error('  Scope: project:releases + org:read');
  console.error('Sonra .env dosyasına: SENTRY_UPLOAD_TOKEN=<token>');
  console.error('Vercel derlemelerinde de çalışması için aynı değeri Vercel proje ortam değişkenlerine ekle.');
  process.exitCode = 1;
  return;
}

const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, SENTRY_AUTH_TOKEN: TOKEN } });

try {
  console.log('\n[1/4] Haritalarla yeniden derleniyor...');
  run('npx expo export --platform web --source-maps');

  console.log('\n[2/4] Debug id gömülüyor...');
  run(`npx @sentry/cli sourcemaps inject dist`);

  console.log('\n[3/4] Sentry\'ye yükleniyor...');
  run(`npx @sentry/cli sourcemaps upload --org ${ORG} --project ${PROJECT} dist`);

  console.log('\n[4/4] PWA etiketleri yeniden ekleniyor...');
  run('node scripts/inject-pwa-head.js');
} finally {
  // Hata olsa da olmasa da haritalar dist'te KALMAMALI.
  const silinen = deleteMaps();
  console.log(`\nTemizlik: ${silinen} .map dosyası dist'ten silindi (herkese açık servis edilmemeleri için).`);
}
