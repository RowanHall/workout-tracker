import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_LOCALE, LOCALES, type LocaleCode } from './i18n';

const KEY = 'kova.locale.v1';

const VALID_CODES = new Set<LocaleCode>(LOCALES.map((l) => l.code));

export async function loadLocale(): Promise<LocaleCode> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw && VALID_CODES.has(raw as LocaleCode)) {
      return raw as LocaleCode;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_LOCALE;
}

export async function saveLocale(locale: LocaleCode): Promise<void> {
  await AsyncStorage.setItem(KEY, locale);
}
