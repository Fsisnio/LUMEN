import type { PaydunyaConfirmPayload } from "./paydunya-client";

/**
 * Merge `custom_data` from root + nested `invoice.custom_data`.
 * Keys are lower‑cased; values stringified — PayDunya sometimes varies nesting/casing.
 */
export function normalizedPaydunyaCustom(payload: PaydunyaConfirmPayload): Record<string, string> {
  const merged: Record<string, string | number | undefined> = { ...(payload.custom_data ?? {}) };
  const invCustom = payload.invoice?.custom_data;
  if (invCustom && typeof invCustom === "object") {
    Object.assign(merged, invCustom as Record<string, string | number | undefined>);
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null) continue;
    const key = k.trim().toLowerCase().replace(/\s+/g, "_");
    const val = typeof v === "string" ? v.trim() : String(v);
    if (!key) continue;
    out[key] = val;
  }
  return out;
}

/** Parse CFA total from confirm payload (`invoice.total_amount`). */
export function invoiceTotalCfa(payload: PaydunyaConfirmPayload): number {
  const t = payload.invoice?.total_amount;
  if (typeof t === "number" && Number.isFinite(t)) return t;
  if (typeof t === "string") {
    const n = Number(t.replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

/**
 * Paid amount vs our `expected_cfa` snapshot (stored at checkout creation).
 * PayDunya may round/format slightly differently; allow a bounded tolerance.
 */
export function paydunyaAmountAcceptable(normalizedCustom: Record<string, string>, payload: PaydunyaConfirmPayload): boolean {
  const expectedStr = normalizedCustom.expected_cfa;
  if (!expectedStr?.trim()) return true;

  const expectedNum = Number(expectedStr);
  const paidNum = invoiceTotalCfa(payload);
  if (!Number.isFinite(expectedNum)) return true;
  if (!Number.isFinite(paidNum)) return false;

  const roundedE = Math.round(expectedNum);
  const roundedP = Math.round(paidNum);
  if (roundedP === roundedE) return true;

  const pctTol = Math.ceil(roundedE * 0.02);
  const tolerance = Math.max(50, Math.min(220, pctTol || 50));
  return Math.abs(roundedP - roundedE) <= tolerance;
}
