import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { dateKey, formatWeight } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { BodyWeight } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

import { BodyWeightEditorSheet } from './BodyWeightEditorSheet';
import { RangePicker, rangeCutoff, type Range } from './RangePicker';
import { WeightChart, type WeightPoint } from './WeightChart';

const LB_PER_KG = 2.20462;

/**
 * Body-weight trend: line chart of weight over time plus the latest value and
 * its change across the range. "Update" opens a ruler bottom sheet to log — or
 * overwrite — today's weight. Stored values are always lbs; we convert for
 * display.
 */
export function BodyWeightCard({ userId }: { userId: string | undefined }) {
  const { profile } = useAuth();
  const unit = profile?.preferred_unit ?? 'lbs';

  const [points, setPoints] = useState<WeightPoint[]>([]);
  const [range, setRange] = useState<Range>('3m');
  const [editing, setEditing] = useState(false);

  // Convert stored lbs into the displayed unit, rounding to the nearest tenth.
  const toDisplay = useCallback(
    (lbs: number) => Math.round((unit === 'kg' ? lbs / LB_PER_KG : lbs) * 10) / 10,
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
          onPress={() => setEditing(true)}
          className="items-center py-1 active:opacity-70"
          hitSlop={6}
        >
          <Text className="text-sm font-semibold text-primary">
            {latest !== null ? 'Update weight' : 'Log weight'}
          </Text>
        </Pressable>
      </View>

      <BodyWeightEditorSheet
        visible={editing}
        onClose={() => setEditing(false)}
        userId={userId}
        latestLbs={latest}
        onSaved={load}
      />
    </View>
  );
}
