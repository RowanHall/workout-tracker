import { router, useFocusEffect } from 'expo-router';
import { Check, ChevronDown, Lock } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { dateKey, formatWeight } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { BodyWeight } from '@/lib/types';
import { usePremium } from '@/providers/PremiumProvider';

import { WeightChart, type WeightPoint } from './WeightChart';

type Range = '3m' | '1y' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  '3m': '3 months',
  '1y': '1 year',
  all: 'All time',
};
const RANGE_SHORT: Record<Range, string> = {
  '3m': '3M',
  '1y': '1Y',
  all: 'All',
};
const RANGE_OPTIONS: Range[] = ['3m', '1y', 'all'];
const PREMIUM_RANGES: Range[] = ['1y', 'all'];

function cutoffFor(range: Range): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - (range === '3m' ? 90 : 365));
  return d;
}

/**
 * Body-weight trend: line chart of weight over time plus the latest value and
 * its change across the range. Includes an inline "Update" button that lets
 * you log (or overwrite) today's weight without leaving the screen.
 */
export function BodyWeightCard({ userId }: { userId: string | undefined }) {
  const { isPremium } = usePremium();
  const [points, setPoints] = useState<WeightPoint[]>([]);
  const [range, setRange] = useState<Range>('3m');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    let query = supabase
      .from('body_weights')
      .select('recorded_on, weight')
      .eq('user_id', userId)
      .order('recorded_on', { ascending: false });
    const cutoff = cutoffFor(range);
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

  async function handleSave() {
    const w = parseFloat(input);
    if (Number.isNaN(w) || w <= 0 || w >= 2000) {
      Alert.alert('Invalid weight', 'Enter your body weight in lbs.');
      return;
    }
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('body_weights').upsert(
        {
          user_id: userId,
          recorded_on: dateKey(new Date()),
          weight: w,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,recorded_on' }
      );
      if (error) throw error;
      setInput('');
      setEditing(false);
      await load();
    } catch (err: any) {
      Alert.alert('Could not log weight', err.message);
    } finally {
      setSaving(false);
    }
  }

  function openEditor() {
    setInput('');
    setEditing(true);
  }

  function cancelEditor() {
    setInput('');
    setEditing(false);
  }

  return (
    <View className="mb-4 rounded-2xl bg-surface p-4">
      <View className="mb-3 flex-row items-end justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-white">Body Weight</Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            hitSlop={8}
            className="flex-row items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-muted">{RANGE_SHORT[range]}</Text>
            <ChevronDown size={12} color="#8B98A9" strokeWidth={2.5} />
          </Pressable>
        </View>
        {latest !== null && (
          <View className="flex-row items-baseline gap-2">
            <Text className="text-lg font-bold text-white">
              {formatWeight(latest)} <Text className="text-sm font-normal text-muted">lbs</Text>
            </Text>
            {points.length > 1 && delta !== 0 && (
              <Text className="text-xs text-muted">
                {delta > 0 ? '▲' : '▼'} {formatWeight(Math.abs(delta))}
              </Text>
            )}
          </View>
        )}
      </View>

      <WeightChart data={points} />

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 px-10"
          onPress={() => setPickerOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-[280px] overflow-hidden rounded-2xl bg-surface"
          >
            <View className="border-b border-white/5 px-4 py-3">
              <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
                Range
              </Text>
            </View>
            {RANGE_OPTIONS.map((opt) => {
              const selected = opt === range;
              const locked = !isPremium && PREMIUM_RANGES.includes(opt);
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    setPickerOpen(false);
                    if (locked) {
                      router.push('/premium');
                      return;
                    }
                    setRange(opt);
                  }}
                  className="flex-row items-center justify-between border-b border-white/5 px-4 py-3.5 active:opacity-70"
                >
                  <Text
                    className={`text-[15px] ${
                      selected ? 'font-bold text-primary' : locked ? 'text-muted' : 'text-white'
                    }`}
                  >
                    {RANGE_LABELS[opt]}
                  </Text>
                  {locked ? (
                    <Lock size={14} color="#8B98A9" strokeWidth={2.5} />
                  ) : selected ? (
                    <Check size={16} color="#22C55E" strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <View className="mt-3 border-t border-white/5 pt-3">
        {editing ? (
          <View className="flex-row items-center gap-2">
            <TextInput
              autoFocus
              className="flex-1 rounded-xl bg-surface-2 px-3 py-2.5 text-white"
              placeholder={latest !== null ? `${formatWeight(latest)} lbs` : 'Weight (lbs)'}
              placeholderTextColor="#16803C"
              keyboardType="decimal-pad"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSave}
            />
            <Pressable
              onPress={cancelEditor}
              hitSlop={8}
              className="px-2 py-2.5 active:opacity-70"
            >
              <Text className="text-sm font-semibold text-muted">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving || !input}
              className="rounded-xl bg-primary px-4 py-2.5 active:opacity-80 disabled:opacity-40"
            >
              <Text className="text-sm font-bold text-background">
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={openEditor}
            className="items-center py-1 active:opacity-70"
            hitSlop={6}
          >
            <Text className="text-sm font-semibold text-primary">
              {latest !== null ? 'Update weight' : 'Log weight'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
