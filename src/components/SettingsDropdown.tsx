"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, ChevronDown } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { CURRENCIES, LANGUAGES } from "@/lib/locale";
import type { CurrencyCode, LanguageCode } from "@/lib/locale";

export function SettingsDropdown() {
  const { currency, language, setCurrency, setLanguage, t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-[var(--navy)]"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Settings className="h-4 w-4" />
        <span>{t("nav.settings")}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 shadow-lg">
          <div className="border-b border-[var(--border)] px-3 pb-2">
            <p className="text-xs font-medium text-gray-500">{t("settings.currency")}</p>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="px-3 pt-2">
            <p className="text-xs font-medium text-gray-500">{t("settings.language")}</p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
