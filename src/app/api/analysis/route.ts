import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getFullStore, getOrganization, updateOrganization } from "@/lib/data-store";
import { buildAnalysisSnapshot } from "@/lib/analysis-payload";
import { requireTenantId } from "@/lib/tenant";
import type { LanguageCode } from "@/lib/locale";
import type { OrganizationSubscriptionUsage } from "@/lib/types";
import { mutateUsage, type AnalysisRunKind } from "@/lib/subscription-quota";

export const maxDuration = 120;
export const runtime = "nodejs";

const QUOTA_I18N: Record<string, string> = {
  quota_report_free: "analysis.quotaReportFree",
  quota_free_ai_month: "analysis.quotaFreeAiMonth",
  quota_day_pass_ai: "analysis.quotaDayPassAi",
  quota_week_ai_day: "analysis.quotaWeekAiDay",
  quota_month_ai_day: "analysis.quotaMonthAiDay",
  quota_day_pass_report: "analysis.quotaDayPassReport",
  quota_week_report: "analysis.quotaWeekReport",
  quota_month_report: "analysis.quotaMonthReport",
  quota_report_tier: "analysis.quotaReportTier",
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENAI_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      {
        error:
          "Missing OPENAI_API_KEY (or OPENAI_KEY) in environment. Add it to .env.local.",
      },
      { status: 503 }
    );
  }

  let language: LanguageCode = "fr";
  let kind: AnalysisRunKind = "analysis";
  try {
    const body = (await request.json().catch(() => ({}))) as {
      language?: string;
      mode?: string;
    };
    if (body.language === "en" || body.language === "fr") {
      language = body.language;
    }
    if (body.mode === "report") kind = "report";
  } catch {
    // ignore
  }

  const tenantRes = await requireTenantId(request);
  if (tenantRes instanceof NextResponse) return tenantRes;
  const tenantId = tenantRes;

  const org = await getOrganization(tenantId);
  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const prevUsage: OrganizationSubscriptionUsage | undefined =
    typeof structuredClone !== "undefined"
      ? structuredClone(org.subscriptionUsage ?? {})
      : { ...(org.subscriptionUsage ?? {}) };

  const verdict = mutateUsage(org, kind, /* dryRun */ false);
  if (!verdict.ok || !verdict.nextUsage) {
    const code = verdict.code ?? "quota_unknown";
    const i18n = QUOTA_I18N[code] ?? "analysis.quotaExceeded";
    return NextResponse.json(
      { error: i18n, quotaCode: code, errorKey: i18n },
      { status: 429 }
    );
  }

  await updateOrganization(tenantId, { subscriptionUsage: verdict.nextUsage });

  const store = await getFullStore(tenantId);
  const snapshot = buildAnalysisSnapshot(store, tenantId);
  const snapshotJson = JSON.stringify(snapshot);

  const systemFrAnalysis = `Tu es un analyste senior en gestion de programmes humanitaires pour les réseaux humanitaires collaboratifs.
Tu reçois un instantané JSON exhaustif de la plateforme CARIPRIP (organisations, programmes, projets, indicateurs, risques).
Réponds en français, de façon structurée en Markdown (titres ##, listes, **gras** pour les points critiques).
Sois factuel, professionnel, orienté décision. N'invente pas de chiffres hors du JSON.
Couvre : synthèse exécutive, performance par programme, finance (taux d'utilisation, projets à surveiller), indicateurs M&E, risques et conformité, recommandations priorisées (court / moyen terme), et alertes éventuelles.`;

  const systemFrReport = `${systemFrAnalysis}
Ton livrable est un **rapport formel destiné aux parties prenantes** (tone institutionnel): inclure date de rapport, destinataires implicites, sections numérotées, et un court récapitulatif en tête (« Executive summary ») avant le corps du rapport.`;

  const systemEnAnalysis = `You are a senior humanitarian program analyst for collaborative humanitarian networks.
You receive a comprehensive JSON snapshot from the CARIPRIP platform (organizations, programs, projects, indicators, risks).
Respond in English using structured Markdown (## headings, lists, **bold** for critical points).
Be factual, decision-oriented, professional. Do not invent figures outside the JSON.
Cover: executive summary, program performance, finance (utilization, projects to watch), M&E indicators, risk & compliance, prioritized recommendations (short/medium term), and any alerts.`;

  const systemEnReport = `${systemEnAnalysis}
Your output must read as an **automatic stakeholder report** suitable for archiving: numbered sections, explicit report date, concise executive précis at the top, then structured findings and recommendations.`;

  const prefix =
    kind === "report"
      ? "Produce the formal stakeholder report from "
      : "Analyze the following platform data snapshot and produce the full ";
  const suffix = kind === "report" ? ".\n\n" : "analysis.\n\n";
  const userContent = `${prefix}the following snapshot${suffix}\`\`\`json\n${snapshotJson}\n\`\`\``;

  try {
    const openai = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    const completion = await openai.chat.completions.create({
      model,
      temperature: kind === "report" ? 0.25 : 0.35,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            language === "fr"
              ? kind === "report"
                ? systemFrReport
                : systemFrAnalysis
              : kind === "report"
                ? systemEnReport
                : systemEnAnalysis,
        },
        { role: "user", content: userContent },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    if (!text) {
      await updateOrganization(tenantId, {
        subscriptionUsage: prevUsage,
      }).catch(() => {});
      return NextResponse.json({ error: "Empty response from the model." }, { status: 502 });
    }

    return NextResponse.json({
      kind,
      content: text,
      model,
      usage: completion.usage ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "OpenAI request failed";
    console.error("[api/analysis]", message);
    await updateOrganization(tenantId, {
      subscriptionUsage: prevUsage,
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
