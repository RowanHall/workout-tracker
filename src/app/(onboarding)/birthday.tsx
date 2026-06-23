import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Platform, View } from 'react-native';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function BirthdayStep() {
  const { draft, update } = useOnboarding();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const defaultBirthday = useMemo(
    () => ({ year: currentYear - 25, month: 0, day: 1 }),
    [currentYear]
  );
  const birthday = draft.birthday ?? defaultBirthday;

  const value = useMemo(
    () => new Date(birthday.year, birthday.month, birthday.day),
    [birthday.year, birthday.month, birthday.day]
  );

  // Min age 10.
  const maximumDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 10);
    return d;
  }, []);
  const minimumDate = useMemo(() => new Date(1925, 0, 1), []);

  function handleChange(_e: DateTimePickerEvent, date?: Date) {
    if (!date) return;
    update({
      birthday: {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      },
    });
  }

  return (
    <OnboardingLayout
      step={3}
      total={10}
      eyebrow="Step 3"
      title="When is your birthday?"
      subtitle="Helps us tailor training experience and benchmarks."
      primaryLabel="Continue"
      primaryDisabled={!draft.birthday}
      onPrimary={() => {
        if (!draft.birthday) update({ birthday });
        router.push('/(onboarding)/weight');
      }}
    >
      <DateTimePicker
        value={value}
        mode="date"
        display="spinner"
        onChange={handleChange}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        themeVariant="dark"
        textColor={Platform.OS === 'ios' ? '#FFFFFF' : undefined}
        style={{ alignSelf: 'stretch', backgroundColor: 'transparent' }}
      />
    </OnboardingLayout>
  );
}
