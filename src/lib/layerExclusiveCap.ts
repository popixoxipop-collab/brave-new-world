import type { LayerPrefs } from "@/lib/layerPrefs";

/** 일반 모드 — 동시 ON 레이어 하드캡 */
export const ACTIVE_LAYER_CAP_DEFAULT = 5;

/** ultra-lite — 더 빡센 캡 */
export const ACTIVE_LAYER_CAP_ULTRA = 3;

/**
 * 캡 집계에서 제외:
 * - showNeptunPreviousTrails: NEPTUN 종속 옵션 (별도 슬롯 안 씀)
 */
const CAP_EXEMPT_KEYS = new Set<keyof LayerPrefs>([
  "labelLanguage",
  "showNeptunPreviousTrails",
]);

/** 캡 초과 시 잘라낼 때 우선 유지 (앞쪽일수록 유지) */
export const LAYER_CAP_KEEP_PRIORITY: Array<keyof LayerPrefs> = [
  "showUkraineControl",
  "showNeptun",
  "showWarZones",
  "showDiplomaticTension",
  "showGdeltWar",
  "showFirmsFires",
  "showMilitaryActivity",
  "showAis",
  "showTzevaAdom",
  "showTelegramOsint",
  "showConflictZones",
  "showShippingLanes",
  "showSubmarineCables",
  "showCityLabels",
];

export function isLayerCapCountedKey(key: keyof LayerPrefs): boolean {
  if (CAP_EXEMPT_KEYS.has(key)) return false;
  return typeof key === "string" && key.startsWith("show");
}

export function countActiveLayers(prefs: LayerPrefs): number {
  let n = 0;
  for (const key of Object.keys(prefs) as Array<keyof LayerPrefs>) {
    if (!isLayerCapCountedKey(key)) continue;
    if (prefs[key] === true) n += 1;
  }
  return n;
}

export function activeLayerCap(ultraLite: boolean): number {
  return ultraLite ? ACTIVE_LAYER_CAP_ULTRA : ACTIVE_LAYER_CAP_DEFAULT;
}

/** 끄기(false)는 항상 OK. 켜기(true)는 캡 여유 있을 때만 */
export function canEnableLayer(
  prefs: LayerPrefs,
  key: keyof LayerPrefs,
  ultraLite: boolean,
): boolean {
  if (!isLayerCapCountedKey(key)) return true;
  if (prefs[key] === true) return true;
  return countActiveLayers(prefs) < activeLayerCap(ultraLite);
}

/**
 * prefs가 캡을 넘으면 우선순위 밖·뒤쪽 ON을 끈다.
 * 반환: 클램프된 prefs (참조 동일 가능)
 */
export function clampPrefsToActiveCap(
  prefs: LayerPrefs,
  ultraLite: boolean,
): LayerPrefs {
  const cap = activeLayerCap(ultraLite);
  if (countActiveLayers(prefs) <= cap) return prefs;

  const next = { ...prefs };
  const onKeys = (Object.keys(next) as Array<keyof LayerPrefs>).filter(
    (key) => isLayerCapCountedKey(key) && next[key] === true,
  );

  const priorityIndex = new Map(
    LAYER_CAP_KEEP_PRIORITY.map((key, index) => [key, index] as const),
  );
  onKeys.sort((a, b) => {
    const pa = priorityIndex.get(a) ?? 10_000;
    const pb = priorityIndex.get(b) ?? 10_000;
    if (pa !== pb) return pa - pb;
    return String(a).localeCompare(String(b));
  });

  for (let i = cap; i < onKeys.length; i += 1) {
    const key = onKeys[i];
    (next as Record<string, boolean | string>)[key as string] = false;
  }
  return next;
}
