import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrophyCard } from '@/components/TrophyCard';
import { supabase } from '@/lib/supabase';
import type { TrophyDefinition, TrophyProgress } from '@/lib/trophies';
import { useAuth } from '@/providers/AuthProvider';

export default function TrophyRoomScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [definitions, setDefinitions] = useState<TrophyDefinition[]>([]);
  const [progressById, setProgressById] = useState<Map<string, TrophyProgress>>(new Map());

  const load = useCallback(async () => {
    if (!userId) return;
    const [defsRes, progressRes] = await Promise.all([
      supabase.from('trophy_definitions').select('*').order('sort_order'),
      supabase
        .from('user_trophy_progress')
        .select('trophy_definition_id, current_raw_count, highest_tier_achieved')
        .eq('user_id', userId),
    ]);
    setDefinitions((defsRes.data as TrophyDefinition[]) ?? []);
    setProgressById(
      new Map(
        ((progressRes.data as TrophyProgress[]) ?? []).map((p) => [
          p.trophy_definition_id,
          p,
        ])
      )
    );
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const tiersEarned = [...progressById.values()].reduce((sum, p) => {
    const order = ['none', 'bronze', 'silver', 'gold', 'platinum'];
    return sum + order.indexOf(p.highest_tier_achieved);
  }, 0);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3">
        <Text className="text-2xl font-extrabold text-white">Trophy Room</Text>
        <Text className="text-sm text-muted">
          {tiersEarned} of {definitions.length * 4} tiers earned
        </Text>
      </View>

      <FlatList
        data={definitions}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerClassName="px-4 pb-4 gap-3"
        columnWrapperClassName="gap-3"
        renderItem={({ item }) => (
          <TrophyCard definition={item} progress={progressById.get(item.id) ?? null} />
        )}
      />
    </SafeAreaView>
  );
}
