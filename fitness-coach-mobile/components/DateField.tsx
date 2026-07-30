import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useT } from '../lib/i18n';
import { C, daysInMonth, formatDateInputTr, localDateStr, monthNames, weekdayNamesShort } from '../lib/theme';

// GG.AA.YYYY alanları için takvimli seçici. Elle yazma KALDIRILMADI — hızlı olduğu için
// duruyor, sadece artık zorunlu değil: sağdaki takvim düğmesi bir ay ızgarası açıyor.
// Değer tipi bilerek "GG.AA.YYYY" metni olarak kaldı, böylece çağıran ekranların mevcut
// doğrulama/parse mantığına (parseTrDate vb.) hiç dokunmak gerekmedi.

function parseValue(value: string): { y: number; m: number; d: number } | null {
  const m = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const d = +m[1];
  const mo = +m[2];
  const y = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo - 1)) return null;
  return { y, m: mo - 1, d };
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDisplay = (y: number, m: number, d: number) => `${pad(d)}.${pad(m + 1)}.${y}`;

// Ekranın geri kalanı gibi hafta Pazartesi başlıyor (bkz. lib/theme.ts mondayOfWeek).
// weekdayNamesShort JS getDay() sırasında (0=Pazar) döndüğü için yeniden diziyoruz.
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const isWeekend = (jsDay: number) => jsDay === 0 || jsDay === 6;

export function DateField({
  label,
  value,
  onChangeText,
  placeholder,
  clearable,
}: {
  label: string;
  value: string;
  onChangeText: (formatted: string) => void;
  placeholder?: string;
  // Doğum günü gibi opsiyonel alanlarda seçimi geri alabilmek için.
  clearable?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pickingYear, setPickingYear] = useState(false);

  const today = new Date();
  const parsed = parseValue(value);
  const [viewYear, setViewYear] = useState(parsed?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? today.getMonth());

  const MONTHS = monthNames(t);
  const WEEKDAYS = weekdayNamesShort(t);
  const todayStr = localDateStr(today);

  function openPicker() {
    // Her açılışta yazılı değere geri dön — kullanıcı ayları gezip vazgeçtiyse bir dahaki
    // açılışta gezindiği yerde değil, seçili tarihte başlaması gerekiyor.
    const p = parseValue(value);
    setViewYear(p?.y ?? today.getFullYear());
    setViewMonth(p?.m ?? today.getMonth());
    setPickingYear(false);
    setOpen(true);
  }

  function pick(day: number) {
    onChangeText(toDisplay(viewYear, viewMonth, day));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    const next = viewMonth + delta;
    if (next < 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else if (next > 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(next);
    }
  }

  const total = daysInMonth(viewYear, viewMonth);
  const leading = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  // Doğum günü alanı için ay ay geriye gitmek işkence — başlığa basınca yıl ızgarası açılıyor.
  const years = Array.from({ length: 121 }, (_, i) => today.getFullYear() + 5 - i);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={(v) => onChangeText(formatDateInputTr(v, value))}
          placeholder={placeholder}
          placeholderTextColor={C.greyD}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={10}
          autoCapitalize="none"
        />
        <Pressable
          onPress={openPicker}
          style={styles.calBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('datepicker.open')}
        >
          <Text style={styles.calBtnGlyph}>▦</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)}>
            <View style={[StyleSheet.absoluteFillObject, styles.scrim]} />
          </Pressable>

          <View style={styles.card}>
            <View style={styles.header}>
              <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} disabled={pickingYear} style={styles.navBtn}>
                <Text style={[styles.navGlyph, pickingYear && styles.navGlyphOff]}>‹</Text>
              </Pressable>
              <Pressable onPress={() => setPickingYear((v) => !v)} hitSlop={8} style={styles.titleBtn}>
                <Text style={styles.title}>
                  {pickingYear ? viewYear : `${MONTHS[viewMonth]} ${viewYear}`}
                </Text>
                <Text style={styles.titleHint}>{pickingYear ? '▴' : '▾'}</Text>
              </Pressable>
              <Pressable onPress={() => shiftMonth(1)} hitSlop={10} disabled={pickingYear} style={styles.navBtn}>
                <Text style={[styles.navGlyph, pickingYear && styles.navGlyphOff]}>›</Text>
              </Pressable>
            </View>

            {pickingYear ? (
              <ScrollView style={styles.yearScroll} contentContainerStyle={styles.yearGrid}>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    onPress={() => {
                      setViewYear(y);
                      setPickingYear(false);
                    }}
                    style={[styles.yearCell, y === viewYear && styles.yearCellOn]}
                  >
                    <Text style={[styles.yearText, y === viewYear && styles.yearTextOn]}>{y}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <>
                <View style={styles.grid}>
                  {MONDAY_FIRST.map((jsDay) => (
                    <View key={jsDay} style={styles.cell}>
                      <Text style={[styles.dowText, isWeekend(jsDay) && styles.weekendText]}>{WEEKDAYS[jsDay]}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.grid}>
                  {cells.map((day, i) => {
                    if (day === null) return <View key={`b${i}`} style={styles.cell} />;
                    const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
                    const selected = !!parsed && parsed.y === viewYear && parsed.m === viewMonth && parsed.d === day;
                    const weekend = isWeekend(new Date(viewYear, viewMonth, day).getDay());
                    return (
                      <Pressable key={day} onPress={() => pick(day)} style={styles.cell}>
                        <View style={[styles.dayPill, iso === todayStr && styles.dayPillToday, selected && styles.dayPillOn]}>
                          <Text
                            style={[
                              styles.dayText,
                              weekend && styles.weekendText,
                              selected && styles.dayTextOn,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.footer}>
              {clearable ? (
                <Pressable
                  onPress={() => {
                    onChangeText('');
                    setOpen(false);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.footerLink}>{t('datepicker.clear')}</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={styles.footerRight}>
                <Pressable
                  onPress={() => {
                    onChangeText(toDisplay(today.getFullYear(), today.getMonth(), today.getDate()));
                    setOpen(false);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.footerLinkOn}>{t('datepicker.today')}</Text>
                </Pressable>
                <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                  <Text style={styles.footerLink}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: C.grey, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 12,
  },
  // minWidth: 0 ŞART — web'de <input> kendi içsel genişliğini taban alıyor, flex:1 tek başına
  // onu daraltamıyor. Onsuz satır kendi kolonundan taşıp yanındaki alanın (ör. Panel'de Saat)
  // üstüne biniyor ve takvim düğmesine yapılan tıklama komşu alana gidiyordu.
  input: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 12, color: C.white, fontSize: 14 },
  calBtn: {
    paddingHorizontal: 13,
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: C.edge,
  },
  calBtnGlyph: { fontSize: 15, color: C.lime },

  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrim: { backgroundColor: 'rgba(4,6,10,0.72)' },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 16,
    padding: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  navGlyph: { fontSize: 22, color: C.lime, fontWeight: '700', lineHeight: 26 },
  navGlyphOff: { color: C.edge },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { fontSize: 14, fontWeight: '800', color: C.white },
  titleHint: { fontSize: 10, color: C.greyD },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  dowText: { fontSize: 10, fontWeight: '700', color: C.greyD, marginBottom: 4 },
  dayPill: {
    width: 34,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayPillToday: { borderColor: C.edge },
  dayPillOn: { backgroundColor: C.lime, borderColor: C.lime },
  dayText: { fontSize: 13, fontWeight: '600', color: C.white },
  dayTextOn: { color: C.bg, fontWeight: '800' },
  weekendText: { color: C.red },

  yearScroll: { maxHeight: 250 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 4 },
  yearCell: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.edge,
  },
  yearCellOn: { backgroundColor: C.lime, borderColor: C.lime },
  yearText: { fontSize: 12, fontWeight: '700', color: C.white },
  yearTextOn: { color: C.bg },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: C.edge,
  },
  footerRight: { flexDirection: 'row', gap: 16 },
  footerLink: { fontSize: 12, fontWeight: '700', color: C.grey },
  footerLinkOn: { fontSize: 12, fontWeight: '700', color: C.lime },
});
