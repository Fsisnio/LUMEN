import { createHash } from "node:crypto";
import { appBaseUrl } from "./app-url";

export interface PaydunyaSecrets {
  masterKey: string;
  privateKey: string;
  token: string;
  mode: "test" | "live";
}

export function readPaydunyaSecrets(): PaydunyaSecrets | null {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY?.trim();
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY?.trim();
  const token = process.env.PAYDUNYA_TOKEN?.trim();
  if (!masterKey || !privateKey || !token) return null;
  const mode = process.env.PAYDUNYA_MODE?.toLowerCase() === "live" ? "live" : "test";
  return { masterKey, privateKey, token, mode };
}

/** Strip control chars; trim length for PayDunya text fields (names, emails, descriptions). */
export function sanitizePaydunyaText(value: string, maxLen: number): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function assertHttpsUrlsForLivePaydunya(mode: PaydunyaSecrets["mode"], urls: string[]): void {
  if (mode !== "live") return;
  for (const u of urls) {
    const trimmed = typeof u === "string" ? u.trim() : "";
    if (!trimmed || !/^https:\/\//i.test(trimmed)) {
      throw new Error(
        "PayDunya live requires HTTPS URLs and a public domain: set APP_BASE_URL=https://..."
      );
    }
  }
}

function createUrl(secrets: PaydunyaSecrets, path: string): string {
  const prefix =
    secrets.mode === "live"
      ? "https://app.paydunya.com/api/v1"
      : "https://app.paydunya.com/sandbox-api/v1";
  return `${prefix}${path}`;
}

export function paydunyaHeaders(secrets: PaydunyaSecrets): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": secrets.masterKey,
    "PAYDUNYA-PRIVATE-KEY": secrets.privateKey,
    "PAYDUNYA-TOKEN": secrets.token,
  };
}

/** PayDunya documents that the `hash` field is SHA-512 of your master key (hex). */
export function verifyPaydunyaMasterKeyHash(secrets: PaydunyaSecrets, hash: string): boolean {
  const expected = createHash("sha512").update(secrets.masterKey, "utf8").digest("hex");
  return typeof hash === "string" && hash.toLowerCase() === expected.toLowerCase();
}

export interface CreateCheckoutArgs {
  /** Total to charge, CFA (integer). */
  totalAmountCfa: number;
  description: string;
  storeName: string;
  storeTagline?: string;
  customer: { name: string; email: string; phone?: string };
  /** Flat string map — passed back on IPN / confirm. */
  customData: Record<string, string>;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
}

export async function createCheckoutInvoice(
  secrets: PaydunyaSecrets,
  args: CreateCheckoutArgs
): Promise<{ checkoutUrl: string; token: string }> {
  const websiteUrl = appBaseUrl();
  assertHttpsUrlsForLivePaydunya(secrets.mode, [
    websiteUrl,
    args.returnUrl,
    args.cancelUrl,
    args.callbackUrl,
  ]);

  const emailSan = sanitizePaydunyaText(args.customer.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.\S+$/.test(emailSan)) {
    throw new Error(
      "PayDunya invoice requires a valid customer email — check the user profile in your database."
    );
  }
  const email = emailSan;

  let name = sanitizePaydunyaText(args.customer.name, 255);
  if (!name) name = "Customer";

  const desc = sanitizePaydunyaText(
    args.description.replace(/\u2014/g, "-"),
    500
  );

  const store: Record<string, string> = {
    name: sanitizePaydunyaText(args.storeName, 255),
    tagline: sanitizePaydunyaText(args.storeTagline ?? "", 500),
    phone: "",
    postal_address: "",
    website_url: websiteUrl,
  };
  const logoUrl = process.env.PAYDUNYA_STORE_LOGO_URL?.trim();
  if (logoUrl) store.logo_url = logoUrl.slice(0, 500);

  const body = {
    invoice: {
      total_amount: Math.round(args.totalAmountCfa),
      description: desc,
      customer: {
        name,
        email,
        phone: sanitizePaydunyaText(args.customer.phone ?? "", 40),
      },
      custom_data: args.customData,
    },
    store,
    actions: {
      return_url: args.returnUrl,
      cancel_url: args.cancelUrl,
      callback_url: args.callbackUrl,
    },
  };

  const url = createUrl(secrets, "/checkout-invoice/create");
  const res = await fetch(url, {
    method: "POST",
    headers: paydunyaHeaders(secrets),
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let json = {} as {
    response_code?: string;
    response_text?: string;
    token?: string;
    description?: string;
  };

  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      `PayDunya checkout-invoice/create returned non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`
    );
  }

  if (!res.ok) {
    throw new Error(
      json.description ?? json.response_text ?? `PayDunya HTTP ${res.status}: invoice creation failed`
    );
  }

  if (json.response_code !== "00" || !json.response_text?.startsWith("http")) {
    throw new Error(json.response_text ?? json.description ?? "PayDunya invoice creation failed");
  }

  return {
    checkoutUrl: json.response_text,
    token: json.token ?? "",
  };
}

export type PaydunyaPaymentStatus = "completed" | "pending" | "cancelled" | "failed" | string;

export interface PaydunyaConfirmPayload {
  response_code?: string;
  response_text?: string;
  hash?: string;
  status?: PaydunyaPaymentStatus;
  custom_data?: Record<string, string | number | undefined>;
  invoice?: {
    token?: string;
    total_amount?: number | string;
    description?: string;
    /** Some PayDunya responses nest `custom_data` under `invoice` instead of root. */
    custom_data?: Record<string, string | number | undefined>;
  };
}

export async function confirmCheckoutInvoice(
  secrets: PaydunyaSecrets,
  invoiceToken: string
): Promise<PaydunyaConfirmPayload> {
  const path = `/checkout-invoice/confirm/${encodeURIComponent(invoiceToken)}`;
  const url = createUrl(secrets, path);
  const res = await fetch(url, {
    method: "GET",
    headers: paydunyaHeaders(secrets),
  });
  const json = (await res.json()) as PaydunyaConfirmPayload;
  return json;
}

export function extractInvoiceToken(payload: PaydunyaConfirmPayload): string | null {
  const t = payload.invoice?.token;
  if (typeof t === "string" && t.trim()) return t.trim();
  return null;
}

/**
 * When the IPN only sends a token (or leaves status pending), fetch the full
 * confirm payload from PayDunya.
 */
export async function resolveConfirmPayload(
  secrets: PaydunyaSecrets,
  payload: PaydunyaConfirmPayload
): Promise<PaydunyaConfirmPayload> {
  const token = extractInvoiceToken(payload);
  const incomplete =
    !!token &&
    (!payload.hash ||
      payload.response_code !== "00" ||
      !payload.status ||
      String(payload.status).toLowerCase() === "pending");
  if (incomplete && token) {
    return confirmCheckoutInvoice(secrets, token);
  }
  return payload;
}

/** Parse `application/x-www-form-urlencoded` IPN body — `data` holds JSON. */
export function parsePaydunyaIpnBody(raw: string): PaydunyaConfirmPayload | null {
  const trimmed = raw.trim();

  if (trimmed.startsWith("{")) {
    try {
      const outer = JSON.parse(trimmed) as { data?: PaydunyaConfirmPayload };
      return outer.data ?? (outer as PaydunyaConfirmPayload);
    } catch {
      return null;
    }
  }

  const params = new URLSearchParams(raw);
  const data = params.get("data");
  if (data) {
    try {
      const parsed = JSON.parse(data) as { data?: PaydunyaConfirmPayload } | PaydunyaConfirmPayload;
      if (parsed && typeof parsed === "object" && "data" in parsed && parsed.data) {
        return parsed.data as PaydunyaConfirmPayload;
      }
      return parsed as PaydunyaConfirmPayload;
    } catch {
      return null;
    }
  }

  const token =
    params.get("invoice_token") ??
    params.get("token") ??
    params.get("checkout_invoice_token");
  if (token) {
    return { invoice: { token }, status: "pending" };
  }

  return null;
}
