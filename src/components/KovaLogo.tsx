import { StyleProp, Text, TextStyle } from 'react-native';

/**
 * The Kova wordmark: heavy italic caps (the letters lean, the baseline stays
 * level), tightly tracked, in brand green. The final "A" is a crossbar-less
 * lambda glyph, reading as an upside-down V. Used on the auth screens and
 * the feed header.
 *
 * `style` is merged last so callers can layer on extras (e.g. a text shadow to
 * keep the wordmark legible over a photo on a shareable card).
 */
export function KovaLogo({
  size = 40,
  style,
}: {
  size?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          fontWeight: '900',
          fontStyle: 'italic',
          letterSpacing: -size * 0.04,
          color: '#22C55E',
        },
        style,
      ]}
    >
      KOVΛ
    </Text>
  );
}

