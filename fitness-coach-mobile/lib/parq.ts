// PAR-Q (Physical Activity Readiness Questionnaire) standart 7 sorusu — metinleri lib/i18n.ts'te
// parq.q1..q7 anahtarları altında TR/EN olarak tutuluyor (standart, uluslararası sağlık taraması
// soruları olduğu için çevrildi). Feragatname metni (WAIVER_TEXT) BİLEREK ÇEVRİLMEDİ — bu bir
// hukuki sorumluluk reddi taslağı, KVKK/Gizlilik/Kullanım Şartları ile aynı kategoride; yayına
// almadan önce eğitmenin gözden geçirip onaylaması ve olası bir çevirinin de ayrıca onaylanması
// gerekir.
export const PARQ_QUESTIONS: { key: string; textKey: string }[] = [
  { key: 'q1', textKey: 'parq.q1' },
  { key: 'q2', textKey: 'parq.q2' },
  { key: 'q3', textKey: 'parq.q3' },
  { key: 'q4', textKey: 'parq.q4' },
  { key: 'q5', textKey: 'parq.q5' },
  { key: 'q6', textKey: 'parq.q6' },
  { key: 'q7', textKey: 'parq.q7' },
];

export const WAIVER_TEXT =
  'Egzersiz ve fiziksel aktivitenin doğası gereği risk taşıdığını biliyorum ve bu programa kendi isteğimle katıldığımı beyan ederim. ' +
  'Sağlık durumumla ilgili yukarıdaki soruları doğru ve eksiksiz yanıtladığımı, herhangi bir "evet" cevabım varsa programa başlamadan önce doktoruma danışmam gerektiğinin bilincinde olduğumu kabul ederim. ' +
  'Antrenörümün ağır ihmali dışındaki durumlarda, bu program kapsamında oluşabilecek yaralanma veya sağlık sorunlarından antrenörümü sorumlu tutmayacağımı beyan ederim.';
