import { Text, View } from 'react-native';

export type VolumeGranularity = 'week' | 'month';

export interface WeekVolume {
  /** Bucket start, local time. */
  weekStart: Date;
  volume: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Fixed pixel height of the plot area so gridlines can be placed absolutely. */
const PLOT_HEIGHT = 128;

/**
 * Vertical bar chart of training volume per bucket. Expects one entry per
 * bucket (zero-volume buckets included) in chronological order; the current
 * bucket is highlighted. A left y-axis and horizontal reference gridlines show
 * concrete volume values. Granularity controls how the x-axis is labeled — for
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
  const rawMax = Math.max(...data.map((w) => w.volume));
  const { niceMax, ticks } = buildScale(rawMax);
  const labelEvery = granularity === 'week' ? Math.max(1, Math.ceil(data.length / 5)) : 1;

  return (
    <View className="flex-row">
      {/* Y axis */}
      <View className="mr-2.5 w-9" style={{ height: PLOT_HEIGHT }}>
        {ticks.map((t) => (
          <Text
            key={t}
            className="absolute right-0 text-[9px] text-muted/70"
            style={{ bottom: (t / niceMax) * PLOT_HEIGHT - 6, fontVariant: ['tabular-nums'] }}
            numberOfLines={1}
          >
            {formatTick(t)}
          </Text>
        ))}
      </View>

      {/* Plot + x axis */}
      <View className="flex-1">
        <View style={{ height: PLOT_HEIGHT }}>
          {/* Reference gridlines */}
          {ticks.map((t) => (
            <View
              key={t}
              className="absolute left-0 right-0 h-px bg-white/5"
              style={{ bottom: (t / niceMax) * PLOT_HEIGHT }}
            />
          ))}
          {/* Bars */}
          <View className="absolute inset-0 flex-row items-end gap-1.5">
            {data.map((bucket, i) => {
              const isCurrent = i === data.length - 1;
              const pct = niceMax === 0 ? 0 : (bucket.volume / niceMax) * 100;
              return (
                <View key={bucket.weekStart.toISOString()} className="flex-1">
                  <View
                    className={`w-full rounded-t-md ${isCurrent ? 'bg-primary' : 'bg-primary-dim'}`}
                    style={{ height: `${Math.max(pct, bucket.volume > 0 ? 3 : 1)}%` }}
                  />
                </View>
              );
            })}
          </View>
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
    </View>
  );
}

/**
 * Build an evenly-spaced "nice" scale (0, step, 2·step, … niceMax) that fully
 * contains rawMax, so gridlines and y-axis labels land on round numbers.
 */
function buildScale(rawMax: number): { niceMax: number; ticks: number[] } {
  if (rawMax <= 0) return { niceMax: 1, ticks: [0, 1] };
  const targetSteps = 4;
  const rawStep = rawMax / targetSteps;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = niceNorm * mag;
  const niceMax = Math.ceil(rawMax / step) * step;

  const ticks: number[] = [];
  for (let t = 0; t <= niceMax + step * 1e-6; t += step) ticks.push(t);
  return { niceMax, ticks };
}

/** Compact volume label for the y-axis: 12000 → "12k", 1500 → "1.5k". */
function formatTick(v: number): string {
  if (v === 0) return '0';
  if (v >= 1000) {
    const k = v / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(Math.round(v));
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
