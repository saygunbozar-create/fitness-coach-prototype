// app/+html.tsx SADECE web.output:"static" ile çalışıyor — o mod ise bu projede SSR sırasında
// çöküyor (Supabase auth-js modül yüklenirken window'a erişiyor, Node.js ortamında window yok).
// SPA (varsayılan "single") çıktısında Expo Router HTML kabuğunu özelleştirmenin bir yolu
// olmadığı için, `expo export` sonrası dist/index.html'e PWA etiketlerini burada elle ekliyoruz.
// Bu script hem `npm run build:web` ile hem Vercel'in build komutuyla (vercel.json) çalışıyor.
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('rel="manifest"')) {
  console.log('[inject-pwa-head] Zaten eklenmiş, atlanıyor.');
  process.exit(0);
}

const tags = `    <meta name="description" content="Antrenör ve danışanların antrenman, beslenme ve ilerleme takibini tek yerde yönetmesi için geliştirildi." />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="theme-color" content="#0B0D12" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Coachbook" />
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>
`;

html = html.replace('</head>', tags + '</head>');
fs.writeFileSync(indexPath, html);
console.log('[inject-pwa-head] PWA etiketleri dist/index.html içine eklendi.');
