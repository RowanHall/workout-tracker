import { Globe2, ImagePlus, Lock, Medal, Share2, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { MuscleMap } from '@/components/MuscleMap';
import { useCountUp } from '@/hooks/useCountUp';
import type { ExerciseMuscle, WorkoutSummary } from '@/lib/types';

const TERMS_URL = 'https://kovafit.ca/terms/';

export type WorkoutVisibility = 'public' | 'private';

export interface SelectedPhoto {
  uri: string;
  base64?: string | null;
}

interface WorkoutSummaryModalProps {
  summary: WorkoutSummary | null;
  onClose: () => void;
  /** When provided, shows a "Share workout" button beside Done. */
  onShare?: () => void;
  /** Combined muscle activation across every logged exercise. */
  muscles?: ExerciseMuscle[];
  /** Photos the user has staged for upload. */
  photos?: SelectedPhoto[];
  onAddPhoto?: () => void;
  onRemovePhoto?: (index: number) => void;
  visibility?: WorkoutVisibility;
  onChangeVisibility?: (v: WorkoutVisibility) => void;
  /** Editable workout title. Leave the input empty to keep the default. */
  title?: string;
  onChangeTitle?: (title: string) => void;
  /** Shown as placeholder when the title input is empty. */
  defaultTitle?: string;
  /** True while photos/visibility are being persisted on close. */
  saving?: boolean;
}

const MAX_PHOTOS = 6;

export function WorkoutSummaryModal({
  summary,
  onClose,
  onShare,
  muscles,
  photos,
  onAddPhoto,
  onRemovePhoto,
  visibility,
  onChangeVisibility,
  title,
  onChangeTitle,
  defaultTitle,
  saving,
}: WorkoutSummaryModalProps) {
  if (!summary) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 pt-12">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 rounded-t-[28px] bg-surface pt-3">
            <View className="mb-1 h-1 w-10 self-center rounded-full bg-border" />

            <SheetHeader />

            <ScrollView
              className="flex-1 px-6"
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <EditsBlock
                title={title}
                onChangeTitle={onChangeTitle}
                defaultTitle={defaultTitle}
                photos={photos}
                onAddPhoto={onAddPhoto}
                onRemovePhoto={onRemovePhoto}
                visibility={visibility}
                onChangeVisibility={onChangeVisibility}
              />

              <Divider />

              <RecapBlock summary={summary} muscles={muscles} />
            </ScrollView>

            {visibility === 'public' && <TermsAgreement />}

            <FooterActions
              onClose={onClose}
              onShare={onShare}
              saving={saving}
              withTopBorder={visibility !== 'public'}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function SheetHeader() {
  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      className="mb-2 items-center px-6 pt-3"
    >
      <View className="flex-row items-center gap-1.5">
        <View className="h-1.5 w-1.5 rounded-full bg-primary" />
        <Text className="text-[11px] font-bold uppercase tracking-[3px] text-muted">
          Workout complete
        </Text>
      </View>
    </Animated.View>
  );
}

function EditsBlock({
  title,
  onChangeTitle,
  defaultTitle,
  photos,
  onAddPhoto,
  onRemovePhoto,
  visibility,
  onChangeVisibility,
}: {
  title?: string;
  onChangeTitle?: (t: string) => void;
  defaultTitle?: string;
  photos?: SelectedPhoto[];
  onAddPhoto?: () => void;
  onRemovePhoto?: (index: number) => void;
  visibility?: WorkoutVisibility;
  onChangeVisibility?: (v: WorkoutVisibility) => void;
}) {
  const showTitle = !!onChangeTitle;
  const showPhotos = !!onAddPhoto;
  const showVisibility = !!onChangeVisibility && !!visibility;
  if (!showTitle && !showPhotos && !showVisibility) return null;

  return (
    <View className="pt-3">
      {showTitle && (
        <Animated.View entering={FadeInDown.delay(80).duration(320)} className="mb-7">
          <FieldLabel>Title</FieldLabel>
          <TextInput
            value={title ?? ''}
            onChangeText={onChangeTitle}
            placeholder={defaultTitle ?? 'Name this workout'}
            placeholderTextColor="rgba(139,152,169,0.7)"
            className="border-b border-white/10 pb-2 text-[26px] font-bold text-white"
            style={{ letterSpacing: -0.4 }}
            maxLength={60}
            returnKeyType="done"
          />
        </Animated.View>
      )}

      {showPhotos && (
        <Animated.View entering={FadeInDown.delay(140).duration(320)} className="mb-7">
          <FieldLabel>Photos</FieldLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2.5"
          >
            <Pressable
              onPress={onAddPhoto}
              disabled={(photos?.length ?? 0) >= MAX_PHOTOS}
              className="h-[76px] w-[76px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-background active:opacity-70 disabled:opacity-40"
            >
              <ImagePlus size={20} color="#22C55E" strokeWidth={1.75} />
              <Text className="mt-1 text-[10px] font-semibold tracking-wider text-muted">
                ADD
              </Text>
            </Pressable>
            {(photos ?? []).map((photo, index) => (
              <View key={`${photo.uri}-${index}`} className="relative">
                <Image
                  source={{ uri: photo.uri }}
                  className="h-[76px] w-[76px] rounded-2xl"
                />
                {onRemovePhoto && (
                  <Pressable
                    onPress={() => onRemovePhoto(index)}
                    className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-background"
                    hitSlop={6}
                  >
                    <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {showVisibility && (
        <Animated.View entering={FadeInDown.delay(200).duration(320)} className="mb-2">
          <FieldLabel>Who can see it</FieldLabel>
          <View className="flex-row rounded-full bg-background p-1">
            <SegmentChoice
              active={visibility === 'public'}
              icon={
                <Globe2
                  size={14}
                  color={visibility === 'public' ? '#0B0F14' : '#8B98A9'}
                  strokeWidth={2.25}
                />
              }
              label="Public"
              onPress={() => onChangeVisibility('public')}
            />
            <SegmentChoice
              active={visibility === 'private'}
              icon={
                <Lock
                  size={14}
                  color={visibility === 'private' ? '#0B0F14' : '#8B98A9'}
                  strokeWidth={2.25}
                />
              }
              label="Private"
              onPress={() => onChangeVisibility('private')}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function RecapBlock({
  summary,
  muscles,
}: {
  summary: WorkoutSummary;
  muscles?: ExerciseMuscle[];
}) {
  const volume = useCountUp(summary.total_volume, 1100, 320);
  return (
    <View>
      <Animated.View entering={FadeIn.delay(280).duration(320)} className="pt-7">
        <Text
          className="text-[64px] font-extrabold leading-none text-white"
          style={{ letterSpacing: -2.5, fontVariant: ['tabular-nums'] }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {volume.toLocaleString()}
        </Text>
        <Text className="mt-2 text-sm text-muted">
          lbs &nbsp;·&nbsp; Total volume
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(420).duration(320)}
        className="mt-7 flex-row"
      >
        <MetaTile label="Sets" value={String(summary.total_sets)} />
        <MetaTile
          label="Streak"
          value={`${summary.streak}${summary.streak === 1 ? ' day' : ' days'}`}
        />
        <MetaTile
          label="PRs"
          value={String(summary.prs.length)}
          highlight={summary.prs.length > 0}
        />
      </Animated.View>

      {summary.prs.length > 0 && (
        <Animated.View entering={FadeInDown.delay(540).duration(320)} className="mt-8">
          <FieldLabel>Personal records</FieldLabel>
          <View className="gap-1">
            {summary.prs.map((pr, i) => (
              <Animated.View
                key={`${pr.exercise}-${pr.type}`}
                entering={FadeInDown.delay(620 + i * 80).springify().damping(18)}
                className="flex-row items-center gap-3 py-2"
              >
                <View className="h-7 w-7 items-center justify-center rounded-full bg-accent/15">
                  <Medal size={14} color="#F59E0B" strokeWidth={2} />
                </View>
                <Text className="flex-1 text-base font-semibold text-white" numberOfLines={1}>
                  {pr.exercise}
                </Text>
                <Text
                  className="text-base font-bold text-accent"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {Math.round(pr.value).toLocaleString()}
                  <Text className="text-xs font-medium text-muted">
                    {' '}
                    {pr.type === 'one_rep_max' ? 'est. 1RM' : 'set vol'}
                  </Text>
                </Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      )}

      {muscles && muscles.length > 0 && (
        <Animated.View entering={FadeInDown.delay(680).duration(320)} className="mt-8">
          <FieldLabel>Muscles worked</FieldLabel>
          <View className="items-center rounded-2xl bg-background py-4">
            <MuscleMap muscles={muscles} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function TermsAgreement() {
  return (
    <View className="border-t border-white/5 px-6 pt-3">
      <Text className="text-[11px] leading-[16px] text-muted">
        By posting, you agree to our{' '}
        <Text
          className="font-semibold text-primary"
          onPress={() => Linking.openURL(TERMS_URL)}
        >
          Terms of Use
        </Text>
        . We have a zero-tolerance policy for objectionable content or abusive
        behavior. Violations will result in immediate account termination.
      </Text>
    </View>
  );
}

function FooterActions({
  onClose,
  onShare,
  saving,
  withTopBorder = true,
}: {
  onClose: () => void;
  onShare?: () => void;
  saving?: boolean;
  withTopBorder?: boolean;
}) {
  return (
    <View
      className={`flex-row gap-2.5 px-6 pb-7 pt-3 ${withTopBorder ? 'border-t border-white/5' : ''}`}
      style={{ paddingBottom: Platform.OS === 'ios' ? 32 : 20 }}
    >
      {onShare && (
        <Pressable
          onPress={onShare}
          disabled={saving}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-white/15 py-4 active:opacity-70 disabled:opacity-50"
        >
          <Share2 size={16} color="#FFFFFF" strokeWidth={2.25} />
          <Text className="font-semibold text-white">Share</Text>
        </Pressable>
      )}
      <Pressable
        onPress={onClose}
        disabled={saving}
        className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-4 active:opacity-80 disabled:opacity-60"
        style={{ flex: onShare ? 2 : 1 }}
      >
        {saving && <ActivityIndicator color="#0B0F14" size="small" />}
        <Text className="font-bold text-background">{saving ? 'Saving' : 'Done'}</Text>
      </Pressable>
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
      {children}
    </Text>
  );
}

function MetaTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-1">
      <Text
        className={`text-2xl font-extrabold ${highlight ? 'text-accent' : 'text-white'}`}
        style={{ letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
    </View>
  );
}

function SegmentChoice({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2.5 active:opacity-80 ${
        active ? 'bg-primary' : ''
      }`}
    >
      {icon}
      <Text
        className={`text-sm font-bold ${active ? 'text-background' : 'text-muted'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Divider() {
  return <View className="mt-2 h-px bg-white/5" />;
}
