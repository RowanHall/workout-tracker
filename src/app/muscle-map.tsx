import { useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MuscleMap } from '@/components/MuscleMap';
import { useHeaderInset } from '@/lib/blurHeader';
import { mergeMuscles } from '@/lib/muscles';
import { supabase } from '@/lib/supabase';
import type { ExerciseMuscle } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

interface SetRow {
  exercises: { muscles: ExerciseMuscle[]; muscle_group: string | null } | null;
}

interface GroupSets {
  group: string;
  sets: number;
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  full_body: 'Full body',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function MuscleMapScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const headerInset = useHeaderInset();

  const [weekOffset, setWeekOffset] = useState(0);
  const [muscles, setMuscles] = useState<ExerciseMuscle[]>([]);
  const [groupSets, setGroupSets] = useState<GroupSets[]>([]);
  const [daysTrained, setDaysTrained] = useState<boolean[]>(Array(7).fill(false));

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday of this week
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const load = useCallback(async () => {
    if (!userId) return;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [setsRes, workoutsRes] = await Promise.all([
      supabase
        .from('workout_sets')
        .select('exercises (muscles, muscle_group), workouts!inner (user_id, ended_at)')
        .eq('workouts.user_id', userId)
        .not('workouts.ended_at', 'is', null)
        .gte('workouts.ended_at', weekStart.toISOString())
        .lt('workouts.ended_at', weekEnd.toISOString()),
      supabase
        .from('workouts')
        .select('ended_at')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .gte('ended_at', weekStart.toISOString())
        .lt('ended_at', weekEnd.toISOString()),
    ]);

    const sets = (setsRes.data ?? []) as unknown as SetRow[];
    setMuscles(mergeMuscles(sets.map((s) => s.exercises?.muscles ?? [])));

    const counts = new Map<string, number>();
    for (const s of sets) {
      const group = s.exercises?.muscle_group;
      if (!group) continue;
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    setGroupSets(
      [...counts.entries()]
        .map(([group, count]) => ({ group, sets: count }))
        .sort((a, b) => b.sets - a.sets)
    );

    const trained = Array(7).fill(false);
    for (const w of (workoutsRes.data ?? []) as { ended_at: string }[]) {
      const idx = Math.floor(
        (new Date(w.ended_at).getTime() - weekStart.getTime()) / 86_400_000
      );
      if (idx >= 0 && idx < 7) trained[idx] = true;
    }
    setDaysTrained(trained);
  }, [userId, weekStart]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const trainedCount = daysTrained.filter(Boolean).length;
  const canGoForward = weekOffset < 0;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerInset, paddingBottom: 48 }}
      >
        <View className="flex-row items-center justify-between px-5 pt-5">
          <Pressable
            onPress={() => setWeekOffset((o) => o - 1)}
            hitSlop={12}
            className="active:opacity-60"
          >
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <Text className="text-[15px] font-semibold text-white">
            {formatWeekRange(weekStart)}
          </Text>
          <Pressable
            onPress={() => canGoForward && setWeekOffset((o) => o + 1)}
            disabled={!canGoForward}
            hitSlop={12}
            className="active:opacity-60"
          >
            <ChevronRight
              size={22}
              color={canGoForward ? '#FFFFFF' : '#2A3441'}
              strokeWidth={2}
            />
          </Pressable>
        </View>

        <Section label="Days Trained" eyebrowSuffix={`${trainedCount} of 7`}>
          <View className="flex-row justify-between px-1">
            {DAY_LABELS.map((day, i) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + i);
              return (
                <View key={i} className="items-center gap-1.5">
                  <Text className="text-[11px] font-medium text-muted">{day}</Text>
                  <Text
                    className="text-[13px] font-semibold text-white"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {date.getDate()}
                  </Text>
                  <View
                    className={`mt-0.5 h-2.5 w-2.5 rounded-full ${daysTrained[i] ? 'bg-primary' : 'bg-white/10'}`}
                  />
                </View>
              );
            })}
          </View>
        </Section>

        <View className="px-5 pt-7">
          <View className="rounded-2xl bg-background p-4">
            {muscles.length > 0 ? (
              <MuscleMap muscles={muscles} />
            ) : (
              <Text className="py-16 text-center text-sm text-muted">
                No sets logged this week.
              </Text>
            )}
            <View className="mt-4 flex-row items-center justify-center gap-5">
              <Legend color="#22C55E" label="Primary mover" />
              <Legend color="#16803C" label="Synergist" />
            </View>
          </View>
        </View>

        {groupSets.length > 0 && (
          <View className="px-5 pt-7">
            <View className="flex-row items-center justify-between pb-2">
              <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
                Muscle
              </Text>
              <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
                Sets
              </Text>
            </View>
            {groupSets.map((row) => (
              <View
                key={row.group}
                className="flex-row items-center justify-between border-b border-white/5 py-3.5"
              >
                <Text className="text-[15px] text-white">
                  {MUSCLE_LABELS[row.group] ?? row.group.replace('_', ' ')}
                </Text>
                <Text
                  className="text-[15px] font-semibold text-white"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {row.sets}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = (d: Date) => d.toLocaleString('en-US', { month: 'long' });
  if (start.getMonth() === end.getMonth()) {
    return `${pad(start.getDate())}–${pad(end.getDate())} ${month(start)} ${start.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${pad(start.getDate())} ${month(start)} – ${pad(end.getDate())} ${month(end)} ${end.getFullYear()}`;
  }
  return `${pad(start.getDate())} ${month(start)} ${start.getFullYear()} – ${pad(end.getDate())} ${month(end)} ${end.getFullYear()}`;
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
