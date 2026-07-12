import type { ConflictZoneFeature, DisputeArea, FirmsFire } from "@/data/geoTypes";
import { resolveDisputeCenter } from "@/lib/disputeCenter";
import { getDisputeGrade } from "@/lib/disputeHatch";
import { isInUkraineTheater } from "@/lib/ukraineSettlementLabels";
import { centerDistanceDeg } from "@/lib/viewportCull";

/**
 * FIRMS는 원인 레이블이 없다.
 * - combat: 분쟁/전선 교차 추정 (훈련과 구분 불가 — UI도 단정 금지)
 * - exercise: NOTAM/사격장 레이어가 있을 때만 (현재 데이터 없음 → 항상 빈 목록)
 * - none: 교차 없음 (산불 등)
 */
export type FirmsSoundKind = "combat" | "exercise" | "none";

export type FirmsCombatHotspot = {
  lat: number;
  lng: number;
  /** 대략적 반경(도). 기본 ~2° ≈ 220km */
  radiusDeg: number;
};

/**
 * 훈련·사격장 제외 구역 — NOTAM / 정적 GeoJSON 붙일 자리.
 * 데이터가 없으면 빈 배열; classify는 exercise를 combat보다 우선한다.
 */
export type FirmsExerciseZone = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  radiusDeg: number;
  /** 선택: 유효 기간 (ISO). 없으면 상시 */
  validFrom?: string | null;
  validTo?: string | null;
};

/** 정적 사격장·정기 훈련공역 — 레이어 추가 전 플레이스홀더 */
export const FIRMS_EXERCISE_ZONES: FirmsExerciseZone[] = [];

const DEFAULT_COMBAT_RADIUS_DEG = 2.2;
const CONFLICT_ZONE_RADIUS_DEG = 1.8;
/** 전쟁 뉴스 핀 근처 FIRMS — 폭격·화재 추정 반경 */
const GDELT_WAR_NEWS_RADIUS_DEG = 1.35;
const GDELT_WAR_HOTSPOT_MAX = 48;

/** combat-grade 분쟁 + 긴장 있는 AI 전쟁지역 중심 → 핫스팟 */
export function buildFirmsCombatHotspots(options: {
  disputes?: DisputeArea[] | null;
  includeWarZones: boolean;
  conflictZones?: ConflictZoneFeature[] | null;
  includeConflictZones: boolean;
}): FirmsCombatHotspot[] {
  const spots: FirmsCombatHotspot[] = [];

  if (options.includeWarZones) {
    for (const dispute of options.disputes ?? []) {
      if (getDisputeGrade(dispute) !== "combat") continue;
      const center = resolveDisputeCenter(dispute);
      spots.push({
        lat: center.lat,
        lng: center.lng,
        radiusDeg: DEFAULT_COMBAT_RADIUS_DEG,
      });
    }
  }

  if (options.includeConflictZones) {
    for (const zone of options.conflictZones ?? []) {
      if (zone.tension === "low") continue;
      spots.push({
        lat: zone.center.lat,
        lng: zone.center.lng,
        radiusDeg: CONFLICT_ZONE_RADIUS_DEG,
      });
    }
  }

  return spots;
}

/**
 * GDELT 전투·전쟁 뉴스 좌표 → FIRMS 교차 핫스팟.
 * 중동 등에서 전쟁구역 빗금 대신 「전쟁뉴스 근처 화재경보」에 사용.
 */
export function buildGdeltWarNewsHotspots(
  events: Array<{ lat: number; lng: number; eventTier?: string }> | null | undefined,
  options?: { radiusDeg?: number; max?: number },
): FirmsCombatHotspot[] {
  const radiusDeg = options?.radiusDeg ?? GDELT_WAR_NEWS_RADIUS_DEG;
  const max = options?.max ?? GDELT_WAR_HOTSPOT_MAX;
  const spots: FirmsCombatHotspot[] = [];
  const seen = new Set<string>();

  for (const event of events ?? []) {
    if (event.eventTier && event.eventTier !== "war") continue;
    if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) continue;
    const key = `${Math.round(event.lat * 4)}:${Math.round(event.lng * 4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    spots.push({ lat: event.lat, lng: event.lng, radiusDeg });
    if (spots.length >= max) break;
  }

  return spots;
}

export function isFirmsNearCombatHotspot(
  fire: Pick<FirmsFire, "lat" | "lng">,
  hotspots: FirmsCombatHotspot[],
): boolean {
  for (const spot of hotspots) {
    if (centerDistanceDeg(fire, spot) <= spot.radiusDeg) return true;
  }
  return false;
}

function zoneIsActiveNow(zone: FirmsExerciseZone, nowMs: number): boolean {
  if (zone.validFrom) {
    const from = Date.parse(zone.validFrom);
    if (Number.isFinite(from) && nowMs < from) return false;
  }
  if (zone.validTo) {
    const to = Date.parse(zone.validTo);
    if (Number.isFinite(to) && nowMs > to) return false;
  }
  return true;
}

/** 훈련구역 안이면 true — 레이어 데이터가 채워지면 자동 동작 */
export function isFirmsInExerciseZone(
  fire: Pick<FirmsFire, "lat" | "lng">,
  zones: FirmsExerciseZone[],
  nowMs = Date.now(),
): boolean {
  for (const zone of zones) {
    if (!zoneIsActiveNow(zone, nowMs)) continue;
    if (centerDistanceDeg(fire, zone) <= zone.radiusDeg) return true;
  }
  return false;
}

/**
 * exercise > combat > none
 * 훈련구역 레이어가 비어 있으면 exercise는 절대 나오지 않음.
 */
export function classifyFirmsFireForSound(
  fire: Pick<FirmsFire, "lat" | "lng">,
  options: {
    ukraineFrontActive: boolean;
    combatHotspots: FirmsCombatHotspot[];
    /** 기본: FIRMS_EXERCISE_ZONES (지금은 []) */
    exerciseZones?: FirmsExerciseZone[];
    nowMs?: number;
  },
): FirmsSoundKind {
  const exerciseZones = options.exerciseZones ?? FIRMS_EXERCISE_ZONES;
  if (isFirmsInExerciseZone(fire, exerciseZones, options.nowMs)) {
    return "exercise";
  }
  if (options.ukraineFrontActive && isInUkraineTheater(fire.lat, fire.lng)) {
    return "combat";
  }
  if (isFirmsNearCombatHotspot(fire, options.combatHotspots)) {
    return "combat";
  }
  return "none";
}

export function firmsFireSoundLabel(
  kind: FirmsSoundKind,
  lang: "ko" | "en" = "ko",
): string {
  if (lang === "en") {
    if (kind === "exercise") return "Thermal · exercise / range";
    if (kind === "combat") return "Likely strike / fire · war-news cross";
    return "Thermal · unclassified";
  }
  if (kind === "exercise") return "열감지 · 훈련/사격장 구역";
  if (kind === "combat") return "폭격·화재 추정 · 전쟁뉴스 교차";
  return "열감지 · 원인 미분류";
}

/** 자동 재생에 쓸 매니페스트 eventId — exercise/none은 기본 무음 */
export function firmsSoundEventId(
  kind: FirmsSoundKind,
): "firms-combat-burst" | "firms-exercise" | null {
  if (kind === "combat") return "firms-combat-burst";
  if (kind === "exercise") return "firms-exercise";
  return null;
}
