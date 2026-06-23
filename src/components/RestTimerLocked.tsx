import { router } from 'expo-router';
import { Lock, Timer } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface Props {
  /** Bumped by the parent each time a set is logged — mirrors RestTimer's lifecycle. */
  trigger: number;
  /** How long the teaser stays visible before fading out, matching a real rest period. */
  displaySeconds?: number;
}

/** Locked stand-in for {@link RestTimer} shown to non-Pro users. Appears in the
 *  same slot, with the same trigger lifecycle, so users discover the feature
 *  exactly when they'd benefit from it — then it disappears so it never nags. */
export function RestTimerLocked({ trigger, displaySeconds = 90 }: Props) {
  const [visible, setVisible] = useState(false);
  const mountTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger === mountTrigger.current) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), displaySeconds * 1000);
    return () => clearTimeout(id);
  }, [trigger, displaySeconds]);

  if (!visible) return null;

  return (
    <Pressable
      className="flex-row items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 active:opacity-80"
      onPress={() => router.push('/paywall')}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent/20">
          <Timer size={18} color="#F59E0B" strokeWidth={2} />
        </View>
        <View>
          <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
            Rest timer
          </Text>
          <Text className="mt-0.5 text-sm font-semibold text-white">
            Auto-rest is a Pro feature
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-1.5 rounded-md bg-accent px-2 py-1">
        <Lock size={11} color="#0B0F14" strokeWidth={2.75} />
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-background">
          Pro
        </Text>
      </View>
    </Pressable>
  );
}
