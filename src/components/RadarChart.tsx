import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

export interface RadarAxis {
  /** Short label rendered at the tip of the axis. */
  label: string;
  /** 0–1 value where 1 hits the outer ring. */
  value: number;
}

interface RadarChartProps {
  data: RadarAxis[];
  /** Reserved space (px) around the polygon for axis labels. */
  labelPadding?: number;
}

const ACCENT = '#22C55E';
const ACCENT_FILL = 'rgba(34, 197, 94, 0.20)';
const RING = '#2A3441';
const LABEL = '#8B98A9';

export function RadarChart({ data, labelPadding = 38 }: RadarChartProps) {
  const [size, setSize] = useState(0);

  const angles = useMemo(
    () => data.map((_, i) => (Math.PI * 2 * i) / data.length - Math.PI / 2),
    [data.length]
  );

  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.max(0, size / 2 - labelPadding);
  const hasData = data.some((d) => d.value > 0);

  const pointAt = (value: number, i: number) => ({
    x: cx + radius * value * Math.cos(angles[i]),
    y: cy + radius * value * Math.sin(angles[i]),
  });

  const polygonAt = (scale: number) =>
    data
      .map((_, i) => {
        const x = cx + radius * scale * Math.cos(angles[i]);
        const y = cy + radius * scale * Math.sin(angles[i]);
        return `${x},${y}`;
      })
      .join(' ');

  const dataPolygon = data
    .map((d, i) => {
      const p = pointAt(d.value, i);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w !== size) setSize(w);
  }

  return (
    <View className="aspect-square w-full" onLayout={onLayout}>
      {size > 0 && (
        <Svg width={size} height={size}>
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <Polygon
              key={`ring-${scale}`}
              points={polygonAt(scale)}
              fill="none"
              stroke={RING}
              strokeWidth={scale === 1 ? 1.25 : 1}
              opacity={scale === 1 ? 1 : 0.7}
            />
          ))}

          {data.map((_, i) => {
            const p = pointAt(1, i);
            return (
              <Line
                key={`spoke-${i}`}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke={RING}
                strokeWidth={1}
                opacity={0.7}
              />
            );
          })}

          {data.map((_, i) => {
            const x = cx + radius * Math.cos(angles[i]);
            const y = cy + radius * Math.sin(angles[i]);
            return (
              <Circle
                key={`tick-${i}`}
                cx={x}
                cy={y}
                r={1.75}
                fill={RING}
                opacity={0.9}
              />
            );
          })}

          {hasData && (
            <>
              <Polygon
                points={dataPolygon}
                fill={ACCENT_FILL}
                stroke={ACCENT}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              {data.map((d, i) => {
                if (d.value <= 0) return null;
                const p = pointAt(d.value, i);
                return (
                  <Circle
                    key={`pt-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill={ACCENT}
                  />
                );
              })}
            </>
          )}

          {data.map((d, i) => {
            const labelRadius = radius + 14;
            const x = cx + labelRadius * Math.cos(angles[i]);
            const y = cy + labelRadius * Math.sin(angles[i]);
            const anchor =
              Math.abs(Math.cos(angles[i])) < 0.2
                ? 'middle'
                : Math.cos(angles[i]) > 0
                  ? 'start'
                  : 'end';
            return (
              <SvgText
                key={`label-${i}`}
                x={x}
                y={y + 3}
                fill={LABEL}
                fontSize={9}
                fontWeight="700"
                letterSpacing={0.6}
                textAnchor={anchor}
              >
                {d.label.toUpperCase()}
              </SvgText>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
