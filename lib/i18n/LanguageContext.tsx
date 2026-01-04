"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import enLocale from "@/locales/en.json";
import heLocale from "@/locales/he.json";

export type Language = "en" | "he";

type TranslationDict = typeof enLocale;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  dir: "ltr" | "rtl";
}

const translations: Record<Language, TranslationDict> = {
  en: enLocale,
  he: heLocale,
};

const STORAGE_KEY = "munimap_language";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "he") {
      setLanguageState(stored);
    }
    setMounted(true);
  }, []);

  // Update document direction when language changes
  useEffect(() => {
    if (!mounted) return;
    
    const dir = language === "he" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    
    // Add/remove RTL class for additional styling hooks
    if (language === "he") {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [language, mounted]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[language];
      let value = getNestedValue(dict as unknown as Record<string, unknown>, key);

      // Fallback to English if key not found
      if (value === undefined) {
        value = getNestedValue(enLocale as unknown as Record<string, unknown>, key);
      }

      // If still not found, return the key itself
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }

      // Replace parameters like {count} with actual values
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          value = value!.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
        });
      }

      return value;
    },
    [language]
  );

  const isRTL = language === "he";
  const dir = isRTL ? "rtl" : "ltr";

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{
          language: "en",
          setLanguage,
          t: (key) => getNestedValue(enLocale as unknown as Record<string, unknown>, key) || key,
          isRTL: false,
          dir: "ltr",
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Utility hook for getting directional classNames
export function useDirectionalClass() {
  const { isRTL } = useLanguage();
  
  return {
    // Text alignment
    textStart: isRTL ? "text-right" : "text-left",
    textEnd: isRTL ? "text-left" : "text-right",
    
    // Margins and Paddings
    marginStart: (size: string) => isRTL ? `mr-${size}` : `ml-${size}`,
    marginEnd: (size: string) => isRTL ? `ml-${size}` : `mr-${size}`,
    paddingStart: (size: string) => isRTL ? `pr-${size}` : `pl-${size}`,
    paddingEnd: (size: string) => isRTL ? `pl-${size}` : `pr-${size}`,
    
    // Positioning
    start: isRTL ? "right" : "left",
    end: isRTL ? "left" : "right",
    insetStart: (size: string) => isRTL ? `right-${size}` : `left-${size}`,
    insetEnd: (size: string) => isRTL ? `left-${size}` : `right-${size}`,
    
    // Flex direction
    flexRowReverse: isRTL ? "flex-row-reverse" : "flex-row",
    
    // Border
    borderStart: (size: string) => isRTL ? `border-r-${size}` : `border-l-${size}`,
    borderEnd: (size: string) => isRTL ? `border-l-${size}` : `border-r-${size}`,
    
    // Transforms
    scaleX: isRTL ? "-scale-x-100" : "",
  };
}
