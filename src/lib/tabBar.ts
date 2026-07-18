// Layout math for the native iOS tab bar (see `(tabs)/_layout.tsx`).
//
// The native tab bar's height cannot be measured programmatically, so we use
// the standard UIKit content height (49pt, excluding the bottom safe-area
// inset) to position floating elements above it and to pad scroll content that
// would otherwise hide behind the translucent bar.
export const NATIVE_TAB_BAR_HEIGHT = 49;

/**
 * Bottom padding a tab screen's scroll content needs so its last rows clear the
 * translucent native tab bar instead of hiding behind it. Pass the safe-area
 * bottom inset.
 */
export function tabBarContentInset(bottomInset: number) {
  return bottomInset + NATIVE_TAB_BAR_HEIGHT + 16;
}
