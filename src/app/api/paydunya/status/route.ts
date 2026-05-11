import { NextResponse } from "next/server";
import { readPaydunyaSecrets } from "@/lib/paydunya-client";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: readPaydunyaSecrets() !== null });
}
