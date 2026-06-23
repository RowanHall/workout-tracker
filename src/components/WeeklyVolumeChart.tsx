import { Text, View } from 'react-native';

export type VolumeGranularity = 'week' | 'month';

export interface WeekVolume {
  /** Bucket start, local time. */
  weekStart: Date;
  volume: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Vertical bar chart of training volume per bucket. Expects one entry per
 * bucket (zero-volume buckets included) in chronological order; the current
 * bucket is highlighted. Granularity controls how the x-axis is labeled — for
 * weekly bars we label every Nth bucket by month/day, for monthly bars we
 * label every bucket with month (and year when it changes).
 */
export function WeeklyVolumeChart({
  data,
  granularity = 'week',
}: {
  data: WeekVolume[];
  granularity?: VolumeGranularity;
}) {
  if (data.every((w) => w.volume === 0)) {
    return <Text className="text-muted">Finish some workouts to see your volume trend.</Text>;
  }
  const max = Math.max(...data.map((w) => w.volume));
  const labelEvery = granularity === 'week' ? Math.max(1, Math.ceil(data.length / 5)) : 1;

  return (
    <View>
      <View className="h-28 flex-row items-end gap-1.5">
        {data.map((bucket, i) => {
          const isCurrent = i === data.length - 1;
          const pct = max === 0 ? 0 : (bucket.volume / max) * 100;
          return (
            <View key={bucket.weekStart.toISOString()} className="flex-1">
              <View
                className={`w-full rounded-t-md ${isCurrent ? 'bg-primary' : 'bg-primary-dim'}`}
                style={{ height: `${Math.max(pct, bucket.volume > 0 ? 4 : 2)}%` }}
              />
            </View>
          );
        })}
      </View>
      <View className="mt-1.5 flex-row gap-1.5">
        {data.map((bucket, i) => {
          const show = i === data.length - 1 || i % labelEvery === 0;
          return (
            <Text
              key={bucket.weekStart.toISOString()}
              className="flex-1 text-center text-[9px] text-muted"
              numberOfLines={1}
            >
              {show ? formatBucket(bucket.weekStart, granularity, i, data) : ''}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function formatBucket(
  start: Date,
  granularity: VolumeGranularity,
  index: number,
  all: WeekVolume[]
): string {
  if (granularity === 'month') {
    const month = MONTH_LABELS[start.getMonth()];
    const prev = index > 0 ? all[index - 1].weekStart : null;
    const yearChanged = !prev || prev.getFullYear() !== start.getFullYear();
    return yearChanged ? `${month} ${String(start.getFullYear()).slice(2)}` : month;
  }
  return `${start.getMonth() + 1}/${start.getDate()}`;
}
