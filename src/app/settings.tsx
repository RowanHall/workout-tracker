import { decode } from 'base64-arraybuffer';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
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

import { Avatar } from '@/components/Avatar';
import { dateKey, formatWeight } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { BodyWeight } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function SettingsScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id;
  const name = profile?.display_name ?? profile?.username ?? '';

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handlePickAvatar() {
    if (!userId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos access needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;

    setUploadingAvatar(true);
    try {
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, decode(asset.base64), { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Stable path + upsert, so cache-bust the URL to force the new image in.
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', userId);
      if (updateError) throw updateError;

      await refreshProfile();
    } catch (err: any) {
      Alert.alert('Could not update photo', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

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
      const { error } = await supabase
        .from('body_weights')
        .upsert(
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
      <ScrollView contentContainerClassName="p-4 pb-8" keyboardShouldPersistTaps="handled">
        <View className="mb-6 items-center">
          <Pressable
            className="active:opacity-80"
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
          >
            <Avatar url={profile?.avatar_url} name={name} size={96} />
            <View className="absolute bottom-0 right-0 rounded-full border-2 border-background bg-primary p-1.5">
              <Camera size={15} color="#0B0F14" strokeWidth={2.25} />
            </View>
          </Pressable>
          <Text className="mt-2 text-sm text-muted">
            {uploadingAvatar ? 'Uploading…' : 'Tap to change photo'}
          </Text>
        </View>

        <SectionLabel>Body Weight</SectionLabel>
        <View className="mb-6 rounded-2xl bg-surface p-4">
          {latest && (
            <View className="mb-3 flex-row items-baseline justify-between">
              <Text className="text-muted">{loggedToday ? "Today's weight" : 'Most recent'}</Text>
              <Text className="text-lg font-bold text-white">
                {formatWeight(latest.weight)}{' '}
                <Text className="text-sm font-normal text-muted">lbs</Text>
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-white"
              placeholder={latest ? `${formatWeight(latest.weight)} lbs` : 'Weight (lbs)'}
              placeholderTextColor="#8B98A9"
              keyboardType="decimal-pad"
              value={input}
              onChangeText={setInput}
            />
            <Pressable
              className="rounded-xl bg-primary px-5 py-2.5 active:opacity-80 disabled:opacity-50"
              disabled={saving}
              onPress={handleLog}
            >
              <Text className="font-bold text-background">{saving ? 'Saving…' : 'Log'}</Text>
            </Pressable>
          </View>
          <Text className="mt-2 text-xs text-muted">
            {loggedToday
              ? "Logging again replaces today's entry."
              : "Saved against today's date; your trend updates on the profile."}
          </Text>
        </View>

        <SectionLabel>Account</SectionLabel>
        <View className="mb-6 overflow-hidden rounded-2xl bg-surface">
          <Row label="Username" value={`@${profile?.username ?? ''}`} />
          <View className="h-px bg-border" />
          <Row label="Email" value={session?.user.email ?? '—'} />
        </View>

        <Pressable
          className="items-center rounded-xl border border-border py-3.5 active:opacity-70"
          onPress={() => supabase.auth.signOut()}
        >
          <Text className="font-semibold text-danger">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
      {children}
    </Text>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5">
      <Text className="text-muted">{label}</Text>
      <Text className="font-semibold text-white">{value}</Text>
    </View>
  );
}
