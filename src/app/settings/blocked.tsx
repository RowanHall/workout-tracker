import { router } from 'expo-router';
import { UserX } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { useHeaderInset } from '@/lib/blurHeader';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

interface BlockedRow {
  blocked_id: string;
  created_at: string;
  profile: Profile;
}

export default function BlockedUsersScreen() {
  const { session } = useAuth();
  const myId = session?.user.id;
  const headerInset = useHeaderInset();
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!myId) return;
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', myId)
      .order('created_at', { ascending: false });
    if (error) {
      Alert.alert('Could not load', error.message);
      setLoaded(true);
      return;
    }
    const ids = (data ?? []).map((r) => r.blocked_id as string);
    if (ids.length === 0) {
      setRows([]);
      setLoaded(true);
      return;
    }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);
    const profileById = new Map<string, Profile>(
      ((profiles ?? []) as Profile[]).map((p) => [p.id, p]),
    );
    setRows(
      (data ?? [])
        .map((r) => ({
          blocked_id: r.blocked_id as string,
          created_at: r.created_at as string,
          profile: profileById.get(r.blocked_id as string) as Profile,
        }))
        .filter((r) => r.profile != null),
    );
    setLoaded(true);
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  async function unblock(blockedId: string, username: string) {
    Alert.alert(`Unblock @${username}?`, "They'll be able to see your workouts and follow you again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          if (!myId) return;
          const { error } = await supabase
            .from('user_blocks')
            .delete()
            .eq('blocker_id', myId)
            .eq('blocked_id', blockedId);
          if (error) {
            Alert.alert('Could not unblock', error.message);
            return;
          }
          setRows((prev) => prev.filter((r) => r.blocked_id !== blockedId));
        },
      },
    ]);
  }

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      data={rows}
      keyExtractor={(item) => item.blocked_id}
      contentContainerClassName="px-5 pt-6 pb-12"
      contentContainerStyle={{ paddingTop: headerInset + 24 }}
      ListHeaderComponent={
        <Text className="mb-5 text-[14px] leading-[20px] text-muted">
          Blocked accounts can&apos;t see your workouts, comment on them, or follow you.
          You won&apos;t see their content either.
        </Text>
      }
      ItemSeparatorComponent={() => <View className="h-px bg-white/5" />}
      renderItem={({ item }) => {
        const p = item.profile;
        const name = p.display_name ?? p.username;
        return (
          <View className="flex-row items-center py-3.5">
            <Pressable
              className="mr-3 flex-1 flex-row items-center active:opacity-70"
              onPress={() => router.push(`/user/${p.id}`)}
            >
              <Avatar url={p.avatar_url} name={name} size={40} />
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
                  {name}
                </Text>
                <Text className="text-xs text-muted" numberOfLines={1}>
                  @{p.username}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => unblock(p.id, p.username)}
              className="rounded-full bg-surface-2 px-4 py-2 active:opacity-70"
            >
              <Text className="text-sm font-bold text-danger">Unblock</Text>
            </Pressable>
          </View>
        );
      }}
      ListEmptyComponent={
        <View className="mt-12 items-center">
          <UserX size={36} color="#8B98A9" strokeWidth={1.5} />
          <Text className="mt-3 text-lg font-bold text-white">No one blocked</Text>
          <Text className="mt-1 text-center text-muted">
            Block someone from their profile or any of their workouts.
          </Text>
        </View>
      }
    />
  );
}
