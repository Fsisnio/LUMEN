export type CurrencyCode = "USD" | "EUR" | "XOF";

export type LanguageCode = "en" | "fr";

export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "XOF", symbol: "CFA", name: "West African CFA franc" },
];

export const LANGUAGES: { code: LanguageCode; name: string }[] = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
];

export function formatCurrency(
  value: number,
  currency: CurrencyCode,
  compact = false
): string {
  const c = CURRENCIES.find((x) => x.code === currency);
  const symbol = c?.symbol ?? "$";
  if (compact && value >= 1000) {
    const k = value / 1000;
    const m = value / 1_000_000;
    if (m >= 1) return `${symbol}${m.toFixed(2)}M`;
    return `${symbol}${k.toFixed(0)}K`;
  }
  return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
