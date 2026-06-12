import { router, useFocusEffect } from 'expo-router';
import { Flame, Settings } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BodyWeightCard } from '@/components/BodyWeightCard';
import { ConsistencyCalendar } from '@/components/ConsistencyCalendar';
import { VolumeChart, type VolumeByGroup } from '@/components/VolumeChart';
import { WeekTracker } from '@/components/WeekTracker';
import { displayStreak } from '@/lib/streak';
import { dateKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id;

  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [restDates, setRestDates] = useState<string[]>([]);
  const [volumeByGroup, setVolumeByGroup] = useState<VolumeByGroup[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    refreshProfile();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const yearCutoff = new Date();
    yearCutoff.setDate(yearCutoff.getDate() - 372);

    const [workoutsRes, setsRes, followersRes, followingRes, restRes, countRes] =
      await Promise.all([
        supabase
          .from('workouts')
          .select('ended_at')
          .eq('user_id', userId)
          .not('ended_at', 'is', null)
          .gte('ended_at', yearCutoff.toISOString()),
        supabase
          .from('workout_sets')
          .select('weight, reps, exercises (muscle_group), workouts!inner (user_id, ended_at)')
          .eq('workouts.user_id', userId)
          .not('workouts.ended_at', 'is', null)
          .gte('created_at', cutoff.toISOString()),
        supabase
          .from('social_follows')
          .select('*', { count: 'exact', head: true })
          .eq('followed_id', userId),
        supabase
          .from('social_follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId),
        supabase
          .from('rest_days')
          .select('rest_date')
          .eq('user_id', userId)
          .gte('rest_date', dateKey(yearCutoff)),
        supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('ended_at', 'is', null),
      ]);

    setWorkoutDates(
      (workoutsRes.data ?? []).map((w) => dateKey(new Date(w.ended_at as string)))
    );
    setRestDates(((restRes.data ?? []) as { rest_date: string }[]).map((r) => r.rest_date));

    const volumes = new Map<string, number>();
    for (const row of (setsRes.data as any[]) ?? []) {
      const group = row.exercises?.muscle_group;
      if (!group) continue;
      volumes.set(group, (volumes.get(group) ?? 0) + row.weight * row.reps);
    }
    setVolumeByGroup(
      [...volumes.entries()]
        .map(([group, volume]) => ({ group, volume }))
        .sort((a, b) => b.volume - a.volume)
    );

    setFollowCounts({
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    });
    setTotalWorkouts(countRes.count ?? 0);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  if (!profile) return null;
  const name = profile.display_name ?? profile.username;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 pb-8">
        <View className="flex-row justify-end pt-2">
          <Pressable
            className="p-1 active:opacity-70"
            onPress={() => router.push('/settings')}
            hitSlop={8}
          >
            <Settings size={22} color="#8B98A9" strokeWidth={1.75} />
          </Pressable>
        </View>

        <View className="mb-4 items-center">
          <View className="mb-3">
            <Avatar url={profile.avatar_url} name={name} size={80} />
          </View>
          <Text className="text-2xl font-bold text-white">{name}</Text>
          <Text className="text-sm text-muted">@{profile.username}</Text>
          <View className="mt-2 flex-row gap-5">
            <Text className="text-sm text-muted">
              <Text className="font-bold text-white">{followCounts.followers}</Text>{' '}
              followers
            </Text>
            <Text className="text-sm text-muted">
              <Text className="font-bold text-white">{followCounts.following}</Text>{' '}
              following
            </Text>
          </View>
        </View>

        <View className="mb-4 rounded-2xl bg-surface p-4">
          <View className="flex-row">
            <HeroStat
              value={String(displayStreak(profile.current_streak, profile.last_workout_date))}
              label="Streak"
              icon={<Flame size={16} color="#F59E0B" strokeWidth={1.75} />}
            />
            <HeroStat value={totalWorkouts.toLocaleString()} label="Workouts" />
            <HeroStat value={String(profile.longest_streak)} label="Best streak" />
          </View>
        </View>

        <SectionCard title="This Week">
          <WeekTracker workoutDates={workoutDates} restDates={restDates} />
        </SectionCard>

        <SectionCard title="Consistency">
          <ConsistencyCalendar workoutDates={workoutDates} />
        </SectionCard>

        <BodyWeightCard userId={userId} />

        <SectionCard title="Volume by Muscle (90 days)">
          <VolumeChart data={volumeByGroup} />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <View className="flex-1 items-center">
      <View className="flex-row items-center gap-1">
        <Text className="text-2xl font-extrabold text-white">{value}</Text>
        {icon}
      </View>
      <Text className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-2xl bg-surface p-4">
      <Text className="mb-3 text-base font-bold text-white">{title}</Text>
      {children}
    </View>
  );
}
