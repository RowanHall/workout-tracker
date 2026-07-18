import { router, useLocalSearchParams } from "expo-router";
import {
  ChevronRight,
  Dumbbell,
  Flame,
  MoreHorizontal,
  Star,
  TrendingUp,
  UserX,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { MuscleMap } from "@/components/MuscleMap";
import { RadarChart, type RadarAxis } from "@/components/RadarChart";
import { useHeaderInset } from "@/lib/blurHeader";
import { VolumeHeatmap } from "@/components/VolumeHeatmap";
import { formatDuration, formatVolume, timeAgo } from "@/lib/format";
import { mergeMuscles } from "@/lib/muscles";
import { displayStreak } from "@/lib/streak";
import { supabase } from "@/lib/supabase";
import type { ExerciseMuscle, Profile, Workout } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

interface BestLift {
  name: string;
  value: number;
}

interface FriendStats {
  workouts: number;
  totalVolume: number;
  favoriteLift: string | null;
  heaviestSet: number;
  biggestSession: number;
  bestLifts: BestLift[];
  recent: Workout[];
}

interface Consistency {
  dailyVolume: Map<string, number>;
  weekMuscles: ExerciseMuscle[];
  weekDistribution: RadarAxis[];
  hasData: boolean;
}

interface ConsistencyRow {
  day: string;
  volume: number;
  is_rest: boolean;
}

interface WeeklyFocusRow {
  muscle_group: string | null;
  muscles: ExerciseMuscle[] | null;
  weight: number;
  reps: number;
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

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id;
  const isSelf = id === myId;
  const headerInset = useHeaderInset();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<FriendStats | null>(null);
  const [consistency, setConsistency] = useState<Consistency | null>(null);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [followState, setFollowState] = useState<"none" | "requested" | "following">("none");
  const [isBlocked, setIsBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!id || !myId) return;
    const [
      profileRes,
      followersRes,
      followingRes,
      myFollowRes,
      workoutsRes,
      setsRes,
      prsRes,
      blockRes,
      consistencyRes,
      weeklyFocusRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("social_follows")
        .select("*", { count: "exact", head: true })
        .eq("followed_id", id)
        .eq("status", "accepted"),
      supabase
        .from("social_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", id)
        .eq("status", "accepted"),
      supabase
        .from("social_follows")
        .select("status")
        .eq("follower_id", myId)
        .eq("followed_id", id)
        .maybeSingle(),
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", id)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false }),
      supabase
        .from("workout_sets")
        .select("weight, reps, exercises (name), workouts!inner (user_id, ended_at)")
        .eq("workouts.user_id", id)
        .not("workouts.ended_at", "is", null),
      supabase
        .from("personal_records")
        .select("value, exercises (name)")
        .eq("user_id", id)
        .eq("record_type", "one_rep_max")
        .order("value", { ascending: false })
        .limit(5),
      supabase
        .from("user_blocks")
        .select("blocked_id", { count: "exact", head: true })
        .eq("blocker_id", myId)
        .eq("blocked_id", id),
      supabase.rpc("get_consistency", { target: id }),
      supabase.rpc("get_weekly_focus", { target: id }),
    ]);

    setProfile((profileRes.data as Profile) ?? null);
    setFollowCounts({
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    });
    const myFollow = myFollowRes.data as { status: string } | null;
    setFollowState(
      myFollow ? (myFollow.status === "accepted" ? "following" : "requested") : "none",
    );
    setIsBlocked((blockRes.count ?? 0) > 0);

    const workouts = (workoutsRes.data ?? []) as Workout[];
    const sets = (setsRes.data ?? []) as unknown as {
      weight: number;
      reps: number;
      exercises: { name: string } | null;
    }[];

    const setCounts = new Map<string, number>();
    let heaviestSet = 0;
    for (const s of sets) {
      heaviestSet = Math.max(heaviestSet, Number(s.weight));
      if (s.exercises) {
        setCounts.set(s.exercises.name, (setCounts.get(s.exercises.name) ?? 0) + 1);
      }
    }
    const favorite = [...setCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    const consistencyRows = (consistencyRes.data ?? []) as ConsistencyRow[];
    const dailyVolume = new Map<string, number>();
    for (const row of consistencyRows) {
      if (!row.is_rest) {
        dailyVolume.set(row.day, (dailyVolume.get(row.day) ?? 0) + Number(row.volume));
      }
    }

    const weeklyFocus = (weeklyFocusRes.data ?? []) as WeeklyFocusRow[];
    const weekMuscles = mergeMuscles(weeklyFocus.map((s) => s.muscles ?? []));
    const groupTotals = new Map<RadarGroup, number>(RADAR_GROUPS.map((g) => [g, 0]));
    for (const s of weeklyFocus) {
      const radar = s.muscle_group ? GROUP_TO_RADAR[s.muscle_group] : undefined;
      if (!radar) continue;
      groupTotals.set(radar, (groupTotals.get(radar) ?? 0) + Number(s.weight) * s.reps);
    }
    const peak = Math.max(...groupTotals.values());
    const weekDistribution = RADAR_GROUPS.map((label) => ({
      label,
      value: peak === 0 ? 0 : (groupTotals.get(label) ?? 0) / peak,
    }));

    setConsistency({
      dailyVolume,
      weekMuscles,
      weekDistribution,
      hasData: consistencyRows.length > 0,
    });

    setStats({
      workouts: workouts.length,
      totalVolume: workouts.reduce((sum, w) => sum + Number(w.total_volume), 0),
      favoriteLift: favorite ? favorite[0] : null,
      heaviestSet,
      biggestSession: workouts.reduce((max, w) => Math.max(max, Number(w.total_volume)), 0),
      bestLifts: (
        (prsRes.data ?? []) as unknown as {
          value: number;
          exercises: { name: string } | null;
        }[]
      )
        .filter((pr) => pr.exercises)
        .map((pr) => ({ name: pr.exercises!.name, value: Number(pr.value) })),
      recent: workouts.slice(0, 5),
    });
    setLoaded(true);
  }, [id, myId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleFollow() {
    if (!myId || !id || isSelf) return;
    const wasConnected = followState !== "none";
    if (wasConnected) {
      // Unfollow, or cancel a pending request. Only an accepted follow counts
      // toward the follower total.
      if (followState === "following") {
        setFollowCounts((prev) => ({ ...prev, followers: prev.followers - 1 }));
      }
      setFollowState("none");
      await supabase.from("social_follows").delete().eq("follower_id", myId).eq("followed_id", id);
    } else if (profile?.is_public) {
      setFollowState("following");
      setFollowCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
      await supabase
        .from("social_follows")
        .insert({ follower_id: myId, followed_id: id, status: "accepted" });
    } else {
      // Private account: this is a request, not a follow — no count change yet.
      setFollowState("requested");
      await supabase
        .from("social_follows")
        .insert({ follower_id: myId, followed_id: id, status: "pending" });
    }
    // Following changes what their workouts/PRs RLS lets us see.
    load();
  }

  function confirmBlock() {
    if (!myId || !id || isSelf) return;
    const handle = profile?.username ? `@${profile.username}` : "this user";
    setMenuOpen(false);
    Alert.alert(
      `Block ${handle}?`,
      "They won't be able to see your workouts or interact with you, and you won't see theirs. You can unblock from Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("user_blocks")
              .insert({ blocker_id: myId, blocked_id: id });
            if (error && !/duplicate key/i.test(error.message)) {
              Alert.alert("Could not block", error.message);
              return;
            }
            setIsBlocked(true);
            setFollowState("none");
            load();
          },
        },
      ],
    );
  }

  async function handleUnblock() {
    if (!myId || !id) return;
    setMenuOpen(false);
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", myId)
      .eq("blocked_id", id);
    if (error) {
      Alert.alert("Could not unblock", error.message);
      return;
    }
    setIsBlocked(false);
    load();
  }

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-muted">This lifter could not be found.</Text>
      </View>
    );
  }

  const name = profile.display_name ?? profile.username;
  const streak = displayStreak(profile.current_streak, profile.last_workout_date);
  // A private account is walled off to everyone but its owner: visitors see
  // only the name + avatar, never the streak, trackers, records or workouts.
  // A private account stays walled until you're an accepted follower; a pending
  // request grants nothing yet.
  const isPrivate = !isSelf && profile.is_public === false && followState !== "following";
  const hiddenByPrivacy = !isSelf && followState !== "following" && stats?.workouts === 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 pb-8"
      contentContainerStyle={{ paddingTop: headerInset + 16 }}
    >
      <View className="-mt-1 mb-2 flex-row items-center">
        <View className="flex-1" />
        {!isBlocked && !isPrivate && (
          <View className="flex-row items-center justify-center">
            <Flame size={26} color="#F59E0B" strokeWidth={2.5} />
            <Text
              numberOfLines={1}
              pointerEvents="none"
              className="absolute"
              style={{
                left: "100%",
                fontSize: 18,
                fontWeight: "900",
                fontStyle: "italic",
                color: "#FFFFFF",
                letterSpacing: -0.7,
                fontVariant: ["tabular-nums"],
                marginLeft: 1,
              }}
            >
              {streak}
            </Text>
          </View>
        )}
        <View className="flex-1 items-end">
          {!isSelf && (
            <Pressable
              hitSlop={10}
              className="rounded-full bg-surface-2 p-2 active:opacity-70"
              onPress={() => setMenuOpen(true)}
            >
              <MoreHorizontal size={18} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>
      <View className="mb-4 items-center">
        <View className="mb-3">
          <Avatar url={profile.avatar_url} name={name} size={80} />
        </View>
        <Text className="text-2xl font-bold text-white">{name}</Text>
        <Text className="text-sm text-muted">@{profile.username}</Text>
        {!isPrivate && (
          <View className="mt-2 flex-row gap-5">
            <Text className="text-sm text-muted">
              <Text className="font-bold text-white">{followCounts.followers}</Text> followers
            </Text>
            <Text className="text-sm text-muted">
              <Text className="font-bold text-white">{followCounts.following}</Text> following
            </Text>
          </View>
        )}

        {!isSelf && !isBlocked && (
          <Pressable
            className={`mt-3 rounded-full px-8 py-2.5 active:opacity-70 ${
              followState === "none" ? "bg-primary" : "bg-surface-2"
            }`}
            onPress={toggleFollow}
          >
            <Text
              className={`font-bold ${followState === "none" ? "text-background" : "text-muted"}`}
            >
              {followState === "following"
                ? "Following"
                : followState === "requested"
                  ? "Requested"
                  : "Follow"}
            </Text>
          </Pressable>
        )}
        {!isSelf && isBlocked && (
          <Pressable
            className="mt-3 rounded-full bg-surface-2 px-8 py-2.5 active:opacity-70"
            onPress={handleUnblock}
          >
            <Text className="font-bold text-danger">Unblock</Text>
          </Pressable>
        )}
      </View>

      {!isSelf && isBlocked && (
        <View className="mb-4 rounded-2xl bg-surface p-4">
          <Text className="text-center text-muted">
            You blocked @{profile.username}. Their workouts and comments are hidden.
          </Text>
        </View>
      )}

      {!isBlocked && isPrivate && (
        <View className="mb-4 rounded-2xl bg-surface p-4">
          <Text className="text-center text-muted">
            This account is private. Only {name} can see their stats and workouts.
          </Text>
        </View>
      )}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setMenuOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl bg-surface px-2 pb-10 pt-3"
          >
            <View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
            <Pressable
              onPress={isBlocked ? handleUnblock : confirmBlock}
              className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5 active:bg-surface-2"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                <UserX size={18} color="#EF4444" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-danger">
                  {isBlocked ? `Unblock @${profile.username}` : `Block @${profile.username}`}
                </Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {isBlocked
                    ? "They can see your workouts and follow you again."
                    : "Hide their workouts and stop interactions."}
                </Text>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {!isBlocked && !isPrivate && consistency?.hasData && (
        <>
          <Section label="Consistency" eyebrowSuffix="last 12 months">
            <VolumeHeatmap dailyVolume={consistency.dailyVolume} />
          </Section>

          <Section label="Weekly Focus" eyebrowSuffix="last 7 days">
            <View className="flex-row items-center">
              <View className="flex-1 items-center justify-center px-2 py-5">
                <MuscleMap
                  muscles={consistency.weekMuscles}
                  gender={profile.gender === "female" ? "female" : "male"}
                />
              </View>
              <View className="flex-1 items-center justify-center px-2 py-5">
                <RadarChart data={consistency.weekDistribution} />
              </View>
            </View>
          </Section>

          <View className="h-4" />
        </>
      )}

      {!isBlocked && !isPrivate && hiddenByPrivacy && (
        <View className="mb-4 rounded-2xl bg-surface p-4">
          <Text className="text-center text-muted">
            Follow {name} to see their workouts, records, and lifts.
          </Text>
        </View>
      )}

      {!isBlocked && !isPrivate && stats && stats.workouts > 0 && (
        <Section label="Records">
          {stats.favoriteLift && (
            <RecordRow
              icon={<Star size={18} color="#F59E0B" strokeWidth={1.75} />}
              label="Favorite lift"
              value={stats.favoriteLift}
            />
          )}
          {stats.heaviestSet > 0 && (
            <RecordRow
              icon={<Dumbbell size={18} color="#22C55E" strokeWidth={1.75} />}
              label="Heaviest set"
              value={`${stats.heaviestSet.toLocaleString()} lbs`}
            />
          )}
          {stats.biggestSession > 0 && (
            <RecordRow
              icon={<TrendingUp size={18} color="#22C55E" strokeWidth={1.75} />}
              label="Biggest session"
              value={formatVolume(stats.biggestSession)}
            />
          )}
          <RecordRow
            icon={<Dumbbell size={18} color="#22C55E" strokeWidth={1.75} />}
            label="Lifetime volume"
            value={formatVolume(stats.totalVolume)}
          />
        </Section>
      )}

      {!isBlocked && !isPrivate && stats && stats.bestLifts.length > 0 && (
        <Section label="Best Lifts" eyebrowSuffix="est. 1RM">
          {stats.bestLifts.map((lift, i) => (
            <View
              key={lift.name}
              className="mb-2 flex-row items-center rounded-2xl border border-white/5 bg-background px-4 py-3"
            >
              <Text className="w-7 font-bold text-muted">#{i + 1}</Text>
              <Text className="flex-1 text-white">{lift.name}</Text>
              <Text className="font-bold text-primary">
                {Math.round(lift.value).toLocaleString()} lbs
              </Text>
            </View>
          ))}
        </Section>
      )}

      {!isBlocked && !isPrivate && stats && stats.recent.length > 0 && (
        <Section label="Recent Workouts">
          {stats.recent.map((w) => (
            <Pressable
              key={w.id}
              className="mb-2 flex-row items-center rounded-2xl border border-white/5 bg-background px-4 py-3 active:opacity-70"
              onPress={() => router.push(`/workout/${w.id}`)}
            >
              <View className="flex-1">
                <Text className="font-semibold text-white">{w.title}</Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {timeAgo(w.ended_at!)} · {formatVolume(w.total_volume)} · {w.total_sets} sets
                  {w.ended_at && ` · ${formatDuration(w.started_at, w.ended_at)}`}
                </Text>
              </View>
              <ChevronRight size={16} color="#8B98A9" strokeWidth={2} />
            </Pressable>
          ))}
        </Section>
      )}
    </ScrollView>
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
    <View className="pt-7">
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

function RecordRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="mb-2 flex-row items-center gap-2.5 rounded-2xl border border-white/5 bg-background px-4 py-3">
      {icon}
      <Text className="flex-1 text-muted">{label}</Text>
      <Text className="font-semibold text-white">{value}</Text>
    </View>
  );
}
