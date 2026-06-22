import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, Vibration, View } from 'react-native';

interface RestTimerProps {
  /** Bumped by the parent each time a set is logged to restart the timer. */
  trigger: number;
  defaultSeconds?: number;
}

export function RestTimer({ trigger, defaultSeconds = 90 }: RestTimerProps) {
  const [remaining, setRemaining] = useState(0);
  // Whatever value `trigger` has at mount is "the past" — the user hasn't
  // logged a set in this session yet, so don't start the timer. Only kick it
  // off when the parent actually bumps the trigger after mount.
  const mountTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger !== mountTrigger.current) setRemaining(defaultSeconds);
  }, [trigger, defaultSeconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          Vibration.vibrate(500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [remaining > 0]);

  if (remaining <= 0) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-primary-dim bg-surface-2 px-5 py-3">
      <View>
        <Text className="text-xs font-semibold uppercase text-muted">Rest</Text>
        <Text className="text-2xl font-bold text-primary">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Pressable
          className="rounded-lg bg-surface px-4 py-2 active:opacity-70"
          onPress={() => setRemaining((prev) => prev + 30)}
        >
          <Text className="font-semibold text-white">+30s</Text>
        </Pressable>
        <Pressable
          className="rounded-lg bg-surface px-4 py-2 active:opacity-70"
          onPress={() => setRemaining(0)}
        >
          <Text className="font-semibold text-muted">Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}
