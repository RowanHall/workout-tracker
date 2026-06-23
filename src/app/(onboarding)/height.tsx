import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SegmentedToggle } from '@/components/onboarding/SegmentedToggle';
import { useOnboarding, type HeightUnit } from '@/providers/OnboardingProvider';

const DEFAULT_CM = 175;
const CM_MIN = 120;
const CM_MAX = 230;

const FT_MIN = 4;
const FT_MAX = 7;

const PICKER_ITEM_STYLE = { color: '#FFFFFF', fontSize: 22 } as const;

export default function HeightStep() {
  const { draft, update } = useOnboarding();

  const unit = draft.heightUnit;
  const heightCm = draft.heightCm ?? DEFAULT_CM;

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

  const totalInches = Math.round(heightCm / 2.54);
  const feet = Math.max(FT_MIN, Math.min(FT_MAX, Math.floor(totalInches / 12)));
  const inches = Math.max(0, Math.min(11, totalInches - feet * 12));

  function setCm(v: number) {
    update({ heightCm: v });
  }

  function setFeetInches(nextFeet: number, nextInches: number) {
    const cm = Math.round((nextFeet * 12 + nextInches) * 2.54);
    update({ heightCm: cm });
  }

  function setUnit(next: HeightUnit) {
    if (next === unit) return;
    if (draft.heightCm == null) update({ heightUnit: next, heightCm: DEFAULT_CM });
    else update({ heightUnit: next });
  }

  return (
    <OnboardingLayout
      step={5}
      total={10}
      eyebrow="Step 5"
      title="How tall are you?"
      primaryLabel="Continue"
      onPrimary={() => {
        if (draft.heightCm == null) update({ heightCm: DEFAULT_CM });
        router.push('/(onboarding)/goal');
      }}
    >
      <View className="gap-8">
        <SegmentedToggle
          options={[
            { label: 'ft / in', value: 'ft' },
            { label: 'cm', value: 'cm' },
          ]}
          value={unit}
          onChange={setUnit}
        />

        <View className="items-center">
          <Text
            className="text-white"
            style={{
              fontSize: 56,
              fontWeight: '800',
              letterSpacing: -2,
              fontVariant: ['tabular-nums'],
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {unit === 'cm' ? `${heightCm} cm` : `${feet}' ${inches}"`}
          </Text>
        </View>

        {unit === 'cm' ? (
          <Picker
            selectedValue={heightCm}
            onValueChange={(v) => setCm(Number(v))}
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
      </View>
    </OnboardingLayout>
  );
}
