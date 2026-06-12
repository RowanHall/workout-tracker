import { Text } from 'react-native';

/**
 * The Kova wordmark: heavy italic caps (the letters lean, the baseline stays
 * level), tightly tracked, in brand green. Used on the auth screens and the
 * feed header.
 */
export function KovaLogo({ size = 40 }: { size?: number }) {
  return (
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
  );
}

