import { Text, View } from 'react-native';

const WEEKS = 12;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** GitHub-style consistency grid for the last 12 weeks. */
export function ConsistencyCalendar({ workoutDates }: { workoutDates: string[] }) {
  const dateSet = new Set(workoutDates);
  const today = new Date();
  // Start from the Sunday WEEKS-1 weeks back so columns align to weeks.
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      return cell;
    })
  );

  return (
    <View>
      <View className="flex-row justify-between gap-1">
        {columns.map((week, wi) => (
          <View key={wi} className="flex-1 gap-1">
            {week.map((day, di) => {
              const future = day > today;
              const active = dateSet.has(isoDate(day));
              return (
                <View
                  key={di}
                  className={`aspect-square rounded-sm ${
                    future ? 'bg-transparent' : active ? 'bg-primary' : 'bg-surface-2'
                  }`}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View className="mt-2 flex-row items-center justify-end gap-1.5">
        <Text className="text-xs text-muted">Less</Text>
        <View className="h-2.5 w-2.5 rounded-sm bg-surface-2" />
        <View className="h-2.5 w-2.5 rounded-sm bg-primary" />
        <Text className="text-xs text-muted">More</Text>
      </View>
    </View>
  );
}
