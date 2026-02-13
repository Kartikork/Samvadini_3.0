import { en } from './en';
import { hi } from './hi';
import { sa } from './sa';
import { ta } from './ta';
import { te } from './te';
import { kn } from './kn';
import { bn } from './bn';
import { gu } from './gu';

const languages = {
  en,
  hi,
  sa,
  ta,
  te,
  kn,
  bn,
  gu,
} as const;

export type LanguageCode = keyof typeof languages;

export type AppTranslations = (typeof languages)[LanguageCode];

export function getAppTranslations(lang: string): AppTranslations {
  const code = (lang as LanguageCode) in languages ? (lang as LanguageCode) : 'en';
  return languages[code];
}

