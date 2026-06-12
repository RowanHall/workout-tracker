import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsistencyCalendar } from '@/components/ConsistencyCalendar';
import { ExpBar } from '@/components/ExpBar';
import { displayStreak } from '@/lib/exp';
import { VolumeChart, type VolumeByGroup } from '@/components/VolumeChart';
import { supabase } from '@/lib/supabase';
import type { Trophy } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id;

  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(new Set());
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [volumeByGroup, setVolumeByGroup] = useState<VolumeByGroup[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });

  const loadStats = useCallback(async () => {
    if (!userId) return;
    refreshProfile();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const [trophyRes, unlockedRes, workoutsRes, setsRes, followersRes, followingRes] =
      await Promise.all([
        supabase.from('trophies').select('*').order('id'),
        supabase.from('user_trophies').select('trophy_id').eq('user_id', userId),
        supabase
          .from('workouts')
          .select('ended_at')
          .eq('user_id', userId)
          .not('ended_at', 'is', null)
          .gte('ended_at', cutoff.toISOString()),
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
      ]);

    setTrophies((trophyRes.data as Trophy[]) ?? []);
    setUnlockedIds(new Set((unlockedRes.data ?? []).map((row) => row.trophy_id)));
    setWorkoutDates(
      (workoutsRes.data ?? []).map((w) => (w.ended_at as string).slice(0, 10))
    );

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
        <View className="mb-4 mt-3 items-center">
          <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary-dim">
            <Text className="text-3xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </Text>
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
          <ExpBar totalExp={profile.total_exp} />
          <View className="mt-4 flex-row justify-around">
            <HeroStat
              value={`${displayStreak(profile.current_streak, profile.last_workout_date)}🔥`}
              label="Streak"
            />
            <HeroStat value={profile.total_exp.toLocaleString()} label="Total EXP" />
            <HeroStat value={String(profile.longest_streak)} label="Best streak" />
          </View>
        </View>

        <SectionCard title="Consistency">
          <ConsistencyCalendar workoutDates={workoutDates} />
        </SectionCard>

        <SectionCard title="Volume by Muscle (90 days)">
          <VolumeChart data={volumeByGroup} />
        </SectionCard>

        <SectionCard title="Trophies">
          <View className="flex-row flex-wrap gap-2">
            {trophies.map((trophy) => {
              const unlocked = unlockedIds.has(trophy.id);
              return (
                <View
                  key={trophy.id}
                  className={`w-[31%] items-center rounded-xl bg-surface-2 px-2 py-3 ${
                    unlocked ? '' : 'opacity-30'
                  }`}
                >
                  <Text className="mb-1 text-2xl">{trophy.icon}</Text>
                  <Text
                    className="text-center text-xs font-semibold text-white"
                    numberOfLines={2}
                  >
                    {trophy.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </SectionCard>

        <Pressable
          className="mt-2 items-center rounded-xl border border-border py-3.5 active:opacity-70"
          onPress={() => supabase.auth.signOut()}
        >
          <Text className="font-semibold text-danger">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-white">{value}</Text>
      <Text className="text-xs text-muted">{label}</Text>
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
