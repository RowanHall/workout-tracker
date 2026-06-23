import { router } from 'expo-router';
import { Dumbbell, Flame, Zap } from 'lucide-react-native';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OptionList } from '@/components/onboarding/OptionList';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function GoalStep() {
  const { draft, update } = useOnboarding();

  return (
    <OnboardingLayout
      step={6}
      total={10}
      eyebrow="Step 6"
      title="What is your top goal?"
      subtitle="We'll tune defaults and recommendations toward this."
      primaryLabel="Continue"
      primaryDisabled={!draft.goal}
      onPrimary={() => router.push('/(onboarding)/experience')}
    >
      <OptionList
        value={draft.goal}
        onChange={(goal) => update({ goal })}
        options={[
          {
            value: 'build_muscle',
            label: 'Build muscle',
            description: 'Hypertrophy-leaning rep ranges and volume tracking.',
            icon: <Dumbbell size={22} color="#22C55E" strokeWidth={2} />,
          },
          {
            value: 'gain_strength',
            label: 'Gain strength',
            description: 'Heavier sets, longer rest, lower-rep PR focus.',
            icon: <Zap size={22} color="#22C55E" strokeWidth={2} />,
          },
          {
            value: 'fat_loss',
            label: 'Fat loss',
            description: 'Maintain muscle while in a deficit. Density-friendly.',
            icon: <Flame size={22} color="#22C55E" strokeWidth={2} />,
          },
        ]}
      />
    </OnboardingLayout>
  );
}
