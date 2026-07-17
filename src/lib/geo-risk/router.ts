/**
 * geo-risk-desk 라우터 오케스트레이터 — Tier 1 루프를 닫는 진입점.
 *
 * 파이프라인: telegram_alerts diff → detect(2-source 게이트) → analyze(Claude 방향성) →
 *   portfolio 교집합 → D1 저장. cron worker의 새 step 또는 API route가 이 함수를 호출한다.
 *
 * D5: Claude 호출은 caller가 주입(callFn) — worker에선 callClaudeMessages, 테스트에선 mock.
 * D6: cursor = risk_events의 최신 first_seen_at. telegram received_at이 그 이후인 행만 처리.
 * 죽음의 문제 ③(비용/소음): detect의 2-source 게이트 + shouldPromote가 이미 상위만 통과시켜,
 *   Claude는 승격된 이벤트에만 태워진다(전량 LLM 금지).
 */
import type { AlertInput } from "./detect";
import { detectEvents } from "./detect";
import type { ClaudeCaller } from "./analyze";
import { analyzeExposure } from "./analyze";
import type { PortfolioSnapshot } from "./portfolio";
import { intersectPortfolio } from "./portfolio";
import type { ExposureAnalysis, RiskEvent } from "./types";

export interface RouterDeps {
  /** cursor 이후 telegram_alerts 조회 (D1 접근을 주입 — 테스트 가능) */
  fetchAlertsSince: (cursor: string | null) => Promise<AlertInput[]>;
  /** 현재 cursor (risk_events 최신 first_seen_at) */
  readCursor: () => Promise<string | null>;
  /** 이벤트 upsert (first-seen 유지) */
  upsertEvent: (ev: RiskEvent) => Promise<void>;
  /** 판정 저장 + status=analyzed */
  saveAnalysis: (eventId: string, a: ExposureAnalysis, nowIso: string) => Promise<void>;
  /** Claude 호출 */
  callClaude: ClaudeCaller;
  /** 포트폴리오 스냅샷 (없으면 null — 교집합 스킵) */
  portfolio: PortfolioSnapshot | null;
  /** Anthropic 키 */
  apiKey: string;
  /** now (ISO) — 결정론/테스트 위해 주입 */
  nowIso: string;
}

export interface RouterResult {
  detected: number;
  analyzed: number;
  /** 포트폴리오와 겹친 이벤트 수 */
  portfolioHits: number;
  errors: string[];
}

/** 한 사이클 실행: diff → detect → (analyze+portfolio+save). */
export async function runRouterCycle(deps: RouterDeps): Promise<RouterResult> {
  const errors: string[] = [];
  const cursor = await deps.readCursor();
  const alerts = await deps.fetchAlertsSince(cursor);
  const events = detectEvents(alerts, deps.nowIso);

  let analyzed = 0;
  let portfolioHits = 0;
  for (const ev of events) {
    try {
      await deps.upsertEvent(ev);
      const analysis = await analyzeExposure(ev, deps.apiKey, deps.callClaude);
      if (analysis.exposures.length === 0) continue; // 판정 실패/공백 — 저장 안 함

      // 포트폴리오 교집합 (있으면) — 관련도로 랭킹 입력, 카드에 반영
      if (deps.portfolio) {
        const impact = intersectPortfolio(analysis.exposures, deps.portfolio);
        if (impact.matched.length > 0) portfolioHits += 1;
      }
      await deps.saveAnalysis(ev.id, analysis, deps.nowIso);
      analyzed += 1;
    } catch (e) {
      errors.push(`${ev.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { detected: events.length, analyzed, portfolioHits, errors };
}
