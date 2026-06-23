import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export interface OptionItem<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface OptionListProps<T extends string> {
  options: OptionItem<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function OptionList<T extends string>({
  options,
  value,
  onChange,
}: OptionListProps<T>) {
  return (
    <View className="gap-3">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-row items-center rounded-2xl border p-4 ${
              active ? 'border-primary bg-primary/10' : 'border-white/10 bg-surface'
            }`}
          >
            {opt.icon ? <View className="mr-3">{opt.icon}</View> : null}
            <View className="flex-1">
              <Text
                className={`text-[16px] font-semibold ${
                  active ? 'text-white' : 'text-white'
                }`}
              >
                {opt.label}
              </Text>
              {opt.description ? (
                <Text className="mt-0.5 text-[13px] leading-5 text-muted">
                  {opt.description}
                </Text>
              ) : null}
            </View>
            <View
              className={`ml-3 h-6 w-6 items-center justify-center rounded-full border ${
                active ? 'border-primary bg-primary' : 'border-white/20'
              }`}
            >
              {active ? <Check size={14} color="#0B0F14" strokeWidth={3} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
