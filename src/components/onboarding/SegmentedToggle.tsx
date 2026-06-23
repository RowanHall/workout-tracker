import { Pressable, Text, View } from 'react-native';

interface SegmentedToggleProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: SegmentedToggleProps<T>) {
  return (
    <View className="flex-row rounded-full bg-surface-2 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center rounded-full py-2.5 ${
              active ? 'bg-primary' : ''
            }`}
          >
            <Text
              className={`text-[13px] font-bold uppercase tracking-[2px] ${
                active ? 'text-background' : 'text-muted'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
