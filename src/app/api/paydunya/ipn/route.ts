import { NextResponse } from "next/server";
import { parsePaydunyaIpnBody, readPaydunyaSecrets } from "@/lib/paydunya-client";
import { normalizedPaydunyaCustom } from "@/lib/paydunya-fulfillment";
import { fulfillPaydunyaInvoice } from "@/lib/subscription-payment";

export const runtime = "nodejs";

/**
 * PayDunya server-to-server IPN (`callback_url`).
 * Respond 200 quickly; log failures — PayDunya may retry non-2xx responses.
 */
export async function POST(request: Request) {
  const secrets = readPaydunyaSecrets();
  if (!secrets) {
    return new NextResponse("skipped", { status: 200 });
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return new NextResponse("ignored", { status: 200 });
  }

  const parsed = parsePaydunyaIpnBody(raw);
  if (!parsed) {
    console.warn("[paydunya ipn] unparseable body");
    return new NextResponse("ignored", { status: 200 });
  }

  const result = await fulfillPaydunyaInvoice({ secrets, payload: parsed });
  if (!result.ok) {
    const ck = Object.keys(normalizedPaydunyaCustom(parsed));
    console.warn("[paydunya ipn]", result.reason, { keys: ck.length ? ck.join(",") : "(no custom)" });
  }
  return new NextResponse("ok", { status: 200 });
}
