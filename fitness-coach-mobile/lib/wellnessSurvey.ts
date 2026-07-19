export type SurveyQuestion = { id: string; label: string };
export type SurveySection = { title: string; questions: SurveyQuestion[] };

// "Savaş Coaching" Google Form'undan (son 30 günün egzersiz sürecinin yaşam kalitesi üzerindeki
// etkisini değerlendiren anket) birebir aktarılan sorular. Formda ayrıca başlıksız/boş bırakılmış
// bir "çoktan seçmeli" soru vardı (muhtemelen kullanılmamış bir taslak) — buraya dahil edilmedi.
export const SURVEY_SECTIONS: SurveySection[] = [
  {
    title: '1. Egzersiz Performansı & Fonksiyonellik',
    questions: [
      { id: 'postur', label: 'Günlük duruşum (postürüm) daha iyi' },
      { id: 'vucut_kullanim', label: 'Gün içinde vücudumu daha rahat kullanıyorum' },
      { id: 'gunluk_yorulma', label: 'Günlük işlerde daha az yoruluyorum (1 = Çok Kötü, 5 = Çok İyi)' },
      { id: 'merdiven_nefes', label: 'Merdiven çıkarken nefesim daha rahat (1 = Çok Kötü, 5 = Çok İyi)' },
    ],
  },
  {
    title: '2. Mobilite, Esneklik & Ağrı',
    questions: [
      { id: 'sabah_sertlik', label: 'Sabahları vücudum daha az sert (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'agri_azalma', label: 'Bel, boyun veya diz ağrılarım azaldı (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'hareket_kisitlama', label: 'Günlük hareketlerde kısıtlanma yaşamıyorum (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'esneklik', label: 'Esnekliğimin arttığını hissediyorum (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'antrenman_agri_suresi', label: 'Antrenman sonrası ağrı sürem kısaldı (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
    ],
  },
  {
    title: '3. Stres, Duygusal Regülasyon & Zihinsel Netlik',
    questions: [
      { id: 'sakinlik', label: 'Gün içinde daha sakin hissediyorum (1 = Hiç, 5 = Çok Sık)' },
      { id: 'sinirlenme', label: 'Sinirlendiğim durumlar azaldı (1 = Hiç, 5 = Çok Sık)' },
      { id: 'odaklanma', label: 'Odaklanma sürem arttı (1 = Hiç, 5 = Çok Sık)' },
      { id: 'zihin_rahatlama', label: 'Antrenman sonrası zihnim rahatlıyor (1 = Hiç, 5 = Çok Sık)' },
      { id: 'stres_bosaltma', label: 'Günün stresini daha iyi boşaltıyorum (1 = Hiç, 5 = Çok Sık)' },
    ],
  },
  {
    title: '🪞 4. Beden Algısı & Sosyal Özgüven',
    questions: [
      { id: 'ayna', label: 'Aynaya bakarken kendimi daha iyi hissediyorum (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'kiyafet', label: 'Kıyafetler üzerimde daha iyi duruyor (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'sosyal_ozguven', label: 'Sosyal ortamlarda daha özgüvenliyim (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'saklama_ihtiyaci', label: 'Vücudumu saklama ihtiyacı hissetmiyorum (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'kendiyle_baris', label: 'Kendimle barışığım (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
    ],
  },
  {
    title: '5. Uyku, Dinlenme & Toparlanma',
    questions: [
      { id: 'uykuya_dalma', label: 'Uykuya dalmam kolay (1 = Çok Kötü, 5 = Çok İyi)' },
      { id: 'gece_uyanma', label: 'Gece uyanmalarım az (1 = Çok Kötü, 5 = Çok İyi)' },
      { id: 'sabah_uyanma', label: 'Sabah alarmdan önce uyanıyorum (1 = Çok Kötü, 5 = Çok İyi)' },
      { id: 'uyuklama', label: 'Gün içinde uyuklama ihtiyacım azaldı (1 = Çok Kötü, 5 = Çok İyi)' },
      { id: 'dinlenmislik', label: 'Dinlenmiş hissediyorum (1 = Çok Kötü, 5 = Çok İyi)' },
    ],
  },
  {
    title: '6. Alışkanlık & Yaşam Tarzı Değişimi',
    questions: [
      { id: 'su_tuketimi', label: 'Su tüketimime daha çok dikkat ediyorum (1 = Hiç, 5 = Çok Sık)' },
      { id: 'gunluk_hareket', label: 'Günlük hareket miktarım arttı (1 = Hiç, 5 = Çok Sık)' },
      { id: 'beslenme_bilinc', label: 'Beslenme seçimlerim daha bilinçli (1 = Hiç, 5 = Çok Sık)' },
      { id: 'egzersiz_rutini', label: 'Egzersiz rutini hayatımın parçası oldu (1 = Hiç, 5 = Çok Sık)' },
      { id: 'kendine_zaman', label: 'Kendime ayırdığım zaman arttı (1 = Hiç, 5 = Çok Sık)' },
    ],
  },
  {
    title: '7. Motivasyon & Devamlılık (Koçluk Gücü)',
    questions: [
      { id: 'birakmama', label: 'Egzersizi bırakmak istemiyorum (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'antrenman_bekleme', label: 'Antrenman günlerini sabırsızlıkla bekliyorum (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'disiplin', label: 'Kendimi disiplinli hissediyorum (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'program_uygunluk', label: 'Program bana uygun (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
      { id: 'egitmen_motivasyon', label: 'Eğitmenimle çalışmak beni motive ediyor (1 = Hiç Katılmıyorum, 5 = Tamamen Katılıyorum)' },
    ],
  },
];

export const SURVEY_ALL_QUESTIONS: SurveyQuestion[] = SURVEY_SECTIONS.flatMap((s) => s.questions);

export function monthLabelTr(period: string): string {
  const [y, m] = period.split('-');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}
