import { NextResponse } from "next/server";
import { fetchLatestGdeltEvents } from "@/lib/gdeltParse";
import { fetchGdeltThemeCached, type GdeltTheme } from "@/lib/gdeltTheme";
import { apiStubResponse } from "@/lib/apiStub";
import { readGdeltPointsFromD1 } from "@/lib/d1LiveSnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const stub = apiStubResponse("gdelt", request);
  if (stub) return stub;

  try {
    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme") as GdeltTheme | null;
    const preferLive = searchParams.get("live") === "1";

    if (theme === "cyber" || theme === "election") {
      const { data, cached } = await fetchGdeltThemeCached(theme);
      return NextResponse.json({
        theme,
        cached,
        fetchedAt: new Date().toISOString(),
        events: data,
        attribution: "GDELT Project",
      });
    }

    // Cron Geo 스냅샷 우선 — ZIP/CSV 파싱 생략
    if (!preferLive) {
      const fromD1 = await readGdeltPointsFromD1(600);
      if (fromD1 && fromD1.count > 0) {
        return NextResponse.json({
          fetchedAt: fromD1.fetchedAt,
          cached: true,
          source: "d1",
          events: fromD1.events.map((point) => ({
            id: point.id,
            kind: "gdelt-geo",
            name: point.name || point.queryTag || "GDELT",
            lat: point.lat,
            lng: point.lng,
            url: point.url,
            mentionCount: point.mentionCount,
            queryTag: point.queryTag,
            severity: 2,
            eventTier: "diplomatic" as const,
          })),
          attribution: "GDELT Project (via Cloudflare D1 cron ingest)",
        });
      }
    }

    const sliceParam = searchParams.get("slices");
    const sliceCount = sliceParam ? Number.parseInt(sliceParam, 10) : undefined;

    const payload = await fetchLatestGdeltEvents(
      sliceCount && sliceCount > 0 ? { sliceCount } : undefined,
    );
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "GDELT 수신 실패",
        events: [],
      },
      { status: 500 },
    );
  }
}
