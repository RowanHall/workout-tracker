import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { NewExerciseModal } from '@/components/NewExerciseModal';
import { FREE_CUSTOM_EXERCISE_LIMIT } from '@/lib/limits';
import { matchesSearch } from '@/lib/search';
import { supabase } from '@/lib/supabase';
import type { Exercise, MuscleGroup } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { usePremium } from '@/providers/PremiumProvider';

// Real system Liquid Glass (iOS 26+) when supported; otherwise the expo-blur
// approximation below. Evaluated once at module scope, not per render.
const LIQUID_GLASS = isLiquidGlassAvailable();

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
];

function label(group: MuscleGroup): string {
  return group === 'full_body' ? 'full body' : group;
}

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const { session } = useAuth();
  const { isPremium } = usePremium();
  const userId = session?.user.id;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [setCounts, setSetCounts] = useState<Map<number, number>>(new Map());
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  // Measured height of the floating header so the list can scroll under it.
  const [headerHeight, setHeaderHeight] = useState(160);

  function handleCreatePress() {
    const customCount = exercises.filter((e) => e.is_custom).length;
    if (!isPremium && customCount >= FREE_CUSTOM_EXERCISE_LIMIT) {
      Alert.alert(
        'Custom exercise limit reached',
        `Free accounts can create up to ${FREE_CUSTOM_EXERCISE_LIMIT} custom exercises. Upgrade to Kova Pro for unlimited.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Go Pro', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    setCreating(true);
  }

  // A freshly created custom exercise is added to the workout/routine straight
  // away — no need to hunt for it in the list and select it again.
  function handleCreated(exercise: Exercise) {
    setCreating(false);
    onSelect(exercise);
    onClose();
  }

  useEffect(() => {
    if (!visible || !userId) return;
    supabase
      .from('exercises')
      .select('*')
      // Built-in library + the current user's own custom ones (RLS lets every
      // signed-in user read all exercises, but only the owner should see them).
      .or(`is_custom.eq.false,created_by.eq.${userId}`)
      .order('name')
      .then(({ data }) => setExercises((data as Exercise[]) ?? []));
    supabase
      .from('workout_sets')
      .select('exercise_id, workouts!inner (user_id, ended_at)')
      .eq('workouts.user_id', userId)
      .not('workouts.ended_at', 'is', null)
      .then(({ data }) => {
        const counts = new Map<number, number>();
        for (const row of (data ?? []) as unknown as { exercise_id: number }[]) {
          counts.set(row.exercise_id, (counts.get(row.exercise_id) ?? 0) + 1);
        }
        setSetCounts(counts);
      });
  }, [visible, userId]);

  const filtered = useMemo(() => {
    const matches = exercises.filter(
      (ex) =>
        (!group || ex.muscle_group === group) &&
        (!search || matchesSearch(ex.name, search))
    );
    // Used exercises bubble to the top by set count; everything else falls
    // through to alphabetical order.
    return matches.sort(
      (a, b) =>
        (setCounts.get(b.id) ?? 0) - (setCounts.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name)
    );
  }, [exercises, setCounts, search, group]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background">
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-4"
          // Rows scroll up under the floating header and dissolve into its blur.
          contentContainerStyle={{ paddingTop: headerHeight + 8, paddingBottom: 24 }}
          scrollIndicatorInsets={{ top: headerHeight }}
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center justify-between border-b border-white/5 py-3.5 active:opacity-70"
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text className="text-[15px] text-white">{item.name}</Text>
              <Text className="text-xs capitalize text-muted">
                {label(item.muscle_group)}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="mt-8 text-center text-muted">No exercises found</Text>
          }
        />

        {/* Floating frosted header — sits over the list so content scrolls
            *under* it and blurs out on a fast, smooth ramp instead of being
            clipped at a hard edge. */}
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <HeaderBlur />
          <View className="px-4 pb-2 pt-4">
            <View className="mb-3 flex-row items-center justify-between">
              <GlassButton label="Create" color="#F59E0B" onPress={handleCreatePress} />
              <Text className="text-base font-semibold text-white">Add Exercise</Text>
              <GlassButton label="Done" color="#22C55E" onPress={onClose} />
            </View>

            <TextInput
              className="mb-3 rounded-xl bg-surface-2 px-4 py-3 text-base text-white"
              placeholder="Search exercises…"
              placeholderTextColor="#8B98A9"
              value={search}
              onChangeText={setSearch}
            />

            <View>
              <Pressable
                className="flex-row items-center justify-between rounded-full bg-surface-2 px-4 py-2.5 active:opacity-70"
                onPress={() => setFilterOpen((o) => !o)}
              >
                <Text
                  className={`text-[13px] capitalize ${
                    group ? 'font-semibold text-white' : 'text-muted'
                  }`}
                >
                  {group ? label(group) : 'All muscle groups'}
                </Text>
                {filterOpen ? (
                  <ChevronUp size={16} color="#8B98A9" strokeWidth={2} />
                ) : (
                  <ChevronDown size={16} color="#8B98A9" strokeWidth={2} />
                )}
              </Pressable>

              {filterOpen && (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  <Pressable
                    className={`rounded-full px-3.5 py-1.5 ${
                      !group ? 'bg-primary' : 'bg-surface-2'
                    }`}
                    onPress={() => {
                      setGroup(null);
                      setFilterOpen(false);
                    }}
                  >
                    <Text
                      className={`text-[13px] ${
                        !group ? 'font-semibold text-background' : 'text-muted'
                      }`}
                    >
                      All
                    </Text>
                  </Pressable>
                  {MUSCLE_GROUPS.map((mg) => {
                    const active = group === mg;
                    return (
                      <Pressable
                        key={mg}
                        className={`rounded-full px-3.5 py-1.5 ${
                          active ? 'bg-primary' : 'bg-surface-2'
                        }`}
                        onPress={() => {
                          setGroup(active ? null : mg);
                          setFilterOpen(false);
                        }}
                      >
                        <Text
                          className={`text-[13px] capitalize ${
                            active ? 'font-semibold text-background' : 'text-muted'
                          }`}
                        >
                          {label(mg)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>

        <NewExerciseModal
          visible={creating}
          userId={userId}
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
        />
      </View>
    </Modal>
  );
}

/**
 * The picker's frosted header band. Same feathered no-hard-line approach as the
 * shared nav header (`blurHeader.tsx`) but tuned to blur *harder and faster*:
 * a higher-intensity BlurView and a heavier dark tint that both hold strong,
 * then feather to zero over the bottom of the band — extended ~28px past the
 * controls so the ramp lands in the gap above the first row, not on the
 * controls. No hard seam where blur meets the sharp list below.
 */
function HeaderBlur() {
  return (
    <View style={[StyleSheet.absoluteFill, { bottom: -28 }]} pointerEvents="none">
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            style={StyleSheet.absoluteFill}
            colors={['#000', '#000', 'transparent']}
            locations={[0, 0.62, 1]}
          />
        }
      >
        <BlurView tint="dark" intensity={94} style={StyleSheet.absoluteFill} />
      </MaskedView>
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['rgba(11,15,20,0.9)', 'rgba(11,15,20,0.82)', 'rgba(11,15,20,0)']}
        locations={[0, 0.62, 1]}
      />
    </View>
  );
}

/**
 * Small floating glass action button for the picker header (Create / Done).
 * Mirrors the app's Liquid Glass pattern: real system glass on iOS 26+, a
 * frosted BlurView + sheen fallback elsewhere. The label carries the accent
 * colour; the capsule itself stays neutral so glass reads through it.
 */
function GlassButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  const content = (
    <View className="px-4 py-1.5">
      <Text className="text-[15px] font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );

  if (LIQUID_GLASS) {
    return (
      <View style={styles.shadow} className="rounded-full">
        <Pressable className="active:opacity-80" onPress={onPress} hitSlop={6}>
          <GlassView glassEffectStyle="regular" isInteractive style={styles.capsule}>
            {content}
          </GlassView>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.shadow} className="rounded-full">
      <Pressable
        className="overflow-hidden rounded-full border border-white/20 active:opacity-80"
        onPress={onPress}
        hitSlop={6}
      >
        <BlurView
          tint="systemUltraThinMaterialDark"
          intensity={60}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {content}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  capsule: {
    borderRadius: 999,
    overflow: 'hidden',
  },
});
