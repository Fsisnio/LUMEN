"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { CurrencyCode, LanguageCode } from "@/lib/locale";
import { formatCurrency as formatCurrencyFn } from "@/lib/locale";
import { t } from "@/lib/translations";

const STORAGE_KEY = "lumen-locale";

interface LocaleState {
  currency: CurrencyCode;
  language: LanguageCode;
}

const defaultState: LocaleState = {
  currency: "USD",
  language: "en",
};

interface LocaleContextValue extends LocaleState {
  setCurrency: (c: CurrencyCode) => void;
  setLanguage: (l: LanguageCode) => void;
  formatCurrency: (value: number, compact?: boolean) => string;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocaleState>(defaultState);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<LocaleState>;
        setState((s) => ({
          currency: parsed.currency ?? s.currency,
          language: parsed.language ?? s.language,
        }));
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [mounted, state]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = state.language;
    }
  }, [state.language]);

  const setCurrency = useCallback((currency: CurrencyCode) => {
    setState((s) => ({ ...s, currency }));
  }, []);

  const setLanguage = useCallback((language: LanguageCode) => {
    setState((s) => ({ ...s, language }));
  }, []);

  const formatCurrency = useCallback(
    (value: number, compact = false) => formatCurrencyFn(value, state.currency, compact),
    [state.currency]
  );

  const translate = useCallback(
    (key: string) => t(key, state.language),
    [state.language]
  );

  const value: LocaleContextValue = {
    ...state,
    setCurrency,
    setLanguage,
    formatCurrency,
    t: translate,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
