import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
  type LabelLanguage,
} from "@/lib/layerPrefs";
import { clampPrefsToActiveCap } from "@/lib/layerExclusiveCap";
import { applyUltraLiteToLayerPrefs } from "@/lib/ultraLiteMode";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 첫 진입 게이트 — 로테이션이 아니라 입·출구(한 번 통과하면 끝).
 *
 * 순서(하드코딩):
 * 1. 로딩 — 이때부터 뒷배경은 이미 줌아웃
 * 2. 환영 편지지
 * 3. 지정학 / 지경학 선택
 * 4. 전체 지구본 확 줌아웃
 * 5. 세부설정(ModePicker)
 */
/** 고도는 런타임에 LOD 앵커로 바뀌므로 literal이 되면 안 됨 (`as const` 금지). */
export const ENTRY_GATE: {
  bootAltitude: number;
  bootLookAt: { readonly lat: number; readonly lng: number };
  zoomOutAltitude: number;
  zoomOutFlyMs: number;
  afterZoomOutHoldMs: number;
} = {
  /** 로딩·환영·도메인 동안 뒷배경 카메라 (이미 줌아웃된 궤도) */
  bootAltitude: 2.85,
  bootLookAt: { lat: 18, lng: 35 },
  /** 도메인 선택 직후 — 전체 지구본이 확 빠지는 고도 */
  zoomOutAltitude: 3.4,
  zoomOutFlyMs: 1600,
  /** 줌아웃 연출 후 세부설정 창까지 여유 */
  afterZoomOutHoldMs: 450,
};

/** @deprecated ENTRY_GATE.bootAltitude / zoomOutAltitude 사용 */
export const DOMAIN_OVERVIEW_ALTITUDE = ENTRY_GATE.zoomOutAltitude;

/** @deprecated ENTRY_GATE.bootLookAt */
export const DOMAIN_OVERVIEW_LOOK_AT = ENTRY_GATE.bootLookAt;

/** @deprecated ENTRY_GATE.zoomOutFlyMs */
export const DOMAIN_OVERVIEW_FLY_MS = ENTRY_GATE.zoomOutFlyMs;

/** 줌아웃 fly 시작 → 세부설정 오픈까지 */
export const DOMAIN_OVERVIEW_THEN_DETAIL_MS =
  ENTRY_GATE.zoomOutFlyMs + ENTRY_GATE.afterZoomOutHoldMs;

function allBooleanLayersOff(base: LayerPrefs): LayerPrefs {
  const next = { ...base };
  for (const key of Object.keys(next) as (keyof LayerPrefs)[]) {
    if (typeof next[key] === "boolean") {
      (next as Record<string, boolean | string>)[key as string] = false;
    }
  }
  return next;
}

/**
 * 도메인 게이트 직후 · 세부 선택 전 — 전체 지구본용 레이어.
 * 지정학: 전쟁 빗금만 / 지경학: 항로·초크포인트·항구
 */
export function buildDomainOverviewPrefs(
  mode: ViewerMode,
  options?: { labelLanguage?: LabelLanguage; ultraLite?: boolean },
): LayerPrefs {
  const labelLanguage = options?.labelLanguage ?? DEFAULT_LAYER_PREFS.labelLanguage;
  let next = allBooleanLayersOff({ ...DEFAULT_LAYER_PREFS, labelLanguage });

  if (mode === "conflict") {
    next = {
      ...next,
      showWarZones: true,
    };
  } else {
    next = {
      ...next,
      showShippingLanes: true,
      showLogisticsRisk: true,
      showPorts: true,
    };
  }

  if (options?.ultraLite) {
    next = applyUltraLiteToLayerPrefs(next);
    if (mode === "conflict") {
      next = { ...next, showWarZones: true };
    } else {
      next = {
        ...next,
        showShippingLanes: true,
        showLogisticsRisk: true,
        showPorts: true,
      };
    }
    next = clampPrefsToActiveCap(next, true);
  }

  return next;
}
