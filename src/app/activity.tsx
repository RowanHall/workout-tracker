import { router } from "expo-router";
import { Heart, MessageCircle, UserPlus } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { useHeaderInset } from "@/lib/blurHeader";
import { timeAgo } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

interface RequestItem {
  actor: Profile;
  createdAt: string;
}

type ActivityItem =
  | {
      kind: "cheer" | "comment";
      id: string;
      actor: Profile;
      workoutId: string;
      workoutTitle: string;
      content: string | null;
      createdAt: string;
    }
  | { kind: "follow"; id: string; actor: Profile; createdAt: string };

export default function ActivityScreen() {
  const { session } = useAuth();
  const myId = session?.user.id;
  const headerInset = useHeaderInset();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!myId) return;
    const [requestsRes, followersRes, interactionsRes] = await Promise.all([
      supabase
        .from("social_follows")
        .select("created_at, profile:profiles!social_follows_follower_id_fkey (*)")
        .eq("followed_id", myId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("social_follows")
        .select("created_at, profile:profiles!social_follows_follower_id_fkey (*)")
        .eq("followed_id", myId)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("feed_interactions")
        .select(
          "id, type, content, created_at, actor:profiles!feed_interactions_user_id_fkey (*), workout:workouts!inner (id, title, user_id)",
        )
        .eq("workout.user_id", myId)
        .neq("user_id", myId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setRequests(
      ((requestsRes.data ?? []) as unknown as { created_at: string; profile: Profile | null }[])
        .filter((r) => r.profile != null)
        .map((r) => ({ actor: r.profile as Profile, createdAt: r.created_at })),
    );

    const followItems: ActivityItem[] = (
      (followersRes.data ?? []) as unknown as { created_at: string; profile: Profile | null }[]
    )
      .filter((r) => r.profile != null)
      .map((r) => ({
        kind: "follow" as const,
        id: `follow-${(r.profile as Profile).id}`,
        actor: r.profile as Profile,
        createdAt: r.created_at,
      }));

    const interactionItems: ActivityItem[] = (
      (interactionsRes.data ?? []) as unknown as {
        id: string;
        type: "cheer" | "comment";
        content: string | null;
        created_at: string;
        actor: Profile | null;
        workout: { id: string; title: string } | null;
      }[]
    )
      .filter((r) => r.actor != null && r.workout != null)
      .map((r) => ({
        kind: r.type,
        id: r.id,
        actor: r.actor as Profile,
        workoutId: (r.workout as { id: string }).id,
        workoutTitle: (r.workout as { title: string }).title,
        content: r.content,
        createdAt: r.created_at,
      }));

    setActivity(
      [...followItems, ...interactionItems].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    );
    setLoaded(true);
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  async function accept(actor: Profile) {
    if (!myId) return;
    setRequests((prev) => prev.filter((r) => r.actor.id !== actor.id));
    await supabase
      .from("social_follows")
      .update({ status: "accepted" })
      .eq("follower_id", actor.id)
      .eq("followed_id", myId);
    load();
  }

  async function decline(actor: Profile) {
    if (!myId) return;
    setRequests((prev) => prev.filter((r) => r.actor.id !== actor.id));
    await supabase
      .from("social_follows")
      .delete()
      .eq("follower_id", actor.id)
      .eq("followed_id", myId);
  }

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  const isEmpty = requests.length === 0 && activity.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: headerInset + 16, paddingHorizontal: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {requests.length > 0 && (
        <View className="pt-1">
          <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
            Follow Requests
          </Text>
          {requests.map((r) => (
            <View
              key={r.actor.id}
              className="mb-2 flex-row items-center rounded-2xl bg-surface px-4 py-3"
            >
              <Pressable
                className="mr-3 flex-1 flex-row items-center active:opacity-70"
                onPress={() => router.push(`/user/${r.actor.id}`)}
              >
                <Avatar
                  url={r.actor.avatar_url}
                  name={r.actor.display_name ?? r.actor.username}
                  size={40}
                />
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-white" numberOfLines={1}>
                    {r.actor.display_name ?? r.actor.username}
                  </Text>
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    @{r.actor.username}
                  </Text>
                </View>
              </Pressable>
              <View className="flex-row items-center gap-2">
                <Pressable
                  className="rounded-full bg-primary px-4 py-2 active:opacity-70"
                  onPress={() => accept(r.actor)}
                  hitSlop={6}
                >
                  <Text className="text-sm font-bold text-background">Accept</Text>
                </Pressable>
                <Pressable
                  className="rounded-full bg-surface-2 px-4 py-2 active:opacity-70"
                  onPress={() => decline(r.actor)}
                  hitSlop={6}
                >
                  <Text className="text-sm font-bold text-muted">Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {activity.length > 0 && (
        <View className="pt-6">
          <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
            Activity
          </Text>
          {activity.map((item) => (
            <ActivityRow key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </View>
      )}

      {isEmpty && (
        <Text className="mt-24 text-center text-muted">No activity yet</Text>
      )}
    </ScrollView>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const name = item.actor.display_name ?? item.actor.username;

  function onPress() {
    if (item.kind === "follow") router.push(`/user/${item.actor.id}`);
    else router.push(`/workout/${item.workoutId}`);
  }

  return (
    <Pressable
      className="flex-row items-center border-b border-white/5 py-3 active:opacity-70"
      onPress={onPress}
    >
      <Avatar url={item.actor.avatar_url} name={name} size={40} />
      <View className="ml-3 flex-1">
        <Text className="text-[14px] leading-[19px] text-white" numberOfLines={2}>
          <Text className="font-semibold">{name}</Text>
          {item.kind === "follow" && " started following you"}
          {item.kind === "cheer" && " cheered your workout"}
          {item.kind === "comment" && (
            <Text className="text-muted">{` commented: ${item.content ?? ""}`}</Text>
          )}
        </Text>
        <Text className="mt-0.5 text-xs text-muted">{timeAgo(item.createdAt)}</Text>
      </View>
      <View className="ml-2">
        {item.kind === "follow" && <UserPlus size={17} color="#8B98A9" strokeWidth={2} />}
        {item.kind === "cheer" && <Heart size={17} color="#EF4444" strokeWidth={2} fill="#EF4444" />}
        {item.kind === "comment" && <MessageCircle size={17} color="#8B98A9" strokeWidth={2} />}
      </View>
    </Pressable>
  );
}
