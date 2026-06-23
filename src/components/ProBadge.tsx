import { Text } from 'react-native';

type Size = 'sm' | 'md';

export function ProBadge({ size = 'sm' }: { size?: Size }) {
  const fontSize = size === 'md' ? 30 : 11;
  return (
    <Text
      style={{
        fontSize,
        fontWeight: '700',
        letterSpacing: fontSize * 0.22,
        textTransform: 'uppercase',
        color: '#F59E0B',
      }}
    >
      Pro
    </Text>
  );
}
