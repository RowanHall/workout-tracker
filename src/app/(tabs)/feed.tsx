import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Check, ChevronDown, Compass, Heart, Inbox, Search, Users, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { WorkoutCard } from "@/components/WorkoutCard";
import { tabBarContentInset } from "@/lib/tabBar";
import { BlurHeaderBackground } from "@/lib/blurHeader";
import { supabase } from "@/lib/supabase";
import type { FeedWorkout, Profile } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

const WELCOME_DISMISSED_KEY = "welcome_banner_dismissed_v1";
const SUGGESTED_DISMISSED_KEY = "suggested_athletes_dismissed_v1";
const FOUNDER_USERNAME = "rowan";
const FOUNDER_EMAIL = "hello@kovafit.ca";

// expo-glass-effect glass when available (iOS 26+); otherwise the expo-blur
// fallback inside HeaderActions. NB: neither is true system Liquid Glass —
// that needs a native lib (see CLAUDE.md). This just matches the other pills.
const GLASS = isLiquidGlassAvailable();

type FeedMode = "following" | "discover";

const MODE_LABELS: Record<FeedMode, string> = {
  following: "Following",
  discover: "Discover",
};

export default function FeedScreen() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const insets = useSafeAreaInsets();
  const greetingName = profile?.display_name ?? profile?.username ?? "there";
  // Measured height of the floating header so the list rests below it at rest
  // but scrolls *under* the blur. Seeded with an estimate to avoid a flash.
  const [headerHeight, setHeaderHeight] = useState(insets.top + 56);
  const [mode, setMode] = useState<FeedMode>("following");
  const [menuOpen, setMenuOpen] = useState(false);
  const [feed, setFeed] = useState<FeedWorkout[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  const loadFeed = useCallback(async () => {
    if (!userId) {
      setFeed([]);
      setLoaded(true);
      return;
    }

    const { data: follows } = await supabase
      .from("social_follows")
      .select("followed_id")
      .eq("follower_id", userId)
      .eq("status", "accepted");
    const followedIds = (follows ?? []).map((r) => r.followed_id as string);

    let query = supabase
      .from("workouts")
      .select(
        `*,
         profiles (username, display_name, avatar_url),
         workout_sets (id, is_pr, exercise_id, exercises (name)),
         workout_photos (photo_url, position),
         feed_interactions (id, workout_id, user_id, type, content, created_at, profiles (username))`,
      )
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: false })
      .limit(30);

    if (mode === "following") {
      if (!followedIds.length) {
        setFeed([]);
        setLoaded(true);
        return;
      }
      query = query.in("user_id", followedIds);
    } else {
      query = query
        .eq("visibility", "public")
        .neq("user_id", userId);
    }

    const { data } = await query;
    setFeed((data as unknown as FeedWorkout[]) ?? []);
    setLoaded(true);

    const { count } = await supabase
      .from("social_follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_id", userId)
      .eq("status", "pending");
    setPendingRequests(count ?? 0);
  }, [userId, mode]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }

  function handleModeChange(next: FeedMode) {
    if (next === mode) return;
    setMode(next);
    setFeed([]);
    setLoaded(false);
  }

  async function toggleCheer(workout: FeedWorkout, hasCheered: boolean) {
    if (!userId) return;
    if (hasCheered) {
      await supabase
        .from("feed_interactions")
        .delete()
        .eq("workout_id", workout.id)
        .eq("user_id", userId)
        .eq("type", "cheer");
    } else {
      await supabase
        .from("feed_interactions")
        .insert({ workout_id: workout.id, user_id: userId, type: "cheer" });
    }
    loadFeed();
  }

  async function addComment(workout: FeedWorkout, content: string) {
    if (!userId) return;
    await supabase
      .from("feed_interactions")
      .insert({ workout_id: workout.id, user_id: userId, type: "comment", content });
    await loadFeed();
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: tabBarContentInset(insets.bottom),
        }}
        scrollIndicatorInsets={{ top: headerHeight, bottom: tabBarContentInset(insets.bottom) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#22C55E"
            progressViewOffset={headerHeight}
          />
        }
        ListHeaderComponent={
          userId && mode === "following" ? (
            <View className="px-4">
              <WelcomeBanner greetingName={greetingName} myUserId={userId} />
              <SuggestedAthletes myUserId={userId} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            currentUserId={userId ?? ""}
            onToggleCheer={toggleCheer}
            onAddComment={addComment}
            onBlocked={loadFeed}
          />
        )}
        ListEmptyComponent={
          loaded ? (
            <View className="mt-24 items-center px-8">
              <Inbox size={40} color="#8B98A9" strokeWidth={1.5} />
              <Text className="mb-1 mt-3 text-lg font-bold text-white">
                {mode === "following" ? "Nothing here yet" : "No public workouts yet"}
              </Text>
              <Text className="text-center text-muted">
                {mode === "following"
                  ? "Follow some friends to fill your feed."
                  : "Check back soon for new public workouts to explore."}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Floating header: blurs the feed as it scrolls under, stays legible. */}
      <View
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top }}
      >
        <BlurHeaderBackground />
        <View className="flex-row items-center justify-between px-4 py-3">
          <FeedModeSelector value={mode} onOpen={() => setMenuOpen(true)} />
          <HeaderActions pendingRequests={pendingRequests} />
        </View>
      </View>

      {/* Mode picker overlay — a plain solid dropdown in the main view tree
          (not a Modal). Glass inside a Modal renders as an opaque white panel. */}
      {menuOpen && (
        <FeedModeMenu
          value={mode}
          headerHeight={headerHeight}
          onChange={handleModeChange}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </View>
  );
}

/**
 * Top-right glass pill holding two icon buttons — Search and Activity.
 * Uses expo-glass-effect on iOS 26+, falling back to a frosted expo-blur
 * capsule elsewhere. Never nests glass on glass.
 */
function HeaderActions({ pendingRequests }: { pendingRequests: number }) {
  const buttons = (
    <View className="flex-row items-center">
      <Pressable
        className="py-2.5 pl-3.5 pr-2 active:opacity-60"
        onPress={() => router.push("/people")}
        hitSlop={6}
      >
        <Search size={20} color="#22C55E" strokeWidth={2} />
      </Pressable>
      <Pressable
        className="py-2.5 pl-2 pr-3.5 active:opacity-60"
        onPress={() => router.push("/activity")}
        hitSlop={6}
      >
        <Heart size={20} color="#8B98A9" strokeWidth={1.75} />
        {pendingRequests > 0 && (
          <View
            className="absolute h-2.5 w-2.5 rounded-full bg-primary"
            style={{ top: 6, right: 8 }}
          />
        )}
      </Pressable>
    </View>
  );

  // expo-glass-effect capsule — no manual blur, rim, or sheen needed here.
  if (GLASS) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive style={styles.glassPill}>
        {buttons}
      </GlassView>
    );
  }

  // Fallback for iOS < 26 / Android: frosted blur with a bright rim and sheen.
  return (
    <View className="overflow-hidden rounded-full border border-white/20">
      <BlurView
        tint="systemUltraThinMaterialDark"
        intensity={60}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0.08)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {buttons}
    </View>
  );
}

const styles = StyleSheet.create({
  glassPill: {
    borderRadius: 999,
    overflow: "hidden",
  },
  menuShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});

function FeedModeSelector({
  value,
  onOpen,
}: {
  value: FeedMode;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      hitSlop={8}
      className="flex-row items-center gap-2 active:opacity-70"
    >
      <Text className="text-[20px] font-extrabold text-white">{MODE_LABELS[value]}</Text>
      <ChevronDown size={18} color="#8B98A9" strokeWidth={2.5} />
    </Pressable>
  );
}

/**
 * Full-screen mode-picker overlay with a plain solid dropdown panel. Rendered
 * in the main view tree (not a `Modal`) and deliberately not glass — a
 * GlassView inside a Modal has no content to sample and renders as an opaque
 * bright-white panel, so we use a solid `surface-2` dropdown instead.
 */
function FeedModeMenu({
  value,
  headerHeight,
  onChange,
  onClose,
}: {
  value: FeedMode;
  headerHeight: number;
  onChange: (next: FeedMode) => void;
  onClose: () => void;
}) {
  function select(next: FeedMode) {
    onClose();
    onChange(next);
  }

  return (
    <Pressable
      onPress={onClose}
      className="bg-black/40"
      style={[StyleSheet.absoluteFill, { paddingTop: headerHeight, paddingLeft: 16 }]}
    >
      <Pressable
        onPress={(e) => e.stopPropagation()}
        className="w-[220px] self-start overflow-hidden rounded-2xl border border-white/10 bg-surface-2"
        style={styles.menuShadow}
      >
        <ModeOption
          icon={<Users size={18} color={value === "following" ? "#22C55E" : "#FFFFFF"} strokeWidth={2} />}
          label="Following"
          description="Friends you follow"
          selected={value === "following"}
          onPress={() => select("following")}
        />
        <ModeOption
          icon={<Compass size={18} color={value === "discover" ? "#22C55E" : "#FFFFFF"} strokeWidth={2} />}
          label="Discover"
          description="Public workouts"
          selected={value === "discover"}
          onPress={() => select("discover")}
          isLast
        />
      </Pressable>
    </Pressable>
  );
}

function ModeOption({
  icon,
  label,
  description,
  selected,
  onPress,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 active:opacity-70 ${
        isLast ? "" : "border-b border-white/5"
      }`}
    >
      <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-surface-2">
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`text-[15px] ${selected ? "font-bold text-primary" : "font-semibold text-white"}`}>
          {label}
        </Text>
        <Text className="text-xs text-muted">{description}</Text>
      </View>
      {selected ? <Check size={16} color="#22C55E" strokeWidth={2.5} /> : null}
    </Pressable>
  );
}

function WelcomeBanner({ greetingName, myUserId }: { greetingName: string; myUserId: string }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [founder, setFounder] = useState<Profile | null>(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_DISMISSED_KEY).then((v) => setDismissed(v === "1"));
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", FOUNDER_USERNAME)
        .maybeSingle();
      if (!data) return;
      const p = data as Profile;
      setFounder(p);
      if (p.id === myUserId) return;
      const { count } = await supabase
        .from("social_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", myUserId)
        .eq("followed_id", p.id);
      setFollowing((count ?? 0) > 0);
    })();
  }, [myUserId]);

  if (dismissed !== false || !founder) return null;

  async function dismiss() {
    setDismissed(true);
    await AsyncStorage.setItem(WELCOME_DISMISSED_KEY, "1");
  }

  async function toggleFollow() {
    if (!founder) return;
    const was = following;
    setFollowing(!was);
    if (was) {
      await supabase
        .from("social_follows")
        .delete()
        .eq("follower_id", myUserId)
        .eq("followed_id", founder.id);
    } else {
      await supabase.from("social_follows").insert({
        follower_id: myUserId,
        followed_id: founder.id,
        status: founder.is_public ? "accepted" : "pending",
      });
    }
  }

  const founderName = founder.display_name ?? founder.username;

  return (
    <View className="mb-4 mt-1 rounded-2xl bg-surface p-4">
      <Pressable
        onPress={dismiss}
        hitSlop={12}
        className="absolute right-3 top-3 z-10 active:opacity-70"
      >
        <X size={16} color="#8B98A9" strokeWidth={2.25} />
      </Pressable>
      <Text className="pr-6 text-[15px] font-semibold text-white">Hi {greetingName}!</Text>
      <Text className="mt-2 text-[14px] leading-[20px] text-muted">
        My name is Rowan, I built Kova. Thank you so much for trying it out!{"\n"}
        {"\n"}I love getting feedback to improve the experience for you just let me know what we can
        change. {"\n"}
        {"\n"}Feel free to email me at{" "}
        <Text className="text-primary" onPress={() => Linking.openURL(`mailto:${FOUNDER_EMAIL}`)}>
          {FOUNDER_EMAIL}
        </Text>{" "}
        and give me a follow.
      </Text>

      <View className="mt-4 border-t border-white/5 pt-4">
        <Pressable
          onPress={() => router.push(`/user/${founder.id}`)}
          className="flex-row items-center active:opacity-70"
        >
          <Avatar url={founder.avatar_url} name={founderName} size={44} />
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
              {founderName}
            </Text>
            <Text className="text-xs text-muted" numberOfLines={1}>
              @{founder.username}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={toggleFollow}
          className={`mt-3 items-center rounded-full py-2.5 active:opacity-70 ${
            following ? "bg-surface-2" : "bg-primary"
          }`}
        >
          <Text className={`text-sm font-bold ${following ? "text-muted" : "text-background"}`}>
            {following ? "Following" : "Follow"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SuggestedAthletes({ myUserId }: { myUserId: string }) {
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SUGGESTED_DISMISSED_KEY).then((v) => {
      try {
        const parsed = v ? (JSON.parse(v) as string[]) : [];
        setDismissedIds(new Set(parsed));
      } catch {
        setDismissedIds(new Set());
      }
    });
  }, []);

  useEffect(() => {
    if (dismissedIds === null) return;
    (async () => {
      const { data: followsData } = await supabase
        .from("social_follows")
        .select("followed_id")
        .eq("follower_id", myUserId);
      const followed = new Set((followsData ?? []).map((r) => r.followed_id as string));
      setFollowedIds(followed);

      const exclude = new Set<string>([myUserId, ...followed, ...dismissedIds]);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("longest_streak", { ascending: false })
        .limit(25);
      const filtered = ((data as Profile[]) ?? []).filter((p) => !exclude.has(p.id)).slice(0, 10);
      setSuggestions(filtered);
    })();
  }, [myUserId, dismissedIds]);

  async function dismiss(id: string) {
    const next = new Set(dismissedIds ?? []);
    next.add(id);
    setDismissedIds(next);
    setSuggestions((prev) => prev.filter((p) => p.id !== id));
    await AsyncStorage.setItem(SUGGESTED_DISMISSED_KEY, JSON.stringify(Array.from(next)));
  }

  async function toggleFollow(target: Profile) {
    const id = target.id;
    const isConnected = followedIds.has(id) || requestedIds.has(id);
    if (isConnected) {
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await supabase
        .from("social_follows")
        .delete()
        .eq("follower_id", myUserId)
        .eq("followed_id", id);
    } else if (target.is_public) {
      setFollowedIds((prev) => new Set(prev).add(id));
      await supabase
        .from("social_follows")
        .insert({ follower_id: myUserId, followed_id: id, status: "accepted" });
    } else {
      setRequestedIds((prev) => new Set(prev).add(id));
      await supabase
        .from("social_follows")
        .insert({ follower_id: myUserId, followed_id: id, status: "pending" });
    }
  }

  if (!suggestions.length) return null;

  return (
    <View className="mb-4 mt-1">
      <Text className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
        Suggested Athletes
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 4 }}
      >
        {suggestions.map((item) => {
          const isFollowing = followedIds.has(item.id);
          const isRequested = requestedIds.has(item.id);
          const connected = isFollowing || isRequested;
          const name = item.display_name ?? item.username;
          return (
            <View key={item.id} className="mr-3 w-[140px] rounded-2xl bg-surface p-3">
              <Pressable
                onPress={() => dismiss(item.id)}
                hitSlop={12}
                className="absolute right-2 top-2 z-10 active:opacity-70"
              >
                <X size={14} color="#8B98A9" strokeWidth={2.25} />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/user/${item.id}`)}
                className="items-center active:opacity-70"
              >
                <Avatar url={item.avatar_url} name={name} size={56} />
                <Text
                  className="mt-2 max-w-full text-[13px] font-semibold text-white"
                  numberOfLines={1}
                >
                  @{item.username}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => toggleFollow(item)}
                className={`mt-3 items-center rounded-full py-1.5 active:opacity-70 ${
                  connected ? "bg-surface-2" : "bg-primary"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    connected ? "text-muted" : "text-background"
                  }`}
                >
                  {isFollowing ? "Following" : isRequested ? "Requested" : "Follow"}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
