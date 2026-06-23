import { useEffect, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;

export interface WheelPickerProps {
  items: { label: string; value: number }[];
  value: number;
  onChange: (value: number) => void;
  width?: number | string;
}

export function WheelPicker({ items, value, onChange, width = '100%' }: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lastReportedIndex = useRef<number>(-1);

  const selectedIndex = Math.max(
    0,
    items.findIndex((it) => it.value === value)
  );

  useEffect(() => {
    // Keep the visible position synced with external value changes.
    const target = selectedIndex * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: target, animated: false });
    lastReportedIndex.current = selectedIndex;
  }, [selectedIndex]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (clamped !== lastReportedIndex.current) {
      lastReportedIndex.current = clamped;
      onChange(items[clamped].value);
    }
    // Snap precisely in case of half-snap.
    const snapTo = clamped * ITEM_HEIGHT;
    if (Math.abs(snapTo - y) > 0.5) {
      scrollRef.current?.scrollTo({ y: snapTo, animated: true });
    }
  }

  const padding = ((VISIBLE_COUNT - 1) / 2) * ITEM_HEIGHT;

  return (
    <View style={{ width: width as any, height: ITEM_HEIGHT * VISIBLE_COUNT }} className="relative">
      {/* Highlight band for the centered selection */}
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 rounded-xl bg-white/5"
        style={{ top: padding, height: ITEM_HEIGHT }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: padding }}
      >
        {items.map((item, i) => (
          <View
            key={`${item.value}-${i}`}
            style={{ height: ITEM_HEIGHT }}
            className="items-center justify-center"
          >
            <Text
              className={`text-[20px] ${
                i === selectedIndex
                  ? 'font-bold text-white'
                  : 'font-medium text-muted'
              }`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
