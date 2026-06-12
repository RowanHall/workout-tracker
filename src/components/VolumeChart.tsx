import { Text, View } from 'react-native';

import { formatVolume } from '@/lib/format';

export interface VolumeByGroup {
  group: string;
  volume: number;
}

/** Simple horizontal bar chart of volume per muscle group. */
export function VolumeChart({ data }: { data: VolumeByGroup[] }) {
  if (data.length === 0) {
    return <Text className="text-muted">Log some sets to see your volume here.</Text>;
  }
  const max = Math.max(...data.map((d) => d.volume));

  return (
    <View className="gap-2.5">
      {data.map((d) => (
        <View key={d.group}>
          <View className="mb-1 flex-row justify-between">
            <Text className="text-sm capitalize text-white">
              {d.group.replace('_', ' ')}
            </Text>
            <Text className="text-sm text-muted">{formatVolume(d.volume)}</Text>
          </View>
          <View className="h-3 overflow-hidden rounded-full bg-surface-2">
            <View
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(3, Math.round((d.volume / max) * 100))}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
