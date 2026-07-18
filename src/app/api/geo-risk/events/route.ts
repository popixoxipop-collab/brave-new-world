/**
 * geo-risk-desk 이벤트 신호 버스 — 정규화된 risk_events + exposures를 JSON으로.
 *
 * D-GRF6(Layer A): Finance live/geopolitical.py가 소비하는 상류(pre-price) 지경학 이벤트 피드.
 *   WHY: 카드 route(/cards)는 지도 렌더용(lat/lon 필수 + brief 포맷). 신호/귀속 소비자는
 *        first_seen_at·corroboration·exposures가 필요해 raw 계약이 별도로 있어야 함.
 *   COST: 엔드포인트 하나 추가. 인증 없음(읽기 전용, 파생 분석물만 — 원본 OSINT 텍스트 미노출).
 *   EXIT: 소비자 계약이 바뀌면 shape만 수정. 되돌리려면 이 파일 삭제 + Finance fetch 제거.
 * 계약: { source, fetchedAt, count, events:[{id,eventClass,severity,geography,firstSeenAt,
 *        corroborationCount,lat,lon,analyzedAt,verified,exposures:[{ticker,direction,verified}]}] }
 */
import { NextResponse } from "next/server";
import { readRiskEventsRaw } from "@/lib/geo-risk/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const max = Math.min(Number(searchParams.get("max") ?? "100") || 100, 500);
    const events = await readRiskEventsRaw(max);
    return NextResponse.json({
      source: "d1",
      fetchedAt: new Date().toISOString(),
      count: events.length,
      events,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "geo-risk events error";
    return NextResponse.json({ error: msg, events: [] }, { status: 500 });
  }
}
