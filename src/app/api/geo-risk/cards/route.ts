/**
 * geo-risk-desk 카드 서빙 — 분석된 리스크 이벤트를 EconInsightBrief[]로 반환.
 * 프론트가 지도 pin 클릭 시 이 카드를 EconInsightParchment로 렌더한다(D4).
 * 기존 gdelt route 패턴(runtime nodejs, force-dynamic) 준수.
 */
import { NextResponse } from "next/server";
import { readRiskCards } from "@/lib/geo-risk/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const max = Math.min(Number(searchParams.get("max") ?? "50") || 50, 200);
    const cards = await readRiskCards(max);
    // loadOnceApiPoints/expandStaticPoints 호환 형식(points). brief는 meta.briefJson(string)에
    // 담아 클릭 시 parse — StaticPoint.meta가 scalar만 허용하므로 side Map 없이 최소 배선.
    const points = cards
      .filter((c) => c.event.lat != null && c.event.lon != null)
      .map((c) => ({
        id: c.event.id,
        kind: "geo-risk" as const,
        name: c.brief.titleKo,
        lat: c.event.lat as number,
        lng: c.event.lon as number, // StaticPoint는 lng
        meta: {
          severity: c.event.severity,
          eventClass: c.event.eventClass,
          briefJson: JSON.stringify(c.brief),
        },
      }));
    return NextResponse.json({
      source: "d1",
      fetchedAt: new Date().toISOString(),
      count: points.length,
      points,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "geo-risk cards error";
    return NextResponse.json({ error: msg, items: [] }, { status: 500 });
  }
}
