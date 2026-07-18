import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { useHeaderInset } from "@/lib/blurHeader";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

type Tab = "followers" | "following";

export default function ConnectionsScreen() {
  const params = useLocalSearchParams<{ userId?: string; tab?: string }>();
  const { session } = useAuth();
  const myId = session?.user.id;
  const targetId = params.userId ?? myId;
  const headerInset = useHeaderInset();

  const [tab, setTab] = useState<Tab>(params.tab === "following" ? "following" : "followers");
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!targetId || !myId) return;
    const [followersRes, followingRes, myFollowsRes] = await Promise.all([
      supabase
        .from("social_follows")
        .select("profile:profiles!social_follows_follower_id_fkey (*)")
        .eq("followed_id", targetId)
        .eq("status", "accepted"),
      supabase
        .from("social_follows")
        .select("profile:profiles!social_follows_followed_id_fkey (*)")
        .eq("follower_id", targetId)
        .eq("status", "accepted"),
      supabase.from("social_follows").select("followed_id, status").eq("follower_id", myId),
    ]);

    const pickProfiles = (rows: unknown): Profile[] =>
      ((rows ?? []) as { profile: Profile | null }[])
        .map((r) => r.profile)
        .filter((p): p is Profile => p != null);

    setFollowers(pickProfiles(followersRes.data));
    setFollowing(pickProfiles(followingRes.data));

    const myFollows = (myFollowsRes.data ?? []) as { followed_id: string; status: string }[];
    setFollowedIds(
      new Set(myFollows.filter((r) => r.status === "accepted").map((r) => r.followed_id)),
    );
    setRequestedIds(
      new Set(myFollows.filter((r) => r.status === "pending").map((r) => r.followed_id)),
    );
    setLoaded(true);
  }, [targetId, myId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleFollow(target: Profile) {
    if (!myId) return;
    const isConnected = followedIds.has(target.id) || requestedIds.has(target.id);
    if (isConnected) {
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      await supabase
        .from("social_follows")
        .delete()
        .eq("follower_id", myId)
        .eq("followed_id", target.id);
    } else if (target.is_public) {
      setFollowedIds((prev) => new Set(prev).add(target.id));
      await supabase
        .from("social_follows")
        .insert({ follower_id: myId, followed_id: target.id, status: "accepted" });
    } else {
      setRequestedIds((prev) => new Set(prev).add(target.id));
      await supabase
        .from("social_follows")
        .insert({ follower_id: myId, followed_id: target.id, status: "pending" });
    }
  }

  const data = tab === "followers" ? followers : following;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row gap-1 rounded-2xl bg-surface-2 p-1 mx-4 mt-3">
        <SegmentButton
          label="Followers"
          count={followers.length}
          active={tab === "followers"}
          onPress={() => setTab("followers")}
        />
        <SegmentButton
          label="Following"
          count={following.length}
          active={tab === "following"}
          onPress={() => setTab("following")}
        />
      </View>

      {!loaded ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#22C55E" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: headerInset + 12 }}
          renderItem={({ item }) => {
            const isSelf = item.id === myId;
            const isFollowing = followedIds.has(item.id);
            const isRequested = requestedIds.has(item.id);
            const connected = isFollowing || isRequested;
            return (
              <Pressable
                className="mb-2 flex-row items-center rounded-2xl bg-surface px-4 py-3 active:opacity-70"
                onPress={() => router.push(`/user/${item.id}`)}
              >
                <View className="mr-3">
                  <Avatar
                    url={item.avatar_url}
                    name={item.display_name ?? item.username}
                    size={40}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-white">
                    {item.display_name ?? item.username}
                  </Text>
                  <Text className="text-xs text-muted">@{item.username}</Text>
                </View>
                {!isSelf && (
                  <Pressable
                    className={`rounded-full px-4 py-2 active:opacity-70 ${
                      connected ? "bg-surface-2" : "bg-primary"
                    }`}
                    onPress={() => toggleFollow(item)}
                    hitSlop={6}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        connected ? "text-muted" : "text-background"
                      }`}
                    >
                      {isFollowing ? "Following" : isRequested ? "Requested" : "Follow"}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text className="mt-12 text-center text-muted">
              {tab === "followers" ? "No followers yet" : "Not following anyone yet"}
            </Text>
          }
        />
      )}
    </View>
  );
}

function SegmentButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-xl py-2.5 active:opacity-70 ${
        active ? "bg-surface" : ""
      }`}
    >
      <Text
        className={`text-sm font-semibold ${active ? "text-white" : "text-muted"}`}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {count.toLocaleString()} {label}
      </Text>
    </Pressable>
  );
}
