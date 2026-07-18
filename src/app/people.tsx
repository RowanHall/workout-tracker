import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { useHeaderInset } from '@/lib/blurHeader';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function PeopleScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const headerInset = useHeaderInset();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('social_follows')
      .select('followed_id, status')
      .eq('follower_id', userId)
      .then(({ data }) => {
        const rows = (data ?? []) as { followed_id: string; status: string }[];
        setFollowedIds(
          new Set(rows.filter((r) => r.status === 'accepted').map((r) => r.followed_id))
        );
        setRequestedIds(
          new Set(rows.filter((r) => r.status === 'pending').map((r) => r.followed_id))
        );
      });
  }, [userId]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', userId ?? '')
        .order('longest_streak', { ascending: false })
        .limit(25);
      if (search.trim()) {
        query = query.ilike('username', `%${search.trim()}%`);
      }
      const { data } = await query;
      setResults((data as Profile[]) ?? []);
    }, 250);
    return () => clearTimeout(handle);
  }, [search, userId]);

  async function toggleFollow(target: Profile) {
    if (!userId) return;
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
        .from('social_follows')
        .delete()
        .eq('follower_id', userId)
        .eq('followed_id', target.id);
    } else if (target.is_public) {
      setFollowedIds((prev) => new Set(prev).add(target.id));
      await supabase
        .from('social_follows')
        .insert({ follower_id: userId, followed_id: target.id, status: 'accepted' });
    } else {
      setRequestedIds((prev) => new Set(prev).add(target.id));
      await supabase
        .from('social_follows')
        .insert({ follower_id: userId, followed_id: target.id, status: 'pending' });
    }
  }

  return (
    <View
      className="flex-1 bg-background px-4 pt-4"
      style={{ paddingTop: headerInset + 16 }}
    >
      <TextInput
        className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-base text-white"
        placeholder="Search by username…"
        placeholderTextColor="#8B98A9"
        autoCapitalize="none"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isFollowing = followedIds.has(item.id);
          const isRequested = requestedIds.has(item.id);
          const connected = isFollowing || isRequested;
          return (
            <Pressable
              className="mb-2 flex-row items-center rounded-xl bg-surface px-4 py-3 active:opacity-70"
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
              <Pressable
                className={`rounded-full px-4 py-2 active:opacity-70 ${
                  connected ? 'bg-surface-2' : 'bg-primary'
                }`}
                onPress={() => toggleFollow(item)}
              >
                <Text
                  className={`text-sm font-bold ${
                    connected ? 'text-muted' : 'text-background'
                  }`}
                >
                  {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                </Text>
              </Pressable>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text className="mt-12 text-center text-muted">No lifters found</Text>
        }
      />
    </View>
  );
}
