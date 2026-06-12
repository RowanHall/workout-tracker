import type { LucideIcon } from 'lucide-react-native';
import {
  Anchor,
  Dumbbell,
  Flame,
  Footprints,
  Medal,
  Mountain,
  Shield,
  TrendingUp,
  Trophy,
} from 'lucide-react-native';

import type { TrophyTier } from '@/lib/types';

export interface TrophyDefinition {
  id: string;
  key: string;
  display_name: string;
  description_format: string;
  icon: string;
  metric: 'total_volume' | 'muscle_volume' | 'streak_weeks';
  unit: string;
  muscle_group_focus: string | null;
  bronze_threshold: number;
  silver_threshold: number;
  gold_threshold: number;
  platinum_threshold: number;
  sort_order: number;
}

export interface TrophyProgress {
  trophy_definition_id: string;
  current_raw_count: number;
  highest_tier_achieved: TrophyTier;
}

export const TIER_COLORS: Record<Exclude<TrophyTier, 'none'>, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

const ICONS: Record<string, LucideIcon> = {
  mountain: Mountain,
  flame: Flame,
  shield: Shield,
  dumbbell: Dumbbell,
  medal: Medal,
  'trending-up': TrendingUp,
  footprints: Footprints,
  anchor: Anchor,
};

export function trophyIcon(name: string): LucideIcon {
  return ICONS[name] ?? Trophy;
}

export function tierLabel(tier: TrophyTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export interface TierProgress {
  /** Highest tier already reached. */
  achieved: TrophyTier;
  /** Tier currently being worked toward; null once platinum is done. */
  next: Exclude<TrophyTier, 'none'> | null;
  /** Threshold the current segment starts from (floor). */
  baseThreshold: number;
  /** Threshold the current segment targets. */
  nextThreshold: number;
  /** 0..1 progress within the current segment. */
  pct: number;
}

export function tierProgress(def: TrophyDefinition, raw: number): TierProgress {
  const ladder: [Exclude<TrophyTier, 'none'>, number][] = [
    ['bronze', def.bronze_threshold],
    ['silver', def.silver_threshold],
    ['gold', def.gold_threshold],
    ['platinum', def.platinum_threshold],
  ];

  let achieved: TrophyTier = 'none';
  let baseThreshold = 0;
  for (const [tier, threshold] of ladder) {
    if (raw >= threshold) {
      achieved = tier;
      baseThreshold = threshold;
    }
  }

  const nextEntry = ladder.find(([, threshold]) => raw < threshold);
  if (!nextEntry) {
    return {
      achieved,
      next: null,
      baseThreshold,
      nextThreshold: def.platinum_threshold,
      pct: 1,
    };
  }

  const [next, nextThreshold] = nextEntry;
  const pct = (raw - baseThreshold) / (nextThreshold - baseThreshold);
  return {
    achieved,
    next,
    baseThreshold,
    nextThreshold,
    pct: Math.min(1, Math.max(0, pct)),
  };
}
