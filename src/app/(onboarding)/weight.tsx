import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { RulerSlider } from '@/components/onboarding/RulerSlider';
import { SegmentedToggle } from '@/components/onboarding/SegmentedToggle';
import { useOnboarding, type WeightUnit } from '@/providers/OnboardingProvider';

const DEFAULT_LBS = 170;
const DEFAULT_KG = 77;

// Body-weight ranges that cover the realistic adult population.
const LBS_MIN = 70;
const LBS_MAX = 450;
const KG_MIN = 32;
const KG_MAX = 205;

export default function WeightStep() {
  const { draft, update } = useOnboarding();

  const unit = draft.weightUnit;
  const { min, max } = unit === 'lbs' ? { min: LBS_MIN, max: LBS_MAX } : { min: KG_MIN, max: KG_MAX };
  const value = draft.bodyWeight ?? (unit === 'lbs' ? DEFAULT_LBS : DEFAULT_KG);

  function setUnit(next: WeightUnit) {
    if (next === unit) return;
    // Convert the current displayed value into the new unit so the slider
    // doesn't jump to defaults.
    let converted = value;
    if (next === 'kg' && unit === 'lbs') converted = value / 2.20462;
    if (next === 'lbs' && unit === 'kg') converted = value * 2.20462;
    update({
      weightUnit: next,
      bodyWeight: Math.round(converted * 10) / 10,
    });
  }

  return (
    <OnboardingLayout
      step={4}
      total={10}
      eyebrow="Step 4"
      title="What is your weight?"
      subtitle="Drag to adjust to the nearest tenth."
      primaryLabel="Continue"
      onPrimary={() => {
        if (draft.bodyWeight == null) update({ bodyWeight: value });
        router.push('/(onboarding)/height');
      }}
    >
      <View className="gap-10">
        <View>
          <SegmentedToggle
            options={[
              { label: 'lbs', value: 'lbs' },
              { label: 'kg', value: 'kg' },
            ]}
            value={unit}
            onChange={setUnit}
          />
        </View>

        <View className="items-center">
          <Text
            className="text-white"
            style={{
              fontSize: 72,
              fontWeight: '800',
              letterSpacing: -3,
              fontVariant: ['tabular-nums'],
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value.toFixed(1)}
            <Text className="text-2xl font-semibold text-muted"> {unit}</Text>
          </Text>
        </View>

        <RulerSlider
          min={min}
          max={max}
          step={0.1}
          value={value}
          onChange={(v) => update({ bodyWeight: v })}
        />
      </View>
    </OnboardingLayout>
  );
}
