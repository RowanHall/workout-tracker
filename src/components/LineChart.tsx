import { useId, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polyline,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

export interface LinePoint {
  /** X position, typically a timestamp in ms. */
  t: number;
  /** Y value. */
  y: number;
}

const PAD_TOP = 14;
const PAD_BOTTOM = 18;
const PAD_LEFT = 8;
const PAD_RIGHT = 40;

/**
 * Generic single-series line chart over an SVG. The x-axis is scaled by the
 * raw `t` values so unevenly spaced points land in the right place; the
 * y-axis is padded above/below the range so the line never touches the edge.
 * Expects at least one point (callers handle the empty state).
 */
export function LineChart({
  data,
  color = '#22C55E',
  height = 150,
  formatLabel = (v) => String(Math.round(v)),
}: {
  data: LinePoint[];
  color?: string;
  height?: number;
  formatLabel?: (v: number) => string;
}) {
  const [width, setWidth] = useState(0);
  // Unique per instance so multiple charts on one screen don't share a <Defs> id.
  const gradientId = `lc-${useId().replace(/:/g, '')}`;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (data.length === 0) {
    return <View onLayout={onLayout} style={{ height }} />;
  }

  const xs = data.map((d) => d.t);
  const ys = data.map((d) => d.y);
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const xSpan = maxX - minX || 1;
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yPad = (maxY - minY || 2) * 0.18;
  const lo = minY - yPad;
  const hi = maxY + yPad;

  const plotW = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotBottom = height - PAD_BOTTOM;
  const single = data.length === 1;

  // A single entry sits at the right edge; multiple points spread by date.
  const x = (t: number) =>
    single ? PAD_LEFT + plotW : PAD_LEFT + ((t - minX) / xSpan) * plotW;
  const y = (v: number) => PAD_TOP + ((hi - v) / (hi - lo)) * (plotBottom - PAD_TOP);

  // The real data points (the dots we draw).
  const points = data.map((d) => ({ px: x(d.t), py: y(d.y) }));
  // With only one entry, assume the value held steady and draw a flat line
  // across the whole width up to it, rather than a lone dot.
  const linePoints = single
    ? [{ px: PAD_LEFT, py: points[0].py }, points[0]]
    : points;

  const polyline = linePoints.map((p) => `${p.px},${p.py}`).join(' ');
  const areaPath =
    `M ${linePoints[0].px},${plotBottom} ` +
    linePoints.map((p) => `L ${p.px},${p.py}`).join(' ') +
    ` L ${linePoints[linePoints.length - 1].px},${plotBottom} Z`;

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.25} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {single ? (
            <SvgText
              x={width - 4}
              y={points[0].py - 8}
              fill="#8B98A9"
              fontSize={10}
              textAnchor="end"
            >
              {formatLabel(maxY)}
            </SvgText>
          ) : (
            <>
              <SvgText x={width - 4} y={PAD_TOP + 4} fill="#8B98A9" fontSize={10} textAnchor="end">
                {formatLabel(maxY)}
              </SvgText>
              <SvgText x={width - 4} y={plotBottom} fill="#8B98A9" fontSize={10} textAnchor="end">
                {formatLabel(minY)}
              </SvgText>
            </>
          )}

          <Path d={areaPath} fill={`url(#${gradientId})`} />
          <Polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.px}
              cy={p.py}
              r={i === points.length - 1 ? 4.5 : 3}
              fill={i === points.length - 1 ? color : '#151B23'}
              stroke={color}
              strokeWidth={2}
            />
          ))}
        </Svg>
      )}
    </View>
  );
}
