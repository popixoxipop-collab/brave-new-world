import { NextResponse } from "next/server";
import { detectAiWarZonesDemo } from "@/lib/aiWarZoneDemo";
import { cachedFetchJson } from "@/lib/apiCache";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 120 * 1000;

export async function GET(request: Request) {
  const stub = apiStubResponse("conflict-zones", request);
  if (stub) return stub;

  try {
    const { data, cached } = await cachedFetchJson("ai-war-zones-demo-v1", TTL_MS, async () =>
      detectAiWarZonesDemo(),
    );
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      cached,
      mode: "ai-demo",
      enabled: true,
      count: data.length,
      zones: data,
      attribution: "AI war-zone demo (Natural Earth + GDELT war clustering, no external AI API)",
    });
  } catch (error) {
    return NextResponse.json(
      {
        zones: [],
        count: 0,
        mode: "ai-demo",
        error: error instanceof Error ? error.message : "ai-war-zones failed",
      },
      { status: 500 },
    );
  }
}
