import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatWeight } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { BodyWeight } from '@/lib/types';

import { WeightChart, type WeightPoint } from './WeightChart';

/**
 * Body-weight trend on the profile: a line chart of weight over time plus the
 * latest value and its change across the range. Logging happens in Settings;
 * this card reloads on focus so it reflects new entries when you return.
 */
export function BodyWeightCard({ userId }: { userId: string | undefined }) {
  const [points, setPoints] = useState<WeightPoint[]>([]);

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

  const latest = points.length ? points[points.length - 1].weight : null;
  const first = points.length ? points[0].weight : null;
  const delta = latest !== null && first !== null ? latest - first : 0;

  return (
    <View className="mb-4 rounded-2xl bg-surface p-4">
      <View className="mb-3 flex-row items-end justify-between">
        <Text className="text-base font-bold text-white">Body Weight</Text>
        {latest !== null ? (
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
        ) : (
          <Pressable onPress={() => router.push('/settings')} hitSlop={8} className="active:opacity-70">
            <Text className="text-sm font-semibold text-primary">Log in Settings</Text>
          </Pressable>
        )}
      </View>

      <WeightChart data={points} />
    </View>
  );
}
