import { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { KovaLogo } from '@/components/KovaLogo';
import { MuscleMap } from '@/components/MuscleMap';
import type { ExerciseMuscle } from '@/lib/types';

/** The stats rendered onto a shareable card. Optional fields are hidden when
 *  absent, so the card adapts to what each entry point can supply. */
export interface ShareStats {
  workoutId: string;
  title: string;
  dateIso: string;
  volume: number;
  sets: number;
  durationLabel: string | null;
  prCount: number;
  streak: number | null;
  athleteName: string | null;
  muscles: ExerciseMuscle[];
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
          </View>

          <View className="flex-1 items-center justify-center">
            {stats.muscles.length > 0 && <MuscleMap muscles={stats.muscles} />}
          </View>

          <View className="rounded-3xl p-5" style={styles.panel}>
            <Text
              className="text-xl font-extrabold text-white"
              style={textShadow}
              numberOfLines={2}
            >
              {stats.title}
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-white/70">
              {stats.athleteName ? `${stats.athleteName} · ` : ''}
              {formatDate(stats.dateIso)}
            </Text>

            <View className="mt-4 flex-row items-end justify-between">
              <Metric
                label="Total Volume"
                value={`${Math.round(stats.volume).toLocaleString()} lbs`}
              />
              {stats.durationLabel && (
                <Metric label="Time" value={stats.durationLabel} align="right" />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }
);

ShareableWorkoutCard.displayName = 'ShareableWorkoutCard';

function Metric({
  label,
  value,
  align = 'left',
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
}) {
  return (
    <View className={align === 'right' ? 'items-end' : 'items-start'}>
      <Text className="text-2xl font-black text-white" style={textShadow}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-[2px] text-primary">
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
});
