import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Medal } from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { formatDuration, formatVolume, timeAgo } from '@/lib/format';
import type { FeedWorkout } from '@/lib/types';

interface WorkoutCardProps {
  workout: FeedWorkout;
  currentUserId: string;
  onToggleCheer: (workout: FeedWorkout, hasCheered: boolean) => void;
  onAddComment: (workout: FeedWorkout, content: string) => Promise<void>;
}

export function WorkoutCard({
  workout,
  currentUserId,
  onToggleCheer,
  onAddComment,
}: WorkoutCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const cheers = workout.feed_interactions.filter((i) => i.type === 'cheer');
  const comments = workout.feed_interactions
    .filter((i) => i.type === 'comment')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const hasCheered = cheers.some((c) => c.user_id === currentUserId);
  const prCount = workout.workout_sets.filter((s) => s.is_pr).length;
  const name = workout.profiles.display_name ?? workout.profiles.username;

  async function submitComment() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    await onAddComment(workout, content);
    setDraft('');
    setSending(false);
  }

  return (
    <View className="mb-3 rounded-2xl bg-surface p-4">
      <Pressable
        className="active:opacity-70"
        onPress={() => router.push(`/workout/${workout.id}`)}
      >
        <View className="mb-3 flex-row items-center">
          <View className="mr-3">
            <Avatar url={workout.profiles.avatar_url} name={name} size={40} />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-white">{name}</Text>
            <Text className="text-xs text-muted">
              @{workout.profiles.username} · {timeAgo(workout.ended_at ?? workout.started_at)}
            </Text>
          </View>
        </View>

        <Text className="mb-2 text-lg font-bold text-white">{workout.title}</Text>
        {prCount > 0 && (
          <View className="mb-2 flex-row items-center gap-1.5 self-start rounded-full bg-accent/20 px-2.5 py-1">
            <Medal size={12} color="#F59E0B" strokeWidth={2} />
            <Text className="text-xs font-bold text-accent">
              {prCount} PR{prCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <View className="mb-3 flex-row gap-4">
          <Stat label="Volume" value={formatVolume(workout.total_volume)} />
          <Stat label="Sets" value={String(workout.total_sets)} />
          {workout.ended_at && (
            <Stat label="Time" value={formatDuration(workout.started_at, workout.ended_at)} />
          )}
        </View>
      </Pressable>

      <View className="flex-row items-center gap-5 border-t border-border pt-3">
        <Pressable
          className="flex-row items-center gap-1.5 active:opacity-70"
          onPress={() => onToggleCheer(workout, hasCheered)}
          hitSlop={8}
        >
          <Ionicons
            name={hasCheered ? 'megaphone' : 'megaphone-outline'}
            size={20}
            color={hasCheered ? '#22C55E' : '#8B98A9'}
          />
          <Text className={hasCheered ? 'font-semibold text-primary' : 'text-muted'}>
            {cheers.length > 0 ? cheers.length : ''} Cheer{cheers.length === 1 ? '' : 's'}
          </Text>
        </Pressable>
        <Pressable
          className="flex-row items-center gap-1.5 active:opacity-70"
          onPress={() => setShowComments((prev) => !prev)}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#8B98A9" />
          <Text className="text-muted">
            {comments.length > 0 ? comments.length : ''} Comment
            {comments.length === 1 ? '' : 's'}
          </Text>
        </Pressable>
      </View>

      {showComments && (
        <View className="mt-3 gap-2">
          {comments.map((c) => (
            <View key={c.id} className="rounded-xl bg-surface-2 px-3 py-2">
              <Text className="text-xs font-semibold text-primary">
                @{c.profiles?.username ?? 'someone'}
              </Text>
              <Text className="text-sm text-white">{c.content}</Text>
            </View>
          ))}
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-white"
              placeholder="Add a comment…"
              placeholderTextColor="#8B98A9"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submitComment}
              returnKeyType="send"
            />
            <Pressable onPress={submitComment} disabled={sending} hitSlop={8}>
              <Ionicons name="send" size={20} color="#22C55E" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
      <Text className="text-base font-extrabold text-white">{value}</Text>
    </View>
  );
}
