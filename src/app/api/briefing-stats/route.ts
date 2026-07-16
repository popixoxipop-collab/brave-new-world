import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStubResponse } from "@/lib/apiStub";
import { parseSearchParams } from "@/lib/apiQuerySchemas";
import {
  readBriefingStatsFromD1,
  readBriefingStatsFromIngestWorker,
} from "@/lib/briefingPeriodStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const briefingStatsQuerySchema = z
  .object({
    key: z.string().min(3).max(64).optional(),
    tier: z.enum(["daily", "weekly", "monthly"]).optional(),
  })
  .refine((v) => Boolean(v.key || v.tier), {
    message: "Provide key or tier",
  });

/**
 * 일/주/월 브리핑용 D1 집계 — LLM 없음.
 * D1 바인딩 우선, 없으면 cron 워커 /briefing-stats 폴백.
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("briefing-stats", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, briefingStatsQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, stats: null },
      { status: 400 },
    );
  }

  const { key, tier } = parsed.data;
  const fromD1 = await readBriefingStatsFromD1({ key, tier });
  if (fromD1) {
    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      source: "d1",
      stats: fromD1,
    });
  }

  const fromWorker = await readBriefingStatsFromIngestWorker({ key, tier });
  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    source: fromWorker ? "ingest-worker" : "empty",
    stats: fromWorker,
  });
}
