import { emitDashboardSound } from "@/components/SoundEffectsBridge";
import type { AudioEventId } from "@/data/audioManifest";
import type { TransportPath } from "@/data/geoTypes";
import { geometryHatchPathsOnly, TENSION_GRADE_STYLES } from "@/lib/disputeHatch";

export const AIR_RAID_SIREN_MS = 10000;
export const AIR_RAID_SIREN_VOLUME_SCALE = 1.45;
/** fly 시작 후 사이렌 시작 지연 — 이동 직후 울리게 */
export const AIR_RAID_SIREN_DELAY_MS = 650;
/** 공습경보 버튼 fly — 뷰어 LOD ~2.0(전역)에서 지역이 보이게 */
export const AIR_RAID_FLY_ALTITUDE = 2.0;
export const AIR_RAID_FLY_MS = 900;
/** 포커스 빗금·테두리 표시 시간 (사이렌 + 여유) */
export const AIR_RAID_FOCUS_HATCH_MS = AIR_RAID_FLY_MS + AIR_RAID_SIREN_DELAY_MS + AIR_RAID_SIREN_MS;

/** LOD 2.0에서도 읽히는 진한 공습경보 구역 테두리 */
export const AIR_RAID_FOCUS_OUTLINE = "rgba(127, 29, 29, 1)";
export const AIR_RAID_FOCUS_HATCH = "rgba(185, 28, 28, 0.82)";

export type AirRaidSirenKind = "tzeva" | "neptun";

const SIREN_EVENT: Record<AirRaidSirenKind, AudioEventId> = {
  tzeva: "tzeva-red-alert",
  neptun: "neptun-air-alert",
};

/**
 * 경보 단위 대략 반경(도) — altitude 2.0(전역 LOD)에서도 구역이 보이도록
 * 근접 줌(0.85) 때보다 넓게
 */
const HATCH_HALF_SPAN_DEG: Record<AirRaidSirenKind, number> = {
  tzeva: 1.85,
  neptun: 3.4,
};

export function isAirRaidFocusPath(path: TransportPath): boolean {
  return path.id.startsWith("air-raid-focus-");
}

/** 지역 이동 직후 짧게·약간 크게 공습경보음 (음소거 시 무시) */
export function playAirRaidSirenAfterFly(kind: AirRaidSirenKind, delayMs = AIR_RAID_SIREN_DELAY_MS) {
  window.setTimeout(() => {
    emitDashboardSound(SIREN_EVENT[kind], {
      durationMs: AIR_RAID_SIREN_MS,
      volumeScale: AIR_RAID_SIREN_VOLUME_SCALE,
      force: true,
    });
  }, delayMs);
}

/**
 * 공습경보 포커스 — 진한 사각 테두리 + 빗금.
 * LOD 2.0에서도 테두리가 주 시그널.
 */
export function buildAirRaidFocusHatchPaths(
  lat: number,
  lng: number,
  kind: AirRaidSirenKind,
  label?: string,
): TransportPath[] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const half = HATCH_HALF_SPAN_DEG[kind];
  const combat = TENSION_GRADE_STYLES.combat;
  const stamp = Date.now().toString(36);
  const idBase = `air-raid-focus-${kind}-${stamp}`;
  const box = {
    minLat: lat - half,
    maxLat: lat + half,
    minLng: lng - half,
    maxLng: lng + half,
  };

  const outline: TransportPath = {
    id: `${idBase}-outline`,
    kind: "dispute-zone",
    name: label ?? null,
    scalerank: 1,
    lengthKm: null,
    accentColor: AIR_RAID_FOCUS_OUTLINE,
    bbox: box,
    points: [
      { lat: box.minLat, lng: box.minLng },
      { lat: box.minLat, lng: box.maxLng },
      { lat: box.maxLat, lng: box.maxLng },
      { lat: box.maxLat, lng: box.minLng },
      { lat: box.minLat, lng: box.minLng },
    ],
  };

  const hatches = geometryHatchPathsOnly(
    idBase,
    label ?? null,
    box,
    combat.pattern,
    "conflict-hatch",
  ).map((path) => ({
    ...path,
    accentColor: AIR_RAID_FOCUS_HATCH,
  }));

  return [outline, ...hatches];
}
