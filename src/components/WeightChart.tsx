import { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polyline,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

export interface WeightPoint {
  recorded_on: string;
  weight: number;
}

const HEIGHT = 150;
const PAD_TOP = 14;
const PAD_BOTTOM = 18;
const PAD_LEFT = 8;
const PAD_RIGHT = 40;

/**
 * Line chart of body weight over time. The x-axis is scaled by actual date so
 * unevenly spaced entries land in the right place; the y-axis is padded a
 * little above/below the range so the line never sits on the chart edge.
 */
export function WeightChart({ data }: { data: WeightPoint[] }) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (data.length === 0) {
    return (
      <View onLayout={onLayout} className="h-[150px] items-center justify-center">
        <Text className="text-muted">Log your weight to start tracking it here.</Text>
      </View>
    );
  }

  const times = data.map((d) => new Date(d.recorded_on).getTime());
  const weights = data.map((d) => d.weight);
  const minT = times[0];
  const maxT = times[times.length - 1];
  const tSpan = maxT - minT || 1;
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const wPad = (maxW - minW || 2) * 0.18;
  const lo = minW - wPad;
  const hi = maxW + wPad;

  const plotW = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotBottom = HEIGHT - PAD_BOTTOM;

  const x = (t: number) =>
    data.length === 1
      ? PAD_LEFT + plotW / 2
      : PAD_LEFT + ((t - minT) / tSpan) * plotW;
  const y = (w: number) => PAD_TOP + ((hi - w) / (hi - lo)) * (plotBottom - PAD_TOP);

  const points = data.map((d, i) => ({ px: x(times[i]), py: y(d.weight) }));
  const polyline = points.map((p) => `${p.px},${p.py}`).join(' ');
  const areaPath =
    `M ${points[0].px},${plotBottom} ` +
    points.map((p) => `L ${p.px},${p.py}`).join(' ') +
    ` L ${points[points.length - 1].px},${plotBottom} Z`;

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#22C55E" stopOpacity={0.25} />
              <Stop offset="1" stopColor="#22C55E" stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Max / min reference labels on the right edge. */}
          <SvgText x={width - 4} y={PAD_TOP + 4} fill="#8B98A9" fontSize={10} textAnchor="end">
            {formatLabel(maxW)}
          </SvgText>
          <SvgText x={width - 4} y={plotBottom} fill="#8B98A9" fontSize={10} textAnchor="end">
            {formatLabel(minW)}
          </SvgText>

          {data.length > 1 && <Path d={areaPath} fill="url(#weightFill)" />}
          {data.length > 1 && (
            <Polyline
              points={polyline}
              fill="none"
              stroke="#22C55E"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.px}
              cy={p.py}
              r={i === points.length - 1 ? 4.5 : 3}
              fill={i === points.length - 1 ? '#22C55E' : '#151B23'}
              stroke="#22C55E"
              strokeWidth={2}
            />
          ))}
        </Svg>
      )}
    </View>
  );
}

function formatLabel(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}
