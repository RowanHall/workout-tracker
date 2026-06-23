import { router } from 'expo-router';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OptionList } from '@/components/onboarding/OptionList';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function ExperienceStep() {
  const { draft, update } = useOnboarding();

  return (
    <OnboardingLayout
      step={7}
      total={10}
      eyebrow="Step 7"
      title="How long have you been training?"
      subtitle="Helps us calibrate strength benchmarks to your level."
      primaryLabel="Continue"
      primaryDisabled={!draft.experience}
      onPrimary={() => router.push('/(onboarding)/pro')}
    >
      <OptionList
        value={draft.experience}
        onChange={(experience) => update({ experience })}
        options={[
          {
            value: 'beginner',
            label: 'Beginner',
            description: '0 – 1 year of consistent training.',
          },
          {
            value: 'intermediate',
            label: 'Intermediate',
            description: '1 – 3 years of consistent training.',
          },
          {
            value: 'advanced',
            label: 'Advanced',
            description: '3+ years of consistent training.',
          },
        ]}
      />
    </OnboardingLayout>
  );
}
