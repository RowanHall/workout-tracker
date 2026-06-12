import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function PeopleScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('social_follows')
      .select('followed_id')
      .eq('follower_id', userId)
      .then(({ data }) =>
        setFollowedIds(new Set((data ?? []).map((row) => row.followed_id)))
      );
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
    const isFollowing = followedIds.has(target.id);
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(target.id);
      else next.add(target.id);
      return next;
    });
    if (isFollowing) {
      await supabase
        .from('social_follows')
        .delete()
        .eq('follower_id', userId)
        .eq('followed_id', target.id);
    } else {
      await supabase
        .from('social_follows')
        .insert({ follower_id: userId, followed_id: target.id });
    }
  }

  return (
    <View className="flex-1 bg-background px-4 pt-4">
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
          return (
            <View className="mb-2 flex-row items-center rounded-xl bg-surface px-4 py-3">
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
                  isFollowing ? 'bg-surface-2' : 'bg-primary'
                }`}
                onPress={() => toggleFollow(item)}
              >
                <Text
                  className={`text-sm font-bold ${
                    isFollowing ? 'text-muted' : 'text-background'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text className="mt-12 text-center text-muted">No lifters found</Text>
        }
      />
    </View>
  );
}
