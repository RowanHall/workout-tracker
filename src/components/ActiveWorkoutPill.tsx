import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronUp, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveWorkoutContext } from '@/providers/ActiveWorkoutProvider';

// Real system Liquid Glass (iOS 26+) when the platform supports it; otherwise
// fall back to the expo-blur approximation below.
const LIQUID_GLASS = isLiquidGlassAvailable();

/**
 * Floating "resume workout" pill. Rendered once, above the tab bar, it appears
 * whenever a workout is running but the pull-up sheet is dropped — persisting
 * across tabs until the workout is finished or discarded. Tapping the left
 * (arrow + timer + last exercise) pulls the workout sheet back up; the right
 * side discards it.
 */
export function ActiveWorkoutPill() {
  const { workout, entries, discard, expanded, expand } = useActiveWorkoutContext();

  // Hide while the sheet is pulled up (the full UI covers the pill) or when
  // there's no workout to resume.
  if (!workout || expanded) return null;

  // The exercise the user was most recently working — the last one with a
  // logged set, otherwise the last one added.
  const current =
    [...entries].reverse().find((e) => e.sets.length > 0) ??
    entries[entries.length - 1] ??
    null;
  const subtitle = current?.exercise.name ?? 'No exercises yet';

  function handleDiscard() {
    Alert.alert('Discard workout?', 'All logged sets will be deleted.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => discard() },
    ]);
  }

  const row = (
    <View className="flex-row items-center py-3 pl-2.5 pr-2">
      <View className="mr-2 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10">
        <ChevronUp size={20} color="#FFFFFF" strokeWidth={2.5} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <PulsingDot />
          <PillElapsed since={workout.started_at} />
        </View>
        <Text className="text-xs text-muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {/* A plain translucent chip, never a nested glass surface — Apple advises
          against stacking Liquid Glass on Liquid Glass. */}
      <Pressable
        className="ml-2 h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 active:opacity-70"
        onPress={handleDiscard}
        hitSlop={6}
      >
        <Trash2 size={20} color="#EF4444" strokeWidth={2.5} />
      </Pressable>
    </View>
  );

  // Real Liquid Glass: let the system render the floating glass capsule. No
  // manual blur, border, or sheen — those are provided natively.
  if (LIQUID_GLASS) {
    return (
      <View style={styles.shadow} className="rounded-full">
        <Pressable
          className="active:opacity-90"
          onPress={expand}
        >
          <GlassView
            glassEffectStyle="regular"
            isInteractive
            style={styles.glassCapsule}
          >
            {row}
          </GlassView>
        </Pressable>
      </View>
    );
  }

  // Fallback for iOS < 26 / Android: fake the glass with a frosted blur, a
  // bright rim, and a top sheen.
  return (
    <View style={styles.shadow} className="rounded-full">
      <Pressable
        className="overflow-hidden rounded-full border border-white/20 active:opacity-90"
        onPress={expand}
      >
        <BlurView
          tint="systemUltraThinMaterialDark"
          intensity={60}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {row}
      </Pressable>
    </View>
  );
}

function PillElapsed({ since }: { since: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <Text
      className="text-[15px] font-semibold text-white"
      style={{ fontVariant: ['tabular-nums'] }}
    >
      {m}:{s.toString().padStart(2, '0')}
    </Text>
  );
}

// A small green dot that softly pulses to signal the workout is still running.
function PulsingDot() {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] });

  return (
    <Animated.View
      className="mr-1.5 h-2 w-2 rounded-full bg-primary"
      style={{ opacity, transform: [{ scale }] }}
    />
  );
}

const styles = StyleSheet.create({
  // Soft drop shadow so the frosted pill reads as a floating glass element
  // rather than sitting flat against the content behind it.
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  glassCapsule: {
    borderRadius: 999,
    overflow: 'hidden',
  },
});
