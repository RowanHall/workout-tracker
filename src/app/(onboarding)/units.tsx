import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SegmentedToggle } from '@/components/onboarding/SegmentedToggle';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function UnitsStep() {
  const { draft, update } = useOnboarding();

  return (
    <OnboardingLayout
      step={1}
      total={10}
      eyebrow="Step 1"
      title="Which units do you use?"
      subtitle="You can change these later in settings."
      primaryLabel="Continue"
      onPrimary={() => router.push('/(onboarding)/gender')}
    >
      <View className="gap-7">
        <Row label="Weight">
          <SegmentedToggle
            options={[
              { label: 'lbs', value: 'lbs' },
              { label: 'kg', value: 'kg' },
            ]}
            value={draft.weightUnit}
            onChange={(weightUnit) => update({ weightUnit })}
          />
        </Row>
        <Row label="Distance">
          <SegmentedToggle
            options={[
              { label: 'Miles', value: 'mi' },
              { label: 'Kilometers', value: 'km' },
            ]}
            value={draft.distanceUnit}
            onChange={(distanceUnit) => update({ distanceUnit })}
          />
        </Row>
      </View>
    </OnboardingLayout>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}
