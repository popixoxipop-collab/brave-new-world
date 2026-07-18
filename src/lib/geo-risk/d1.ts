/**
 * geo-risk-desk D1 접근 — risk_events/risk_analyses 읽기·쓰기 + 카드 변환.
 * geowatch 기존 d1LiveSnapshots 패턴(getDb → drizzle) 재사용.
 */
import { desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { riskEvents, riskAnalyses } from "@/db/schema";
import type { EconInsightBrief } from "@/data/econInsightBriefs";
import type { ExposureAnalysis, RiskEvent } from "./types";
import { toBrief } from "./adapter";
import type { PortfolioImpact } from "./portfolio";

/** cursor 이후 telegram 처리를 위한 최신 처리 시각(마지막 first_seen). 없으면 null. */
export async function readCursor(): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ firstSeenAt: riskEvents.firstSeenAt })
    .from(riskEvents)
    .orderBy(desc(riskEvents.firstSeenAt))
    .limit(1);
  return rows[0]?.firstSeenAt ?? null;
}

/** 라우터가 감지한 이벤트 upsert (first_seen_at은 최초만 — id 충돌 시 유지). */
export async function upsertRiskEvent(ev: RiskEvent): Promise<void> {
  const db = await getDb();
  await db
    .insert(riskEvents)
    .values({
      id: ev.id,
      source: ev.source,
      sourceRef: ev.sourceRef,
      eventClass: ev.eventClass,
      geography: ev.geography,
      severity: ev.severity,
      summary: ev.summary,
      lat: ev.lat,
      lon: ev.lon,
      corroborationCount: ev.corroborationCount,
      firstSeenAt: ev.firstSeenAt,
      status: ev.status,
    })
    .onConflictDoUpdate({
      target: riskEvents.id,
      // 재관측: corroboration/severity/summary는 갱신, first_seen_at은 유지(append-only 의미론)
      set: {
        corroborationCount: ev.corroborationCount,
        severity: ev.severity,
        summary: ev.summary,
        status: ev.status,
      },
    });
}

/** 판정 저장 + 이벤트 status=analyzed. */
export async function saveAnalysis(
  eventId: string,
  analysis: ExposureAnalysis,
  nowIso: string,
): Promise<void> {
  const db = await getDb();
  await db.insert(riskAnalyses).values({
    eventId,
    exposuresJson: JSON.stringify(analysis.exposures),
    portfolioDelta: analysis.portfolioDelta,
    verified: analysis.verified ? 1 : 0,
    model: analysis.model,
    createdAt: nowIso,
  });
  await db.update(riskEvents).set({ status: "analyzed" }).where(eq(riskEvents.id, eventId));
}

/**
 * 최근 분석된 리스크 이벤트를 카드(EconInsightBrief)로 — 프론트가 지도에 렌더.
 * D4: portfolio 교집합은 라우터 시점에 이미 반영됐다고 가정(여기선 이벤트+최신 판정만 조인).
 */
export async function readRiskCards(max = 50): Promise<
  Array<{ event: RiskEvent; brief: EconInsightBrief; createdAt: string }>
> {
  const db = await getDb();
  const events = await db
    .select()
    .from(riskEvents)
    .where(eq(riskEvents.status, "analyzed"))
    .orderBy(desc(riskEvents.firstSeenAt))
    .limit(max);

  const out: Array<{ event: RiskEvent; brief: EconInsightBrief; createdAt: string }> = [];
  for (const e of events) {
    const [a] = await db
      .select()
      .from(riskAnalyses)
      .where(eq(riskAnalyses.eventId, e.id))
      .orderBy(desc(riskAnalyses.createdAt))
      .limit(1);
    if (!a) continue;

    const event: RiskEvent = {
      id: e.id,
      source: e.source,
      sourceRef: e.sourceRef,
      eventClass: e.eventClass as RiskEvent["eventClass"],
      geography: e.geography,
      severity: e.severity as RiskEvent["severity"],
      summary: e.summary,
      lat: e.lat,
      lon: e.lon,
      corroborationCount: e.corroborationCount,
      firstSeenAt: e.firstSeenAt,
      status: "analyzed",
    };
    const analysis: ExposureAnalysis = {
      exposures: safeParse(a.exposuresJson),
      portfolioDelta: a.portfolioDelta,
      verified: a.verified === 1,
      model: a.model ?? "unknown",
    };
    // 카드에 이미 반영된 포트폴리오 영향은 없으므로 null (라우터가 승격 시 반영, 카드는 노출 표시)
    const impact: PortfolioImpact | null = null;
    out.push({ event, brief: toBrief(event, analysis, impact), createdAt: a.createdAt });
  }
  return out;
}

/**
 * D-GRF6(Layer A): raw 리스크 이벤트 + 노출 — Finance 신호 버스용(카드 포맷 없이).
 *   WHY: Finance geopolitical.py가 이벤트 해상도 지경학 입력을 관측/귀속에 쓰려면 brief가
 *        아니라 정규화된 이벤트(first_seen_at·exposures)가 필요. 카드 route는 lat/lon 있는 것만
 *        + brief 포맷이라 부적합. 이 함수가 A/B/C 공용 데이터 버스.
 *   COST: readRiskCards와 조인 로직 중복(작음). 카드와 별도 진화 가능해 오히려 결합도↓.
 *   EXIT: 스키마 바뀌면 여기 select만 수정. 소비자(Finance)는 JSON 계약만 의존.
 */
export async function readRiskEventsRaw(max = 100): Promise<
  Array<{
    id: string;
    eventClass: string;
    severity: string;
    geography: string | null;
    firstSeenAt: string;
    corroborationCount: number;
    lat: number | null;
    lon: number | null;
    analyzedAt: string;
    verified: boolean;
    exposures: ExposureAnalysis["exposures"];
  }>
> {
  const db = await getDb();
  const events = await db
    .select()
    .from(riskEvents)
    .where(eq(riskEvents.status, "analyzed"))
    .orderBy(desc(riskEvents.firstSeenAt))
    .limit(max);

  const out = [];
  for (const e of events) {
    const [a] = await db
      .select()
      .from(riskAnalyses)
      .where(eq(riskAnalyses.eventId, e.id))
      .orderBy(desc(riskAnalyses.createdAt))
      .limit(1);
    if (!a) continue;
    out.push({
      id: e.id,
      eventClass: e.eventClass,
      severity: e.severity,
      geography: e.geography,
      firstSeenAt: e.firstSeenAt,
      corroborationCount: e.corroborationCount,
      lat: e.lat,
      lon: e.lon,
      analyzedAt: a.createdAt,
      verified: a.verified === 1,
      exposures: safeParse(a.exposuresJson),
    });
  }
  return out;
}

function safeParse(json: string): ExposureAnalysis["exposures"] {
  try {
    const p = JSON.parse(json);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export { gt }; // detect의 cursor 쿼리에서 재사용
