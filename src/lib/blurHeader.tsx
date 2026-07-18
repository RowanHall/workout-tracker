import { useHeaderHeight } from '@react-navigation/elements';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

/**
 * Frosted-glass navigation header shared by every pushed detail screen.
 *
 * The header floats over the content (`headerTransparent`) so the page scrolls
 * *under* it — content blurs through the frosted background as it reaches the
 * top instead of being clipped by an opaque bar, while the title and header
 * buttons stay legible. Screens must offset their scroll content by
 * `useHeaderInset()` so the first row starts below the header at rest.
 *
 * The blur and dark tint are both feathered to zero over the bottom of the
 * header (via a vertical gradient mask) so there's no hard seam where the
 * frosted band meets the sharp content below — it reads as a smooth
 * no-blur → blur ramp instead of a visible line.
 */
/**
 * The frosted band itself — an absolutely-filled blur + dark tint, both
 * feathered to zero over the bottom of the band. Used as the native header
 * background and, for tab screens with their own floating header (the feed),
 * dropped behind that header so it blurs identically.
 */
export function BlurHeaderBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Blur, masked opaque→transparent so it dissolves before the edge. */}
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            style={StyleSheet.absoluteFill}
            colors={['#000', '#000', 'transparent']}
            locations={[0, 0.55, 1]}
          />
        }
      >
        <BlurView tint="dark" intensity={44} style={StyleSheet.absoluteFill} />
      </MaskedView>
      {/* Dark tint fades on the same ramp so nothing cuts off abruptly. */}
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['rgba(11,15,20,0.6)', 'rgba(11,15,20,0.55)', 'rgba(11,15,20,0)']}
        locations={[0, 0.55, 1]}
      />
    </View>
  );
}

export const blurHeaderOptions = {
  headerShown: true,
  headerTransparent: true,
  headerStyle: { backgroundColor: 'transparent' },
  headerTintColor: '#FFFFFF',
  headerShadowVisible: false,
  headerBackground: () => <BlurHeaderBackground />,
} as const;

/**
 * Top padding a scroll container needs so its content rests below the
 * transparent blur header (which no longer reserves layout space). Add any
 * screen-specific breathing room on top of this value.
 */
export function useHeaderInset(): number {
  return useHeaderHeight();
}
