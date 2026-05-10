/**
 * Curated list of countries (West & Central Africa-focused, plus international).
 * Add countries as the platform expands.
 */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "SN", name: "Senegal" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GM", name: "Gambia" },
  { code: "MR", name: "Mauritania" },
  { code: "NE", name: "Niger" },
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Benin" },
  { code: "CM", name: "Cameroon" },
  { code: "CD", name: "Democratic Republic of the Congo" },
  { code: "TD", name: "Chad" },
  { code: "CF", name: "Central African Republic" },
  { code: "MA", name: "Morocco" },
  { code: "TN", name: "Tunisia" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgium" },
  { code: "VA", name: "Vatican City" },
];

export function countryName(value: string | undefined | null): string {
  if (!value) return "";
  return COUNTRIES.find((c) => c.name === value || c.code === value)?.name ?? value;
}
