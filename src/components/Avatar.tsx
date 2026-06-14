import { Image, Text, View } from 'react-native';

/**
 * Round profile picture. Shows the uploaded image when `url` is set, otherwise
 * a colored circle with the user's first initial.
 */
export function Avatar({
  url,
  name,
  size = 40,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      className="items-center justify-center rounded-full bg-primary-dim"
      style={{ width: size, height: size }}
    >
      <Text className="font-bold text-white" style={{ fontSize: size * 0.4 }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
