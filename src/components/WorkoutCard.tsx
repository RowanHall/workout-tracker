import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Dumbbell, Medal } from 'lucide-react-native';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
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
  const photoUrls = [...(workout.workout_photos ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((p) => p.photo_url);
  const durationLabel = workout.ended_at
    ? formatDuration(workout.started_at, workout.ended_at)
    : null;

  async function submitComment() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    await onAddComment(workout, content);
    setDraft('');
    setSending(false);
  }

  return (
    <View className="mb-4 overflow-hidden rounded-2xl bg-surface">
      <Pressable
        className="flex-row items-center px-4 py-3 active:opacity-70"
        onPress={() => router.push(`/user/${workout.user_id}`)}
      >
        <Avatar url={workout.profiles.avatar_url} name={name} size={36} />
        <View className="ml-3 flex-1">
          <Text className="text-[14px] font-semibold text-white" numberOfLines={1}>
            {name}
          </Text>
          <Text className="text-xs text-muted" numberOfLines={1}>
            @{workout.profiles.username} · {timeAgo(workout.ended_at ?? workout.started_at)}
          </Text>
        </View>
      </Pressable>

      <FeedHero
        workoutId={workout.id}
        photoUrls={photoUrls}
        title={workout.title}
        volume={workout.total_volume}
      />

      <View className="flex-row items-center gap-5 px-4 pt-3">
        <Pressable
          className="flex-row items-center gap-1.5 active:opacity-70"
          onPress={() => onToggleCheer(workout, hasCheered)}
          hitSlop={8}
        >
          <Ionicons
            name={hasCheered ? 'megaphone' : 'megaphone-outline'}
            size={22}
            color={hasCheered ? '#22C55E' : '#FFFFFF'}
          />
          {cheers.length > 0 && (
            <Text className={`text-[13px] ${hasCheered ? 'font-semibold text-primary' : 'text-white'}`}>
              {cheers.length}
            </Text>
          )}
        </Pressable>
        <Pressable
          className="flex-row items-center gap-1.5 active:opacity-70"
          onPress={() => setShowComments((prev) => !prev)}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
          {comments.length > 0 && (
            <Text className="text-[13px] text-white">{comments.length}</Text>
          )}
        </Pressable>
      </View>

      <Pressable
        className="px-4 pb-3 pt-2 active:opacity-70"
        onPress={() => router.push(`/workout/${workout.id}`)}
      >
        <Text className="text-[15px] text-white">
          <Text className="font-bold">{name}</Text>
          <Text className="text-muted">  </Text>
          {workout.title}
        </Text>

        <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1">
          <Stat label="Volume" value={formatVolume(workout.total_volume)} />
          <Stat label="Sets" value={String(workout.total_sets)} />
          {durationLabel && <Stat label="Time" value={durationLabel} />}
          {prCount > 0 && (
            <View className="flex-row items-center gap-1">
              <Medal size={12} color="#F59E0B" strokeWidth={2.5} />
              <Text className="text-[13px] font-bold text-accent">
                {prCount} PR{prCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {!showComments && comments.length > 0 && (
        <Pressable
          className="gap-1 px-4 pb-3 active:opacity-70"
          onPress={() => setShowComments(true)}
        >
          {comments.slice(-2).map((c) => (
            <Text key={c.id} className="text-[14px] text-white" numberOfLines={2}>
              <Text className="font-semibold text-primary">
                @{c.profiles?.username ?? 'someone'}
              </Text>
              <Text>  </Text>
              {c.content}
            </Text>
          ))}
          {comments.length > 2 && (
            <Text className="text-[13px] text-muted">
              View all {comments.length} comments
            </Text>
          )}
        </Pressable>
      )}

      {showComments && (
        <View className="gap-2 border-t border-white/5 px-4 py-3">
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
              className="flex-1 rounded-xl bg-surface-2 px-3 py-2 text-sm text-white"
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

function FeedHero({
  workoutId,
  photoUrls,
  title,
  volume,
}: {
  workoutId: string;
  photoUrls: string[];
  title: string;
  volume: number;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32;

  if (photoUrls.length === 0) {
    return (
      <Pressable
        className="border-y border-white/5 bg-surface-2 active:opacity-90"
        style={{ width: cardWidth, height: Math.round(cardWidth * 0.55) }}
        onPress={() => router.push(`/workout/${workoutId}`)}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Dumbbell size={28} color="#22C55E" strokeWidth={2} />
          <Text
            className="mt-3 text-[44px] font-extrabold text-white"
            style={{ fontVariant: ['tabular-nums'], letterSpacing: -1.5 }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatVolume(volume)}
          </Text>
          <Text
            className="mt-1 text-[11px] font-bold uppercase tracking-[2.5px] text-muted"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      </Pressable>
    );
  }

  return <FeedPhotoCarousel workoutId={workoutId} urls={photoUrls} cardWidth={cardWidth} />;
}

function FeedPhotoCarousel({
  workoutId,
  urls,
  cardWidth,
}: {
  workoutId: string;
  urls: string[];
  cardWidth: number;
}) {
  const [page, setPage] = useState(0);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (next !== page) setPage(next);
  }

  return (
    <View style={{ width: cardWidth, height: cardWidth }} className="bg-background">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {urls.map((url, i) => (
          <Pressable
            key={`${url}-${i}`}
            onPress={() => router.push(`/workout/${workoutId}`)}
            style={{ width: cardWidth, height: cardWidth }}
          >
            <Image
              source={{ uri: url }}
              style={{ width: cardWidth, height: cardWidth }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      {urls.length > 1 && (
        <View className="absolute bottom-3 left-0 right-0 flex-row items-center justify-center gap-1.5">
          {urls.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${
                i === page ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline gap-1">
      <Text
        className="text-[13px] font-bold text-white"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted">
        {label}
      </Text>
    </View>
  );
}
