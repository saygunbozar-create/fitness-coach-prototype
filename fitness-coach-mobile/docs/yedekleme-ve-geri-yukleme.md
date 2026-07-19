# Yedekleme ve geri yükleme

## Durum (2026-07-19 itibarıyla doğrulanan)

Supabase veritabanının WAL arşivlemesi (yedeklemenin alt yapısı) çalışıyor ve hatasız —
`pg_stat_archiver` üzerinden doğrulandı. Bu, Supabase'in günlük otomatik yedek almasının
teknik ön koşulunun sağlıklı olduğu anlamına gelir.

**Doğrulanamayan tek şey:** tam saklama süresi (kaç gün geriye gidilebildiği) ve
indirilebilir/nokta-zaman (point-in-time) geri yükleme seçeneklerinin hangilerinin plana
dahil olduğu — bu bilgi Supabase Dashboard'un kendisinde, API üzerinden görünmüyor.

**Kontrol için tek adım:** Supabase Dashboard → Project Settings → Add-ons (veya
Database → Backups) sayfasına gir, "Backups" bölümünde kaç günlük yedek tutulduğunu ve
Point-in-Time Recovery (PITR) ekinin açık olup olmadığını gör. Free plandaysan yedekler
7 gün tutulur ama indirilemez; Pro plana geçersen indirilebilir + PITR eklenebilir.

## Bir şeyler ters giderse: geri yükleme adımları

1. Supabase Dashboard → sol menüden **Database** → **Backups** sekmesine git.
2. Listede tarihe göre sıralanmış otomatik yedekler görürsün. Geri dönmek istediğin
   tarihe en yakın olanı seç.
3. **Restore** butonuna tıkla. Supabase bunu ya doğrudan projene ya da önce bir önizleme
   dalına (branch) geri yükleme seçeneğiyle sunar — emin değilsen önce önizleme dalına
   geri yükleyip verinin doğru olduğunu gördükten sonra asıl projeye uygulaman daha güvenli.
4. Geri yükleme birkaç dakika sürebilir. Bitene kadar uygulamayı (web ve mobil) durdurmana
   gerek yok ama o sırada yapılan değişiklikler geri yüklemeden SONRAKI zaman dilimine
   ait olmayacağı için kaybolabilir.
5. Geri yükleme bittikten sonra `coachbook-roan.vercel.app` üzerinden birkaç temel akışı
   (giriş yap, bir danışan aç) dene, verinin beklediğin gibi geldiğini doğrula.

## Önemli not

Bu adımlar Supabase'in kendi otomatik yedeklerini kapsıyor. Ayrıca, bu projede her
migration dosyası `supabase/migrations/` altında Git'te de saklanıyor — yani şema
(tablo yapısı) her zaman koddan yeniden kurulabilir durumda; asıl korunması gereken
gerçek danışan verisi (kilo, ölçüm, ödeme, fotoğraf vb.), o da yukarıdaki otomatik
yedeklerle korunuyor.
