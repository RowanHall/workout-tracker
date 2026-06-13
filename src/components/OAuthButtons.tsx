import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { signInWithOAuth, type OAuthProvider } from '@/lib/oauth';

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

  return (
    <View>
      <View className="my-5 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs uppercase tracking-wider text-muted">or continue with</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <View className="gap-3">
        {PROVIDERS.map((provider) => (
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
