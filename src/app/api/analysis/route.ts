import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getFullStore } from "@/lib/data-store";
import { buildAnalysisSnapshot } from "@/lib/analysis-payload";
import { getTenantId } from "@/lib/tenant";
import type { LanguageCode } from "@/lib/locale";

export const maxDuration = 120;

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
  try {
    const body = await request.json().catch(() => ({}));
    if (body.language === "en" || body.language === "fr") {
      language = body.language;
    }
  } catch {
    // ignore
  }

  const tenantId = await getTenantId(request);
  const store = await getFullStore(tenantId);
  const snapshot = buildAnalysisSnapshot(store, tenantId);
  const snapshotJson = JSON.stringify(snapshot);

  const systemFr = `Tu es un analyste senior en gestion de programmes humanitaires pour le réseau Caritas.
Tu reçois un instantané JSON exhaustif de la plateforme CARIPRIP (organisations, programmes, projets, indicateurs, risques).
Réponds en français, de façon structurée en Markdown (titres ##, listes, **gras** pour les points critiques).
Sois factuel, professionnel, orienté décision. N'invente pas de chiffres hors du JSON.
Couvre : synthèse exécutive, performance par programme, finance (taux d'utilisation, projets à surveiller), indicateurs M&E, risques et conformité, recommandations priorisées (court / moyen terme), et alertes éventuelles.`;

  const systemEn = `You are a senior humanitarian program analyst for the Caritas network.
You receive a comprehensive JSON snapshot from the CARIPRIP platform (organizations, programs, projects, indicators, risks).
Respond in English using structured Markdown (## headings, lists, **bold** for critical points).
Be factual, decision-oriented, professional. Do not invent figures outside the JSON.
Cover: executive summary, program performance, finance (utilization, projects to watch), M&E indicators, risk & compliance, prioritized recommendations (short/medium term), and any alerts.`;

  const userContent = `Analyze the following platform data snapshot and produce the full analysis.\n\n\`\`\`json\n${snapshotJson}\n\`\`\``;

  try {
    const openai = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.35,
      max_tokens: 4096,
      messages: [
        { role: "system", content: language === "fr" ? systemFr : systemEn },
        { role: "user", content: userContent },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "Empty response from the model." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      content: text,
      model,
      usage: completion.usage ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "OpenAI request failed";
    console.error("[api/analysis]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
