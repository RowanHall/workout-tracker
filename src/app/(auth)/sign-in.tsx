import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { KovaLogo } from '@/components/KovaLogo';
import { OAuthButtons } from '@/components/OAuthButtons';
import { redirectTo } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (!error) return;
    const notConfirmed =
      error.message.toLowerCase().includes('not confirmed') ||
      (error as { code?: string }).code === 'email_not_confirmed';
    if (notConfirmed) {
      Alert.alert(
        'Email not confirmed',
        'Check your inbox for the confirmation link, or resend it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Resend',
            onPress: async () => {
              const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: { emailRedirectTo: redirectTo },
              });
              if (resendError) {
                Alert.alert('Could not resend', resendError.message);
              } else {
                Alert.alert('Sent', 'Check your email for the confirmation link.');
              }
            },
          },
        ]
      );
      return;
    }
    Alert.alert('Sign in failed', error.message);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-8 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-2 items-center">
          <KovaLogo size={44} />
        </View>
        <Text className="mb-10 text-center text-base text-muted">
          Track your training, set by set
        </Text>

        <TextInput
          className="mb-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-base text-white"
          placeholder="Email"
          placeholderTextColor="#8B98A9"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="mb-6 rounded-xl border border-border bg-surface px-4 py-3.5 text-base text-white"
          placeholder="Password"
          placeholderTextColor="#8B98A9"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          className="items-center rounded-xl bg-primary py-4 active:opacity-80 disabled:opacity-50"
          disabled={submitting}
          onPress={handleSignIn}
        >
          <Text className="text-base font-bold text-background">
            {submitting ? 'Signing in…' : 'Sign In'}
          </Text>
        </Pressable>

        <OAuthButtons />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-muted">New here? </Text>
          <Link href="/sign-up" className="font-semibold text-primary">
            Create an account
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
