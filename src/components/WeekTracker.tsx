import { Moon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { dateKey } from '@/lib/format';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Mon–Sun strip showing which days of the current week the user worked out
 * or logged a rest day. Past blank days are muted, future days are outlined
 * placeholders, today is ringed regardless of state.
 */
export function WeekTracker({
  workoutDates,
  restDates = [],
  workoutIds,
  onDayPress,
}: {
  workoutDates: string[];
  restDates?: string[];
  workoutIds?: Record<string, string>;
  onDayPress?: (workoutId: string) => void;
}) {
  const worked = new Set(workoutDates);
  const rested = new Set(restDates);

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
  const restedThisWeek = days.filter((d) => d <= today && rested.has(dateKey(d))).length;

  return (
    <View>
      <View className="flex-row justify-between">
        {days.map((date, i) => {
          const isFuture = date > today;
          const isToday = date.getTime() === today.getTime();
          const key = dateKey(date);
          const didWork = worked.has(key);
          const didRest = !didWork && rested.has(key);

          let cellClass = 'bg-surface-2';
          if (didWork) cellClass = 'bg-primary';
          else if (didRest) cellClass = 'bg-surface-2 border border-border';
          else if (isFuture) cellClass = 'border border-border bg-transparent';

          const ring = isToday ? 'border-2 border-primary' : '';

          const workoutId = didWork ? workoutIds?.[key] : undefined;
          const cell = (
            <View
              className={`h-9 w-9 items-center justify-center rounded-lg ${cellClass} ${ring}`}
            >
              {didWork ? (
                <Text className="text-base font-bold text-white">✓</Text>
              ) : didRest ? (
                <Moon size={14} color="#8B98A9" strokeWidth={2} />
              ) : (
                <Text className="text-xs font-semibold text-muted">{date.getDate()}</Text>
              )}
            </View>
          );

          return (
            <View key={i} className="items-center gap-1.5">
              <Text className="text-[11px] font-semibold text-muted">{DAY_LABELS[i]}</Text>
              {workoutId && onDayPress ? (
                <Pressable
                  className="active:opacity-70"
                  onPress={() => onDayPress(workoutId)}
                  hitSlop={4}
                >
                  {cell}
                </Pressable>
              ) : (
                cell
              )}
            </View>
          );
        })}
      </View>
      <Text className="mt-3 text-center text-xs text-muted">
        {workedThisWeek} {workedThisWeek === 1 ? 'workout' : 'workouts'} this week
        {restedThisWeek > 0
          ? ` · ${restedThisWeek} rest ${restedThisWeek === 1 ? 'day' : 'days'}`
          : ''}
      </Text>
    </View>
  );
}
