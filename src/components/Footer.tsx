"use client";

import { useLocale } from "@/contexts/LocaleContext";

const CONTACT_EMAIL = "info@spparow.org";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-3 text-center text-xs text-gray-500 sm:px-6">
      <span className="text-gray-600">{t("footer.contact")}</span>{" "}
      <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-[var(--accent-dark)] hover:underline">
        {CONTACT_EMAIL}
      </a>
    </footer>
  );
}
