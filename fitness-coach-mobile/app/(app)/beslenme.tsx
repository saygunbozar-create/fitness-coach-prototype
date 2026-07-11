import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { Bar } from '../../components/Bar';
import { FoodRow } from '../../components/FoodRow';
import { MealItemEditRow } from '../../components/MealItemEditRow';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import {
  useAddMeal,
  useAddMealItem,
  useAddNutritionNote,
  useAddShoppingItem,
  useAddSupplementItem,
  useClient,
  useDeleteMeal,
  useDeleteMealItem,
  useDeleteNutritionNote,
  useDeleteShoppingItem,
  useDeleteSupplementItem,
  useFoodLibrary,
  useMeals,
  useNutritionNotes,
  useSeedFoodLibrary,
  useShoppingItems,
  useSupplementItems,
  useToggleShoppingItem,
  useUpdateMealItem,
  useUpdateMealQty,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';

function onErr(title: string) {
  return (e: any) => Alert.alert(title, e.message ?? 'Bir hata oluştu.');
}

export default function BeslenmeScreen() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const mealsQuery = useMeals(selectedClientId ?? undefined);
  const updateQty = useUpdateMealQty(selectedClientId ?? undefined);
  const addMeal = useAddMeal(selectedClientId ?? undefined);
  const deleteMeal = useDeleteMeal(selectedClientId ?? undefined);
  const addMealItem = useAddMealItem(selectedClientId ?? undefined, isTrainer ? profile?.id : undefined);
  const updateMealItem = useUpdateMealItem(selectedClientId ?? undefined);
  const deleteMealItem = useDeleteMealItem(selectedClientId ?? undefined);
  const foodLibraryQuery = useFoodLibrary(isTrainer ? profile?.id : undefined);
  const seedFoodLibrary = useSeedFoodLibrary(isTrainer ? profile?.id : undefined);
  const supplementsQuery = useSupplementItems(selectedClientId ?? undefined);
  const addSupplement = useAddSupplementItem(selectedClientId ?? undefined);
  const deleteSupplement = useDeleteSupplementItem(selectedClientId ?? undefined);
  const shoppingQuery = useShoppingItems(selectedClientId ?? undefined);
  const addShoppingItem = useAddShoppingItem(selectedClientId ?? undefined);
  const toggleShoppingItem = useToggleShoppingItem(selectedClientId ?? undefined);
  const deleteShoppingItem = useDeleteShoppingItem(selectedClientId ?? undefined);
  const notesQuery = useNutritionNotes(selectedClientId ?? undefined);
  const addNote = useAddNutritionNote(selectedClientId ?? undefined);
  const deleteNote = useDeleteNutritionNote(selectedClientId ?? undefined);

  const [editMode, setEditMode] = useState(false);
  const [addingMeal, setAddingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [addingItemForMeal, setAddingItemForMeal] = useState<string | null>(null);
  const [supplementDraft, setSupplementDraft] = useState({ name: '', dose: '', timing: '' });
  const [shoppingDraft, setShoppingDraft] = useState({ name: '', quantity: '' });
  const [noteDraft, setNoteDraft] = useState('');

  useEffect(() => {
    if (isTrainer && foodLibraryQuery.isSuccess && foodLibraryQuery.data?.length === 0 && !seedFoodLibrary.isPending) {
      seedFoodLibrary.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrainer, foodLibraryQuery.isSuccess, foodLibraryQuery.data?.length]);

  const totals = useMemo(() => {
    const meals = mealsQuery.data ?? [];
    return meals.reduce(
      (t, m) =>
        m.items.reduce(
          (acc, it) => ({
            kcal: acc.kcal + it.kcal * it.todayQty,
            p: acc.p + it.p * it.todayQty,
            k: acc.k + it.k * it.todayQty,
            y: acc.y + it.y * it.todayQty,
          }),
          t
        ),
      { kcal: 0, p: 0, k: 0, y: 0 }
    );
  }, [mealsQuery.data]);

  if (clientQuery.isLoading || mealsQuery.isLoading || !clientQuery.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  const client = clientQuery.data;
  const meals = mealsQuery.data ?? [];
  const supplements = supplementsQuery.data ?? [];
  const shoppingItems = shoppingQuery.data ?? [];
  const notes = notesQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Beslenme" clientName={client.name} showPill={isTrainer} />
      <ScrollView contentContainerStyle={styles.content}>
        {isTrainer && (
          <Pressable
            style={[styles.editToggle, editMode && styles.editToggleOn]}
            onPress={() => setEditMode((v) => !v)}
            hitSlop={10}
          >
            <Text style={[styles.editToggleText, editMode && { color: C.bg }]}>
              {editMode ? '✓ Programı düzenliyorsun' : '✎ Programı düzenle'}
            </Text>
          </Pressable>
        )}

        <Panel title="Günlük Hedef Durumu" right="otomatik">
          <Bar label="Kalori" val={totals.kcal} target={client.kcal_target} unit="kcal" color={C.lime} />
          <Bar label="Protein" val={totals.p} target={client.macro_p} unit="g" color={C.blue} />
          <Bar label="Karbonhidrat" val={totals.k} target={client.macro_k} unit="g" color={C.orange} />
          <Bar label="Yağ" val={totals.y} target={client.macro_y} unit="g" color={C.red} />
          {isTrainer && totals.kcal === 0 && (
            <Text style={styles.barHint}>
              Bu çubuklar danışanın aşağıda "Yendi" işaretlediği besinlere göre dolar — danışan henüz bugün için hiçbir şey işaretlemedi.
            </Text>
          )}
        </Panel>

        <Panel title="Notlar" right={`${notes.length} not`}>
          {notes.length === 0 ? (
            <Text style={styles.empty}>Henüz not yok.</Text>
          ) : (
            notes.map((n) => (
              <View key={n.id} style={styles.noteRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteText}>{n.note}</Text>
                  <Text style={styles.noteDate}>{new Date(n.created_at).toLocaleDateString('tr-TR')}</Text>
                </View>
                {isTrainer && (
                  <Pressable onPress={() => deleteNote.mutate(n.id, { onError: onErr('Silinemedi') })} hitSlop={8}>
                    <Text style={styles.listDelete}>Sil</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
          {isTrainer && (
            <View style={styles.inlineForm}>
              <AuthField label="Yeni Not" value={noteDraft} onChangeText={setNoteDraft} placeholder="Ör. Bu hafta şeker tüketimine dikkat et" />
              <PrimaryButton
                label="Not Ekle"
                loading={addNote.isPending}
                disabled={!noteDraft.trim()}
                onPress={() =>
                  addNote.mutate(noteDraft.trim(), { onSuccess: () => setNoteDraft(''), onError: onErr('Not eklenemedi') })
                }
              />
            </View>
          )}
        </Panel>

        {meals.map((m) => {
          const mk = m.items.reduce((a, it) => a + it.kcal * it.todayQty, 0);
          const mp = m.items.reduce((a, it) => a + it.p * it.todayQty, 0);
          return (
            <Panel
              key={m.id}
              title={m.name}
              right={editMode ? undefined : `${nf(mk)} kcal · ${nf(mp)} g protein`}
            >
              {editMode && (
                <Pressable style={styles.deleteMealBtn} onPress={() => deleteMeal.mutate(m.id, { onError: onErr('Öğün silinemedi') })}>
                  <Text style={styles.deleteMealText}>Öğünü Sil</Text>
                </Pressable>
              )}

              {m.items.map((it) => {
                if (editMode) {
                  return (
                    <MealItemEditRow
                      key={it.id}
                      initial={{ food: it.food, unit: it.unit, kcal: it.kcal, p: it.p, k: it.k, y: it.y, default_qty: it.default_qty }}
                      saving={updateMealItem.isPending || deleteMealItem.isPending}
                      onSave={(v) => updateMealItem.mutate({ id: it.id, ...v }, { onError: onErr('Kaydedilemedi') })}
                      onDelete={() => deleteMealItem.mutate(it.id, { onError: onErr('Silinemedi') })}
                    />
                  );
                }
                const applied = it.todayQty > 0;
                return (
                  <FoodRow
                    key={it.id}
                    item={{ food: it.food, unit: it.unit, defaultQty: it.default_qty, applied, kcal: it.kcal, p: it.p, k: it.k, y: it.y }}
                    readOnly={isTrainer}
                    onToggle={() => {
                      const next = applied ? 0 : it.default_qty;
                      updateQty.mutate({ mealItemId: it.id, qty: next }, { onError: onErr('Kaydedilemedi') });
                    }}
                  />
                );
              })}

              {editMode && addingItemForMeal === m.id && (
                <MealItemEditRow
                  initial={null}
                  saving={addMealItem.isPending}
                  suggestions={foodLibraryQuery.data}
                  onSave={(v) =>
                    addMealItem.mutate(
                      { meal_id: m.id, sort_order: m.items.length, ...v },
                      { onSuccess: () => setAddingItemForMeal(null), onError: onErr('Besin eklenemedi') }
                    )
                  }
                  onCancel={() => setAddingItemForMeal(null)}
                />
              )}

              {editMode && addingItemForMeal !== m.id && (
                <Pressable style={styles.addItemBtn} onPress={() => setAddingItemForMeal(m.id)}>
                  <Text style={styles.addItemText}>+ Besin Ekle</Text>
                </Pressable>
              )}
            </Panel>
          );
        })}

        {editMode && !addingMeal && (
          <Pressable style={styles.addMealBtn} onPress={() => setAddingMeal(true)}>
            <Text style={styles.addMealText}>+ Yeni Öğün Ekle</Text>
          </Pressable>
        )}

        {editMode && addingMeal && (
          <View style={styles.addMealCard}>
            <AuthField label="Öğün Adı" value={newMealName} onChangeText={setNewMealName} placeholder="Ör. Ara Öğün" />
            <PrimaryButton
              label="Öğün Ekle"
              loading={addMeal.isPending}
              disabled={!newMealName.trim()}
              onPress={() =>
                addMeal.mutate(
                  { name: newMealName.trim(), sort_order: meals.length },
                  { onSuccess: () => { setNewMealName(''); setAddingMeal(false); }, onError: onErr('Öğün eklenemedi') }
                )
              }
            />
          </View>
        )}

        <Panel title="Takviye Planı" right={`${supplements.length} takviye`}>
          {supplements.length === 0 ? (
            <Text style={styles.empty}>Henüz takviye eklenmedi.</Text>
          ) : (
            supplements.map((s) => (
              <View key={s.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listName}>{s.name}</Text>
                  <Text style={styles.listMeta}>
                    {[s.dose, s.timing].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
                {editMode && (
                  <Pressable onPress={() => deleteSupplement.mutate(s.id, { onError: onErr('Silinemedi') })} hitSlop={8}>
                    <Text style={styles.listDelete}>Sil</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}

          {editMode && (
            <View style={styles.inlineForm}>
              <AuthField label="Takviye Adı" value={supplementDraft.name} onChangeText={(v) => setSupplementDraft((s) => ({ ...s, name: v }))} placeholder="Ör. Whey Protein" />
              <View style={styles.rowGap}>
                <View style={{ flex: 1 }}>
                  <AuthField label="Doz" value={supplementDraft.dose} onChangeText={(v) => setSupplementDraft((s) => ({ ...s, dose: v }))} placeholder="Ör. 30 g" />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthField label="Zamanlama" value={supplementDraft.timing} onChangeText={(v) => setSupplementDraft((s) => ({ ...s, timing: v }))} placeholder="Ör. Antrenman sonrası" />
                </View>
              </View>
              <PrimaryButton
                label="Takviye Ekle"
                loading={addSupplement.isPending}
                disabled={!supplementDraft.name.trim()}
                onPress={() => {
                  if (!selectedClientId) { Alert.alert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.'); return; }
                  addSupplement.mutate(
                    { name: supplementDraft.name.trim(), dose: supplementDraft.dose.trim(), timing: supplementDraft.timing.trim(), sort_order: supplements.length },
                    { onSuccess: () => setSupplementDraft({ name: '', dose: '', timing: '' }), onError: onErr('Takviye eklenemedi') }
                  );
                }}
              />
            </View>
          )}
        </Panel>

        <Panel title="Alışveriş Listesi" right={`${shoppingItems.filter((i) => !i.checked).length} kalan`}>
          {shoppingItems.length === 0 ? (
            <Text style={styles.empty}>Liste boş.</Text>
          ) : (
            shoppingItems.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <Pressable
                  style={styles.shopCheckRow}
                  onPress={() => toggleShoppingItem.mutate({ id: item.id, checked: !item.checked }, { onError: onErr('Güncellenemedi') })}
                >
                  <View style={[styles.checkbox, item.checked && styles.checkboxOn]}>
                    {item.checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={[styles.listName, item.checked && styles.listNameChecked]}>
                    {item.name}
                    {item.quantity ? ` · ${item.quantity}` : ''}
                  </Text>
                </Pressable>
                {editMode && (
                  <Pressable onPress={() => deleteShoppingItem.mutate(item.id, { onError: onErr('Silinemedi') })} hitSlop={8}>
                    <Text style={styles.listDelete}>Sil</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}

          {editMode && (
            <View style={styles.inlineForm}>
              <View style={styles.rowGap}>
                <View style={{ flex: 2 }}>
                  <AuthField label="Ürün" value={shoppingDraft.name} onChangeText={(v) => setShoppingDraft((s) => ({ ...s, name: v }))} placeholder="Ör. Yumurta" />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthField label="Miktar" value={shoppingDraft.quantity} onChangeText={(v) => setShoppingDraft((s) => ({ ...s, quantity: v }))} placeholder="Ör. 1 koli" />
                </View>
              </View>
              <PrimaryButton
                label="Ürün Ekle"
                loading={addShoppingItem.isPending}
                disabled={!shoppingDraft.name.trim()}
                onPress={() => {
                  if (!selectedClientId) { Alert.alert('Bekle', 'Danışan bilgisi henüz yüklenmedi, birkaç saniye sonra tekrar dene.'); return; }
                  addShoppingItem.mutate(
                    { name: shoppingDraft.name.trim(), quantity: shoppingDraft.quantity.trim(), sort_order: shoppingItems.length },
                    { onSuccess: () => setShoppingDraft({ name: '', quantity: '' }), onError: onErr('Ürün eklenemedi') }
                  );
                }}
              />
            </View>
          )}
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4 },
  editToggle: {
    alignSelf: 'flex-start',
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.edge,
    backgroundColor: C.card,
  },
  editToggleOn: { backgroundColor: C.lime, borderColor: C.lime },
  editToggleText: { fontSize: 12, fontWeight: '700', color: C.greyD },
  deleteMealBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  deleteMealText: { fontSize: 11, fontWeight: '700', color: C.red },
  addItemBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  addItemText: { fontSize: 13, color: C.greyD, fontWeight: '600' },
  addMealBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  addMealText: { fontSize: 13, color: C.greyD },
  addMealCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.edge, padding: 14, marginBottom: 14 },
  empty: { color: C.greyD, fontSize: 12 },
  barHint: { color: C.greyD, fontSize: 11, marginTop: 6, lineHeight: 16, fontStyle: 'italic' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 8,
  },
  listName: { color: C.white, fontWeight: '700', fontSize: 13 },
  listNameChecked: { color: C.greyD, textDecorationLine: 'line-through' },
  listMeta: { color: C.greyD, fontSize: 11, marginTop: 2 },
  listDelete: { color: C.red, fontSize: 11, fontWeight: '700' },
  inlineForm: { marginTop: 4 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  noteText: { color: C.white, fontSize: 13, lineHeight: 18 },
  noteDate: { color: C.greyD, fontSize: 10, marginTop: 4 },
  rowGap: { flexDirection: 'row', gap: 8 },
  shopCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.greyD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: C.lime, borderColor: C.lime },
  checkboxMark: { color: C.bg, fontSize: 12, fontWeight: '900' },
});
