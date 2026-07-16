import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronRight, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { OptionList } from '@/components/onboarding/OptionList';
import { SegmentedToggle } from '@/components/onboarding/SegmentedToggle';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

type Gender = NonNullable<Profile['gender']>;
type Goal = NonNullable<Profile['primary_goal']>;
type Experience = NonNullable<Profile['experience_level']>;
type WeightUnit = Profile['preferred_unit'];
type DistanceUnit = Profile['distance_unit'];

type EditField =
  | 'gender'
  | 'birthday'
  | 'height'
  | 'goal'
  | 'experience'
  | 'weightUnit'
  | 'distanceUnit'
  | 'referral'
  | 'privacy'
  | null;

const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const GOAL_LABELS: Record<Goal, string> = {
  build_muscle: 'Build muscle',
  gain_strength: 'Gain strength',
  fat_loss: 'Fat loss',
};

const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const REFERRAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'ai_search', label: 'AI search (ChatGPT, Gemini, etc.)' },
  { value: 'influencer', label: 'Influencer / creator' },
  { value: 'google_search', label: 'Google search' },
  { value: 'app_store', label: 'App Store' },
  { value: 'friends_family', label: 'Friends or family' },
  { value: 'other', label: 'Other' },
];

const REFERRAL_LABELS: Record<string, string> = REFERRAL_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {}
);

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatBirthday(iso: string | null): string {
  if (!iso) return 'Not set';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return 'Not set';
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function formatHeight(cm: number | null, unit: 'cm' | 'ft'): string {
  if (cm == null) return 'Not set';
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches - feet * 12;
  return `${feet}' ${inches}"`;
}

export default function ProfileSettingsScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id;
  const displayName = profile?.display_name ?? profile?.username ?? '';

  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<EditField>(null);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('ft');

  async function updateProfile(patch: Partial<Profile>) {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    await refreshProfile();
  }

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

    setUploading(true);
    try {
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, decode(asset.base64), { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
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
      setUploading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center px-5 pt-8 pb-2">
        <Pressable
          className="active:opacity-80"
          onPress={handlePickAvatar}
          disabled={uploading}
        >
          <Avatar url={profile?.avatar_url} name={displayName} size={112} />
          <View className="absolute bottom-0 right-0 rounded-full border-2 border-background bg-primary p-1.5">
            <Camera size={16} color="#0B0F14" strokeWidth={2.25} />
          </View>
        </Pressable>
        <Text className="mt-3 text-sm text-muted">
          {uploading ? 'Uploading…' : 'Tap to change photo'}
        </Text>
      </View>

      <Section label="Identity">
        <Row label="Display name" value={displayName || '—'} />
        <Row
          label="Username"
          value={profile?.username ? `@${profile.username}` : '—'}
          last
        />
      </Section>

      <Section label="Personal">
        <Row
          label="Gender"
          value={profile?.gender ? GENDER_LABELS[profile.gender] : 'Not set'}
          onPress={() => setEditing('gender')}
        />
        <Row
          label="Birthday"
          value={formatBirthday(profile?.birthday ?? null)}
          onPress={() => setEditing('birthday')}
        />
        <Row
          label="Height"
          value={formatHeight(profile?.height_cm ?? null, heightUnit)}
          onPress={() => setEditing('height')}
          last
        />
      </Section>

      <Section label="Training">
        <Row
          label="Primary goal"
          value={profile?.primary_goal ? GOAL_LABELS[profile.primary_goal] : 'Not set'}
          onPress={() => setEditing('goal')}
        />
        <Row
          label="Experience"
          value={
            profile?.experience_level ? EXPERIENCE_LABELS[profile.experience_level] : 'Not set'
          }
          onPress={() => setEditing('experience')}
          last
        />
      </Section>

      <Section label="Units">
        <Row
          label="Weight"
          value={profile?.preferred_unit ?? 'lbs'}
          onPress={() => setEditing('weightUnit')}
        />
        <Row
          label="Distance"
          value={profile?.distance_unit === 'km' ? 'Kilometers' : 'Miles'}
          onPress={() => setEditing('distanceUnit')}
          last
        />
      </Section>

      <Section label="Privacy">
        <Row
          label="Account"
          value={profile?.is_public === false ? 'Private' : 'Public'}
          onPress={() => setEditing('privacy')}
          last
        />
      </Section>

      <Section label="Other">
        <Row
          label="Heard about us via"
          value={
            profile?.referral_source
              ? REFERRAL_LABELS[profile.referral_source] ?? profile.referral_source
              : 'Not set'
          }
          onPress={() => setEditing('referral')}
          last
        />
      </Section>

      <EditSheet
        visible={editing === 'gender'}
        title="Gender"
        onClose={() => setEditing(null)}
      >
        <OptionList
          value={profile?.gender ?? null}
          onChange={async (gender) => {
            setEditing(null);
            await updateProfile({ gender });
          }}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </EditSheet>

      <EditSheet
        visible={editing === 'goal'}
        title="Primary goal"
        onClose={() => setEditing(null)}
      >
        <OptionList
          value={profile?.primary_goal ?? null}
          onChange={async (primary_goal) => {
            setEditing(null);
            await updateProfile({ primary_goal });
          }}
          options={[
            { value: 'build_muscle', label: 'Build muscle' },
            { value: 'gain_strength', label: 'Gain strength' },
            { value: 'fat_loss', label: 'Fat loss' },
          ]}
        />
      </EditSheet>

      <EditSheet
        visible={editing === 'experience'}
        title="Experience"
        onClose={() => setEditing(null)}
      >
        <OptionList
          value={profile?.experience_level ?? null}
          onChange={async (experience_level) => {
            setEditing(null);
            await updateProfile({ experience_level });
          }}
          options={[
            { value: 'beginner', label: 'Beginner', description: '0 – 1 year of consistent training.' },
            { value: 'intermediate', label: 'Intermediate', description: '1 – 3 years of consistent training.' },
            { value: 'advanced', label: 'Advanced', description: '3+ years of consistent training.' },
          ]}
        />
      </EditSheet>

      <EditSheet
        visible={editing === 'weightUnit'}
        title="Weight unit"
        onClose={() => setEditing(null)}
      >
        <SegmentedToggle
          options={[
            { label: 'lbs', value: 'lbs' },
            { label: 'kg', value: 'kg' },
          ]}
          value={(profile?.preferred_unit ?? 'lbs') as WeightUnit}
          onChange={async (preferred_unit) => {
            setEditing(null);
            await updateProfile({ preferred_unit });
          }}
        />
      </EditSheet>

      <EditSheet
        visible={editing === 'distanceUnit'}
        title="Distance unit"
        onClose={() => setEditing(null)}
      >
        <SegmentedToggle
          options={[
            { label: 'Miles', value: 'mi' },
            { label: 'Kilometers', value: 'km' },
          ]}
          value={(profile?.distance_unit ?? 'mi') as DistanceUnit}
          onChange={async (distance_unit) => {
            setEditing(null);
            await updateProfile({ distance_unit });
          }}
        />
      </EditSheet>

      <EditSheet
        visible={editing === 'referral'}
        title="How did you hear about us?"
        onClose={() => setEditing(null)}
      >
        <OptionList
          value={profile?.referral_source ?? null}
          onChange={async (referral_source) => {
            setEditing(null);
            await updateProfile({ referral_source });
          }}
          options={REFERRAL_OPTIONS}
        />
      </EditSheet>

      <EditSheet
        visible={editing === 'privacy'}
        title="Account privacy"
        onClose={() => setEditing(null)}
      >
        <SegmentedToggle
          options={[
            { label: 'Public', value: 'public' },
            { label: 'Private', value: 'private' },
          ]}
          value={profile?.is_public === false ? 'private' : 'public'}
          onChange={async (value) => {
            setEditing(null);
            await updateProfile({ is_public: value === 'public' });
          }}
        />
        <Text className="mt-4 text-[13px] leading-5 text-muted">
          When public, anyone who visits your profile can see your streak,
          consistency tracker, weekly focus, records and workouts. When
          private, they see only your name and photo.
        </Text>
      </EditSheet>

      <BirthdayEditor
        visible={editing === 'birthday'}
        initial={profile?.birthday ?? null}
        onClose={() => setEditing(null)}
        onSave={async (iso) => {
          setEditing(null);
          await updateProfile({ birthday: iso });
        }}
      />

      <HeightEditor
        visible={editing === 'height'}
        initialCm={profile?.height_cm ?? null}
        unit={heightUnit}
        onUnitChange={setHeightUnit}
        onClose={() => setEditing(null)}
        onSave={async (cm) => {
          setEditing(null);
          await updateProfile({ height_cm: cm });
        }}
      />
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="px-5 pt-7">
      <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <View
      className={`flex-row items-center py-3.5 ${last ? '' : 'border-b border-white/5'}`}
    >
      <Text className="flex-1 text-[15px] text-muted">{label}</Text>
      <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
        {value}
      </Text>
      {onPress ? (
        <ChevronRight size={18} color="#8B98A9" strokeWidth={2} style={{ marginLeft: 6 }} />
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      {content}
    </Pressable>
  );
}

function EditSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl bg-surface px-5 pt-4 pb-8"
        >
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-white/15" />
          </View>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8} className="active:opacity-70">
              <X size={20} color="#8B98A9" strokeWidth={2} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BirthdayEditor({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: string | null;
  onClose: () => void;
  onSave: (iso: string) => Promise<void>;
}) {
  const initialDate = useMemo(() => {
    if (initial) {
      const [y, m, d] = initial.split('-').map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() - 25);
    return fallback;
  }, [initial]);

  const [draft, setDraft] = useState<Date>(initialDate);

  useEffect(() => {
    if (visible) setDraft(initialDate);
  }, [visible, initialDate]);

  const maximumDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 10);
    return d;
  }, []);
  const minimumDate = useMemo(() => new Date(1925, 0, 1), []);

  function handleChange(_e: DateTimePickerEvent, date?: Date) {
    if (date) setDraft(date);
  }

  async function handleSave() {
    const iso = `${draft.getFullYear()}-${String(draft.getMonth() + 1).padStart(2, '0')}-${String(
      draft.getDate()
    ).padStart(2, '0')}`;
    await onSave(iso);
  }

  return (
    <EditSheet visible={visible} title="Birthday" onClose={onClose}>
      <DateTimePicker
        value={draft}
        mode="date"
        display="spinner"
        onChange={handleChange}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        themeVariant="dark"
        textColor={Platform.OS === 'ios' ? '#FFFFFF' : undefined}
        style={{ alignSelf: 'stretch', backgroundColor: 'transparent' }}
      />
      <Pressable
        className="mt-4 items-center rounded-2xl bg-primary py-3.5 active:opacity-80"
        onPress={handleSave}
      >
        <Text className="text-[15px] font-bold text-background">Save</Text>
      </Pressable>
    </EditSheet>
  );
}

const CM_MIN = 120;
const CM_MAX = 230;
const FT_MIN = 4;
const FT_MAX = 7;
const PICKER_ITEM_STYLE = { color: '#FFFFFF', fontSize: 22 } as const;

function HeightEditor({
  visible,
  initialCm,
  unit,
  onUnitChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialCm: number | null;
  unit: 'cm' | 'ft';
  onUnitChange: (u: 'cm' | 'ft') => void;
  onClose: () => void;
  onSave: (cm: number) => Promise<void>;
}) {
  const [draftCm, setDraftCm] = useState<number>(initialCm ?? 175);

  useEffect(() => {
    if (visible) setDraftCm(initialCm ?? 175);
  }, [visible, initialCm]);

  const totalInches = Math.round(draftCm / 2.54);
  const feet = Math.max(FT_MIN, Math.min(FT_MAX, Math.floor(totalInches / 12)));
  const inches = Math.max(0, Math.min(11, totalInches - feet * 12));

  const cmValues = useMemo(() => {
    const items: number[] = [];
    for (let v = CM_MIN; v <= CM_MAX; v++) items.push(v);
    return items;
  }, []);
  const feetValues = useMemo(() => {
    const items: number[] = [];
    for (let v = FT_MIN; v <= FT_MAX; v++) items.push(v);
    return items;
  }, []);
  const inchValues = useMemo(() => {
    const items: number[] = [];
    for (let v = 0; v < 12; v++) items.push(v);
    return items;
  }, []);

  function setFeetInches(nextFeet: number, nextInches: number) {
    setDraftCm(Math.round((nextFeet * 12 + nextInches) * 2.54));
  }

  return (
    <EditSheet visible={visible} title="Height" onClose={onClose}>
      <View className="gap-6">
        <SegmentedToggle
          options={[
            { label: 'ft / in', value: 'ft' },
            { label: 'cm', value: 'cm' },
          ]}
          value={unit}
          onChange={onUnitChange}
        />

        <View className="items-center">
          <Text
            className="text-white"
            style={{
              fontSize: 48,
              fontWeight: '800',
              letterSpacing: -1.5,
              fontVariant: ['tabular-nums'],
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {unit === 'cm' ? `${draftCm} cm` : `${feet}' ${inches}"`}
          </Text>
        </View>

        {unit === 'cm' ? (
          <Picker
            selectedValue={draftCm}
            onValueChange={(v) => setDraftCm(Number(v))}
            itemStyle={PICKER_ITEM_STYLE}
          >
            {cmValues.map((v) => (
              <Picker.Item key={v} label={`${v} cm`} value={v} color="#FFFFFF" />
            ))}
          </Picker>
        ) : (
          <View className="flex-row">
            <View className="flex-1">
              <Picker
                selectedValue={feet}
                onValueChange={(v) => setFeetInches(Number(v), inches)}
                itemStyle={PICKER_ITEM_STYLE}
              >
                {feetValues.map((v) => (
                  <Picker.Item key={v} label={`${v} ft`} value={v} color="#FFFFFF" />
                ))}
              </Picker>
            </View>
            <View className="flex-1">
              <Picker
                selectedValue={inches}
                onValueChange={(v) => setFeetInches(feet, Number(v))}
                itemStyle={PICKER_ITEM_STYLE}
              >
                {inchValues.map((v) => (
                  <Picker.Item key={v} label={`${v} in`} value={v} color="#FFFFFF" />
                ))}
              </Picker>
            </View>
          </View>
        )}

        <Pressable
          className="items-center rounded-2xl bg-primary py-3.5 active:opacity-80"
          onPress={() => onSave(draftCm)}
        >
          <Text className="text-[15px] font-bold text-background">Save</Text>
        </Pressable>
      </View>
    </EditSheet>
  );
}
