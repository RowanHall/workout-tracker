import { useMemo, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { dateKey, formatVolume } from '@/lib/format';

const CELL = 11;
const GAP = 3;
const COL = CELL + GAP;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Five-stop gradient from dim → bright. Whole class names so NativeWind
// can pick them up via static analysis.
const SHADES = [
  'bg-surface-2',
  'bg-primary/25',
  'bg-primary/50',
  'bg-primary/75',
  'bg-primary',
];

/**
 * GitHub-style heatmap colored by *daily training volume* rather than
 * workout count. The continuous gradient highlights how hard each day
 * was, not just whether the user trained. Horizontally scrollable, starts
 * scrolled to today.
 */
export function VolumeHeatmap({ dailyVolume }: { dailyVolume: Map<string, number> }) {
  const scrollRef = useRef<ScrollView>(null);

  const { weeks, monthLabels, totalDays, totalVolume, peakVolume, thresholds } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    const weeks: Date[][] = [];
    for (let cursor = new Date(start); cursor <= today; ) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const monthLabels = weeks.flatMap((week, wi) => {
      const firstOfMonth = week.find((day) => day.getDate() === 1 && day <= today);
      return firstOfMonth ? [{ weekIndex: wi, label: MONTHS[firstOfMonth.getMonth()] }] : [];
    });

    // Quartile-based thresholds across days that actually had training, so
    // a single huge day doesn't wash out the gradient for everyone else.
    const volumes = [...dailyVolume.values()].filter((v) => v > 0).sort((a, b) => a - b);
    const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
    const peakVolume = volumes.length > 0 ? volumes[volumes.length - 1] : 0;
    const quantile = (p: number) =>
      volumes.length === 0 ? 0 : volumes[Math.min(volumes.length - 1, Math.floor(volumes.length * p))];
    const thresholds = [quantile(0.25), quantile(0.5), quantile(0.75)];

    return {
      weeks,
      monthLabels,
      totalDays: volumes.length,
      totalVolume,
      peakVolume,
      thresholds,
    };
  }, [dailyVolume]);

  const shadeFor = (volume: number): string => {
    if (volume <= 0) return SHADES[0];
    if (volume <= thresholds[0]) return SHADES[1];
    if (volume <= thresholds[1]) return SHADES[2];
    if (volume <= thresholds[2]) return SHADES[3];
    return SHADES[4];
  };

  const today = new Date();
  const gridWidth = weeks.length * COL;

  return (
    <View>
      <View className="flex-row">
        <View style={{ marginTop: 16, width: 28, height: 7 * COL }}>
          {[1, 3, 5].map((row) => (
            <Text
              key={row}
              className="absolute text-[9px] text-muted"
              style={{ top: row * COL }}
            >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][row]}
            </Text>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View>
            <View style={{ width: gridWidth, height: 16 }}>
              {monthLabels.map(({ weekIndex, label }) => (
                <Text
                  key={`${label}-${weekIndex}`}
                  className="absolute text-[9px] text-muted"
                  style={{ left: weekIndex * COL }}
                >
                  {label}
                </Text>
              ))}
            </View>
            <View className="flex-row">
              {weeks.map((week, wi) => (
                <View key={wi} style={{ width: COL }}>
                  {week.map((day, di) => {
                    if (day > today) {
                      return <View key={di} style={{ width: CELL, height: COL }} />;
                    }
                    const volume = dailyVolume.get(dateKey(day)) ?? 0;
                    return (
                      <View key={di} style={{ height: COL }}>
                        <View
                          className={`rounded-sm ${shadeFor(volume)}`}
                          style={{ width: CELL, height: CELL }}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-xs text-muted">
          {totalDays} day{totalDays === 1 ? '' : 's'} · {formatVolume(totalVolume)} total
        </Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs text-muted">Less</Text>
          {SHADES.map((shade) => (
            <View key={shade} className={`h-2.5 w-2.5 rounded-sm ${shade}`} />
          ))}
          <Text className="text-xs text-muted">More</Text>
        </View>
      </View>

      {peakVolume > 0 && (
        <Text className="mt-1 text-xs text-muted">
          Heaviest day: {formatVolume(peakVolume)}
        </Text>
      )}
    </View>
  );
}
