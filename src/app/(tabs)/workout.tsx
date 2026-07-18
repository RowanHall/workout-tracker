import { router, useFocusEffect } from 'expo-router';
import { Moon, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBarContentInset } from '@/lib/tabBar';
import { BlurHeaderBackground } from '@/lib/blurHeader';
import { useActiveWorkoutContext } from '@/providers/ActiveWorkoutProvider';
import { dateKey } from '@/lib/format';
import { FREE_ROUTINE_LIMIT } from '@/lib/limits';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { usePremium } from '@/providers/PremiumProvider';

/**
 * The workout launcher. The active workout itself no longer lives here — it's a
 * global pull-up sheet (see `ActiveWorkoutSheet`). This screen always shows the
 * week tracker, start/rest-day actions, and routines; while a workout is
 * running the primary button becomes "Resume Workout", which pulls the sheet
 * back up.
 */
export default function WorkoutScreen() {
  const { session, refreshProfile } = useAuth();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const { workout, loading, start, startFromRoutine, expand } = useActiveWorkoutContext();

  const [weekWorkoutIds, setWeekWorkoutIds] = useState<Record<string, string>>({});
  const [weekRestDates, setWeekRestDates] = useState<string[]>([]);
  const [loggingRest, setLoggingRest] = useState(false);
  const [routines, setRoutines] = useState<{ id: string; title: string; exerciseCount: number }[]>([]);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);

  const loadWeek = useCallback(async () => {
    if (!session?.user.id) return;
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const mondayKey = dateKey(monday);
    const [workoutsRes, restRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('id, ended_at')
        .eq('user_id', session.user.id)
        .not('ended_at', 'is', null)
        .gte('ended_at', monday.toISOString())
        .order('ended_at', { ascending: true }),
      supabase
        .from('rest_days')
        .select('rest_date')
        .eq('user_id', session.user.id)
        .gte('rest_date', mondayKey),
    ]);
    const ids: Record<string, string> = {};
    for (const w of (workoutsRes.data ?? []) as { id: string; ended_at: string }[]) {
      ids[dateKey(new Date(w.ended_at))] = w.id;
    }
    setWeekWorkoutIds(ids);
    setWeekRestDates(
      ((restRes.data ?? []) as { rest_date: string }[]).map((r) => r.rest_date)
    );
  }, [session?.user.id]);

  const loadRoutines = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from('routines')
      .select('id, title, routine_exercises ( id )')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setRoutines(
      ((data as any[]) ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        exerciseCount: r.routine_exercises?.length ?? 0,
      }))
    );
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      loadWeek();
      loadRoutines();
    }, [loadWeek, loadRoutines])
  );

  function handleStartEmpty() {
    start().catch((e) => Alert.alert('Error', e.message));
  }

  async function handleStartRoutine(routineId: string) {
    // A workout is already running — starting a routine would abandon it, so
    // send the user back to the running one instead.
    if (workout) {
      Alert.alert(
        'Workout in progress',
        'Finish or discard your current workout before starting a routine.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Resume', onPress: expand },
        ]
      );
      return;
    }
    setStartingRoutineId(routineId);
    try {
      await startFromRoutine(routineId);
    } catch (err: any) {
      Alert.alert('Could not start routine', err.message);
    } finally {
      setStartingRoutineId(null);
    }
  }

  function handleNewRoutine() {
    if (!isPremium && routines.length >= FREE_ROUTINE_LIMIT) {
      Alert.alert(
        'Routine limit reached',
        `Free accounts can save up to ${FREE_ROUTINE_LIMIT} routines. Upgrade to Kova Pro for unlimited routines.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Go Pro', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    router.push('/routine/new');
  }

  const todayKey = dateKey(new Date());
  const workedToday = todayKey in weekWorkoutIds;
  const restedToday = weekRestDates.includes(todayKey);
  const restCapReached = weekRestDates.length >= 5;
  const canLogRest = !workedToday && !restedToday && !restCapReached;

  async function handleLogRestDay() {
    setLoggingRest(true);
    try {
      const { error } = await supabase.rpc('log_rest_day', { p_today: dateKey(new Date()) });
      if (error) throw error;
      await Promise.all([refreshProfile(), loadWeek()]);
    } catch (err: any) {
      Alert.alert('Could not log rest day', err.message);
    } finally {
      setLoggingRest(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  let restHelper: string | null = null;
  if (restedToday) restHelper = 'Rest day logged — streak safe.';
  else if (workedToday) restHelper = "You're already logged today.";
  else if (restCapReached) restHelper = 'Rest day cap (5/week) reached.';

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: tabBarContentInset(insets.bottom),
        }}
        scrollIndicatorInsets={{ top: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-7">
          {workout ? (
            <Pressable
              className="w-full items-center rounded-full bg-primary py-5 active:opacity-80"
              onPress={expand}
            >
              <Text className="text-lg font-bold text-background">Resume Workout</Text>
            </Pressable>
          ) : (
            <Pressable
              className="w-full flex-row items-center justify-center gap-2 rounded-full bg-primary py-5 active:opacity-80"
              onPress={handleStartEmpty}
            >
              <Plus size={20} color="#0B0F14" strokeWidth={2.5} />
              <Text className="text-lg font-bold text-background">Start Empty Workout</Text>
            </Pressable>
          )}
          <Pressable
            className="mt-3 w-full flex-row items-center justify-center gap-2 rounded-full border border-white/10 py-4 active:opacity-70 disabled:opacity-40"
            disabled={!canLogRest || loggingRest}
            onPress={handleLogRestDay}
          >
            <Moon size={18} color="#8B98A9" strokeWidth={2} />
            <Text className="font-semibold text-muted">
              {loggingRest ? 'Logging…' : 'Log Rest Day'}
            </Text>
          </Pressable>
          {restHelper && (
            <Text className="mt-3 text-center text-xs text-muted">{restHelper}</Text>
          )}
        </View>

        <RoutinesSection
          routines={routines}
          startingRoutineId={startingRoutineId}
          isPremium={isPremium}
          onStartRoutine={handleStartRoutine}
          onEditRoutine={(id) => router.push(`/routine/${id}`)}
          onNewRoutine={handleNewRoutine}
        />
      </ScrollView>

      {/* Blurs content as it scrolls up under the status bar. */}
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 12 }}
        pointerEvents="none"
      >
        <BlurHeaderBackground />
      </View>
    </View>
  );
}

function RoutinesSection({
  routines,
  startingRoutineId,
  isPremium,
  onStartRoutine,
  onEditRoutine,
  onNewRoutine,
}: {
  routines: { id: string; title: string; exerciseCount: number }[];
  startingRoutineId: string | null;
  isPremium: boolean;
  onStartRoutine: (id: string) => void;
  onEditRoutine: (id: string) => void;
  onNewRoutine: () => void;
}) {
  const atLimit = !isPremium && routines.length >= FREE_ROUTINE_LIMIT;
  const suffix = isPremium
    ? routines.length > 0
      ? String(routines.length)
      : null
    : `${routines.length}/${FREE_ROUTINE_LIMIT}`;

  return (
    <Section label="Routines" eyebrowSuffix={suffix ?? undefined}>
      {routines.map((r) => {
        const starting = startingRoutineId === r.id;
        return (
          <View
            key={r.id}
            className="flex-row items-center border-b border-white/5 py-3.5"
          >
            <Pressable
              onPress={() => onEditRoutine(r.id)}
              className="flex-1 pr-3 active:opacity-70"
            >
              <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
                {r.title}
              </Text>
              <Text className="mt-0.5 text-xs text-muted">
                {r.exerciseCount} {r.exerciseCount === 1 ? 'exercise' : 'exercises'}
              </Text>
            </Pressable>
            <Pressable
              className="rounded-xl bg-primary px-3.5 py-2 active:opacity-80 disabled:opacity-50"
              disabled={starting}
              onPress={() => onStartRoutine(r.id)}
            >
              <Text className="text-sm font-bold text-background">
                {starting ? 'Starting…' : 'Start'}
              </Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        className="mt-3 flex-row items-center justify-center gap-2 rounded-full border border-white/10 bg-surface/40 py-4 active:opacity-70"
        onPress={onNewRoutine}
      >
        <Plus size={18} color="#22C55E" strokeWidth={2.25} />
        <Text className="font-bold text-primary">New Routine</Text>
      </Pressable>

      {atLimit && (
        <Text className="mt-3 text-center text-xs text-muted">
          Free limit reached. Go Pro for unlimited routines.
        </Text>
      )}
    </Section>
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
