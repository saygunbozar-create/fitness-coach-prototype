import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyClientState } from '../../components/EmptyClientState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { useClient, useMessages, useSendMessage } from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C } from '../../lib/theme';
import type { Message } from '../../lib/types';

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.body}</Text>
        <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{formatMessageTime(message.created_at)}</Text>
      </View>
    </View>
  );
}

export default function MesajlarScreen() {
  const { profile } = useAuth();
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const client = clientQuery.data;
  const isTrainer = profile?.role === 'trainer';
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const messagesQuery = useMessages(client?.trainer_id, client?.id);
  const sendMessage = useSendMessage(client?.trainer_id, client?.id, isTrainer ? 'trainer' : 'client');
  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  async function onSend() {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      await sendMessage.mutateAsync(body);
    } catch {
      setDraft(body);
    }
  }

  // Hiç danışanı olmayan eğitmende selectedClientId null kalıyor, dolayısıyla clientQuery hiç
  // çalışmıyordu — bu ekran sonsuza kadar dönen bir spinner'da takılı kalırdı. Diğer
  // ekranlardaki (Antrenman, Beslenme, İlerleme, Ödemeler) davranışın aynısı.
  if (isTrainer && !selectedClientId) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Mesajlar" />
        <EmptyClientState />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Mesajlar" />
        <View style={styles.loading}>
          <ActivityIndicator color={C.lime} size="large" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={isTrainer ? `Mesajlar · ${client.name}` : 'Mesajlar'} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>Henüz mesaj yok. İlk mesajı sen gönder.</Text>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} mine={m.sender_role === (isTrainer ? 'trainer' : 'client')} />)
        )}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Mesaj yaz..."
          placeholderTextColor={C.greyD}
          multiline
        />
        <Pressable style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]} onPress={onSend} disabled={!draft.trim() || sendMessage.isPending} hitSlop={8}>
          <Text style={styles.sendBtnText}>Gönder</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4, flexGrow: 1 },
  empty: { color: C.grey, fontSize: 13, textAlign: 'center', marginTop: 24 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleTheirs: { backgroundColor: C.card, borderWidth: 1, borderColor: C.edge, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: C.lime, borderBottomRightRadius: 4 },
  bubbleText: { color: C.white, fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: C.bg },
  bubbleTime: { color: C.grey, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(11,13,18,0.55)' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.edge,
    backgroundColor: C.bg,
  },
  input: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: C.white,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: { backgroundColor: C.lime, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: C.bg, fontWeight: '800', fontSize: 13 },
});
