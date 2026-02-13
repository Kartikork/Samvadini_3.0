import { en } from './en';
import { hi } from './hi';

const languages = {
  en,
  hi,
} as const;

export type LanguageCode = keyof typeof languages;

export type AppTranslations = (typeof languages)[LanguageCode];

export function getAppTranslations(lang: string): AppTranslations {
  const code = (lang as LanguageCode) in languages ? (lang as LanguageCode) : 'en';
  return languages[code];
}

