import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { dateKey, formatWeight } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { BodyWeight } from '@/lib/types';

import { RangePicker, rangeCutoff, type Range } from './RangePicker';
import { WeightChart, type WeightPoint } from './WeightChart';

/**
 * Body-weight trend: line chart of weight over time plus the latest value and
 * its change across the range. Includes an inline "Update" button that lets
 * you log (or overwrite) today's weight without leaving the screen.
 */
export function BodyWeightCard({ userId }: { userId: string | undefined }) {
  const [points, setPoints] = useState<WeightPoint[]>([]);
  const [range, setRange] = useState<Range>('3m');
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
          <RangePicker value={range} onChange={setRange} />
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
