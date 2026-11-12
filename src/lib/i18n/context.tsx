"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale, dictionaries, Dictionary } from "./dictionaries";

interface LanguageContextType {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "pharmacy_khata_locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    // Read persisted language preference from localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (saved === "en" || saved === "ur-ro" || saved === "ur")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // Dynamically adjust root html dir attribute
    if (typeof document !== "undefined") {
      document.documentElement.dir = newLocale === "ur" ? "rtl" : "ltr";
      document.documentElement.lang = newLocale === "ur" ? "ur" : "en";
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = locale === "ur" ? "rtl" : "ltr";
      document.documentElement.lang = locale === "ur" ? "ur" : "en";
    }
  }, [locale]);

  const dir = locale === "ur" ? "rtl" : "ltr";
  const isRtl = locale === "ur";
  const t = dictionaries[locale] || dictionaries.en;

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale, dir, isRtl }}>
      <div dir={dir} className={isRtl ? "font-urdu" : "font-sans"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
