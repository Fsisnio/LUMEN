import { NextResponse } from "next/server";
import { createCheckoutInvoice, readPaydunyaSecrets } from "@/lib/paydunya-client";
import { appBaseUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";
import { getOrganization } from "@/lib/data-store";
import { parsePayableTier, paydunyaListedAmountCfa } from "@/lib/subscription-offers";
import { applyDiscountCfa } from "@/lib/subscription-payment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secrets = readPaydunyaSecrets();
  if (!secrets) {
    return NextResponse.json({ error: "paydunya_not_configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { tierId?: string };
  try {
    body = (await request.json()) as { tierId?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const tier = typeof body.tierId === "string" ? parsePayableTier(body.tierId) : null;
  if (!tier) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  const org = await getOrganization(user.organizationId);
  if (!org) {
    return NextResponse.json({ error: "organization_not_found" }, { status: 404 });
  }

  const listed = paydunyaListedAmountCfa(tier);
  const total = applyDiscountCfa(listed, org.nextRenewalDiscountPct);
  const discountAppliedPct =
    listed > total && typeof org.nextRenewalDiscountPct === "number"
      ? org.nextRenewalDiscountPct
      : 0;

  const base = appBaseUrl();
  let checkoutUrl: string;
  try {
    const invoice = await createCheckoutInvoice(secrets, {
      totalAmountCfa: total,
      description: `Lumen - ${tier.replace(/_/g, " ")}`,
      storeName: process.env.PAYDUNYA_STORE_NAME?.trim() || "Lumen",
      storeTagline: process.env.PAYDUNYA_STORE_TAGLINE?.trim() || "CARIPRIP program intelligence",
      customer: { name: user.name, email: user.email },
      customData: {
        org_id: org.id,
        tier,
        expected_cfa: String(total),
        discount_applied_pct: String(Math.min(99, Math.max(0, discountAppliedPct))),
      },
      returnUrl: `${base}/plans/success`,
      cancelUrl: `${base}/plans`,
      callbackUrl: `${base}/api/paydunya/ipn`,
    });
    checkoutUrl = invoice.checkoutUrl;
  } catch (e) {
    console.error("[paydunya checkout]", e);
    const msg = e instanceof Error ? e.message : "checkout_failed";
    const credLikely =
      /private\s*key/i.test(msg) || /token combination/i.test(msg) || /^TEST\s/i.test(msg);
    const errorKey = credLikely ? "plans.paydunyaCredMismatch" : "plans.paydunyaCheckoutFail";
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: msg, errorKey }, { status: 502 });
    }
    return NextResponse.json({ errorKey }, { status: 502 });
  }

  return NextResponse.json({ url: checkoutUrl });
}
