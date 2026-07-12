import type { GlobeLodTier } from "@/lib/globeLod";
import { FIRMS_FIRE_MAX_BY_TIER } from "@/lib/viewportCull";
import { isClientApiStubMode } from "@/lib/runtimeConfig.client";

/**
 * Live(API_STUB_MODE=false) 렌더·폴링 안전장치.
 * stub ON일 때는 기존(또는 약간 빠른) 간격, stub OFF일 때는 보수적 간격·상한.
 *
 * 전환 게이트 (권장 순서):
 *   stub → Phase1 정적 .json.gz → Phase2 5초 버스트 ingest → Phase3 Worker OK 후 live
 */

export {
  GDELT_CLIENT_RING_CAP,
  STREAM_INGEST_BURST_MS,
  TELEGRAM_CLIENT_RING_CAP,
} from "@/lib/streamIngestGuard";


/** FIRMS API max — 화면 상한보다 크게 받지 않음 (state 폭증 방지) */
export function firmsLiveFetchMax(tier: GlobeLodTier): number {
  return FIRMS_FIRE_MAX_BY_TIER[tier];
}

/** 서버 FIRMS hard cap과 동일 값 (route.ts 로컬 상수) — query max 무시 상한 */
export const FIRMS_SERVER_HARD_CAP = 900;

/** Tzeva: 라이브 3s는 과함 → 15s */
export function liveTzevaPollMs(): number {
  return isClientApiStubMode() ? 3_000 : 15_000;
}

/** Telegram alerts: 라이브 12s → 30s */
export function liveTelegramPollMs(): number {
  return isClientApiStubMode() ? 12_000 : 30_000;
}

/** Telegram sync POST: 라이브 60s → 120s */
export function liveTelegramSyncPollMs(): number {
  return isClientApiStubMode() ? 60_000 : 120_000;
}

/** FIRMS bbox/주기 갱신 */
export function liveFirmsPollMs(): number {
  return isClientApiStubMode() ? 3 * 60_000 : 5 * 60_000;
}

/** GDELT 이벤트 폴링 */
export function liveGdeltPollMs(): number {
  return isClientApiStubMode() ? 15 * 60_000 : 20 * 60_000;
}

/** AIS 선박 */
export function liveAisPollMs(): number {
  return isClientApiStubMode() ? 60_000 : 90_000;
}

export function liveAisFetchMax(): number {
  return isClientApiStubMode() ? 250 : 120;
}

/** ADS-B 군용기 */
export function liveMilPollMs(): number {
  return isClientApiStubMode() ? 45_000 : 75_000;
}

export function liveMilFetchMax(): number {
  return isClientApiStubMode() ? 400 : 150;
}

/** 미 항모 */
export function liveUsCarriersPollMs(): number {
  return isClientApiStubMode() ? 5 * 60_000 : 8 * 60_000;
}

/** Yahoo 티커 스트립 */
export function liveTickerPollMs(): number {
  return isClientApiStubMode() ? 10 * 60_000 : 15 * 60_000;
}

/** 카메라 조작·백그라운드 탭 중 라이브 새로고침 보류 */
export function shouldDeferLiveNetworkRefresh(cameraMoving: boolean): boolean {
  if (isClientApiStubMode()) return false;
  if (typeof document !== "undefined" && document.hidden) return true;
  return cameraMoving;
}
