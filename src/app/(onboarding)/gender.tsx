import { router } from 'expo-router';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OptionList } from '@/components/onboarding/OptionList';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function GenderStep() {
  const { draft, update } = useOnboarding();

  return (
    <OnboardingLayout
      step={2}
      total={10}
      eyebrow="Step 2"
      title="What is your gender?"
      subtitle="Used to calibrate strength benchmarks and calorie estimates."
      primaryLabel="Continue"
      primaryDisabled={!draft.gender}
      onPrimary={() => router.push('/(onboarding)/birthday')}
    >
      <OptionList
        value={draft.gender}
        onChange={(gender) => update({ gender })}
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
        ]}
      />
    </OnboardingLayout>
  );
}
