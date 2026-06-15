import { FontAwesome } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';

import {
  isAppleSignInAvailable,
  signInWithAppleNative,
  signInWithOAuth,
  type OAuthProvider,
} from '@/lib/oauth';

const PROVIDERS: {
  key: OAuthProvider;
  label: string;
  icon: keyof typeof FontAwesome.glyphMap;
}[] = [
  { key: 'apple', label: 'Apple', icon: 'apple' },
  { key: 'google', label: 'Google', icon: 'google' },
  { key: 'github', label: 'GitHub', icon: 'github' },
];

/** Social sign-in row shared by the sign-in and sign-up screens. */
export function OAuthButtons() {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [appleNative, setAppleNative] = useState(false);

  useEffect(() => {
    // On iOS we use Apple's native sign-in sheet + button (required by Apple's
    // Human Interface Guidelines). Elsewhere, Apple falls back to web OAuth.
    if (Platform.OS === 'ios') isAppleSignInAvailable().then(setAppleNative);
  }, []);

  async function handlePress(provider: OAuthProvider) {
    setBusy(provider);
    try {
      await signInWithOAuth(provider);
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message ?? 'Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handleAppleNative() {
    setBusy('apple');
    try {
      await signInWithAppleNative();
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message ?? 'Please try again.');
    } finally {
      setBusy(null);
    }
  }

  // Apple is rendered as its own native button on iOS; the rest stay as the
  // shared web-OAuth buttons.
  const webProviders = appleNative ? PROVIDERS.filter((p) => p.key !== 'apple') : PROVIDERS;

  return (
    <View>
      <View className="my-5 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs uppercase tracking-wider text-muted">or continue with</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <View className="gap-3">
        {appleNative && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={12}
            style={{ height: 48, width: '100%' }}
            onPress={handleAppleNative}
          />
        )}

        {webProviders.map((provider) => (
          <Pressable
            key={provider.key}
            className="h-12 flex-row items-center justify-center gap-3 rounded-xl border border-border bg-surface active:opacity-70 disabled:opacity-50"
            disabled={busy !== null}
            onPress={() => handlePress(provider.key)}
          >
            {busy === provider.key ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <FontAwesome name={provider.icon} size={18} color="#FFFFFF" />
                <Text className="text-base font-semibold text-white">
                  Continue with {provider.label}
                </Text>
              </>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
