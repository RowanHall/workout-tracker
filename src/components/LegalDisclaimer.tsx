import { Linking, Text } from 'react-native';
import type { ReactNode } from 'react';

const TERMS_URL = 'https://kovafit.ca/terms/';
const PRIVACY_URL = 'https://rowanhall.github.io/workout-tracker/';

/**
 * Terms + privacy consent line shown on every entry into the app (welcome,
 * sign-in, sign-up). Apple reviews both the sign-up AND log-in flows for
 * this, so it must be visible before any credential entry.
 */
export function LegalDisclaimer({
  action = 'continuing',
  children,
}: {
  action?: string;
  children?: ReactNode;
}) {
  return (
    <Text className="text-center text-xs leading-[18px] text-muted">
      By {action}, you agree to our{' '}
      <Text
        className="font-semibold text-primary"
        onPress={() => Linking.openURL(TERMS_URL)}
      >
        Terms of Use
      </Text>{' '}
      and{' '}
      <Text
        className="font-semibold text-primary"
        onPress={() => Linking.openURL(PRIVACY_URL)}
      >
        Privacy Policy
      </Text>
      .{children}
    </Text>
  );
}
