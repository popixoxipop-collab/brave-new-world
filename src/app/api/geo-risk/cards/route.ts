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
    return NextResponse.json({
      source: "d1",
      fetchedAt: new Date().toISOString(),
      count: cards.length,
      // 지도 pin에 필요한 좌표 + 카드 계약을 함께
      items: cards.map((c) => ({
        id: c.event.id,
        lat: c.event.lat,
        lon: c.event.lon,
        eventClass: c.event.eventClass,
        severity: c.event.severity,
        createdAt: c.createdAt,
        brief: c.brief,
      })),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "geo-risk cards error";
    return NextResponse.json({ error: msg, items: [] }, { status: 500 });
  }
}
