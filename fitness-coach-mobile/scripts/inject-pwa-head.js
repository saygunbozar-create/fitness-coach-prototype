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
    <style>
      /* Sayfanın kendi (uygulama dışı) zemini de koyu olsun. Aksi halde içerik viewport'u tam
         doldurmadığında ya da aşırı kaydırma (overscroll) sırasında altta/üstte beyaz şerit
         görünüyor — telefonda tam olarak bu yaşandı. */
      html, body, #root { background-color: #0B0D12; }

      /* Mobilde istenmeyen yakınlaşmayı engelle. Üç ayrı davranış var, üçü de ayrı ayrı kapatılmalı: */

      /* 1) Çift dokunuşla yakınlaştırma. */
      html, body { touch-action: manipulation; }

      /* 2) Yatay çevirince iOS'un metni otomatik büyütmesi. */
      html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

      /* 3) EN ÖNEMLİSİ: iOS'ta bir metin alanına dokununca sayfanın kendiliğinden yakınlaşması.
         iOS bunu SADECE yazı boyutu 16px'in altındaysa yapar ve viewport'taki user-scalable=no
         ayarını (iOS 10'dan beri, erişilebilirlik gerekçesiyle) yok sayar — yani tek gerçek
         çözüm alanların yazı boyutunu 16px'e çıkarmak. Uygulamanın kendi tasarımı 14px; bu
         kural sadece dokunmatik cihazlarda geçerli, masaüstü görünümü değişmiyor.
         RNW kendi sınıflarıyla inline boyut verdiği için !important gerekiyor. */
      @media (hover: none) and (pointer: coarse) {
        input, textarea, select { font-size: 16px !important; }
      }
    </style>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>
`;

// Expo'nun ürettiği viewport etiketi yakınlaştırmaya izin veriyor; onu kilitli sürümle
// DEĞİŞTİRİYORUZ (ikinci bir viewport etiketi eklemek yerine — iki etiket olduğunda hangisinin
// kazandığı tarayıcıya göre değişir).
// NOT: Buraya bir ara `viewport-fit=cover` de eklenmişti; iPhone'da sayfayı güvenli alanın altına
// taşıyıp ekranın altında beyaz bir şerit bıraktığı için kaldırıldı. Yakınlaşmayı engellemek için
// gerekli değildi zaten — uygulama güvenli alanı useSafeAreaInsets ile kendisi yönetiyor.
const LOCKED_VIEWPORT =
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no" />';

const viewportRe = /<meta\s+name="viewport"[^>]*>/i;
if (viewportRe.test(html)) {
  html = html.replace(viewportRe, LOCKED_VIEWPORT);
  console.log('[inject-pwa-head] viewport etiketi yakınlaşmayı engelleyecek şekilde değiştirildi.');
} else {
  html = html.replace('<head>', '<head>\n    ' + LOCKED_VIEWPORT);
  console.log('[inject-pwa-head] viewport etiketi bulunamadı, yenisi eklendi.');
}

html = html.replace('</head>', tags + '</head>');
fs.writeFileSync(indexPath, html);
console.log('[inject-pwa-head] PWA etiketleri dist/index.html içine eklendi.');
