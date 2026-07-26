import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthField } from './AuthField';
import { MealItemEditRow } from './MealItemEditRow';
import { Panel } from './Panel';
import { PrimaryButton } from './PrimaryButton';
import { showAlert } from '../lib/alert';
import { useT } from '../lib/i18n';
import {
  useAddMeal,
  useAddMealItem,
  useDeleteMeal,
  useDeleteMealItem,
  useFoodLibrary,
  useMonthlyMealPlan,
  useUpdateMealItem,
} from '../lib/queries';
import { C, TR_MONTHS, TR_WEEKDAY_SHORT, daysInMonth, localDateStr, nf } from '../lib/theme';

function useOnErr() {
  const t = useT();
  return (title: string) => (e: any) => showAlert(title, e.message ?? t('common.error'));
}

export function MonthlyNutritionPlan({
  clientId,
  isTrainer,
  trainerId,
}: {
  clientId: string;
  isTrainer: boolean;
  trainerId?: string;
}) {
  const t = useT();
  const onErr = useOnErr();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [addingMeal, setAddingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [addingItemForMeal, setAddingItemForMeal] = useState<string | null>(null);

  const planQuery = useMonthlyMealPlan(clientId, viewYear, viewMonth);
  const foodLibraryQuery = useFoodLibrary(isTrainer ? trainerId : undefined);
  const addMeal = useAddMeal(clientId);
  const deleteMeal = useDeleteMeal(clientId);
  const addMealItem = useAddMealItem(clientId, isTrainer ? trainerId : undefined);
  const updateMealItem = useUpdateMealItem(clientId);
  const deleteMealItem = useDeleteMealItem(clientId);

  const mealsByDate = useMemo(() => {
    const map = new Map<string, typeof planQuery.data>();
    (planQuery.data ?? []).forEach((m) => {
      if (!m.plan_date) return;
      const list = map.get(m.plan_date) ?? [];
      list.push(m);
      map.set(m.plan_date, list);
    });
    return map;
  }, [planQuery.data]);

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
    setExpandedDate(null);
    setAddingMeal(false);
    setAddingItemForMeal(null);
  }

  const todayStr = localDateStr();
  const total = daysInMonth(viewYear, viewMonth);
  const days = Array.from({ length: total }, (_, i) => i + 1);

  function dateFor(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <Panel title={t('monthly_nutrition.title')} right={t('monthly_nutrition.days_count', { count: total })}>
      <View style={styles.monthNav}>
        <Pressable onPress={() => changeMonth(-1)} hitSlop={8}>
          <Text style={styles.monthNavText}>‹ {TR_MONTHS[(viewMonth + 11) % 12]}</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{TR_MONTHS[viewMonth]} {viewYear}</Text>
        <Pressable onPress={() => changeMonth(1)} hitSlop={8}>
          <Text style={styles.monthNavText}>{TR_MONTHS[(viewMonth + 1) % 12]} ›</Text>
        </Pressable>
      </View>

      {planQuery.isLoading ? (
        <ActivityIndicator color={C.lime} />
      ) : (
        days.map((day) => {
          const date = dateFor(day);
          const meals = mealsByDate.get(date) ?? [];
          const isToday = date === todayStr;
          const isExpanded = expandedDate === date;
          const weekday = TR_WEEKDAY_SHORT[new Date(viewYear, viewMonth, day).getDay()];
          const dayTotals = meals.reduce(
            (a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, k: a.k + m.k, y: a.y + m.y }),
            { kcal: 0, p: 0, k: 0, y: 0 }
          );

          if (!isExpanded) {
            const clickable = isTrainer || meals.length > 0;
            return (
              <Pressable
                key={date}
                style={[styles.dayRow, isToday && styles.dayRowToday]}
                onPress={clickable ? () => setExpandedDate(date) : undefined}
              >
                <View style={styles.dayNumBox}>
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{day}</Text>
                  <Text style={styles.dayWeekday}>{isToday ? t('monthly_nutrition.today') : weekday}</Text>
                </View>
                {meals.length === 0 ? (
                  <Text style={styles.dayEmpty}>{t('monthly_nutrition.no_plan')}</Text>
                ) : (
                  <Text style={styles.daySummary}>{t('monthly_nutrition.meals_planned', { count: meals.length })}</Text>
                )}
                <View style={{ flex: 1 }} />
                {meals.length > 0 ? (
                  <Text style={styles.dayKcal}>{nf(dayTotals.kcal)} kcal</Text>
                ) : isTrainer ? (
                  <Text style={styles.dayAddHint}>{t('monthly_nutrition.write_plan_hint')}</Text>
                ) : null}
              </Pressable>
            );
          }

          return (
            <View key={date} style={[styles.dayCard, isToday && styles.dayCardToday]}>
              <Pressable style={styles.dayCardHeader} onPress={() => setExpandedDate(null)}>
                <View style={styles.dayNumBox}>
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{day}</Text>
                  <Text style={styles.dayWeekday}>{isToday ? t('monthly_nutrition.today') : weekday}</Text>
                </View>
                <Text style={styles.dayCardTitle}>{t('monthly_nutrition.day_plan_title', { weekday })}</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.dayKcal}>{nf(dayTotals.kcal)} kcal</Text>
              </Pressable>

              {meals.length > 0 && (
                <View style={styles.macroChips}>
                  <View style={styles.macroChip}>
                    <Text style={[styles.macroChipVal, { color: C.blue }]}>{nf(dayTotals.p)}g</Text>
                    <Text style={styles.macroChipLabel}>{t('beslenme.protein_label')}</Text>
                  </View>
                  <View style={styles.macroChip}>
                    <Text style={[styles.macroChipVal, { color: C.orange }]}>{nf(dayTotals.k)}g</Text>
                    <Text style={styles.macroChipLabel}>{t('monthly_nutrition.carb_abbrev')}</Text>
                  </View>
                  <View style={styles.macroChip}>
                    <Text style={[styles.macroChipVal, { color: C.red }]}>{nf(dayTotals.y)}g</Text>
                    <Text style={styles.macroChipLabel}>{t('beslenme.fat_label')}</Text>
                  </View>
                </View>
              )}

              {meals.map((m) => (
                <View key={m.id} style={styles.mealBlock}>
                  <View style={styles.mealBlockHeader}>
                    <Text style={styles.mealBlockTitle}>{m.name}</Text>
                    <Text style={styles.mealBlockKcal}>{nf(m.kcal)} kcal</Text>
                    {isTrainer && (
                      <Pressable onPress={() => deleteMeal.mutate(m.id, { onError: onErr(t('beslenme.err_delete_meal')) })} hitSlop={8}>
                        <Text style={styles.mealBlockDelete}>{t('common.delete')}</Text>
                      </Pressable>
                    )}
                  </View>

                  {m.items.length === 0 ? (
                    <Text style={styles.mealEmptyText}>{t('monthly_nutrition.no_food_yet')}</Text>
                  ) : isTrainer ? (
                    m.items.map((it) => (
                      <MealItemEditRow
                        key={it.id}
                        initial={{ food: it.food, unit: it.unit, kcal: it.kcal, p: it.p, k: it.k, y: it.y, default_qty: it.default_qty }}
                        saving={updateMealItem.isPending || deleteMealItem.isPending}
                        onSave={(v) => updateMealItem.mutate({ id: it.id, ...v }, { onError: onErr(t('antrenman.err_save_title')) })}
                        onDelete={() => deleteMealItem.mutate(it.id, { onError: onErr(t('common.delete_failed_title')) })}
                      />
                    ))
                  ) : (
                    <Text style={styles.mealItemsText}>
                      {m.items.map((it) => `${nf(it.default_qty)} ${it.unit} ${it.food}`).join(' · ')}
                    </Text>
                  )}

                  {isTrainer &&
                    (addingItemForMeal === m.id ? (
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
                    ) : (
                      <Pressable style={styles.addItemBtn} onPress={() => setAddingItemForMeal(m.id)}>
                        <Text style={styles.addItemText}>{t('beslenme.add_item_btn')}</Text>
                      </Pressable>
                    ))}
                </View>
              ))}

              {isTrainer && !addingMeal && (
                <Pressable style={styles.addMealBtn} onPress={() => setAddingMeal(true)}>
                  <Text style={styles.addMealText}>{t('monthly_nutrition.add_meal_btn')}</Text>
                </Pressable>
              )}

              {isTrainer && addingMeal && (
                <View style={styles.addMealCard}>
                  <AuthField label={t('beslenme.meal_name_label')} value={newMealName} onChangeText={setNewMealName} placeholder={t('monthly_nutrition.meal_name_placeholder')} />
                  <PrimaryButton
                    label={t('beslenme.add_meal_confirm_btn')}
                    loading={addMeal.isPending}
                    disabled={!newMealName.trim()}
                    onPress={() =>
                      addMeal.mutate(
                        { name: newMealName.trim(), sort_order: meals.length, plan_date: date },
                        { onSuccess: () => { setNewMealName(''); setAddingMeal(false); }, onError: onErr(t('beslenme.err_add_meal')) }
                      )
                    }
                  />
                </View>
              )}
            </View>
          );
        })
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  monthNavText: { color: C.grey, fontSize: 13 },
  monthLabel: { color: C.white, fontSize: 13, fontWeight: '700' },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  dayRowToday: { borderWidth: 1, borderColor: C.lime },
  dayNumBox: { width: 34, alignItems: 'center' },
  dayNum: { color: C.white, fontSize: 14, fontWeight: '700' },
  dayNumToday: { color: C.lime },
  dayWeekday: { color: C.greyD, fontSize: 9, marginTop: 1 },
  dayEmpty: { color: C.grey, fontSize: 12, fontStyle: 'italic' },
  daySummary: { color: C.white, fontSize: 12 },
  dayKcal: { color: C.white, fontSize: 12, fontWeight: '700' },
  dayAddHint: { color: C.greyD, fontSize: 11, fontWeight: '700' },
  dayCard: { backgroundColor: C.card2, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.edge },
  dayCardToday: { borderColor: C.lime },
  dayCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dayCardTitle: { color: C.grey, fontSize: 12 },
  macroChips: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  macroChip: { flex: 1, backgroundColor: C.bg, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  macroChipVal: { fontSize: 12, fontWeight: '700' },
  macroChipLabel: { color: C.greyD, fontSize: 9, marginTop: 1 },
  mealBlock: { backgroundColor: C.bg, borderRadius: 8, padding: 10, marginBottom: 8 },
  mealBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  mealBlockTitle: { color: C.white, fontSize: 12, fontWeight: '700', flex: 1 },
  mealBlockKcal: { color: C.greyD, fontSize: 10 },
  mealBlockDelete: { color: C.red, fontSize: 11, fontWeight: '700' },
  mealEmptyText: { color: C.greyD, fontSize: 11 },
  mealItemsText: { color: C.grey, fontSize: 11, lineHeight: 17 },
  addItemBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  addItemText: { fontSize: 12, color: C.greyD, fontWeight: '600' },
  addMealBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  addMealText: { fontSize: 12, color: C.greyD },
  addMealCard: { backgroundColor: C.bg, borderRadius: 10, padding: 10 },
});
