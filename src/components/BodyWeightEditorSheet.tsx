import { X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

import { RulerSlider } from '@/components/onboarding/RulerSlider';
import { dateKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const LB_PER_KG = 2.20462;

// Body-weight ranges that cover the realistic adult population, mirroring the
// onboarding weight step.
const LBS_MIN = 70;
const LBS_MAX = 450;
const KG_MIN = 32;
const KG_MAX = 205;
const DEFAULT_LBS = 170;
const DEFAULT_KG = 77;

/**
 * Bottom-sheet body-weight logger: a ruler slider (in the user's preferred
 * unit) to log — or overwrite — today's weight. Stored values are always lbs;
 * we convert for display. Shared by the profile trend card and settings hub.
 */
export function BodyWeightEditorSheet({
  visible,
  onClose,
  userId,
  latestLbs,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string | undefined;
  latestLbs: number | null;
  onSaved?: () => void;
}) {
  const { profile } = useAuth();
  const unit = profile?.preferred_unit ?? 'lbs';

  const toDisplay = useCallback(
    (lbs: number) => Math.round((unit === 'kg' ? lbs / LB_PER_KG : lbs) * 10) / 10,
    [unit]
  );
  const toLbs = useCallback((v: number) => (unit === 'kg' ? v * LB_PER_KG : v), [unit]);

  const { min, max } = unit === 'kg' ? { min: KG_MIN, max: KG_MAX } : { min: LBS_MIN, max: LBS_MAX };

  const [draft, setDraft] = useState(unit === 'kg' ? DEFAULT_KG : DEFAULT_LBS);
  const [saving, setSaving] = useState(false);

  // Seed the draft from the latest logged weight each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraft(latestLbs !== null ? toDisplay(latestLbs) : unit === 'kg' ? DEFAULT_KG : DEFAULT_LBS);
    }
  }, [visible, latestLbs, toDisplay, unit]);

  async function handleSave() {
    if (!userId) return;
    const w = toLbs(draft);
    if (Number.isNaN(w) || w <= 0 || w >= 2000) {
      Alert.alert('Invalid weight', `Enter your body weight in ${unit}.`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('body_weights').upsert(
        {
          user_id: userId,
          recorded_on: dateKey(new Date()),
          weight: Math.round(w * 100) / 100,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,recorded_on' }
      );
      if (error) throw error;
      onClose();
      onSaved?.();
    } catch (err: any) {
      Alert.alert('Could not log weight', err.message);
    } finally {
      setSaving(false);
    }
  }

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
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
              {latestLbs !== null ? 'Update body weight' : 'Log body weight'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8} className="active:opacity-70">
              <X size={20} color="#8B98A9" strokeWidth={2} />
            </Pressable>
          </View>

          <View className="items-center">
            <Text
              className="text-white"
              style={{
                fontSize: 64,
                fontWeight: '800',
                letterSpacing: -2.5,
                fontVariant: ['tabular-nums'],
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {draft.toFixed(1)}
              <Text className="text-2xl font-semibold text-muted"> {unit}</Text>
            </Text>
          </View>

          <View className="mt-6 mb-6">
            <RulerSlider min={min} max={max} step={0.1} value={draft} onChange={setDraft} />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="items-center rounded-2xl bg-primary py-4 active:opacity-80 disabled:opacity-40"
          >
            <Text className="text-base font-bold text-background">
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
