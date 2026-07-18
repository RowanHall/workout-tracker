import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

import { dateKey, formatWeight } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { BodyWeight } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

import { RangePicker, rangeCutoff, type Range } from './RangePicker';
import { WeightChart, type WeightPoint } from './WeightChart';

const LB_PER_KG = 2.20462;

// Body-weight ranges that cover the realistic adult population, mirroring the
// onboarding weight step.
const LBS_MIN = 70;
const LBS_MAX = 450;
const KG_MIN = 32;
const KG_MAX = 205;
const DEFAULT_LBS = 170;
const DEFAULT_KG = 77;

const PICKER_ITEM_STYLE = { color: '#FFFFFF', fontSize: 22 } as const;
const TENTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Body-weight trend: line chart of weight over time plus the latest value and
 * its change across the range. "Update" opens a scroll-wheel ruler (in the
 * user's preferred unit) to log — or overwrite — today's weight without
 * leaving the screen. Stored values are always lbs; we convert for display.
 */
export function BodyWeightCard({ userId }: { userId: string | undefined }) {
  const { profile } = useAuth();
  const unit = profile?.preferred_unit ?? 'lbs';

  const [points, setPoints] = useState<WeightPoint[]>([]);
  const [range, setRange] = useState<Range>('3m');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(unit === 'kg' ? DEFAULT_KG : DEFAULT_LBS);
  const [saving, setSaving] = useState(false);

  // Convert between stored lbs and the displayed unit, rounding display to the
  // nearest tenth so it lines up with the ruler's 0.1 step.
  const toDisplay = useCallback(
    (lbs: number) => Math.round((unit === 'kg' ? lbs / LB_PER_KG : lbs) * 10) / 10,
    [unit]
  );
  const toLbs = useCallback(
    (v: number) => (unit === 'kg' ? v * LB_PER_KG : v),
    [unit]
  );

  const load = useCallback(async () => {
    if (!userId) return;
    let query = supabase
      .from('body_weights')
      .select('recorded_on, weight')
      .eq('user_id', userId)
      .order('recorded_on', { ascending: false });
    const cutoff = rangeCutoff(range);
    if (cutoff) query = query.gte('recorded_on', dateKey(cutoff));
    const { data } = await query;
    const rows = ((data ?? []) as Pick<BodyWeight, 'recorded_on' | 'weight'>[])
      .map((r) => ({ recorded_on: r.recorded_on, weight: Number(r.weight) }))
      .reverse();
    setPoints(rows);
  }, [userId, range]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const latest = points.length ? points[points.length - 1].weight : null;
  const first = points.length ? points[0].weight : null;
  const delta = latest !== null && first !== null ? latest - first : 0;

  // The chart plots relative shape; convert to the display unit so its
  // tooltip numbers match the header.
  const displayPoints: WeightPoint[] = points.map((p) => ({
    recorded_on: p.recorded_on,
    weight: toDisplay(p.weight),
  }));

  const { min, max } = unit === 'kg' ? { min: KG_MIN, max: KG_MAX } : { min: LBS_MIN, max: LBS_MAX };

  const wholeValues = useMemo(() => {
    const items: number[] = [];
    for (let v = min; v <= max; v++) items.push(v);
    return items;
  }, [min, max]);

  // Split the draft into a whole-number wheel and a tenths wheel, so the two
  // native Apple-style pickers together give 0.1 resolution.
  const draftWhole = Math.max(min, Math.min(max, Math.floor(draft)));
  const draftTenth = Math.max(0, Math.min(9, Math.round((draft - Math.floor(draft)) * 10)));

  function setWholeTenth(whole: number, tenth: number) {
    setDraft(Math.max(min, Math.min(max, whole + tenth / 10)));
  }

  async function handleSave() {
    if (!userId) return;
    const w = toLbs(draft);
    if (Number.isNaN(w) || w <= 0 || w >= 2000) {
      Alert.alert('Invalid weight', `Enter your body weight in ${unit}.`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('body_weights').upsert(
        {
          user_id: userId,
          recorded_on: dateKey(new Date()),
          weight: Math.round(w * 100) / 100,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,recorded_on' }
      );
      if (error) throw error;
      setEditing(false);
      await load();
    } catch (err: any) {
      Alert.alert('Could not log weight', err.message);
    } finally {
      setSaving(false);
    }
  }

  function openEditor() {
    setDraft(latest !== null ? toDisplay(latest) : unit === 'kg' ? DEFAULT_KG : DEFAULT_LBS);
    setEditing(true);
  }

  return (
    <View className="mb-4">
      <View className="mb-3 flex-row items-end justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-white">Body Weight</Text>
          <RangePicker value={range} onChange={setRange} />
        </View>
        {latest !== null && (
          <View className="flex-row items-baseline gap-2">
            <Text className="text-lg font-bold text-white">
              {formatWeight(toDisplay(latest))}{' '}
              <Text className="text-sm font-normal text-muted">{unit}</Text>
            </Text>
            {points.length > 1 && delta !== 0 && (
              <Text className="text-xs text-muted">
                {delta > 0 ? '▲' : '▼'} {formatWeight(toDisplay(Math.abs(delta)))}
              </Text>
            )}
          </View>
        )}
      </View>

      <WeightChart data={displayPoints} />

      <View className="mt-3 border-t border-white/5 pt-3">
        <Pressable
          onPress={openEditor}
          className="items-center py-1 active:opacity-70"
          hitSlop={6}
        >
          <Text className="text-sm font-semibold text-primary">
            {latest !== null ? 'Update weight' : 'Log weight'}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={editing}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/60"
          onPress={() => setEditing(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl bg-surface px-5 pt-4 pb-8"
          >
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-white/15" />
            </View>
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
                {latest !== null ? 'Update body weight' : 'Log body weight'}
              </Text>
              <Pressable
                onPress={() => setEditing(false)}
                hitSlop={8}
                className="active:opacity-70"
              >
                <X size={20} color="#8B98A9" strokeWidth={2} />
              </Pressable>
            </View>

            <View className="items-center">
              <Text
                className="text-white"
                style={{
                  fontSize: 64,
                  fontWeight: '800',
                  letterSpacing: -2.5,
                  fontVariant: ['tabular-nums'],
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {draft.toFixed(1)}
                <Text className="text-2xl font-semibold text-muted"> {unit}</Text>
              </Text>
            </View>

            <View className="mt-4 mb-6 flex-row">
              <View className="flex-1">
                <Picker
                  selectedValue={draftWhole}
                  onValueChange={(v) => setWholeTenth(Number(v), draftTenth)}
                  itemStyle={PICKER_ITEM_STYLE}
                >
                  {wholeValues.map((v) => (
                    <Picker.Item key={v} label={`${v}`} value={v} color="#FFFFFF" />
                  ))}
                </Picker>
              </View>
              <View className="flex-1">
                <Picker
                  selectedValue={draftTenth}
                  onValueChange={(v) => setWholeTenth(draftWhole, Number(v))}
                  itemStyle={PICKER_ITEM_STYLE}
                >
                  {TENTHS.map((v) => (
                    <Picker.Item key={v} label={`.${v} ${unit}`} value={v} color="#FFFFFF" />
                  ))}
                </Picker>
              </View>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="items-center rounded-2xl bg-primary py-4 active:opacity-80 disabled:opacity-40"
            >
              <Text className="text-base font-bold text-background">
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
