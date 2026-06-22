import { useState } from 'react';
import {
  Image,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

/** Swipeable hero gallery of photos attached to a workout. Sized to the
 *  screen width (minus the standard 16px page padding) and laid out at a
 *  4:3 aspect so it sits cleanly above the rest of the detail screen. */
export function WorkoutPhotosCarousel({ urls }: { urls: string[] }) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32;
  const photoHeight = Math.round(cardWidth * 0.75);
  const [page, setPage] = useState(0);

  if (urls.length === 0) return null;

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (next !== page) setPage(next);
  }

  return (
    <View
      className="mb-4 overflow-hidden rounded-2xl bg-surface"
      style={{ height: photoHeight }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {urls.map((url, i) => (
          <Image
            key={`${url}-${i}`}
            source={{ uri: url }}
            style={{ width: cardWidth, height: photoHeight }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {urls.length > 1 && (
        <View className="absolute bottom-3 left-0 right-0 flex-row items-center justify-center gap-1.5">
          {urls.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${
                i === page ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
