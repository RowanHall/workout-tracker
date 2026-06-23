import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  View,
} from 'react-native';
import Svg, { Line, Text as SvgText } from 'react-native-svg';

interface Props {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  tickSpacing?: number;
  majorEvery?: number;
  height?: number;
}

export function RulerSlider({
  min,
  max,
  step = 0.1,
  value,
  onChange,
  tickSpacing = 10,
  majorEvery = 10,
  height = 88,
}: Props) {
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const lastIndex = useRef<number>(-1);
  const isUserScrolling = useRef(false);

  const totalSteps = Math.round((max - min) / step);
  const contentWidth = totalSteps * tickSpacing;

  const valueIndex = Math.max(
    0,
    Math.min(totalSteps, Math.round((value - min) / step))
  );

  useEffect(() => {
    if (width <= 0 || isUserScrolling.current) return;
    scrollRef.current?.scrollTo({
      x: valueIndex * tickSpacing,
      animated: false,
    });
    lastIndex.current = valueIndex;
  }, [valueIndex, width, tickSpacing]);

  function handleLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.max(0, Math.min(totalSteps, Math.round(x / tickSpacing)));
    if (idx !== lastIndex.current) {
      lastIndex.current = idx;
      Haptics.selectionAsync();
      const next = min + idx * step;
      onChange(Math.round(next * 100) / 100);
    }
  }

  const svg = useMemo(() => {
    if (contentWidth <= 0) return null;
    const elements: React.ReactNode[] = [];
    const baseY = height - 26;
    const majorH = 26;
    const minorH = 12;
    for (let i = 0; i <= totalSteps; i++) {
      const x = i * tickSpacing;
      const isMajor = i % majorEvery === 0;
      const h = isMajor ? majorH : minorH;
      elements.push(
        <Line
          key={`t-${i}`}
          x1={x}
          x2={x}
          y1={baseY - h}
          y2={baseY}
          stroke={isMajor ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)'}
          strokeWidth={isMajor ? 1.5 : 1}
        />
      );
      if (isMajor) {
        const labelValue = Math.round((min + i * step) * 100) / 100;
        elements.push(
          <SvgText
            key={`l-${i}`}
            x={x}
            y={height - 6}
            fontSize="11"
            fontWeight="500"
            fill="#8B98A9"
            textAnchor="middle"
          >
            {labelValue}
          </SvgText>
        );
      }
    }
    return (
      <Svg width={contentWidth} height={height}>
        {elements}
      </Svg>
    );
  }, [contentWidth, height, totalSteps, tickSpacing, majorEvery, min, step]);

  const pad = width > 0 ? width / 2 : 0;

  return (
    <View onLayout={handleLayout} style={{ height }} className="relative">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={tickSpacing}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isUserScrolling.current = true;
        }}
        onMomentumScrollEnd={() => {
          isUserScrolling.current = false;
        }}
        onScrollEndDrag={(e) => {
          // If no momentum follows (slow release), clear the flag.
          // Momentum-end will also fire and clear it; either is fine.
          if (e.nativeEvent.velocity?.x === 0) {
            isUserScrolling.current = false;
          }
        }}
        contentContainerStyle={{ paddingHorizontal: pad }}
      >
        {svg}
      </ScrollView>
      <View
        pointerEvents="none"
        className="absolute top-0 items-center"
        style={{ left: '50%', marginLeft: -1.5, width: 3, height: height - 26 }}
      >
        <View className="h-full w-[3px] rounded-full bg-primary" />
      </View>
    </View>
  );
}
