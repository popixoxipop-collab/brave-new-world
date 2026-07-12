import { theaterAssetSymbols } from "@/lib/theaterAssets";
import type { HeroBreakingItem } from "@/lib/news/types";

/** A급 속보 — 이 점수 이상일 때 alert 모드(히어로 슬라이드업) */
export const ALERT_URGENCY_THRESHOLD = 45;

export const INTEL_STACK_CLEARANCE_CALM = "8.5rem";
export const INTEL_STACK_CLEARANCE_ALERT = "13.5rem";
export const INTEL_STACK_CLEARANCE_ECONOMY_CALM = "10rem";
export const INTEL_STACK_CLEARANCE_ECONOMY_ALERT = "14.5rem";

/** alert 하이라이트 티커 — 이 % 이상 변동 시 SPIKE 배지 */
export const TICKER_SPIKE_THRESHOLD_PERCENT = 1.25;

export type IntelStackMode = "calm" | "alert";

export function resolveIntelStackMode(hero: HeroBreakingItem | null): IntelStackMode {
  if (!hero) return "calm";
  return hero.urgencyScore >= ALERT_URGENCY_THRESHOLD ? "alert" : "calm";
}

export function resolveIntelStackClearance(
  mode: IntelStackMode,
  viewerMode: "conflict" | "economy" = "conflict",
): string {
  if (viewerMode === "economy") {
    return mode === "alert"
      ? INTEL_STACK_CLEARANCE_ECONOMY_ALERT
      : INTEL_STACK_CLEARANCE_ECONOMY_CALM;
  }
  return mode === "alert" ? INTEL_STACK_CLEARANCE_ALERT : INTEL_STACK_CLEARANCE_CALM;
}

/** alert 모드 티커 하이라이트 — 전장 연관 심볼 상위 4개 */
export function heroHighlightSymbols(hero: HeroBreakingItem | null, limit = 4): string[] {
  if (!hero) return [];
  return theaterAssetSymbols(hero.theater).slice(0, limit);
}
