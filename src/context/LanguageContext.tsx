import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { translations, AVAILABLE_LANGUAGES, type Language, type TranslationSchema } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationSchema;
  availableLanguages: typeof AVAILABLE_LANGUAGES;
  currentLanguageMeta: (typeof AVAILABLE_LANGUAGES)[number];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'wcg_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (saved && (saved === 'vi' || saved === 'en' || saved === 'zh' || saved === 'th')) {
        return saved;
      }
    }
    return 'vi'; // Default to Vietnamese
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
      window.dispatchEvent(new CustomEvent('wcg_language_changed', { detail: newLang }));
    } catch {}
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY && e.newValue) {
        const nextLang = e.newValue as Language;
        if (nextLang === 'vi' || nextLang === 'en' || nextLang === 'zh' || nextLang === 'th') {
          setLanguageState(nextLang);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [language]);

  const currentLanguageMeta = useMemo(() => {
    return AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];
  }, [language]);

  const t = useMemo(() => {
    return translations[language] || translations.vi;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      availableLanguages: AVAILABLE_LANGUAGES,
      currentLanguageMeta,
    }),
    [language, t, currentLanguageMeta]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: 'vi',
      setLanguage: () => {},
      t: translations.vi,
      availableLanguages: AVAILABLE_LANGUAGES,
      currentLanguageMeta: AVAILABLE_LANGUAGES[0],
    };
  }
  return context;
};
