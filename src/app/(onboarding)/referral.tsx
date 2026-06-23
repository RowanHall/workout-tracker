import { router } from 'expo-router';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OptionList } from '@/components/onboarding/OptionList';
import { useOnboarding } from '@/providers/OnboardingProvider';

const SOURCES: { value: string; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'ai_search', label: 'AI search (ChatGPT, Gemini, etc.)' },
  { value: 'influencer', label: 'Influencer / creator' },
  { value: 'google_search', label: 'Google search' },
  { value: 'app_store', label: 'App Store' },
  { value: 'friends_family', label: 'Friends or family' },
  { value: 'other', label: 'Other' },
];

export default function ReferralStep() {
  const { draft, update } = useOnboarding();

  return (
    <OnboardingLayout
      step={9}
      total={10}
      eyebrow="Step 9"
      title="How did you hear about us?"
      subtitle="It really does help us figure out where to put our time."
      primaryLabel="Continue"
      primaryDisabled={!draft.referralSource}
      onPrimary={() => router.push('/(onboarding)/welcome')}
    >
      <OptionList
        value={draft.referralSource}
        onChange={(referralSource) => update({ referralSource })}
        options={SOURCES}
      />
    </OnboardingLayout>
  );
}
