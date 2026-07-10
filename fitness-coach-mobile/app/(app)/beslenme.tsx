import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  useClient,
  useDeleteMeal,
  useDeleteMealItem,
  useMeals,
  useUpdateMealItem,
  useUpdateMealQty,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';

export default function BeslenmeScreen() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const mealsQuery = useMeals(selectedClientId ?? undefined);
  const updateQty = useUpdateMealQty(selectedClientId ?? undefined);
  const addMeal = useAddMeal(selectedClientId ?? undefined);
  const deleteMeal = useDeleteMeal(selectedClientId ?? undefined);
  const addMealItem = useAddMealItem(selectedClientId ?? undefined);
  const updateMealItem = useUpdateMealItem(selectedClientId ?? undefined);
  const deleteMealItem = useDeleteMealItem(selectedClientId ?? undefined);

  const [editMode, setEditMode] = useState(false);
  const [addingMeal, setAddingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [addingItemForMeal, setAddingItemForMeal] = useState<string | null>(null);

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

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Beslenme" clientName={client.name} showPill={isTrainer} />
      <ScrollView contentContainerStyle={styles.content}>
        {isTrainer && (
          <Pressable style={styles.editToggle} onPress={() => setEditMode((v) => !v)}>
            <Text style={[styles.editToggleText, editMode && { color: C.lime }]}>
              {editMode ? '✓ Programı düzenliyorsun' : '✎ Programı düzenle'}
            </Text>
          </Pressable>
        )}

        <Panel title="Günlük Hedef Durumu" right="otomatik">
          <Bar label="Kalori" val={totals.kcal} target={client.kcal_target} unit="kcal" color={C.lime} />
          <Bar label="Protein" val={totals.p} target={client.macro_p} unit="g" color={C.blue} />
          <Bar label="Karbonhidrat" val={totals.k} target={client.macro_k} unit="g" color={C.orange} />
          <Bar label="Yağ" val={totals.y} target={client.macro_y} unit="g" color={C.red} />
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
                <Pressable style={styles.deleteMealBtn} onPress={() => deleteMeal.mutate(m.id)}>
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
                      onSave={(v) => updateMealItem.mutate({ id: it.id, ...v })}
                      onDelete={() => deleteMealItem.mutate(it.id)}
                    />
                  );
                }
                return (
                  <FoodRow
                    key={it.id}
                    item={{ food: it.food, qty: it.todayQty, kcal: it.kcal, p: it.p, k: it.k, y: it.y }}
                    onChange={(delta) => {
                      const next = Math.max(0, Math.round((it.todayQty + delta) * 2) / 2);
                      updateQty.mutate({ mealItemId: it.id, qty: next });
                    }}
                  />
                );
              })}

              {editMode && addingItemForMeal === m.id && (
                <MealItemEditRow
                  initial={null}
                  saving={addMealItem.isPending}
                  onSave={(v) =>
                    addMealItem.mutate(
                      { meal_id: m.id, sort_order: m.items.length, ...v },
                      { onSuccess: () => setAddingItemForMeal(null) }
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
                  { onSuccess: () => { setNewMealName(''); setAddingMeal(false); } }
                )
              }
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4 },
  editToggle: { alignSelf: 'flex-start', marginBottom: 12 },
  editToggleText: { fontSize: 12, fontWeight: '700', color: C.greyD },
  deleteMealBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  deleteMealText: { fontSize: 11, fontWeight: '700', color: C.red },
  addItemBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  addItemText: { fontSize: 13, color: C.greyD, fontWeight: '600' },
  addMealBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  addMealText: { fontSize: 13, color: C.greyD },
  addMealCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.edge, padding: 14, marginBottom: 14 },
});
