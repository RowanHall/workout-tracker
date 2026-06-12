import { Text, View } from 'react-native';

import { formatWeight } from '@/lib/format';

import { LineChart } from './LineChart';

export interface WeightPoint {
  recorded_on: string;
  weight: number;
}

/** Body-weight trend over time. */
export function WeightChart({ data }: { data: WeightPoint[] }) {
  if (data.length === 0) {
    return (
      <View className="h-[150px] items-center justify-center">
        <Text className="text-muted">Log your weight in Settings to see your trend here.</Text>
      </View>
    );
  }

  const points = data.map((d) => ({ t: new Date(d.recorded_on).getTime(), y: d.weight }));
  return <LineChart data={points} color="#22C55E" formatLabel={formatWeight} />;
}
