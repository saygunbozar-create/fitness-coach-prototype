import { ReactNode, useState } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native';
import { C } from '../lib/theme';

const LINE_HEIGHT = 30;
const RING_COUNT = 8;

// Sol kenarda spiral defter halkaları + arkada çizgili kağıt dokusu — Not Defteri ekranlarının
// ortak "defter" görünümünü sağlar. ScrollView burada, NotebookFrame'in kendisinde barındırılıyor
// (çağıran ayrıca bir ScrollView sarmalamıyor): çizgi katmanı scroll edilen içerikle AYNI View'ın
// içinde, kaydırılan içeriğin bir parçası olarak render ediliyor — böylece kaydırınca çizgiler de
// metinle birlikte kayar. Çizgi sayısı, gerçek (görünmeyen kısımlar dahil) içerik yüksekliğine göre
// onContentSizeChange ile hesaplanıyor.
export function NotebookFrame({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const lineCount = Math.ceil(contentHeight / LINE_HEIGHT);

  return (
    <View style={styles.wrap}>
      <View style={styles.spiral}>
        {Array.from({ length: RING_COUNT }).map((_, i) => (
          <View key={i} style={styles.ring} />
        ))}
      </View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={contentContainerStyle}
        onContentSizeChange={(_, h) => setContentHeight(h)}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: lineCount }).map((_, i) => (
            <View key={i} style={[styles.ruleLine, { top: (i + 1) * LINE_HEIGHT }]} />
          ))}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row' },
  spiral: {
    width: 22,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  ring: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.greyD,
    backgroundColor: C.bg,
  },
  content: { flex: 1, paddingRight: 4 },
  ruleLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.edge },
});
