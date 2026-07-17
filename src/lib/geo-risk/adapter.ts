/**
 * geo-risk-desk 카드 어댑터 — 라우터 판정을 geowatch 기존 EconInsightBrief로.
 *
 * D4: 새 카드 타입을 만들지 않는다. EconInsightBrief.marketLinks가 이미 {symbol,direction}
 *   financial-exposure 카드이므로, 판정을 그 계약으로 변환하면 기존 EconInsightParchment가
 *   그대로 렌더한다(맵/카드 재작성 0). WHY 재사용: 조사 결과 카드 계약이 이미 동형.
 *   COST: EconInsightBrief에 verified 필드가 없어 D2 unverified를 텍스트로 녹여야 함.
 *   EXIT: 정밀 수치(유료 MCP) 도입 시 EconInsightBrief에 verified 배지 필드 추가.
 * D2 Hybrid 정직성: verified=false 노출은 impactLine/paragraph에 "방향성 추정, 정밀 수치
 *   미검증"을 명시해 사용자가 mock을 real로 오독하지 않게 한다.
 */
import type { EconInsightBrief, EconInsightMarketLink, InsightRiskLevel } from "@/data/econInsightBriefs";
import type { ExposureAnalysis, RiskEvent } from "./types";
import type { PortfolioImpact } from "./portfolio";

function riskLevelFromSeverity(sev: RiskEvent["severity"]): InsightRiskLevel {
  if (sev === "L3") return "CRITICAL";
  if (sev === "L2") return "HIGH";
  return "STABLE";
}

/**
 * 이벤트 + 판정 + 포트폴리오 영향 → EconInsightBrief.
 * matched(내 포지션) 노출을 먼저, unmatched를 뒤에 배치.
 */
export function toBrief(
  event: RiskEvent,
  analysis: ExposureAnalysis,
  impact: PortfolioImpact | null,
): EconInsightBrief {
  // marketLinks: matched 우선(내 포지션), 그 다음 참고 노출
  const matchedTickers = new Set((impact?.matched ?? []).map((m) => m.ticker));
  const orderedExposures = [
    ...analysis.exposures.filter((e) => matchedTickers.has(e.ticker)),
    ...analysis.exposures.filter((e) => !matchedTickers.has(e.ticker)),
  ];
  const marketLinks: EconInsightMarketLink[] = orderedExposures.map((e) => ({
    symbol: e.ticker,
    direction: e.direction,
  }));

  const anyUnverified = analysis.exposures.some((e) => !e.verified);
  const relevancePct = impact ? Math.round(impact.relevance * 100) : 0;
  const matchCount = impact?.matched.length ?? 0;

  // impactLine: 포트폴리오 관련도 요약 (D2: 방향성 vs 정밀수치 구분)
  const impactLine =
    matchCount > 0
      ? `내 포지션 ${matchCount}종 노출 · 관련도 ${relevancePct}%` +
        (anyUnverified ? " · ⚠ 방향성 추정(정밀 수치 미검증)" : " · 검증됨")
      : `보유 포지션 직접 노출 없음 · 참고 노출 ${marketLinks.length}종`;

  const paragraphs: string[] = [];
  // 매칭된 노출의 근거를 문단으로
  for (const m of impact?.matched ?? []) {
    const e = analysis.exposures.find((x) => x.ticker === m.ticker);
    if (e) {
      paragraphs.push(
        `${m.ticker} (${(m.weight * 100).toFixed(0)}% · ${m.market}) ${e.direction === "up" ? "▲" : e.direction === "down" ? "▼" : "◆"} ${e.rationale}`,
      );
    }
  }
  if (impact?.snapshotWarning) paragraphs.push(`※ ${impact.snapshotWarning}`);
  if (anyUnverified) {
    paragraphs.push(
      "※ 이 판정은 무료 데이터 기반 방향성 추정입니다. 달러/퍼센트 정밀 수치는 검증 데이터 " +
        "연결 전까지 미제공(Hybrid 모드). 투자 자문 아님 — 애널리스트 초안, 사람 검토 필요.",
    );
  }

  return {
    navId: `risk:${event.id}`,
    titleKo: `${event.geography ?? event.eventClass} 리스크`,
    titleEn: `${event.geography ?? event.eventClass} risk`,
    riskLevel: riskLevelFromSeverity(event.severity),
    impactLine,
    marketLinks,
    paragraphs: [event.summary, ...paragraphs],
  };
}
