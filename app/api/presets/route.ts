import { NextResponse } from "next/server";
import { listPresets } from "@/data/presets";

export const runtime = "nodejs";

// GET /api/presets — list available presets for the ingestion form dropdown.
export async function GET() {
  return NextResponse.json({ presets: listPresets() });
}
