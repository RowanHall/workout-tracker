import { router, useFocusEffect } from "expo-router";
import { BarChart3, ChevronRight, Dumbbell, Flame, Settings } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { MuscleMap } from "@/components/MuscleMap";
import { RadarChart, type RadarAxis } from "@/components/RadarChart";
import { VolumeHeatmap } from "@/components/VolumeHeatmap";
import { WeekTracker } from "@/components/WeekTracker";
import { dateKey, formatDuration, formatVolume } from "@/lib/format";
import { mergeMuscles } from "@/lib/muscles";
import { displayStreak } from "@/lib/streak";
import { supabase } from "@/lib/supabase";
import type { ExerciseMuscle } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

interface SessionRow {
  id: string;
  title: string;
  total_volume: number;
  total_sets: number;
  started_at: string;
  ended_at: string;
}

interface WeekSetRow {
  weight: number;
  reps: number;
  exercises: { muscle_group: string; muscles: ExerciseMuscle[] } | null;
}

const RADAR_GROUPS = ["Chest", "Back", "Delts", "Arms", "Legs", "Core"] as const;
type RadarGroup = (typeof RADAR_GROUPS)[number];

const GROUP_TO_RADAR: Record<string, RadarGroup> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Delts",
  biceps: "Arms",
  triceps: "Arms",
  quads: "Legs",
  hamstrings: "Legs",
  glutes: "Legs",
  calves: "Legs",
  core: "Core",
};

export default function ProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id;

  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [restDates, setRestDates] = useState<string[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [dailyVolume, setDailyVolume] = useState<Map<string, number>>(new Map());
  const [weekMuscles, setWeekMuscles] = useState<ExerciseMuscle[]>([]);
  const [weekDistribution, setWeekDistribution] = useState<RadarAxis[]>([]);
  const [workouts, setWorkouts] = useState<SessionRow[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    refreshProfile();

    const yearCutoff = new Date();
    yearCutoff.setDate(yearCutoff.getDate() - 372);
    const weekCutoff = new Date();
    weekCutoff.setDate(weekCutoff.getDate() - 7);

    const [workoutsRes, weekSetsRes, followersRes, followingRes, restRes] = await Promise.all([
      supabase
        .from("workouts")
        .select("id, title, total_volume, total_sets, started_at, ended_at")
        .eq("user_id", userId)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false }),
      supabase
        .from("workout_sets")
        .select(
          "weight, reps, exercises (muscle_group, muscles), workouts!inner (user_id, ended_at)",
        )
        .eq("workouts.user_id", userId)
        .not("workouts.ended_at", "is", null)
        .gte("workouts.ended_at", weekCutoff.toISOString()),
      supabase
        .from("social_follows")
        .select("*", { count: "exact", head: true })
        .eq("followed_id", userId),
      supabase
        .from("social_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId),
      supabase
        .from("rest_days")
        .select("rest_date")
        .eq("user_id", userId)
        .gte("rest_date", dateKey(yearCutoff)),
    ]);

    const workoutRows = (workoutsRes.data ?? []) as SessionRow[];
    const weekSets = (weekSetsRes.data ?? []) as unknown as WeekSetRow[];

    setWorkouts(workoutRows);
    setWorkoutDates(workoutRows.map((w) => dateKey(new Date(w.ended_at))));
    setRestDates(((restRes.data ?? []) as { rest_date: string }[]).map((r) => r.rest_date));

    setFollowCounts({
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    });

    const daily = new Map<string, number>();
    for (const w of workoutRows) {
      const k = dateKey(new Date(w.ended_at));
      daily.set(k, (daily.get(k) ?? 0) + Number(w.total_volume));
    }
    setDailyVolume(daily);

    setWeekMuscles(mergeMuscles(weekSets.map((s) => s.exercises?.muscles ?? [])));
    const groupTotals = new Map<RadarGroup, number>(RADAR_GROUPS.map((g) => [g, 0]));
    for (const s of weekSets) {
      const group = s.exercises?.muscle_group;
      const radar = group ? GROUP_TO_RADAR[group] : undefined;
      if (!radar) continue;
      groupTotals.set(radar, (groupTotals.get(radar) ?? 0) + Number(s.weight) * s.reps);
    }
    const peak = Math.max(...groupTotals.values());
    setWeekDistribution(
      RADAR_GROUPS.map((label) => ({
        label,
        value: peak === 0 ? 0 : (groupTotals.get(label) ?? 0) / peak,
      })),
    );
  }, [userId, refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!profile) return null;
  const displayName = profile.display_name ?? profile.username;
  const streak = displayStreak(profile.current_streak, profile.last_workout_date);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="flex-row items-center justify-between px-5 pt-2">
          <View className="flex-row items-center gap-0.5">
            <Flame size={32} color="#F59E0B" strokeWidth={2.5} />
            <Text
              className="text-[20px] font-semibold text-white"
              style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.3 }}
            >
              {streak}
            </Text>
          </View>
          <Pressable
            className="p-1 active:opacity-70"
            onPress={() => router.push("/settings")}
            hitSlop={8}
          >
            <Settings size={22} color="#8B98A9" strokeWidth={1.75} />
          </Pressable>
        </View>

        <Identity
          name={displayName}
          username={profile.username}
          avatarUrl={profile.avatar_url}
          followers={followCounts.followers}
          following={followCounts.following}
        />

        <Section label="This Week">
          <WeekTracker workoutDates={workoutDates} restDates={restDates} />
        </Section>

        <Section label="Consistency" eyebrowSuffix="last 12 months">
          <VolumeHeatmap dailyVolume={dailyVolume} />
        </Section>

        <View className="flex-row gap-3 px-5 pt-7">
          <NavButton
            label="Stats"
            icon={<BarChart3 size={16} color="#FFFFFF" strokeWidth={2} />}
            onPress={() => router.push("/stats")}
          />
          <NavButton
            label="Exercises"
            icon={<Dumbbell size={16} color="#FFFFFF" strokeWidth={2} />}
            onPress={() => router.push("/exercises")}
          />
        </View>

        <Section label="Weekly Focus" eyebrowSuffix="last 7 days">
          <View className="flex-row items-center">
            <View className="flex-1 items-center justify-center px-2 py-5">
              <MuscleMap muscles={weekMuscles} />
            </View>
            <View className="flex-1 items-center justify-center px-2 py-5">
              <RadarChart data={weekDistribution} />
            </View>
          </View>
        </Section>

        <Section
          label="Workouts"
          eyebrowSuffix={workouts.length ? `${workouts.length} total` : undefined}
        >
          {workouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function WorkoutRow({ workout }: { workout: SessionRow }) {
  const ended = new Date(workout.ended_at);
  return (
    <Pressable
      onPress={() => router.push(`/workout/${workout.id}`)}
      className="flex-row items-center border-b border-white/5 py-3.5 active:opacity-70"
    >
      <View className="flex-1 pr-3">
        <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
          {workout.title}
        </Text>
        <Text className="mt-1 text-xs text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {formatDate(ended)} · {formatVolume(workout.total_volume)} · {workout.total_sets} sets ·{" "}
          {formatDuration(workout.started_at, workout.ended_at)}
        </Text>
      </View>
      <ChevronRight size={18} color="#8B98A9" strokeWidth={2} />
    </Pressable>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function Identity({
  name,
  username,
  avatarUrl,
  followers,
  following,
}: {
  name: string;
  username: string;
  avatarUrl?: string | null;
  followers: number;
  following: number;
}) {
  return (
    <View className="items-center px-5 pt-3">
      <Avatar url={avatarUrl} name={name} size={72} />
      <Text className="mt-4 text-[22px] font-bold text-white" style={{ letterSpacing: -0.3 }}>
        {name}
      </Text>
      <Text className="mt-0.5 text-sm text-muted">@{username}</Text>
      <View className="mt-3 flex-row items-center gap-2.5">
        <FollowMeta count={followers} label="followers" />
        <View className="h-0.5 w-0.5 rounded-full bg-muted/60" />
        <FollowMeta count={following} label="following" />
      </View>
    </View>
  );
}

function FollowMeta({ count, label }: { count: number; label: string }) {
  return (
    <Text className="text-[13px] text-muted">
      <Text className="font-semibold text-white" style={{ fontVariant: ["tabular-nums"] }}>
        {count.toLocaleString()}
      </Text>{" "}
      {label}
    </Text>
  );
}

function NavButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-between rounded-2xl bg-surface px-4 py-4 active:opacity-70"
    >
      <View className="flex-row items-center gap-2.5">
        {icon}
        <Text className="text-[15px] font-semibold text-white">{label}</Text>
      </View>
      <ChevronRight size={18} color="#8B98A9" strokeWidth={2} />
    </Pressable>
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
        <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">{label}</Text>
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
