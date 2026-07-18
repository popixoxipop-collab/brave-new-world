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
import { crossCheckBeta, TRANSMISSION_PROVENANCE, type BetaCheck } from "./transmissionMap";

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
  // Stage-2: 각 exposure에 실측 β 교차검증 배지. LLM 방향이 β 부호와 일치하는가(§13).
  const betaChecks = new Map<string, BetaCheck>();
  const marketLinks: EconInsightMarketLink[] = orderedExposures.map((e) => {
    const check = crossCheckBeta(e.ticker, event.eventClass, e.direction);
    betaChecks.set(e.ticker, check);
    return {
      symbol: e.ticker,
      direction: e.direction,
      ...(check.chipNote ? { note: check.chipNote } : {}),
      ...(check.agreement === "agree" || check.agreement === "disagree" || check.agreement === "unverified"
        ? { betaFlag: check.agreement }
        : {}),
    };
  });

  // β가 LLM 방향과 어긋나거나 미검증인 노출 — 카드에서 정직하게 드러낸다.
  const disagreeing = orderedExposures.filter((e) => betaChecks.get(e.ticker)?.agreement === "disagree");
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

  // Stage-2 β 교차검증 섹션 — 실측 데이터가 LLM 방향을 지지/반박하는지 정직하게 표시(§13).
  const checkedLinks = marketLinks.filter((m) => m.note);
  if (checkedLinks.length > 0) {
    const driverKo = (m: EconInsightMarketLink) =>
      (betaChecks.get(m.symbol)?.driver ?? "brent") === "brent" ? "유가(Brent)" : "변동성(VIX)";
    const lines = checkedLinks.map((m) => {
      const c = betaChecks.get(m.symbol);
      const t = c?.t != null ? ` t=${c.t.toFixed(0)}` : "";
      const tag =
        c?.agreement === "disagree"
          ? " ⚠ LLM 방향과 반대"
          : c?.agreement === "unverified"
            ? c?.driver === "vix"
              ? " (변동성 이벤트 — 시장β 교란, 방향 미검증)"
              : " (β 유의성 약 — 방향 미검증)"
            : c?.agreement === "agree"
              ? " ✓ 실측 β가 방향 지지"
              : "";
      return `· ${m.symbol}: β(${driverKo(m)})=${(c?.beta ?? 0) >= 0 ? "+" : ""}${(c?.beta ?? 0).toFixed(2)}${t}${tag}`;
    });
    paragraphs.push(
      "실측 β 교차검증 (Stage-2 transmission map) — 이벤트 충격이 각 종목을 어느 방향으로 " +
        "미는지 과거 일간수익 회귀로 검증:\n" +
        lines.join("\n"),
    );
    if (disagreeing.length > 0) {
      paragraphs.push(
        `※ ${disagreeing.map((e) => e.ticker).join(", ")}는 LLM 판정 방향이 실측 β 부호와 반대입니다. ` +
          "정유·항공처럼 단순 유가 논리가 데이터로 검증되지 않는 종목 — 방향을 신뢰하기 전 재검토 필요.",
      );
    }
    paragraphs.push(
      `※ β 출처: 일간수익 OLS, n=${TRANSMISSION_PROVENANCE.nDays}일 ` +
        `(${TRANSMISSION_PROVENANCE.start}~${TRANSMISSION_PROVENANCE.end}), Brent=${TRANSMISSION_PROVENANCE.brentSource}. ` +
        "직관 아닌 실측치(Data-First Numerics §13).",
    );
  }

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
