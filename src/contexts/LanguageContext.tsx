import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import enLocale from '@/locales/en.json';
import urLocale from '@/locales/ur.json';
import arLocale from '@/locales/ar.json';
import trLocale from '@/locales/tr.json';
import idLocale from '@/locales/id.json';
import msLocale from '@/locales/ms.json';
import taLocale from '@/locales/ta.json';
import bnLocale from '@/locales/bn.json';

export type Language = 'en' | 'ur' | 'ar' | 'tr' | 'id' | 'ms' | 'ta' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  direction: 'ltr' | 'rtl';
}

export const LANGUAGE_OPTIONS: {
  code: Language;
  labelKey: string;
  nativeLabel: string;
}[] = [
  { code: 'en', labelKey: 'language.english', nativeLabel: 'English' },
  { code: 'ur', labelKey: 'language.urdu', nativeLabel: 'اردو' },
  { code: 'ar', labelKey: 'language.arabic', nativeLabel: 'العربية' },
  { code: 'tr', labelKey: 'language.turkish', nativeLabel: 'Türkçe' },
  { code: 'id', labelKey: 'language.indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'ms', labelKey: 'language.malay', nativeLabel: 'Bahasa Melayu' },
  { code: 'ta', labelKey: 'language.tamil', nativeLabel: 'தமிழ்' },
  { code: 'bn', labelKey: 'language.bengali', nativeLabel: 'বাংলা' },
];

const translations: Record<Language, Record<string, string>> = {
  en: enLocale,
  ur: urLocale,
  ar: arLocale,
  tr: trLocale,
  id: idLocale,
  ms: msLocale,
  ta: taLocale,
  bn: bnLocale,
};

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && value in translations;

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('barakah-language');
    return isLanguage(saved) ? saved : 'en';
  });

  const direction = language === 'ar' || language === 'ur' ? 'rtl' : 'ltr';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('barakah-language', lang);
  };

  const value = useMemo<LanguageContextType>(() => {
    const t = (key: string): string =>
      translations[language]?.[key] || translations.en[key] || key;

    return { language, setLanguage, t, direction };
  }, [direction, language]);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [language, direction]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: string) => translations.en[key] || key,
      direction: 'ltr' as const,
    };
  }
  return context;
};
