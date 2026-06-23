import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { dateKey, formatWeight } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { BodyWeight } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function BodyWeightSettingsScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [latest, setLatest] = useState<Pick<BodyWeight, 'recorded_on' | 'weight'> | null>(null);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadLatest = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('body_weights')
      .select('recorded_on, weight')
      .eq('user_id', userId)
      .order('recorded_on', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatest(
      data ? { recorded_on: data.recorded_on, weight: Number(data.weight) } : null
    );
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadLatest();
    }, [loadLatest])
  );

  async function handleLog() {
    const w = parseFloat(input);
    if (Number.isNaN(w) || w <= 0 || w >= 2000) {
      Alert.alert('Invalid weight', 'Enter your body weight in lbs.');
      return;
    }
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('body_weights').upsert(
        {
          user_id: userId,
          recorded_on: dateKey(new Date()),
          weight: w,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,recorded_on' }
      );
      if (error) throw error;
      setInput('');
      await loadLatest();
    } catch (err: any) {
      Alert.alert('Could not log weight', err.message);
    } finally {
      setSaving(false);
    }
  }

  const loggedToday = latest?.recorded_on === dateKey(new Date());

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center px-5 pt-10 pb-2">
          <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
            {latest ? (loggedToday ? "Today's weight" : 'Most recent') : 'No entries yet'}
          </Text>
          {latest ? (
            <Text
              className="mt-3 text-white"
              style={{
                fontSize: 64,
                fontWeight: '800',
                letterSpacing: -2.5,
                fontVariant: ['tabular-nums'],
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatWeight(latest.weight)}
              <Text className="text-2xl font-semibold text-muted"> lbs</Text>
            </Text>
          ) : (
            <Text
              className="mt-3 text-muted"
              style={{
                fontSize: 64,
                fontWeight: '800',
                letterSpacing: -2.5,
                fontVariant: ['tabular-nums'],
              }}
            >
              —
            </Text>
          )}
        </View>

        <View className="px-5 pt-8">
          <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
            Log today
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-white"
              placeholder={latest ? `${formatWeight(latest.weight)} lbs` : 'Weight (lbs)'}
              placeholderTextColor="#16803C"
              keyboardType="decimal-pad"
              value={input}
              onChangeText={setInput}
            />
            <Pressable
              className="rounded-xl bg-primary px-5 py-3 active:opacity-80 disabled:opacity-50"
              disabled={saving}
              onPress={handleLog}
            >
              <Text className="font-bold text-background">{saving ? 'Saving…' : 'Log'}</Text>
            </Pressable>
          </View>
          <Text className="mt-3 text-xs text-muted">
            {loggedToday
              ? "Logging again replaces today's entry."
              : "Saved against today's date; your trend updates on the profile."}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
