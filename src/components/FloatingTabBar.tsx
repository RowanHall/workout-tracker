import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Real system Liquid Glass (iOS 26+) when available; otherwise fall back to the
// expo-blur approximation — mirrors ActiveWorkoutPill.
const LIQUID_GLASS = isLiquidGlassAvailable();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICON_SIZE = 29;

// Base icons per route; the outlined variant is used when unfocused.
const ICONS: Record<string, 'person' | 'barbell' | 'home'> = {
  index: 'person',
  workout: 'barbell',
  feed: 'home',
};

// How much vertical space the floating bar occupies above the safe-area inset —
// used to position anything that floats above it (the resume-workout pill).
export const FLOATING_TAB_BAR_HEIGHT = 62;
export const FLOATING_TAB_BAR_GAP = -8;

/**
 * Bottom padding a tab screen's scroll content needs so its last rows clear the
 * floating pill instead of hiding behind it. Pass the safe-area bottom inset.
 */
export function floatingTabBarContentInset(bottomInset: number) {
  return bottomInset + FLOATING_TAB_BAR_GAP + FLOATING_TAB_BAR_HEIGHT + 16;
}

/**
 * A floating, centered glass pill that replaces the default opaque tab bar.
 * Content scrolls underneath and blurs through the glass, matching the app's
 * frosted-header language. The active workout is a global pull-up sheet that
 * covers the bar when expanded, so the bar itself always renders.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const row = (
    <View className="flex-row items-center px-2 py-2.5">
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const base = ICONS[route.name] ?? 'ellipse';
        const iconName = (isFocused ? base : `${base}-outline`) as IconName;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            className="items-center justify-center px-7 py-2 active:opacity-70"
          >
            {isFocused && (
              <View
                className="absolute h-0.5 w-4 rounded-full bg-primary"
                style={{ top: 0 }}
              />
            )}
            <Ionicons
              name={iconName}
              size={ICON_SIZE}
              color={isFocused ? '#22C55E' : '#8B98A9'}
            />
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + FLOATING_TAB_BAR_GAP,
        alignItems: 'center',
      }}
    >
      <View style={styles.shadow} className="rounded-full">
        {LIQUID_GLASS ? (
          // Real Liquid Glass: the system renders the floating capsule — no
          // manual blur, border, or sheen.
          <GlassView glassEffectStyle="regular" style={styles.capsule}>
            {row}
          </GlassView>
        ) : (
          // Fallback for iOS < 26 / Android: frosted blur + bright rim + sheen.
          <View className="overflow-hidden rounded-full border border-white/20">
            <BlurView
              tint="systemUltraThinMaterialDark"
              intensity={60}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.18)',
                'rgba(255,255,255,0.04)',
                'rgba(255,255,255,0.08)',
              ]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {row}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Soft drop shadow so the pill reads as floating above the content.
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  capsule: {
    borderRadius: 999,
    overflow: 'hidden',
  },
});
