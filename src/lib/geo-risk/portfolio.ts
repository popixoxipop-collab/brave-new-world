/**
 * geo-risk-desk 포트폴리오 필터 — 이벤트 노출 ∩ 내 포지션.
 *
 * D3: geowatch는 Finance 계좌를 **직접 조회하지 않는다**(§17 account-pair-guard + 크레덴셜
 *   격리 + 라이브 봇 무영향). Finance가 export한 포지션 스냅샷 JSON만 읽는다(읽기전용).
 *   스냅샷은 Alpaca(US)+KIS(KR) 양쪽 포지션을 함께 담는다(§17: 단일계좌 조회 금지 대칭).
 *   WHY 스냅샷: geowatch(공개 앱)에 브로커 키를 노출하지 않고, 라이브 주문/리밸에 영향 0.
 *   COST: 스냅샷이 최신이 아닐 수 있음(export 주기 의존). EXIT: Finance가 스냅샷을 cron
 *     export(예: data/forward/portfolio_snapshot.json)하고 geo-risk가 그 URL/파일만 fetch.
 *
 * Finance 쪽 export 계약(사용자가 Finance 세션에서 1회 배선):
 *   live/bot/account_report.py 의 get_all_positions()(Alpaca)+KIS hldg 를 재사용해
 *   { asOf, source:"alpaca+kis", positions:[{ticker,weight,market}] } JSON을 쓴다.
 *   geo-risk는 그 JSON을 loadPortfolio로 소비만 한다.
 */
import type { Exposure } from "./types";

export interface Position {
  ticker: string;
  /** 포트폴리오 비중 0~1 */
  weight: number;
  /** US(Alpaca) | KR(KIS) */
  market: "US" | "KR";
  name?: string;
}

export interface PortfolioSnapshot {
  asOf: string;
  /** §17: 반드시 양쪽 계좌 함께. 단일이면 불완전 스냅샷으로 경고. */
  source: string;
  positions: Position[];
}

/** 이벤트 노출 중 내 포트폴리오와 겹치는 것 + 관련도 스코어. */
export interface PortfolioImpact {
  /** 포지션과 매칭된 노출 (weight 주입) */
  matched: Array<Exposure & { weight: number; market: "US" | "KR" }>;
  /** 포지션과 안 겹치는 노출 (참고용, 승격 우선순위 낮음) */
  unmatched: Exposure[];
  /** 관련도 = 매칭된 포지션 weight 합 (Tier 2 퍼널 랭킹 입력) */
  relevance: number;
  /** §17 스냅샷 완전성 경고 (양쪽 계좌 없으면) */
  snapshotWarning: string | null;
}

/** JSON을 안전하게 PortfolioSnapshot으로. 잘못되면 빈 스냅샷. */
export function loadPortfolio(json: unknown): PortfolioSnapshot {
  const obj = (json ?? {}) as Record<string, unknown>;
  const rawPos = Array.isArray(obj.positions) ? obj.positions : [];
  const positions: Position[] = rawPos
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => ({
      ticker: String(p.ticker ?? "").toUpperCase(),
      weight: typeof p.weight === "number" && Number.isFinite(p.weight) ? p.weight : 0,
      market: p.market === "KR" ? "KR" : "US",
      name: p.name ? String(p.name) : undefined,
    }))
    .filter((p) => p.ticker.length > 0);
  return {
    asOf: String(obj.asOf ?? ""),
    source: String(obj.source ?? "unknown"),
    positions,
  };
}

/** 노출 판정을 포트폴리오와 교차. matched만 "내 돈에 영향". */
export function intersectPortfolio(
  exposures: Exposure[],
  snap: PortfolioSnapshot,
): PortfolioImpact {
  const byTicker = new Map(snap.positions.map((p) => [p.ticker, p]));
  const matched: PortfolioImpact["matched"] = [];
  const unmatched: Exposure[] = [];
  for (const e of exposures) {
    const pos = byTicker.get(e.ticker);
    if (pos) matched.push({ ...e, weight: pos.weight, market: pos.market });
    else unmatched.push(e);
  }
  const relevance = matched.reduce((s, m) => s + m.weight, 0);

  // §17: 스냅샷이 양쪽 계좌를 담았는지 (단일이면 불완전 경고)
  const hasUS = snap.positions.some((p) => p.market === "US");
  const hasKR = snap.positions.some((p) => p.market === "KR");
  const snapshotWarning =
    hasUS && hasKR
      ? null
      : `스냅샷이 ${hasUS ? "US" : hasKR ? "KR" : "빈"} 단일 — §17 위반 소지(Alpaca+KIS 함께여야 완전)`;

  return { matched, unmatched, relevance, snapshotWarning };
}
