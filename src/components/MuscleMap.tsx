import { Text, View } from 'react-native';

import { MuscleBody } from '@/components/MuscleBody';
import {
  heatColor,
  MUSCLE_LABELS,
  topMuscles,
  type Activation,
} from '@/lib/muscles';

interface MuscleMapProps {
  activation: Activation;
  title?: string;
  /** Show the green→red intensity scale. */
  showScale?: boolean;
  /** How many worked-muscle chips to list (0 to hide). */
  chips?: number;
  width?: number;
}

/**
 * The body figure plus a heat scale and a list of the muscles worked hardest —
 * the standard "what did this train?" card used across the app.
 */
export function MuscleMap({
  activation,
  title,
  showScale = true,
  chips = 6,
  width = 230,
}: MuscleMapProps) {
  const worked = chips > 0 ? topMuscles(activation, chips) : [];

  return (
    <View className="items-center">
      {title ? (
        <Text className="mb-3 self-stretch text-base font-bold text-white">{title}</Text>
      ) : null}

      <MuscleBody activation={activation} width={width} />

      {showScale && (
        <View className="mt-3 flex-row items-center gap-2">
          <Text className="text-[10px] text-muted">Light</Text>
          <View className="h-2 flex-row overflow-hidden rounded-full">
            {[0.15, 0.35, 0.55, 0.75, 1].map((t) => (
              <View key={t} style={{ width: 16, height: 8, backgroundColor: heatColor(t) }} />
            ))}
          </View>
          <Text className="text-[10px] text-muted">Hard</Text>
        </View>
      )}

      {worked.length > 0 && (
        <View className="mt-3 flex-row flex-wrap justify-center gap-1.5">
          {worked.map((region) => (
            <View
              key={region}
              className="flex-row items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1"
            >
              <View
                style={{ backgroundColor: heatColor(activation[region] ?? 0) }}
                className="h-2 w-2 rounded-full"
              />
              <Text className="text-xs font-medium text-white">{MUSCLE_LABELS[region]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
