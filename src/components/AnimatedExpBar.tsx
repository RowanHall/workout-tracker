import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { expToNextLevel, levelProgress } from '@/lib/exp';

interface AnimatedExpBarProps {
  /** Total EXP before the workout. */
  fromExp: number;
  /** EXP earned by the workout. */
  gained: number;
  /** ms before the fill starts (so it can follow other reveals). */
  delay?: number;
}

/**
 * Game-style level bar: fills from the pre-workout position, rolls over at
 * each level-up (bar snaps to 0, level number increments), and settles at
 * the new progress.
 */
export function AnimatedExpBar({ fromExp, gained, delay = 600 }: AnimatedExpBarProps) {
  const start = levelProgress(fromExp);
  const end = levelProgress(fromExp + gained);
  const [displayLevel, setDisplayLevel] = useState(start.level);
  const leveledUp = end.level > start.level;
  const pct = useSharedValue(start.needed > 0 ? start.current / start.needed : 0);

  useEffect(() => {
    // One fill segment per level crossed, sharing ~1.4s proportionally.
    const segments: { level: number; from: number; to: number }[] = [];
    for (let lvl = start.level; lvl <= end.level; lvl++) {
      segments.push({
        level: lvl,
        from: lvl === start.level ? start.current / start.needed : 0,
        to: lvl === end.level ? end.current / end.needed : 1,
      });
    }
    const total = 1400;
    const span = segments.reduce((sum, s) => sum + (s.to - s.from), 0) || 1;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let at = delay;
    for (const segment of segments) {
      const duration = Math.max(250, (total * (segment.to - segment.from)) / span);
      timeouts.push(
        setTimeout(() => {
          setDisplayLevel(segment.level);
          pct.value = segment.from;
          pct.value = withTiming(segment.to, {
            duration,
            easing: Easing.out(Easing.cubic),
          });
        }, at)
      );
      at += duration + 80;
    }
    return () => timeouts.forEach(clearTimeout);
    // Animation is driven once per summary; inputs never change mid-mount.
  }, []);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(pct.value * 1000) / 10}%`,
  }));

  return (
    <View>
      <View className="mb-1.5 flex-row items-end justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-bold text-primary">LVL {displayLevel}</Text>
          {leveledUp && displayLevel === end.level && (
            <Animated.View
              entering={ZoomIn.springify()}
              className="rounded-full bg-accent px-2 py-0.5"
            >
              <Text className="text-[10px] font-extrabold text-background">
                LEVEL UP!
              </Text>
            </Animated.View>
          )}
        </View>
        <Text className="text-xs text-muted">
          {expToNextLevel(displayLevel).toLocaleString()} EXP to next
        </Text>
      </View>
      <View className="h-3 overflow-hidden rounded-full bg-surface-2">
        <Animated.View className="h-full rounded-full bg-primary" style={fillStyle} />
      </View>
    </View>
  );
}
