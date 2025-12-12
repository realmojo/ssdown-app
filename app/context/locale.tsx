import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import jp from "../locales/jp.json";
import ko from "../locales/ko.json";
import pt from "../locales/pt.json";
import vi from "../locales/vi.json";

export type LanguageCode = "en" | "ko" | "pt" | "jp" | "fr" | "vi" | "es";

type LocaleContextValue = {
  language: LanguageCode | null;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string) => string;
  loaded: boolean;
};

const STORAGE_KEY = "app_language";

const dictionaries: Record<LanguageCode, any> = {
  en,
  ko,
  pt,
  jp,
  fr,
  vi,
  es,
};

const LocaleContext = createContext<LocaleContextValue>({
  language: null,
  setLanguage: async () => {},
  t: (key: string) => key,
  loaded: false,
});

function getValue(obj: any, path: string): string | undefined {
  return path.split(".").reduce<any>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return acc[part];
    }
    return undefined;
  }, obj);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "en" || stored === "ko") {
          setLanguageState(stored);
        }
      } catch (error) {
        console.warn("Failed to load language:", error);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      console.warn("Failed to save language:", error);
    }
  };

  const t = (key: string) => {
    const dict = dictionaries[language ?? "en"] || dictionaries.en;
    const value = getValue(dict, key);
    if (typeof value === "string") return value;
    const fallback = getValue(dictionaries.en, key);
    return typeof fallback === "string" ? fallback : key;
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      loaded,
    }),
    [language, loaded]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
