import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { AuthField } from '../../components/AuthField';
import { Bar } from '../../components/Bar';
import { FoodRow } from '../../components/FoodRow';
import { MealItemEditRow } from '../../components/MealItemEditRow';
import { MonthlyNutritionPlan } from '../../components/MonthlyNutritionPlan';
import { EmptyClientState } from '../../components/EmptyClientState';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
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

function useOnErr() {
  const t = useT();
  return (title: string) => (e: any) => showAlert(title, e.message ?? t('common.error'));
}

export default function BeslenmeScreen() {
  const t = useT();
  const onErr = useOnErr();
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
      seedFoodLibrary.mutate(undefined, { onError: onErr(t('beslenme.err_seed_food_library')) });
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

  if (isTrainer && !selectedClientId) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={t('nav.beslenme')} />
        <EmptyClientState />
      </View>
    );
  }

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
      <ScreenHeader title={t('nav.beslenme')} clientName={client.name} showPill={isTrainer} />
      <ScrollView contentContainerStyle={styles.content}>
        {isTrainer && (
          <Pressable
            style={[styles.editToggle, editMode && styles.editToggleOn]}
            onPress={() => setEditMode((v) => !v)}
            hitSlop={10}
          >
            <Text style={[styles.editToggleText, editMode && { color: C.bg }]}>
              {editMode ? t('beslenme.edit_toggle_on') : t('antrenman.edit_toggle')}
            </Text>
          </Pressable>
        )}

        <Panel title={t('beslenme.daily_target_title')} right={t('beslenme.auto')}>
          <Bar label={t('beslenme.calorie_label')} val={totals.kcal} target={client.kcal_target} unit="kcal" color={C.lime} />
          <Bar label={t('beslenme.protein_label')} val={totals.p} target={client.macro_p} unit="g" color={C.blue} />
          <Bar label={t('beslenme.carb_label')} val={totals.k} target={client.macro_k} unit="g" color={C.orange} />
          <Bar label={t('beslenme.fat_label')} val={totals.y} target={client.macro_y} unit="g" color={C.red} />
          {isTrainer && totals.kcal === 0 && (
            <Text style={styles.barHint}>{t('beslenme.bar_hint')}</Text>
          )}
        </Panel>

        <Panel title={t('beslenme.notes_title')} right={t('beslenme.notes_count', { count: notes.length })}>
          {notes.length === 0 ? (
            <Text style={styles.empty}>{t('beslenme.notes_empty')}</Text>
          ) : (
            notes.map((n) => (
              <View key={n.id} style={styles.noteRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteText}>{n.note}</Text>
                  <Text style={styles.noteDate}>{new Date(n.created_at).toLocaleDateString('tr-TR')}</Text>
                </View>
                {isTrainer && (
                  <Pressable onPress={() => deleteNote.mutate(n.id, { onError: onErr(t('common.delete_failed_title')) })} hitSlop={8}>
                    <Text style={styles.listDelete}>{t('common.delete')}</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
          {isTrainer && (
            <View style={styles.inlineForm}>
              <AuthField label={t('beslenme.new_note_label')} value={noteDraft} onChangeText={setNoteDraft} placeholder={t('beslenme.new_note_placeholder')} />
              <PrimaryButton
                label={t('beslenme.add_note_btn')}
                loading={addNote.isPending}
                disabled={!noteDraft.trim()}
                onPress={() =>
                  addNote.mutate(noteDraft.trim(), { onSuccess: () => setNoteDraft(''), onError: onErr(t('beslenme.err_add_note')) })
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
                <Pressable style={styles.deleteMealBtn} onPress={() => deleteMeal.mutate(m.id, { onError: onErr(t('beslenme.err_delete_meal')) })}>
                  <Text style={styles.deleteMealText}>{t('beslenme.delete_meal_btn')}</Text>
                </Pressable>
              )}

              {m.items.map((it) => {
                if (editMode) {
                  return (
                    <MealItemEditRow
                      key={it.id}
                      initial={{ food: it.food, unit: it.unit, kcal: it.kcal, p: it.p, k: it.k, y: it.y, default_qty: it.default_qty }}
                      saving={updateMealItem.isPending || deleteMealItem.isPending}
                      onSave={(v) => updateMealItem.mutate({ id: it.id, ...v }, { onError: onErr(t('antrenman.err_save_title')) })}
                      onDelete={() => deleteMealItem.mutate(it.id, { onError: onErr(t('common.delete_failed_title')) })}
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
                      updateQty.mutate({ mealItemId: it.id, qty: next }, { onError: onErr(t('antrenman.err_save_title')) });
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
                      { onSuccess: () => setAddingItemForMeal(null), onError: onErr(t('beslenme.err_add_food')) }
                    )
                  }
                  onCancel={() => setAddingItemForMeal(null)}
                />
              )}

              {editMode && addingItemForMeal !== m.id && (
                <Pressable style={styles.addItemBtn} onPress={() => setAddingItemForMeal(m.id)}>
                  <Text style={styles.addItemText}>{t('beslenme.add_item_btn')}</Text>
                </Pressable>
              )}
            </Panel>
          );
        })}

        {editMode && !addingMeal && (
          <Pressable style={styles.addMealBtn} onPress={() => setAddingMeal(true)}>
            <Text style={styles.addMealText}>{t('beslenme.add_meal_btn')}</Text>
          </Pressable>
        )}

        {editMode && addingMeal && (
          <View style={styles.addMealCard}>
            <AuthField label={t('beslenme.meal_name_label')} value={newMealName} onChangeText={setNewMealName} placeholder={t('beslenme.meal_name_placeholder')} />
            <PrimaryButton
              label={t('beslenme.add_meal_confirm_btn')}
              loading={addMeal.isPending}
              disabled={!newMealName.trim()}
              onPress={() =>
                addMeal.mutate(
                  { name: newMealName.trim(), sort_order: meals.length },
                  { onSuccess: () => { setNewMealName(''); setAddingMeal(false); }, onError: onErr(t('beslenme.err_add_meal')) }
                )
              }
            />
          </View>
        )}

        <Panel title={t('beslenme.supplement_plan_title')} right={t('beslenme.supplement_count', { count: supplements.length })}>
          {supplements.length === 0 ? (
            <Text style={styles.empty}>{t('beslenme.supplement_empty')}</Text>
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
                  <Pressable onPress={() => deleteSupplement.mutate(s.id, { onError: onErr(t('common.delete_failed_title')) })} hitSlop={8}>
                    <Text style={styles.listDelete}>{t('common.delete')}</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}

          {editMode && (
            <View style={styles.inlineForm}>
              <AuthField label={t('beslenme.supplement_name_label')} value={supplementDraft.name} onChangeText={(v) => setSupplementDraft((s) => ({ ...s, name: v }))} placeholder={t('beslenme.supplement_name_placeholder')} />
              <View style={styles.rowGap}>
                <View style={{ flex: 1 }}>
                  <AuthField label={t('beslenme.dose_label')} value={supplementDraft.dose} onChangeText={(v) => setSupplementDraft((s) => ({ ...s, dose: v }))} placeholder={t('beslenme.dose_placeholder')} />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthField label={t('beslenme.timing_label')} value={supplementDraft.timing} onChangeText={(v) => setSupplementDraft((s) => ({ ...s, timing: v }))} placeholder={t('beslenme.timing_placeholder')} />
                </View>
              </View>
              <PrimaryButton
                label={t('beslenme.add_supplement_btn')}
                loading={addSupplement.isPending}
                disabled={!supplementDraft.name.trim()}
                onPress={() => {
                  if (!selectedClientId) { showAlert(t('beslenme.wait_title'), t('beslenme.client_not_loaded')); return; }
                  addSupplement.mutate(
                    { name: supplementDraft.name.trim(), dose: supplementDraft.dose.trim(), timing: supplementDraft.timing.trim(), sort_order: supplements.length },
                    { onSuccess: () => setSupplementDraft({ name: '', dose: '', timing: '' }), onError: onErr(t('beslenme.err_add_supplement')) }
                  );
                }}
              />
            </View>
          )}
        </Panel>

        <Panel title={t('beslenme.shopping_list_title')} right={t('beslenme.shopping_remaining', { count: shoppingItems.filter((i) => !i.checked).length })}>
          {shoppingItems.length === 0 ? (
            <Text style={styles.empty}>{t('beslenme.shopping_empty')}</Text>
          ) : (
            shoppingItems.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <Pressable
                  style={styles.shopCheckRow}
                  onPress={() => toggleShoppingItem.mutate({ id: item.id, checked: !item.checked }, { onError: onErr(t('common.update_failed_title')) })}
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
                  <Pressable onPress={() => deleteShoppingItem.mutate(item.id, { onError: onErr(t('common.delete_failed_title')) })} hitSlop={8}>
                    <Text style={styles.listDelete}>{t('common.delete')}</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}

          {editMode && (
            <View style={styles.inlineForm}>
              <View style={styles.rowGap}>
                <View style={{ flex: 2 }}>
                  <AuthField label={t('beslenme.product_label')} value={shoppingDraft.name} onChangeText={(v) => setShoppingDraft((s) => ({ ...s, name: v }))} placeholder={t('beslenme.product_placeholder')} />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthField label={t('beslenme.quantity_label')} value={shoppingDraft.quantity} onChangeText={(v) => setShoppingDraft((s) => ({ ...s, quantity: v }))} placeholder={t('beslenme.quantity_placeholder')} />
                </View>
              </View>
              <PrimaryButton
                label={t('beslenme.add_product_btn')}
                loading={addShoppingItem.isPending}
                disabled={!shoppingDraft.name.trim()}
                onPress={() => {
                  if (!selectedClientId) { showAlert(t('beslenme.wait_title'), t('beslenme.client_not_loaded')); return; }
                  addShoppingItem.mutate(
                    { name: shoppingDraft.name.trim(), quantity: shoppingDraft.quantity.trim(), sort_order: shoppingItems.length },
                    { onSuccess: () => setShoppingDraft({ name: '', quantity: '' }), onError: onErr(t('beslenme.err_add_product')) }
                  );
                }}
              />
            </View>
          )}
        </Panel>

        <MonthlyNutritionPlan clientId={client.id} isTrainer={isTrainer} trainerId={isTrainer ? profile?.id : undefined} />
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
