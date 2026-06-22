import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { MuscleMap } from '@/components/MuscleMap';
import { mergeMuscles } from '@/lib/muscles';
import { supabase } from '@/lib/supabase';
import type { ExerciseMuscle } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

interface SetRow {
  exercises: { muscles: ExerciseMuscle[] } | null;
}

export default function MuscleMapScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [muscles, setMuscles] = useState<ExerciseMuscle[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const res = await supabase
      .from('workout_sets')
      .select('exercises (muscles), workouts!inner (user_id, ended_at)')
      .eq('workouts.user_id', userId)
      .not('workouts.ended_at', 'is', null)
      .gte('workouts.ended_at', cutoff.toISOString());
    const sets = (res.data ?? []) as unknown as SetRow[];
    setMuscles(mergeMuscles(sets.map((s) => s.exercises?.muscles ?? [])));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <Section label="Activation" eyebrowSuffix="last 7 days">
          <View className="rounded-2xl bg-surface p-4">
            {muscles.length > 0 ? (
              <MuscleMap muscles={muscles} />
            ) : (
              <Text className="py-16 text-center text-sm text-muted">
                No sets logged in the last 7 days yet.
              </Text>
            )}
            <View className="mt-4 flex-row items-center justify-center gap-5">
              <Legend color="#22C55E" label="Primary mover" />
              <Legend color="#16803C" label="Synergist" />
            </View>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

function Section({
  label,
  eyebrowSuffix,
  children,
}: {
  label: string;
  eyebrowSuffix?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="px-5 pt-7">
      <View className="mb-3 flex-row items-baseline justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
          {label}
        </Text>
        {eyebrowSuffix && (
          <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted/70">
            {eyebrowSuffix}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}
