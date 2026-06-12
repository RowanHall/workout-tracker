import { useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { dateKey } from '@/lib/format';

const CELL = 11;
const GAP = 3;
const COL = CELL + GAP;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GitHub-style intensity shades by workouts per day. Full literal class
// names so NativeWind can statically extract them.
const SHADES = ['bg-surface-2', 'bg-primary/40', 'bg-primary/70', 'bg-primary'];

/**
 * GitHub-style contribution heatmap of the last 12 months. Horizontally
 * scrollable, starts scrolled to today. `workoutDates` may contain
 * duplicates — multiple workouts on a day deepen the cell color.
 */
export function ConsistencyCalendar({ workoutDates }: { workoutDates: string[] }) {
  const scrollRef = useRef<ScrollView>(null);

  const counts = new Map<string, number>();
  for (const date of workoutDates) {
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  // Start on the Sunday on/before one year ago; columns run through today.
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

  // A month label above the first column containing that month's 1st.
  const monthLabels = weeks.flatMap((week, wi) => {
    const firstOfMonth = week.find((day) => day.getDate() === 1 && day <= today);
    return firstOfMonth ? [{ weekIndex: wi, label: MONTHS[firstOfMonth.getMonth()] }] : [];
  });

  const gridWidth = weeks.length * COL;
  const totalWorkouts = workoutDates.length;

  return (
    <View>
      <View className="flex-row">
        {/* Weekday gutter (aligned under the month-label row's height). */}
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
                    const count = counts.get(dateKey(day)) ?? 0;
                    return (
                      <View key={di} style={{ height: COL }}>
                        <View
                          className={`rounded-sm ${SHADES[Math.min(count, SHADES.length - 1)]}`}
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
          {totalWorkouts} workout{totalWorkouts === 1 ? '' : 's'} in the last year
        </Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs text-muted">Less</Text>
          {SHADES.map((shade) => (
            <View key={shade} className={`h-2.5 w-2.5 rounded-sm ${shade}`} />
          ))}
          <Text className="text-xs text-muted">More</Text>
        </View>
      </View>
    </View>
  );
}
