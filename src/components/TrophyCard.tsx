import { Text, View } from 'react-native';

import {
  TIER_COLORS,
  tierLabel,
  tierProgress,
  trophyIcon,
  type TrophyDefinition,
  type TrophyProgress,
} from '@/lib/trophies';

interface TrophyCardProps {
  definition: TrophyDefinition;
  progress: TrophyProgress | null;
}

export function TrophyCard({ definition, progress }: TrophyCardProps) {
  const raw = progress?.current_raw_count ?? 0;
  const tp = tierProgress(definition, raw);
  const started = raw > 0;
  const Icon = trophyIcon(definition.icon);

  // Tier colors are data-driven hex values, so they go through style props;
  // everything structural stays in NativeWind classes.
  const tierColor = tp.achieved !== 'none' ? TIER_COLORS[tp.achieved] : null;
  const barColor = tp.next ? TIER_COLORS[tp.next] : TIER_COLORS.platinum;

  const target = definition.description_format.replace(
    '{count}',
    tp.nextThreshold.toLocaleString()
  );
  const progressLabel = tp.next
    ? `${raw.toLocaleString()} / ${tp.nextThreshold.toLocaleString()} ${definition.unit} (${tierLabel(tp.next)})`
    : 'Platinum — mastered!';

  return (
    <View
      className={`flex-1 rounded-2xl border-2 bg-surface p-4 ${
        started ? '' : 'opacity-40'
      } ${tierColor ? '' : 'border-border'}`}
      style={tierColor ? { borderColor: tierColor } : undefined}
    >
      <View className="mb-3 items-center">
        <View
          className="h-16 w-16 items-center justify-center rounded-full bg-surface-2"
          style={tierColor ? { backgroundColor: `${tierColor}26` } : undefined}
        >
          <Icon size={30} color={tierColor ?? '#8B98A9'} strokeWidth={1.75} />
        </View>
      </View>

      <Text className="mb-0.5 text-center text-base font-bold text-white" numberOfLines={1}>
        {definition.display_name}
      </Text>
      <Text className="mb-3 text-center text-xs text-muted" numberOfLines={2}>
        {target}
      </Text>

      <View className="mb-1.5 flex-row justify-center gap-1.5">
        {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => {
          const reached =
            tp.achieved !== 'none' &&
            ['bronze', 'silver', 'gold', 'platinum'].indexOf(tp.achieved) >=
              ['bronze', 'silver', 'gold', 'platinum'].indexOf(tier);
          return (
            <View
              key={tier}
              className="h-2 w-2 rounded-full bg-surface-2"
              style={reached ? { backgroundColor: TIER_COLORS[tier] } : undefined}
            />
          );
        })}
      </View>

      <View className="h-2 overflow-hidden rounded-full bg-surface-2">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.round(tp.pct * 100)}%`, backgroundColor: barColor }}
        />
      </View>
      <Text className="mt-1.5 text-center text-[11px] text-muted">{progressLabel}</Text>
    </View>
  );
}
