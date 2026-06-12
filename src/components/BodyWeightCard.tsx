import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { dateKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { BodyWeight } from '@/lib/types';

import { WeightChart, type WeightPoint } from './WeightChart';

/**
 * Body-weight tracking card: a line chart of weight over time plus an inline
 * input to log today's weight. Re-logging the same day overwrites the value.
 * Loads its own data so the profile screen doesn't have to thread it through.
 */
export function BodyWeightCard({ userId }: { userId: string | undefined }) {
  const [points, setPoints] = useState<WeightPoint[]>([]);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('body_weights')
      .select('recorded_on, weight')
      .eq('user_id', userId)
      .order('recorded_on', { ascending: false })
      .limit(90);
    const rows = ((data ?? []) as Pick<BodyWeight, 'recorded_on' | 'weight'>[])
      .map((r) => ({ recorded_on: r.recorded_on, weight: Number(r.weight) }))
      .reverse();
    setPoints(rows);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleLog() {
    const w = parseFloat(input);
    if (Number.isNaN(w) || w <= 0 || w >= 2000) {
      Alert.alert('Invalid weight', 'Enter your body weight in lbs.');
      return;
    }
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('body_weights')
        .upsert(
          { user_id: userId, recorded_on: dateKey(new Date()), weight: w, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,recorded_on' }
        );
      if (error) throw error;
      setInput('');
      await load();
    } catch (err: any) {
      Alert.alert('Could not log weight', err.message);
    } finally {
      setSaving(false);
    }
  }

  const latest = points.length ? points[points.length - 1].weight : null;
  const first = points.length ? points[0].weight : null;
  const delta = latest !== null && first !== null ? latest - first : 0;

  return (
    <View className="mb-4 rounded-2xl bg-surface p-4">
      <View className="mb-3 flex-row items-end justify-between">
        <Text className="text-base font-bold text-white">Body Weight</Text>
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

      <View className="mt-3 flex-row items-center gap-2">
        <TextInput
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-white"
          placeholder={latest !== null ? `${formatWeight(latest)} lbs` : 'Weight (lbs)'}
          placeholderTextColor="#8B98A9"
          keyboardType="decimal-pad"
          value={input}
          onChangeText={setInput}
        />
        <Pressable
          className="rounded-xl bg-primary px-5 py-2.5 active:opacity-80 disabled:opacity-50"
          disabled={saving}
          onPress={handleLog}
        >
          <Text className="font-bold text-background">{saving ? 'Saving…' : 'Log'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}
