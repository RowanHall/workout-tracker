import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KovaLogo } from '@/components/KovaLogo';
import { WorkoutCard } from '@/components/WorkoutCard';
import { supabase } from '@/lib/supabase';
import type { FeedWorkout } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function FeedScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [feed, setFeed] = useState<FeedWorkout[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadFeed = useCallback(async () => {
    // RLS limits visible workouts to the user's own and those of people
    // they follow, so no explicit user filter is needed here.
    const { data } = await supabase
      .from('workouts')
      .select(
        `*,
         profiles (username, display_name, avatar_url),
         workout_sets (id, is_pr),
         feed_interactions (id, workout_id, user_id, type, content, created_at, profiles (username))`
      )
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(30);
    setFeed((data as unknown as FeedWorkout[]) ?? []);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }

  async function toggleCheer(workout: FeedWorkout, hasCheered: boolean) {
    if (!userId) return;
    if (hasCheered) {
      await supabase
        .from('feed_interactions')
        .delete()
        .eq('workout_id', workout.id)
        .eq('user_id', userId)
        .eq('type', 'cheer');
    } else {
      await supabase
        .from('feed_interactions')
        .insert({ workout_id: workout.id, user_id: userId, type: 'cheer' });
    }
    loadFeed();
  }

  async function addComment(workout: FeedWorkout, content: string) {
    if (!userId) return;
    await supabase
      .from('feed_interactions')
      .insert({ workout_id: workout.id, user_id: userId, type: 'comment', content });
    await loadFeed();
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <KovaLogo size={24} />
        <Pressable
          className="flex-row items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 active:opacity-70"
          onPress={() => router.push('/people')}
        >
          <Ionicons name="person-add" size={16} color="#22C55E" />
          <Text className="text-sm font-semibold text-primary">Find Friends</Text>
        </Pressable>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#22C55E" />
        }
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            currentUserId={userId ?? ''}
            onToggleCheer={toggleCheer}
            onAddComment={addComment}
          />
        )}
        ListEmptyComponent={
          loaded ? (
            <View className="mt-24 items-center px-8">
              <Inbox size={40} color="#8B98A9" strokeWidth={1.5} />
              <Text className="mb-1 mt-3 text-lg font-bold text-white">Nothing here yet</Text>
              <Text className="text-center text-muted">
                Finish a workout or follow some friends to fill your feed.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
