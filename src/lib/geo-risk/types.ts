/**
 * geo-risk-desk 라우터 타입.
 * 지정학 이벤트 → 포트폴리오 노출 판정의 데이터 계약.
 * exposures는 geowatch 기존 EconInsightBrief.marketLinks와 동형이라 카드가 바로 렌더한다.
 */

/** risk_events.event_class 도메인 */
export type EventClass =
  | "chokepoint_disruption"
  | "sanction"
  | "conflict_shift"
  | "infra_attack"
  | "other";

/** L1(단일 언급) < L2(다중소스/강신호) < L3(critical). L2+만 full 분석 승격. */
export type Severity = "L1" | "L2" | "L3";

/** 분류기 출력 (Telegram 텍스트 → 구조화). */
export interface Classification {
  eventClass: EventClass;
  /** 알려진 지명 매칭 결과 (없으면 null) */
  geography: string | null;
  severity: Severity;
  lat: number | null;
  lon: number | null;
  /** 분류를 유발한 키워드들 (감사 추적 — 왜 이 분류인가) */
  matchedKeywords: string[];
}

/** 라우터가 승격한 리스크 이벤트 (risk_events 행과 동형). */
export interface RiskEvent {
  id: string;
  source: string;
  sourceRef: string;
  eventClass: EventClass;
  geography: string | null;
  severity: Severity;
  summary: string;
  lat: number | null;
  lon: number | null;
  corroborationCount: number;
  firstSeenAt: string;
  status: "detected" | "analyzed" | "dismissed";
}

/** 단일 노출 (marketLinks 동형). */
export interface Exposure {
  ticker: string;
  /** up=수혜, down=타격, watch=불확실 */
  direction: "up" | "down" | "watch";
  rationale: string;
  /** D2 grounding: 검증된 데이터 소스에서 왔는가. false면 UI가 "unverified" 회색 처리. */
  verified: boolean;
}

/** Claude 판정 출력 (risk_analyses 행과 동형). */
export interface ExposureAnalysis {
  exposures: Exposure[];
  /** 포트폴리오 영향 추정 (D2: 유료 데이터 전까지 null/mock) */
  portfolioDelta: number | null;
  /** 전체 판정이 검증 데이터 기반인지 (하나라도 unverified면 false) */
  verified: boolean;
  model: string;
}
