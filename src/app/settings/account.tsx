import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useHeaderInset } from '@/lib/blurHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function AccountSettingsScreen() {
  const { session, profile } = useAuth();
  const headerInset = useHeaderInset();
  const [deleting, setDeleting] = useState(false);

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently erases your account, workouts, stats, follows, and photos. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await supabase.rpc('delete_account');
            if (error) {
              setDeleting(false);
              Alert.alert('Could not delete account', error.message);
              return;
            }
            await supabase.auth.signOut();
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: headerInset, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pt-7">
        <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
          Sign-in
        </Text>
        <Row label="Email" value={session?.user.email ?? '—'} />
        <Row label="Username" value={profile?.username ? `@${profile.username}` : '—'} last />
      </View>

      <View className="px-5 pt-8">
        <Pressable
          className="items-center rounded-xl border border-white/10 py-3.5 active:opacity-70"
          onPress={() => supabase.auth.signOut()}
        >
          <Text className="font-semibold text-danger">Sign Out</Text>
        </Pressable>

        <Pressable
          className="mt-3 items-center py-3.5 active:opacity-70 disabled:opacity-50"
          disabled={deleting}
          onPress={handleDeleteAccount}
        >
          <Text className="text-sm font-medium text-muted">
            {deleting ? 'Deleting account…' : 'Delete Account'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between py-3.5 ${
        last ? '' : 'border-b border-white/5'
      }`}
    >
      <Text className="text-[15px] text-muted">{label}</Text>
      <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
