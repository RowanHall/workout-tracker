import { Text, View } from 'react-native';

import { dateKey } from '@/lib/format';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Mon–Sun strip showing which days of the current week the user worked out.
 * Past rest days are muted, future days are outlined placeholders, today is
 * ringed regardless of state.
 */
export function WeekTracker({ workoutDates }: { workoutDates: string[] }) {
  const worked = new Set(workoutDates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  // getDay(): 0 = Sun, 1 = Mon, … shift so Monday is the week's first cell.
  const offset = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - offset);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });

  const workedThisWeek = days.filter((d) => d <= today && worked.has(dateKey(d))).length;

  return (
    <View>
      <View className="flex-row justify-between">
        {days.map((date, i) => {
          const isFuture = date > today;
          const isToday = date.getTime() === today.getTime();
          const didWork = worked.has(dateKey(date));

          let cellClass = 'bg-surface-2';
          if (didWork) cellClass = 'bg-primary';
          else if (isFuture) cellClass = 'border border-border bg-transparent';

          const ring = isToday ? 'border-2 border-primary' : '';

          return (
            <View key={i} className="items-center gap-1.5">
              <Text className="text-[11px] font-semibold text-muted">{DAY_LABELS[i]}</Text>
              <View
                className={`h-9 w-9 items-center justify-center rounded-lg ${cellClass} ${ring}`}
              >
                {didWork ? (
                  <Text className="text-base font-bold text-white">✓</Text>
                ) : (
                  <Text className="text-xs font-semibold text-muted">{date.getDate()}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      <Text className="mt-3 text-center text-xs text-muted">
        {workedThisWeek} {workedThisWeek === 1 ? 'workout' : 'workouts'} this week
      </Text>
    </View>
  );
}
