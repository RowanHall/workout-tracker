import { Link } from 'expo-router';
import { Target } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

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
    if (error) Alert.alert('Sign in failed', error.message);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center px-8">
        <View className="mb-3 items-center">
          <Target size={48} color="#22C55E" strokeWidth={1.5} />
        </View>
        <Text className="mb-1 text-center text-3xl font-bold text-white">Arrow</Text>
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

        <View className="mt-6 flex-row justify-center">
          <Text className="text-muted">New here? </Text>
          <Link href="/sign-up" className="font-semibold text-primary">
            Create an account
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
