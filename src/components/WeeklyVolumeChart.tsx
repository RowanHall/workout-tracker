import { Text, View } from 'react-native';

export interface WeekVolume {
  /** Monday of the week, local time. */
  weekStart: Date;
  volume: number;
}

/**
 * Vertical bar chart of training volume per week. Expects one entry per week
 * (zero-volume weeks included) in chronological order; the current week is
 * highlighted.
 */
export function WeeklyVolumeChart({ data }: { data: WeekVolume[] }) {
  if (data.every((w) => w.volume === 0)) {
    return <Text className="text-muted">Finish some workouts to see your weekly trend.</Text>;
  }
  const max = Math.max(...data.map((w) => w.volume));

  return (
    <View>
      <View className="h-28 flex-row items-end gap-1.5">
        {data.map((week, i) => {
          const isCurrent = i === data.length - 1;
          const pct = max === 0 ? 0 : (week.volume / max) * 100;
          return (
            <View key={week.weekStart.toISOString()} className="flex-1">
              <View
                className={`w-full rounded-t-md ${isCurrent ? 'bg-primary' : 'bg-primary-dim'}`}
                style={{ height: `${Math.max(pct, week.volume > 0 ? 4 : 2)}%` }}
              />
            </View>
          );
        })}
      </View>
      <View className="mt-1.5 flex-row gap-1.5">
        {data.map((week, i) => (
          <Text
            key={week.weekStart.toISOString()}
            className="flex-1 text-center text-[9px] text-muted"
          >
            {i % 3 === 0 || i === data.length - 1
              ? `${week.weekStart.getMonth() + 1}/${week.weekStart.getDate()}`
              : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}
