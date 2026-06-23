import { useRef, useState } from 'react';
import { PanResponder, type LayoutChangeEvent, View } from 'react-native';

interface Props {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}

/**
 * Horizontal slider that snaps to `step` (default 0.1).
 * Pointer can be dragged from either the thumb or anywhere on the track.
 */
export function PrecisionSlider({ min, max, step = 0.1, value, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  function snap(raw: number): number {
    const clamped = Math.max(min, Math.min(max, raw));
    const snapped = Math.round(clamped / step) * step;
    // Avoid float drift like 99.30000000000001
    return Math.round(snapped * 100) / 100;
  }

  function fromX(x: number): number {
    if (widthRef.current <= 0) return value;
    const t = Math.max(0, Math.min(1, x / widthRef.current));
    return snap(min + t * (max - min));
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onChange(fromX(evt.nativeEvent.locationX));
      },
      onPanResponderMove: (evt) => {
        onChange(fromX(evt.nativeEvent.locationX));
      },
    })
  ).current;

  function handleLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    widthRef.current = w;
  }

  const pct = width > 0 ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <View className="h-12 justify-center">
      <View
        onLayout={handleLayout}
        className="h-12 justify-center"
        {...responder.panHandlers}
      >
        <View className="h-1.5 w-full rounded-full bg-white/10" />
        <View
          className="absolute h-1.5 rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
        <View
          className="absolute h-7 w-7 rounded-full border-4 border-background bg-primary"
          style={{ left: `${pct}%`, marginLeft: -14 }}
        />
      </View>
    </View>
  );
}
