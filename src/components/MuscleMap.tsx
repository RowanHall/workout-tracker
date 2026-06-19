import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Body, { type ExtendedBodyPart } from 'react-native-body-highlighter';

import type { ExerciseMuscle } from '@/lib/types';

interface MuscleMapProps {
  muscles: ExerciseMuscle[];
  /** Optional cap on scale. Defaults to 1 so we never upscale past the SVG's native size. */
  maxScale?: number;
  gender?: 'male' | 'female';
}

// Two-stop ramp: secondary (intensity 1) → dim primary, primary (2) → bright.
const COLORS = ['#16803C', '#22C55E'];
const BORDER = '#2A3441';
const DEFAULT_FILL = '#1E2630';
const GAP = 8;
// Each body's native SVG width (see SvgMaleWrapper / SvgFemaleWrapper).
const NATIVE_BODY_WIDTH = 200;

export function MuscleMap({ muscles, maxScale = 1, gender = 'male' }: MuscleMapProps) {
  const [width, setWidth] = useState(0);

  const data = useMemo<ExtendedBodyPart[]>(
    () => muscles.map((m) => ({ slug: m.slug, intensity: m.intensity })),
    [muscles]
  );

  // Pick the largest scale that fits two bodies plus the gap into the container.
  const scale = Math.min(maxScale, Math.max(0, (width - GAP) / (NATIVE_BODY_WIDTH * 2)));

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  }

  return (
    <View
      className="w-full flex-row items-center justify-center"
      style={{ gap: GAP }}
      onLayout={onLayout}
    >
      {scale > 0 && (
        <>
          <Body
            data={data}
            side="front"
            gender={gender}
            scale={scale}
            colors={COLORS}
            border={BORDER}
            defaultFill={DEFAULT_FILL}
          />
          <Body
            data={data}
            side="back"
            gender={gender}
            scale={scale}
            colors={COLORS}
            border={BORDER}
            defaultFill={DEFAULT_FILL}
          />
        </>
      )}
    </View>
  );
}
