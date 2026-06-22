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
const PAD_BOTTOM_WITH_LABELS = 30;
const PAD_LEFT = 8;
const PAD_RIGHT = 40;
const X_LABEL_MIN_SPACING = 56;

/**
 * Generic single-series line chart over an SVG. The x-axis is scaled by the
 * raw `t` values so unevenly spaced points land in the right place; the
 * y-axis is padded above/below the range so the line never touches the edge.
 * Expects at least one point (callers handle the empty state).
 */
export function LineChart({
  data,
  color = '#22C55E',
  markerColor = '#F59E0B',
  markers,
  height = 150,
  formatLabel = (v) => String(Math.round(v)),
  formatXLabel,
}: {
  data: LinePoint[];
  color?: string;
  /** Color for highlighted markers (e.g. PR points). */
  markerColor?: string;
  /** Indices into `data` that should render as a larger star-style highlight. */
  markers?: number[];
  height?: number;
  formatLabel?: (v: number) => string;
  /** When provided, renders date labels at the bottom for a subset of points. */
  formatXLabel?: (t: number) => string;
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
  const padBottom = formatXLabel ? PAD_BOTTOM_WITH_LABELS : PAD_BOTTOM;
  const plotBottom = height - padBottom;
  const single = data.length === 1;

  // A single entry sits at the right edge; multiple points spread by date.
  const x = (t: number) =>
    single ? PAD_LEFT + plotW : PAD_LEFT + ((t - minX) / xSpan) * plotW;
  const y = (v: number) => PAD_TOP + ((hi - v) / (hi - lo)) * (plotBottom - PAD_TOP);

  // The real data points (the dots we draw).
  const points = data.map((d) => ({ px: x(d.t), py: y(d.y) }));

  // Pick which data indices get an x-axis date label. Always anchor the first
  // and last point; pack as many evenly-spaced labels in between as will fit
  // without overlapping at the configured minimum spacing.
  const xLabelIndices: number[] = [];
  if (formatXLabel && data.length > 0) {
    if (single) {
      xLabelIndices.push(0);
    } else {
      const maxLabels = Math.max(2, Math.floor(plotW / X_LABEL_MIN_SPACING) + 1);
      const tickCount = Math.min(maxLabels, data.length);
      for (let i = 0; i < tickCount; i++) {
        const idx = Math.round((i / (tickCount - 1)) * (data.length - 1));
        if (!xLabelIndices.includes(idx)) xLabelIndices.push(idx);
      }
    }
  }
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

          {points.map((p, i) => {
            const isMarker = markers?.includes(i);
            const isLast = i === points.length - 1;
            if (isMarker) {
              return (
                <Circle
                  key={i}
                  cx={p.px}
                  cy={p.py}
                  r={5.5}
                  fill={markerColor}
                  stroke="#151B23"
                  strokeWidth={2}
                />
              );
            }
            return (
              <Circle
                key={i}
                cx={p.px}
                cy={p.py}
                r={isLast ? 4.5 : 3}
                fill={isLast ? color : '#151B23'}
                stroke={color}
                strokeWidth={2}
              />
            );
          })}

          {formatXLabel &&
            xLabelIndices.map((idx) => {
              const p = points[idx];
              const anchor =
                idx === 0 ? 'start' : idx === data.length - 1 ? 'end' : 'middle';
              return (
                <SvgText
                  key={`x-${idx}`}
                  x={p.px}
                  y={height - 6}
                  fill="#8B98A9"
                  fontSize={10}
                  textAnchor={anchor}
                >
                  {formatXLabel(data[idx].t)}
                </SvgText>
              );
            })}
        </Svg>
      )}
    </View>
  );
}
