/**
 * geo-risk-desk 라우터 오케스트레이터 — Tier 1 루프를 닫는 진입점.
 *
 * 파이프라인: telegram 최근 메시지 → detect(2-source 게이트) → analyze(Claude/NVIDIA 방향성) →
 *   portfolio 교집합 → D1 저장. cron worker의 새 step 또는 API route가 이 함수를 호출한다.
 *
 * D5: Claude 호출은 caller가 주입(callFn) — worker에선 callClaudeMessages, 테스트에선 mock.
 * D-GRF11(2026-07-20): 전역 cursor(risk_events 최신 first_seen_at) 필터를 제거했다.
 *   WHY: cursor가 있으면 한 사이클에 무관 버킷이 승격돼 커서가 전진할 때, 같은 사이클의
 *     미승격 약신호 단일소스 알림이 다음 사이클엔 커서보다 과거가 돼 영구 유실됐다(2-source
 *     corroboration이 실전에서 발동 못하는 구조적 버그, vitest로 재현: firstSeenAt.audit.test.ts).
 *     telegramFetch가 채널당 최근 8개만 돌려주는 자연스러운 창이 있어 cursor 없이 매 사이클
 *     전체 재처리해도 물량이 안 커진다.
 *   COST: 이미 analyzed된 이벤트도 메시지가 여전히 보이는 한 매 사이클 재감지·재버킷팅된다
 *     (무료, 결정론적 룰 — LLM 호출 없음). 비용 통제는 아래 getEventStatus 스킵으로 이전.
 * 죽음의 문제 ③(비용/소음): detect의 2-source 게이트 + shouldPromote로 1차 필터한 뒤,
 *   이미 analyzed/dismissed인 이벤트는 getEventStatus로 스킵 — Claude/NVIDIA는 새 이벤트에만.
 */
import type { AlertInput } from "./detect";
import { detectEvents } from "./detect";
import type { ClaudeCaller } from "./analyze";
import { analyzeExposure } from "./analyze";
import type { PortfolioSnapshot } from "./portfolio";
import { intersectPortfolio } from "./portfolio";
import type { ExposureAnalysis, RiskEvent } from "./types";

export interface RouterDeps {
  /** telegram 최근 메시지 조회 (D1/스크래핑 접근을 주입 — 테스트 가능) */
  fetchAlerts: () => Promise<AlertInput[]>;
  /** 이벤트 upsert (first_seen_at·status는 기존값 유지 — id 충돌 시 안 바뀜) */
  upsertEvent: (ev: RiskEvent) => Promise<void>;
  /** 이벤트 현재 status 조회 (없으면 null) — 이미 analyzed면 LLM 재호출 스킵 */
  getEventStatus: (id: string) => Promise<RiskEvent["status"] | null>;
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
  /** 이번 사이클에 처음 D1에 생성된 이벤트 수(신규) */
  detected: number;
  /** 이미 있던 이벤트가 재관측돼 corroboration/severity/summary만 갱신된 수 */
  reconfirmed: number;
  /** 새로 LLM 판정한 수(이미 analyzed였던 건 제외) */
  analyzed: number;
  /** 포트폴리오와 겹친 이벤트 수 */
  portfolioHits: number;
  errors: string[];
}

/** 한 사이클 실행: fetch → detect → (신규만 analyze+portfolio+save). */
export async function runRouterCycle(deps: RouterDeps): Promise<RouterResult> {
  const errors: string[] = [];
  const alerts = await deps.fetchAlerts();
  const events = detectEvents(alerts, deps.nowIso);

  let detected = 0;
  let reconfirmed = 0;
  let analyzed = 0;
  let portfolioHits = 0;
  for (const ev of events) {
    try {
      const priorStatus = await deps.getEventStatus(ev.id);
      await deps.upsertEvent(ev); // corroboration/severity/summary 갱신 — first_seen_at·status 불변

      if (priorStatus === "analyzed" || priorStatus === "dismissed") {
        reconfirmed += 1;
        continue; // 이미 판정됨 — LLM 재호출 금지(비용 통제, D-GRF11)
      }
      detected += 1;

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

  return { detected, reconfirmed, analyzed, portfolioHits, errors };
}
