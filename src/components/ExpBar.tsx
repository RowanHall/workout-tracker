import { Text, View } from 'react-native';

import { levelProgress } from '@/lib/exp';

export function ExpBar({ totalExp }: { totalExp: number }) {
  const { level, current, needed } = levelProgress(totalExp);
  const pct = Math.min(100, Math.round((current / needed) * 100));

  return (
    <View>
      <View className="mb-1.5 flex-row items-end justify-between">
        <Text className="text-sm font-bold text-primary">LVL {level}</Text>
        <Text className="text-xs text-muted">
          {current.toLocaleString()} / {needed.toLocaleString()} EXP
        </Text>
      </View>
      <View className="h-2.5 overflow-hidden rounded-full bg-surface-2">
        <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
