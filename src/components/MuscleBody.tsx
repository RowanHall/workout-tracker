import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { heatColor, type Activation, type MuscleRegion } from '@/lib/muscles';

const SILHOUETTE = '#141A21';
const SILHOUETTE_STROKE = '#2A3441';
const SEAM = '#0B0F14';

/** Mirror a path about x=50 (coords written "x,y"). */
function mirror(d: string): string {
  return d.replace(
    /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
    (_, x: string, y: string) => `${+(100 - parseFloat(x)).toFixed(2)},${y}`
  );
}

interface RegionPath {
  region: MuscleRegion;
  d: string;
}

/** Expand left/centre muscle definitions into full (mirrored) region paths. */
function expand(
  left: Partial<Record<MuscleRegion, string>>,
  centre: Partial<Record<MuscleRegion, string>>
): RegionPath[] {
  const out: RegionPath[] = [];
  for (const [region, d] of Object.entries(left) as [MuscleRegion, string][]) {
    out.push({ region, d });
    out.push({ region, d: mirror(d) });
  }
  for (const [region, d] of Object.entries(centre) as [MuscleRegion, string][]) {
    out.push({ region, d });
  }
  return out;
}

// Neutral body silhouette (shared front/back), drawn under the muscle fills.
const SILHOUETTE_PATHS = [
  'M44,26 L56,26 L55,34 L45,34 Z', // neck
  'M34,36 L66,36 L64,74 Q63,92 58,113 L42,113 Q37,92 36,74 Z', // torso
  'M33,40 L25,44 L18,86 L13,106 L20,108 L24,88 L31,52 L34,46 Z', // left arm
  'M67,40 L75,44 L82,86 L87,106 L80,108 L76,88 L69,52 L66,46 Z', // right arm
  'M40,110 L60,110 L62,123 L38,123 Z', // pelvis
  'M38,121 L49,121 L48,181 L47,215 L39,215 L37,181 Z', // left leg
  'M62,121 L51,121 L52,181 L53,215 L61,215 L63,181 Z', // right leg
];

const FRONT_REGIONS = expand(
  {
    traps: 'M45,33 L50,40 L43,44 L38,41 Z',
    front_delts: 'M33,41 L26,45 L24,53 L31,53 L34,46 Z',
    side_delts: 'M26,45 L21,51 L20,61 L25,58 L26,52 Z',
    upper_chest: 'M36,46 L49,46 L49,54 L37,54 Z',
    mid_chest: 'M37,54 L49,54 L49,62 L38,62 Z',
    lower_chest: 'M38,62 L49,62 L48,70 L40,70 Z',
    biceps: 'M31,52 L24,55 L21,76 L28,77 L33,57 Z',
    forearms: 'M28,80 L20,82 L16,104 L23,104 Z',
    obliques: 'M40,76 L43,76 L43,106 L39,104 Z',
    quads: 'M38,122 L46,122 L46,177 L40,177 Z',
    adductors: 'M47,124 L49.4,124 L49,170 L47.2,170 Z',
    calves: 'M40,181 L47,181 L46,210 L41,210 Z',
  },
  { abs: 'M43,72 L57,72 L57,108 L43,108 Z' }
);

const BACK_REGIONS = expand(
  {
    rear_delts: 'M33,42 L26,46 L24,54 L31,54 L35,47 Z',
    lats: 'M36,60 L46,62 L46,92 L41,90 L36,76 Z',
    mid_back: 'M41,54 L47,56 L46,66 L41,64 Z',
    triceps: 'M31,52 L24,55 L21,78 L28,79 L33,57 Z',
    forearms: 'M28,82 L20,84 L16,106 L23,106 Z',
    glutes: 'M39,116 L49,116 L49,140 L40,140 L37,128 Z',
    hamstrings: 'M40,142 L49,142 L48,180 L41,180 Z',
    calves: 'M41,184 L48,184 L47,212 L42,212 Z',
  },
  {
    traps: 'M42,34 L58,34 L66,44 L58,52 L60,66 L50,72 L40,66 L42,52 L34,44 Z',
    lower_back: 'M44,94 L56,94 L55,114 L45,114 Z',
  }
);

const VIEW_BOX_W = 100;
const VIEW_BOX_H = 224;

function Figure({
  regions,
  activation,
  width,
}: {
  regions: RegionPath[];
  activation: Activation;
  width: number;
}) {
  const height = (width * VIEW_BOX_H) / VIEW_BOX_W;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_BOX_W} ${VIEW_BOX_H}`}>
      <Circle cx={50} cy={16} r={11} fill={SILHOUETTE} stroke={SILHOUETTE_STROKE} strokeWidth={0.6} />
      <G>
        {SILHOUETTE_PATHS.map((d, i) => (
          <Path key={`s${i}`} d={d} fill={SILHOUETTE} stroke={SILHOUETTE_STROKE} strokeWidth={0.6} />
        ))}
      </G>
      <G>
        {regions.map((r, i) => (
          <Path
            key={`${r.region}-${i}`}
            d={r.d}
            fill={heatColor(activation[r.region] ?? 0)}
            stroke={SEAM}
            strokeWidth={0.4}
            strokeLinejoin="round"
          />
        ))}
      </G>
    </Svg>
  );
}

export interface MuscleBodyProps {
  activation: Activation;
  /** Total width for the figure pair. */
  width?: number;
  views?: ('front' | 'back')[];
}

/**
 * An anatomical figure that lights up the muscles an activation map describes,
 * shading each region from faint grey (untouched) through green/amber/red as it
 * is worked harder. Renders a front and back view side by side by default.
 */
function MuscleBodyBase({ activation, width = 220, views = ['front', 'back'] }: MuscleBodyProps) {
  const gap = 8;
  const figureWidth = (width - gap * (views.length - 1)) / views.length;
  return (
    <View className="flex-row items-start justify-center" style={{ gap }}>
      {views.map((view) => (
        <Figure
          key={view}
          width={figureWidth}
          activation={activation}
          regions={view === 'front' ? FRONT_REGIONS : BACK_REGIONS}
        />
      ))}
    </View>
  );
}

export const MuscleBody = memo(MuscleBodyBase);
