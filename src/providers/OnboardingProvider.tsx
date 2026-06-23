import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

export type WeightUnit = 'lbs' | 'kg';
export type DistanceUnit = 'mi' | 'km';
export type HeightUnit = 'cm' | 'ft';
export type Gender = 'male' | 'female' | 'other';
export type Goal = 'build_muscle' | 'gain_strength' | 'fat_loss';
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export interface OnboardingDraft {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  heightUnit: HeightUnit;
  gender: Gender | null;
  birthday: { year: number; month: number; day: number } | null;
  bodyWeight: number | null; // stored in the unit the user picked
  heightCm: number | null; // canonical
  goal: Goal | null;
  experience: Experience | null;
  referralSource: string | null;
}

interface OnboardingContextValue {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
}

const DEFAULT_DRAFT: OnboardingDraft = {
  weightUnit: 'lbs',
  distanceUnit: 'mi',
  heightUnit: 'ft',
  gender: null,
  birthday: null,
  bodyWeight: null,
  heightCm: null,
  goal: null,
  experience: null,
  referralSource: null,
};

const OnboardingContext = createContext<OnboardingContextValue>({
  draft: DEFAULT_DRAFT,
  update: () => {},
  reset: () => {},
});

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<OnboardingDraft>(DEFAULT_DRAFT);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      draft,
      update: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
      reset: () => setDraft(DEFAULT_DRAFT),
    }),
    [draft]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
