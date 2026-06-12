import { Text, View } from 'react-native';

/**
 * The Kova wordmark: heavy italic caps, tightly tracked, tilted a touch,
 * in brand green. Used on the auth screens and the feed header.
 */
export function KovaLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={{ transform: [{ rotate: '-4deg' }] }}>
      <Text
        style={{
          fontSize: size,
          fontWeight: '900',
          fontStyle: 'italic',
          letterSpacing: -size * 0.04,
          color: '#22C55E',
        }}
      >
        KOVA
      </Text>
    </View>
  );
}
