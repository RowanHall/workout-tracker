import { Check } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useHeaderInset } from '@/lib/blurHeader';
import { LOCALES, type LocaleCode } from '@/lib/i18n';
import { useLanguage } from '@/providers/LanguageProvider';

export default function LanguageSettingsScreen() {
  const { locale, setLocale, t } = useLanguage();
  const headerInset = useHeaderInset();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: headerInset, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pt-6">
        <Text className="text-sm text-muted">{t('language.intro')}</Text>
      </View>

      <View className="px-5 pt-7">
        <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
          {t('language.title')}
        </Text>
        {LOCALES.map((opt, i) => (
          <LanguageRow
            key={opt.code}
            code={opt.code}
            name={opt.name}
            english={opt.english}
            selected={opt.code === locale}
            onPress={() => setLocale(opt.code)}
            last={i === LOCALES.length - 1}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function LanguageRow({
  code,
  name,
  english,
  selected,
  onPress,
  last,
}: {
  code: LocaleCode;
  name: string;
  english: string;
  selected: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  const showEnglish = name !== english;
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center py-3.5 active:opacity-70 ${
        last ? '' : 'border-b border-white/5'
      }`}
    >
      <View className="flex-1">
        <Text className="text-[15px] text-white">{name}</Text>
        {showEnglish && (
          <Text className="mt-0.5 text-xs text-muted">{english}</Text>
        )}
      </View>
      {code === 'en' && !selected && (
        <Text className="mr-2 text-[11px] font-bold uppercase tracking-[1.5px] text-muted/70">
          Default
        </Text>
      )}
      {selected ? (
        <Check size={18} color="#22C55E" strokeWidth={2.5} />
      ) : (
        <View className="h-[18px] w-[18px]" />
      )}
    </Pressable>
  );
}
