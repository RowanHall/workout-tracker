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
import { LegalDisclaimer } from '@/components/LegalDisclaimer';
import { OAuthButtons } from '@/components/OAuthButtons';
import { redirectTo } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    const trimmed = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(trimmed)) {
      Alert.alert(
        'Invalid username',
        'Use 3–24 characters: lowercase letters, numbers, and underscores.'
      );
      return;
    }
    if (!email || password.length < 6) {
      Alert.alert('Hold on', 'Enter an email and a password of at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          username: trimmed,
          display_name: displayName.trim() || trimmed,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else if (!data.session) {
      Alert.alert('Almost there', 'Check your email to confirm your account.');
    }
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
        <Text className="mb-2 text-center text-sm font-semibold uppercase tracking-[3px] text-muted">
          Join
        </Text>
        <View className="mb-2 items-center">
          <KovaLogo size={44} />
        </View>
        <Text className="mb-10 text-center text-base text-muted">
          Track every workout, set by set
        </Text>

        <TextInput
          className="mb-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-base text-white"
          placeholder="Username"
          placeholderTextColor="#8B98A9"
          autoCapitalize="none"
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase())}
        />
        <TextInput
          className="mb-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-base text-white"
          placeholder="Display name (optional)"
          placeholderTextColor="#8B98A9"
          value={displayName}
          onChangeText={setDisplayName}
        />
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
          placeholder="Password (6+ characters)"
          placeholderTextColor="#8B98A9"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          className="items-center rounded-xl bg-primary py-4 active:opacity-80 disabled:opacity-50"
          disabled={submitting}
          onPress={handleSignUp}
        >
          <Text className="text-base font-bold text-background">
            {submitting ? 'Creating account…' : 'Create Account'}
          </Text>
        </Pressable>

        <View className="mt-4">
          <LegalDisclaimer action="creating an account">
            {' '}We have a zero-tolerance policy for objectionable content or
            abusive behavior. Violations will result in immediate account
            termination.
          </LegalDisclaimer>
        </View>

        <OAuthButtons />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-muted">Already lifting with us? </Text>
          <Link href="/sign-in" className="font-semibold text-primary">
            Sign in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
