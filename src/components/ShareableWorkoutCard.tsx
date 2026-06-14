import { Flame, Medal } from 'lucide-react-native';
import { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { KovaLogo } from '@/components/KovaLogo';

/** The stats rendered onto a shareable card. Optional fields are hidden when
 *  absent, so the card adapts to what each entry point can supply. */
export interface ShareStats {
  title: string;
  dateIso: string;
  volume: number;
  sets: number;
  durationLabel: string | null;
  prCount: number;
  streak: number | null;
  athleteName: string | null;
}

/** Either a fully transparent canvas (a Strava-style sticker to drop over an
 *  Instagram Story) or the chosen photo baked in behind the stats. */
export type ShareBackground =
  | { type: 'transparent' }
  | { type: 'photo'; uri: string };

// A soft shadow keeps text legible whether it lands on a bright photo or a
// translucent panel.
const textShadow = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  stats: ShareStats;
  background: ShareBackground;
  /** Fired once a chosen photo has finished decoding, so the parent can hold
   *  off on capturing until the image is actually on screen. */
  onImageLoad?: () => void;
}

/**
 * The 9:16 card captured by `react-native-view-shot`. With a transparent
 * background it exports a PNG with real alpha — drop it over a Story as a
 * sticker. With a photo it bakes the stats in for sending through Messages,
 * WhatsApp, and friends.
 */
export const ShareableWorkoutCard = forwardRef<View, Props>(
  ({ stats, background, onImageLoad }, ref) => {
    return (
      <View
        ref={ref}
        collapsable={false}
        style={styles.canvas}
      >
        {background.type === 'photo' && (
          <Image
            source={{ uri: background.uri }}
            resizeMode="cover"
            onLoad={onImageLoad}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View className="flex-1 p-5">
          <View className="flex-row items-center justify-between">
            <KovaLogo size={26} style={textShadow} />
            {stats.streak != null && stats.streak > 0 && (
              <View
                className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                style={styles.chipDark}
              >
                <Flame size={14} color="#F59E0B" strokeWidth={2.5} />
                <Text className="text-xs font-bold text-white">
                  {stats.streak}-day streak
                </Text>
              </View>
            )}
          </View>

          <View className="flex-1" />

          <View className="rounded-3xl p-5" style={styles.panel}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-2xl font-extrabold text-white"
                  style={textShadow}
                  numberOfLines={2}
                >
                  {stats.title}
                </Text>
                <Text className="mt-0.5 text-sm font-medium text-white/70">
                  {stats.athleteName ? `${stats.athleteName} · ` : ''}
                  {formatDate(stats.dateIso)}
                </Text>
              </View>
              {stats.prCount > 0 && (
                <View
                  className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={styles.chipAccent}
                >
                  <Medal size={14} color="#F59E0B" strokeWidth={2.25} />
                  <Text className="text-xs font-bold text-accent">
                    {stats.prCount} PR{stats.prCount > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            <View className="mt-5">
              <View className="flex-row items-baseline">
                <Text
                  className="text-5xl font-black text-white"
                  style={textShadow}
                >
                  {Math.round(stats.volume).toLocaleString()}
                </Text>
                <Text className="ml-1.5 text-xl font-bold text-white/80">lbs</Text>
              </View>
              <Text className="mt-0.5 text-xs font-bold uppercase tracking-[2px] text-primary">
                Total Volume
              </Text>
            </View>

            <View className="mt-5 h-px" style={styles.divider} />

            <View className="mt-4 flex-row justify-between">
              <Metric label="Sets" value={String(stats.sets)} />
              {stats.durationLabel && (
                <Metric label="Time" value={stats.durationLabel} />
              )}
              <Metric label="PRs" value={String(stats.prCount)} />
            </View>
          </View>
        </View>
      </View>
    );
  }
);

ShareableWorkoutCard.displayName = 'ShareableWorkoutCard';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xl font-extrabold text-white" style={textShadow}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  panel: {
    backgroundColor: 'rgba(11,15,20,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipDark: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  chipAccent: {
    backgroundColor: 'rgba(245,158,11,0.2)',
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
