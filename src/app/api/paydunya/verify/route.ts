import { NextResponse } from "next/server";
import { confirmCheckoutInvoice, readPaydunyaSecrets } from "@/lib/paydunya-client";
import { fulfillPaydunyaInvoice } from "@/lib/subscription-payment";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** Browser return: confirm invoice with PayDunya, then activate pass if paid. */
export async function GET(request: Request) {
  const secrets = readPaydunyaSecrets();
  if (!secrets) {
    return NextResponse.json({ configured: false, ok: false, reason: "not_configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!token?.trim()) {
    return NextResponse.json({ ok: false, reason: "missing_token" }, { status: 400 });
  }

  try {
    const payload = await confirmCheckoutInvoice(secrets, token.trim());
    const result = await fulfillPaydunyaInvoice({
      secrets,
      payload,
      expectedOrgId: user.organizationId,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[paydunya verify]", e);
    return NextResponse.json({ ok: false, reason: "verify_exception" }, { status: 500 });
  }
}
