import { router } from 'expo-router';
import { Check, ChevronDown, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { KovaLogo } from '@/components/KovaLogo';
import { ProBadge } from '@/components/ProBadge';
import { usePremium } from '@/providers/PremiumProvider';

export type Range = '3m' | '1y' | 'all';

export const RANGE_LABELS: Record<Range, string> = {
  '3m': '3 months',
  '1y': '1 year',
  all: 'All time',
};
export const RANGE_SHORT: Record<Range, string> = {
  '3m': '3M',
  '1y': '1Y',
  all: 'All',
};
export const RANGE_OPTIONS: Range[] = ['3m', '1y', 'all'];
export const PREMIUM_RANGES: Range[] = ['1y', 'all'];

/** Days back from today. `null` means "no cutoff — all data". */
export function rangeCutoff(range: Range): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - (range === '3m' ? 90 : 365));
  return d;
}

/**
 * Pill button that opens a small modal letting the user pick a time range.
 * Locked ranges (Pro-only) show a Lock icon and route to the paywall on tap
 * instead of selecting.
 */
export function RangePicker({
  value,
  onChange,
}: {
  value: Range;
  onChange: (next: Range) => void;
}) {
  const { isPremium } = usePremium();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        className="flex-row items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 active:opacity-70"
      >
        <Text className="text-xs font-semibold text-muted">{RANGE_SHORT[value]}</Text>
        <ChevronDown size={12} color="#8B98A9" strokeWidth={2.5} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 px-10"
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-[280px] overflow-hidden rounded-2xl bg-surface"
          >
            <View className="border-b border-white/5 px-4 py-3">
              <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
                Range
              </Text>
            </View>
            {RANGE_OPTIONS.map((opt) => {
              const selected = opt === value;
              const locked = !isPremium && PREMIUM_RANGES.includes(opt);
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    setOpen(false);
                    if (locked) {
                      router.push('/paywall');
                      return;
                    }
                    onChange(opt);
                  }}
                  className="flex-row items-center justify-between border-b border-white/5 px-4 py-3.5 active:opacity-70"
                >
                  <Text
                    className={`text-[15px] ${
                      selected ? 'font-bold text-primary' : locked ? 'text-muted' : 'text-white'
                    }`}
                  >
                    {RANGE_LABELS[opt]}
                  </Text>
                  {locked ? (
                    <View className="flex-row items-center gap-1.5">
                      <Lock size={12} color="#F59E0B" strokeWidth={2.5} />
                      <KovaLogo size={11} style={{ color: '#FFFFFF' }} />
                      <ProBadge />
                    </View>
                  ) : selected ? (
                    <Check size={16} color="#22C55E" strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
