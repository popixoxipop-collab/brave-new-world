import { eventRecencyMs, type ScoredEvent } from "@/data/eventTiers";
import type { EventTier } from "@/data/geoTypes";
import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";
import { getZoomOutScale } from "@/lib/zoomScale";
import { isCenterInView, VIEWPORT_RADIUS_BY_TIER } from "@/lib/viewportCull";

type ViewState = { lat: number; lng: number; altitude: number };

type MapTagTier = Extract<EventTier, "war" | "diplomatic" | "protest">;
type PinTier = Extract<EventTier, "alliance" | "protest">;

/** WebGL·라벨 부담을 줄이기 위한 줌 단계별 상한 — global(ISS)은 극소 */
const MAX_TAGS_BY_TIER: Record<GlobeLodTier, Record<MapTagTier, number>> = {
  global: { war: 6, diplomatic: 6, protest: 4 },
  continent: { war: 12, diplomatic: 12, protest: 10 },
  regional: { war: 18, diplomatic: 18, protest: 16 },
  near: { war: 22, diplomatic: 22, protest: 20 },
  village: { war: 28, diplomatic: 28, protest: 24 },
};

const MAX_PINS_BY_TIER: Record<GlobeLodTier, Record<PinTier, number>> = {
  global: { alliance: 4, protest: 0 },
  continent: { alliance: 12, protest: 0 },
  regional: { alliance: 22, protest: 0 },
  near: { alliance: 30, protest: 0 },
  village: { alliance: 38, protest: 0 },
};

const TAG_LABELS: Partial<Record<EventTier, { ko: string; en: string }>> = {
  war: { ko: "전투·충돌", en: "Combat / clash" },
  diplomatic: { ko: "외교 긴장", en: "Diplomatic tension" },
  alliance: { ko: "동맹 갈등", en: "Alliance friction" },
  protest: { ko: "시위", en: "Protest" },
};

/** 지도 위 GDELT 위치 태그 분류 문구 (긴장도 숫자 없음) */
export function gdeltLocationTagLabel(tier: EventTier, lang: "ko" | "en" = "ko"): string {
  const entry = TAG_LABELS[tier];
  if (!entry) return tier;
  return lang === "en" ? entry.en : entry.ko;
}

/** 태그 크기 — 긴장도 점수 대신 티어별 고정 */
export function gdeltLocationTagSize(tier: EventTier, altitude = 1): number {
  const base =
    tier === "war" ? 0.92 : tier === "diplomatic" ? 0.86 : tier === "protest" ? 0.84 : 0.82;
  return base * getZoomOutScale(altitude);
}

/** ISS/전역: 거친 헥사곤 근사 격자 · 근접: 세밀 격자 */
function cellStepForLod(lod: GlobeLodTier) {
  if (lod === "global") return 2.4;
  if (lod === "continent") return 1.2;
  if (lod === "regional") return 0.65;
  return 0.45;
}

function cellKey(lat: number, lng: number, lod: GlobeLodTier) {
  const step = cellStepForLod(lod);
  return `${Math.round(lat / step)}:${Math.round(lng / step)}`;
}

function tagRank(event: ScoredEvent) {
  return event.tensionScore * 1_000_000 + eventRecencyMs(event);
}

function pickTierEvents(
  events: ScoredEvent[],
  tier: EventTier,
  view: ViewState,
  maxCount: number,
): ScoredEvent[] {
  if (maxCount <= 0) return [];

  const { tier: lod } = getGlobeLod(view.altitude);
  const radiusDeg = VIEWPORT_RADIUS_BY_TIER[lod];

  const pool = events
    .filter((event) => event.eventTier === tier)
    .filter((event) =>
      radiusDeg > 0
        ? isCenterInView({ lat: event.lat, lng: event.lng }, view, radiusDeg)
        : true,
    )
    .sort((a, b) => tagRank(b) - tagRank(a))
    .slice(0, maxCount * 4);

  const byCell = new Map<string, ScoredEvent>();
  for (const event of pool) {
    const key = cellKey(event.lat, event.lng, lod);
    const prev = byCell.get(key);
    if (!prev || tagRank(event) > tagRank(prev)) {
      byCell.set(key, event);
    }
  }

  return Array.from(byCell.values())
    .sort((a, b) => tagRank(b) - tagRank(a))
    .slice(0, maxCount);
}

/**
 * GDELT 전투·외교·시위 이벤트를 지도 위치 태그(라벨)로 표시할 후보만 고릅니다.
 * - 뷰포트 밖 제외
 * - 격자 중복 제거 (한 칸에 최우선 이벤트 1개)
 * - LOD·티어별 개수 상한
 */
export function pickGdeltTensionTags(
  events: ScoredEvent[],
  options: {
    showWar: boolean;
    showDiplomatic: boolean;
    showProtest?: boolean;
    view: ViewState;
  },
): ScoredEvent[] {
  const { tier } = getGlobeLod(options.view.altitude);
  const limits = MAX_TAGS_BY_TIER[tier];
  const picked: ScoredEvent[] = [];

  if (options.showWar) {
    picked.push(...pickTierEvents(events, "war", options.view, limits.war));
  }
  if (options.showDiplomatic) {
    picked.push(...pickTierEvents(events, "diplomatic", options.view, limits.diplomatic));
  }
  if (options.showProtest) {
    picked.push(...pickTierEvents(events, "protest", options.view, limits.protest));
  }

  return picked.sort((a, b) => tagRank(b) - tagRank(a));
}

/** 동맹 GDELT 이벤트 — 뷰포트·격자 기준 핀 */
export function pickGdeltTierPins(
  events: ScoredEvent[],
  options: {
    showAlliance: boolean;
    showProtest: boolean;
    view: ViewState;
  },
): ScoredEvent[] {
  const { tier } = getGlobeLod(options.view.altitude);
  const limits = MAX_PINS_BY_TIER[tier];
  const picked: ScoredEvent[] = [];

  if (options.showAlliance) {
    picked.push(...pickTierEvents(events, "alliance", options.view, limits.alliance));
  }
  if (options.showProtest) {
    picked.push(...pickTierEvents(events, "protest", options.view, limits.protest));
  }

  return picked.sort((a, b) => tagRank(b) - tagRank(a));
}
