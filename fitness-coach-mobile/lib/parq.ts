// PAR-Q (Physical Activity Readiness Questionnaire) standart 7 sorusunun Türkçe çevirisi.
// Feragatname metni bir taslaktır — yayına almadan önce eğitmenin gözden geçirip onaylaması gerekir
// (KVKK/Gizlilik/Kullanım Şartları metinlerinde izlenen aynı yöntem).
export const PARQ_QUESTIONS: { key: string; text: string }[] = [
  { key: 'q1', text: 'Doktorunuz size kalple ilgili bir rahatsızlığınız olduğunu ve sadece doktor önerdiği fiziksel aktiviteyi yapmanız gerektiğini hiç söyledi mi?' },
  { key: 'q2', text: 'Fiziksel aktivite yaparken göğsünüzde ağrı hissediyor musunuz?' },
  { key: 'q3', text: 'Geçtiğimiz bir ay içinde, fiziksel aktivite yapmadığınız zamanlarda göğüs ağrınız oldu mu?' },
  { key: 'q4', text: 'Baş dönmesi nedeniyle dengenizi kaybediyor musunuz ya da hiç bilincinizi kaybettiniz mi?' },
  { key: 'q5', text: 'Fiziksel aktiviteyle kötüleşebilecek bir kemik veya eklem probleminiz (ör. sırt, diz, kalça, omuz) var mı?' },
  { key: 'q6', text: 'Doktorunuz şu anda kalp veya tansiyon için size ilaç veriyor mu?' },
  { key: 'q7', text: 'Fiziksel aktivite yapmamanız gerektiğini düşündüren başka bir sağlık nedeni biliyor musunuz?' },
];

export const WAIVER_TEXT =
  'Egzersiz ve fiziksel aktivitenin doğası gereği risk taşıdığını biliyorum ve bu programa kendi isteğimle katıldığımı beyan ederim. ' +
  'Sağlık durumumla ilgili yukarıdaki soruları doğru ve eksiksiz yanıtladığımı, herhangi bir "evet" cevabım varsa programa başlamadan önce doktoruma danışmam gerektiğinin bilincinde olduğumu kabul ederim. ' +
  'Antrenörümün ağır ihmali dışındaki durumlarda, bu program kapsamında oluşabilecek yaralanma veya sağlık sorunlarından antrenörümü sorumlu tutmayacağımı beyan ederim.';
